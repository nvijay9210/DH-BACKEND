const { pool } = require("../Config/db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { createUserBranch } = require("./UserBranchService");
const { AppError } = require("../Logics/AppError");
const { validateData } = require("../Middleware/ValidationMiddleware");
const { createUser, deleteKeycloakUser, getUserId } = require("../Keycloak/User");
const RedisService = require("./RedisService");

/* ===============================
   Helper: Get User Branch Mapping
=================================*/
const getUserBranchById = async (tenant_id, branch_id, user_id) => {
  const rows = await pool.query(
    `SELECT * FROM userbranch
     WHERE tenant_id = ? AND user_id = ?`,
    [tenant_id, user_id]
  );
  return rows;
};

/* ===============================
   User Login
=================================*/
exports.login = async (Details) => {
  const validation = validateData('login', Details);
  if (!validation.isValid) {
    throw new AppError('Login validation failed', 400, validation.errors);
  }

  let conn;
  try {
    const jwt_key = process.env.JWT_KEY;
    if (!jwt_key) throw new AppError("Server configuration error", 500);

    conn = await pool.getConnection();

    // 🔥 JOIN userbranch to fetch branch_id dynamically
    const users = await conn.query(
      `SELECT u.*,
          t.is_active AS tenant_active,
          ub.branch_id AS userbranch_branch_id,
          b.is_active AS branch_active
       FROM user u
       JOIN tenant t ON u.tenant_id = t.tenant_id
       LEFT JOIN userbranch ub ON u.user_id = ub.user_id AND u.tenant_id = ub.tenant_id
       LEFT JOIN branch b ON ub.user_id = b.user_id
       WHERE u.username = ?
       ORDER BY ub.created_at DESC  -- Get most recent branch mapping first
       LIMIT 1`,
      [validation.value.username]
    );

    if (users.length === 0) throw new AppError("Invalid credentials", 401);

    const user = users[0];

    // ✅ Use branch_id from userbranch (fallback to user.branch_id if needed)
    const finalBranchId = user.userbranch_branch_id || user.branch_id || null;

    if (user.status !== "A")
      throw new AppError("User account is deactivated", 403);
    if (user.tenant_active !== 1) throw new AppError("Tenant is inactive", 403);
    if (finalBranchId && user.branch_active !== 1)
      throw new AppError("Branch is inactive", 403);

    const token = jwt.sign(
      {
        user_id: user.user_id,
        username: user.username,
        tenant_id: user.tenant_id,
        branch_id: finalBranchId,
        role: user.role,
      },
      jwt_key,
      { expiresIn: "1d" }
    );

    return {
      msg: "Login successful",
      success: true,
      token,
      user: {
        user_id: user.user_id,
        username: user.username,
        tenant_id: user.tenant_id,
        branch_id: finalBranchId,
        role: user.role,
      },
    };
  } catch (err) {
    console.error("❌ login Error:", err);
    throw err;
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   User Logout
=================================*/

exports.logout = async (req, res) => {
  try {
    // Correct cookie name
    const sessionId = req.cookies?.session_id;

    // Delete Redis session
    if (sessionId) {
      await RedisService.delete(`session:${sessionId}`);
      await RedisService.delete(`api_count:${sessionId}`);
    }

    const cookieOptions = {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
    };

    // Clear cookies
    res.clearCookie("session_id", cookieOptions);
    res.clearCookie("access_token", cookieOptions);
    res.clearCookie("refresh_token", cookieOptions);
    res.clearCookie("clientId", cookieOptions);
    res.clearCookie("realm", cookieOptions);
    res.clearCookie("user_id", cookieOptions);

    console.log("✅ Logout completed");

    return res.status(200).json({
      status: "Success",
      msg: "Logout successful",
    });
  } catch (error) {
    console.error("Logout Error:", error);

    return res.status(500).json({
      status: "Error",
      msg: "Logout failed",
      error: error.message,
    });
  }
};
// Helper query with userbranch JOIN
// const getUserQueryWithBranch = () => `
//   SELECT 
//     u.user_id, 
//     u.username, 
//     u.role, 
//     u.status, 
//     u.created_by, 
//     u.created_at, 
//     u.tenant_id
    
//   FROM user u
//   LEFT JOIN userbranch ub ON u.user_id = ub.user_id AND u.tenant_id = ub.tenant_id
// `;

exports.userDetails = async (tenant_id, branch_id, currentUserrole) => {
  let conn;

  try {
    conn = await pool.getConnection();

    // 🔐 Role validation
    if (!["ADMIN", "SUPERUSER", "DEV"].includes(currentUserrole)) {
      throw new AppError("Access denied: Insufficient privileges", 403);
    }

    // ✅ Base query with branch mapping
    const baseQuery = `
      SELECT 
        u.*, 
        GROUP_CONCAT(ub.branch_id) AS branch_ids
      FROM user u
      LEFT JOIN userbranch ub ON u.user_id = ub.user_id
    `;

    let query = "";
    let params = [];

    // 🧠 Role-based filtering
    if (currentUserrole === "SUPERUSER") {
      query = `
        ${baseQuery}
        WHERE u.tenant_id = ?
          AND u.role NOT IN ('SUPERUSER', 'DEV')
          AND u.status = 'A'
        GROUP BY u.user_id
        ORDER BY u.username
      `;
      params = [tenant_id];

      console.log("🔹 SUPERUSER query");
    } 
    else if (currentUserrole === "DEV") {
      query = `
        ${baseQuery}
        WHERE u.tenant_id = ?
          AND u.role <> 'DEV'
          AND u.status = 'A'
        GROUP BY u.user_id
        ORDER BY u.username
      `;
      params = [tenant_id];

      console.log("🔹 DEV query");
    } 
    else {
      // ADMIN / Branch scoped
      query = `
        ${baseQuery}
        WHERE u.tenant_id = ?
          AND (ub.branch_id = ? OR u.user_id = ?)
          AND u.status = 'A'
        GROUP BY u.user_id
        ORDER BY u.username
      `;
      params = [tenant_id, branch_id, branch_id];

      console.log("🔹 ADMIN / Branch-scoped query");
    }

    // 🚀 Execute query
    const rows = await conn.query(query, params);

    // 🔄 Convert branch_ids string → array
    const formattedRows = rows.map((row) => ({
      ...row,
      branch_ids: row.branch_ids
        ? row.branch_ids.split(",").map((id) => Number(id))
        : [],
    }));

    console.log(`✅ Returned ${formattedRows.length} active users`);

    return formattedRows;

  } catch (err) {
    console.error("❌ userDetails Error:", err.message, {
      tenant_id,
      branch_id,
      currentUserrole,
    });
    throw err;
  } finally {
    if (conn) conn.release();
  }
};

exports.userList = async (tenant_id, branch_id, currentUserrole) => {
  let conn;
  try {
    conn = await pool.getConnection();

    if (!["ADMIN", "SUPERUSER"].includes(currentUserrole)) {
      throw new AppError("Access denied: ADMIN privileges required", 403);
    }

    const rows = await conn.query(
      `SELECT 
         u.user_id, 
         u.username, 
         u.role, 
         u.status, 
         u.created_at
         
       FROM user u
       LEFT JOIN userbranch ub ON u.user_id = ub.user_id AND u.tenant_id = ub.tenant_id
       WHERE u.tenant_id = ? 
         AND (ub.branch_id = ? OR u.branch_id = ?)
       GROUP BY u.user_id
       ORDER BY u.username`,
      [tenant_id, branch_id, branch_id]
    );
    return rows;
  } catch (err) {
    console.error("❌ userList Error:", err);
    throw err;
  } finally {
    if (conn) conn.release();
  }
};

exports.getAllUserBranches = async (conn, tenant_id, user_id) => {
  const rows = await conn.query(
    `SELECT branch_id 
     FROM userbranch 
     WHERE tenant_id = ? AND user_id = ? AND is_active != 0`,
    [tenant_id, user_id]
  );
  return rows.map(r => r.branch_id);
};

/* ===============================
   Full User List (Dropdown)
=================================*/
exports.fullUserList = async (tenant_id, branch_id) => {
  try {
    const rows = await pool.query(
      `SELECT username 
       FROM user 
       WHERE tenant_id = ? AND branch_id = ? AND status = 'A'
       ORDER BY username`,
      [tenant_id, branch_id]
    );
    return rows;
  } catch (err) {
    console.error("❌ fullUserList Error:", err);
    throw new AppError("Failed to fetch user list", 500);
  }
};

/* ===============================
   Update User Access
=================================*/
exports.userAccess = async (
  Details,
  tenant_id,
  branch_id,
  currentUserrole
) => {
  let conn;
  try {
    conn = await pool.getConnection();

    if (!["ADMIN", "SUPERUSER"].includes(currentUserrole)) {
      throw new AppError("Access denied: ADMIN privileges required", 403);
    }

    const result = await conn.query(
      `UPDATE user 
       SET role = ?, status = ?, updated_at = NOW()
       WHERE username = ? AND tenant_id = ?`,
      [Details.role, Details.status, Details.username, tenant_id]
    );

    if (result.affectedRows === 0) throw new AppError("User not found", 404);

    return { success: true, message: "User access updated successfully" };
  } catch (err) {
    console.error("❌ userAccess Error:", err);
    throw err;
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   ADMIN password_hash Change
=================================*/
exports.adminPassChange = async (
  Details,
  tenant_id,
  branch_id,
  currentUserrole
) => {
  let conn;
  try {
    conn = await pool.getConnection();

    if (!["ADMIN", "SUPERUSER"].includes(currentUserrole)) {
      throw new AppError("Access denied: ADMIN privileges required", 403);
    }

    const hashedPassword = await bcrypt.hash(Details.password_hash, 10);

    const result = await conn.query(
      `UPDATE user 
       SET password_hash = ?, updated_at = NOW()
       WHERE username = ? AND tenant_id = ?`,
      [hashedPassword, Details.username, tenant_id]
    );

    if (result.affectedRows === 0) throw new AppError("User not found", 404);

    return { success: true, message: "password_hash changed successfully" };
  } catch (err) {
    console.error("❌ adminPassChange Error:", err);
    throw err;
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Create New User
=================================*/
exports.newUser = async (Details, tenant_id, branch_id, createdBy) => {
  let conn;
  try {
    conn = await pool.getConnection();

    // 🔐 Validate password exists
    if (!Details?.password_hash || typeof Details.password_hash !== 'string') {
      throw new AppError("password_hash is required", 400);
    }

    // 🔐 Optional: Enforce password strength
    if (Details.password_hash.length < 8) {
      throw new AppError("password_hash must be at least 8 characters", 400);
    }

    // Check for existing username (case-insensitive)
    const existing = await conn.query(
      `SELECT user_id FROM user WHERE LOWER(username) = LOWER(?) AND tenant_id = ?`,
      [Details.username, tenant_id]
    );

    if (existing.length > 0) throw new AppError("Username already exists", 409);

    // ✅ Now safe to hash
    const hashedPassword = await bcrypt.hash(Details.password_hash.trim(), 10);

    const result = await conn.query(
      `INSERT INTO user 
       (username, password_hash, role, status, created_by, created_at, tenant_id, branch_id) 
       VALUES (?, ?, ?, ?, ?, NOW(), ?, ?)`,
      [
        Details.username?.toUpperCase(),
        hashedPassword,
        Details.role,
        Details.status,
        createdBy,
        tenant_id,
        branch_id,
      ]
    );

    const userId = result.insertId;

    if (typeof createUserBranch === "function") {
      await createUserBranch(Details, tenant_id,branch_id, createdBy, userId);
    }

    return { success: true, message: "User created successfully", userId };
  } catch (err) {
    console.error("❌ newUser Error:", err);
    throw err;
  } finally {
    if (conn) conn.release();
  }
};

exports.addUser = async (details,tenant_id,branch_id,created_by, req) => {
  let conn,keycloakdata;

  console.log('addUser called with:', { details, tenant_id, branch_id, created_by });

  try {
    conn = await pool.getConnection();

    // 🔥 START TRANSACTION
    await conn.beginTransaction();

     keycloakdata = await createUser(req);
    console.log('keycloakdata:',keycloakdata)
    details.keycloak_id = keycloakdata.id;

    const safe = (val) => (val === undefined ? null : val);

    const sql = `
      INSERT INTO user 
      (tenant_id, first_name, last_name,dateofbirth, email, phone_number, role, status,
       password_hash, keycloak_id, username, user_photo, id_card_photo, 
       aadhaar_number, address, district, city, state, country, pincode,created_by)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `;

    const values = [
      safe(tenant_id),
      safe(details.first_name?.toUpperCase()),
      safe(details.last_name?.toUpperCase()),
      safe(details.dateofbirth),
      safe(details.email),
      safe(details.phone_number),
      safe(details.role),
      safe(details.status) || "A",
      safe(details.password_hash),
      safe(details.keycloak_id),
      safe(details.username),
      safe(details.user_photo),
      safe(details.id_card_photo),
      safe(details.aadhaar_number),
      safe(details.address),
      safe(details.district),
      safe(details.city),
      safe(details.state),
      safe(details.country),
      safe(details.pincode),
      safe(created_by)
    ];

    if (values.length !== 21) {
      throw new Error(
        `Value count mismatch: Expected 21, got ${values.length}`,
      );
    }

    // ✅ Insert User
    const result = await conn.query(sql, values);

    let branchIds = details.branch_ids;

    // ✅ Convert string "1,7" → [1,7]
    if (typeof branchIds === "string") {
      branchIds = branchIds.split(",").map((id) => Number(id.trim()));
    }

    console.log(branchIds);

    // ✅ Insert User-Branch Mapping
    if (result.insertId && branchIds?.length) {
      for (const bid of branchIds) {
        await conn.query(
          `INSERT INTO userbranch (tenant_id, branch_id, user_id, created_by)
           VALUES (?, ?, ?, ?)`,
          [details.tenant_id, bid, Number(result.insertId), details.created_by],
        );
      }
    }

    // 🔥 COMMIT if everything succeeds
    await conn.commit();

    return result;
  } catch (err) {
    // ❌ ROLLBACK if ANY error occurs
    if (conn) await conn.rollback();

    if (keycloakdata?.id) {
      const token = req.cookies.access_token;
      const realm = req.cookies.realm;

      await deleteKeycloakUser(token, realm, keycloakdata.id);
    }

    console.error("Transaction failed, rolled back:", err.message);
    throw err;
  } finally {
    if (conn) conn.release();
  }
};

/**
 * ============================================================================
 * UPDATE USER - With Keycloak Password Sync & Transaction Safety
 * ============================================================================
 */
exports.updateUser = async (details, tenant_id, branch_id, updated_by, req) => {
  let conn;
  let passwordChanged = false;

  console.log('updateUser called with:', { 
    user_id: details.user_id, 
    tenant_id, 
    updated_fields: Object.keys(details),
    password_provided: !!details.password_hash 
  });

  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // 🔍 Step 1: Fetch existing user
    const existingUser = await conn.query(
      `SELECT user_id, keycloak_id, username, password_hash, user_photo, id_card_photo, status 
       FROM user 
       WHERE user_id = ? AND tenant_id = ?`,
      [details.user_id, tenant_id]
    );

    if (!existingUser || existingUser.length === 0) {
      throw new AppError("User not found or unauthorized", 404);
    }

    const currentUser = existingUser[0];
    const safe = (val) => (val === undefined || val === "" ? null : val);

    // 🔐 Step 2: Password check
    if (details.password_hash && details.password_hash !== currentUser.password_hash) {
      passwordChanged = true;
      console.log('🔐 Password change detected for user:', currentUser.username);
    }

    // 🗂️ Step 3: File handling
    const user_photo = safe(details.user_photo) || currentUser.user_photo;
    const id_card_photo = safe(details.id_card_photo) || currentUser.id_card_photo;

    // 📝 Step 4: Dynamic update
    const updateFields = [];
    const updateValues = [];

    const fieldMap = {
      first_name: (v) => safe(v?.toUpperCase()),
      last_name: (v) => safe(v?.toUpperCase()),
      dateofbirth: (v) => safe(v),
      email: (v) => safe(v),
      phone_number: (v) => safe(v),
      role: (v) => safe(v),
      status: (v) => safe(v) || "A",
      password_hash: (v) => safe(v),
      username: (v) => safe(v),
      user_photo: () => user_photo,
      id_card_photo: () => id_card_photo,
      aadhaar_number: (v) => safe(v),
      address: (v) => safe(v),
      district: (v) => safe(v),
      city: (v) => safe(v),
      state: (v) => safe(v),
      country: (v) => safe(v),
      pincode: (v) => safe(v),
      updated_by: () => safe(updated_by),
    };

    for (const [key, transformer] of Object.entries(fieldMap)) {
      if (details[key] !== undefined) {
        if (key === 'password_hash' && !passwordChanged) continue;

        updateFields.push(`${key} = ?`);
        updateValues.push(transformer(details[key]));
      }
    }

    updateFields.push(`updated_at = NOW()`);

    if (updateFields.length === 0) {
      await conn.rollback();
      return { affectedRows: 0, message: "No changes detected" };
    }

    updateValues.push(details.user_id, tenant_id);

    const updateSql = `
      UPDATE user 
      SET ${updateFields.join(', ')} 
      WHERE user_id = ? AND tenant_id = ?
    `;

    const updateResult = await conn.query(updateSql, updateValues);

    if (updateResult.affectedRows === 0) {
      throw new AppError("Failed to update user", 500);
    }

    // =====================================================
    // 🔥 FIXED STEP 5 (Branch Mapping - MariaDB Safe)
    // =====================================================
    let branchIds = details.branch_ids;

    if (typeof branchIds === "string") {
      branchIds = branchIds
        .split(",")
        .map((id) => Number(id.trim()))
        .filter((id) => !isNaN(id));
    }

    // Remove duplicates
    if (Array.isArray(branchIds)) {
      branchIds = [...new Set(branchIds)];
    }

    // Delete old
    await conn.query(
      `DELETE FROM userbranch WHERE user_id = ?`,
      [details.user_id]
    );

    // Insert new (FIXED)
    if (Array.isArray(branchIds) && branchIds.length > 0) {
      const values = [];
      const placeholders = [];

      for (const bid of branchIds) {
        placeholders.push("(?, ?, ?, ?)");
        values.push(
          tenant_id,
          Number(bid),
          details.user_id,
          safe(updated_by)
        );
      }

      const insertSql = `
        INSERT INTO userbranch (tenant_id, branch_id, user_id, created_by)
        VALUES ${placeholders.join(", ")}
      `;

      await conn.query(insertSql, values);
    }

    // 🔐 Step 6: Keycloak sync
    if (passwordChanged && currentUser.keycloak_id) {
      try {
        const adminToken = req.cookies?.access_token || req.headers?.authorization?.replace('Bearer ', '');
        const realm = req.cookies?.realm || process.env.KEYCLOAK_REALM;

        if (!adminToken || !realm) {
          throw new Error("Missing Keycloak credentials");
        }

        await setUserPassword(adminToken, realm, currentUser.username, details.password_hash);

      } catch (kcErr) {
        throw new AppError(`Keycloak sync failed: ${kcErr.message}`, 502);
      }
    }

    // ✅ Commit
    await conn.commit();

    return {
      affectedRows: updateResult.affectedRows,
      user_id: details.user_id,
      message: "User updated successfully",
      password_changed: passwordChanged,
    };

  } catch (err) {
    if (conn) {
      await conn.rollback();
      console.log('🔄 Transaction rolled back:', err.message);
    }

    console.error("❌ updateUser failed:", err.message);
    throw err;

  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Delete User (Soft Delete)
=================================*/
exports.deleteUser = async (
  targetUserId,
  tenant_id,
  branch_id,
  currentUserrole,
  token,realm
) => {
  let conn;
  try {
    conn = await pool.getConnection();

    if (!["ADMIN", "SUPERUSER"].includes(currentUserrole)) {
      throw new AppError("Access denied: ADMIN privileges required", 403);
    }

    // Verify user exists in tenant
    const existing = await conn.query(
      `SELECT user_id,username FROM user WHERE user_id = ? AND tenant_id = ?`,
      [targetUserId, tenant_id]
    );

    if (existing.length === 0) throw new AppError("User not found", 404);

    const keycloakdata=await getUserId(token, realm, existing[0].username);

    const result = await conn.query(
      `UPDATE user SET status = 'IA', updated_at = NOW() 
       WHERE user_id = ? AND tenant_id = ?`,
      [targetUserId, tenant_id]
    );

    if (result.affectedRows === 0)
      throw new AppError("Failed to deactivate user", 500);

    await deleteKeycloakUser(token, realm, keycloakdata.id)

    return { success: true, message: "User deactivated successfully" };
  } catch (err) {
    console.error("❌ deleteUser Error:", err);
    throw err;
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Switch Branch (Token Refresh)
=================================*/
exports.switchBranch = async (tenant_id, branch_id, currentUser) => {
  let conn;
  try {
    // Optional: Verify branch belongs to tenant & is active
    conn = await pool.getConnection();
    const branches = await conn.query(
      `SELECT branch_id FROM branch 
       WHERE branch_id = ? AND tenant_id = ? AND is_active = 1`,
      [branch_id, tenant_id]
    );

    if (branch_id && branches.length === 0) {
      throw new AppError("Invalid or inactive branch", 400);
    }

    if (currentUser.role !== "SUPERUSER") {
      throw new AppError("Access denied: SUPERUSER privileges required", 403);
    }

    const newToken = jwt.sign(
      {
        user_id: currentUser.user_id,
        username: currentUser.username,
        tenant_id,
        branch_id: branch_id || null,
        role: currentUser.role,
      },
      process.env.JWT_KEY,
      { expiresIn: "4h" }
    );

    return newToken;
  } catch (err) {
    console.error("❌ switchBranch Error:", err);
    throw err;
  } finally {
    if (conn) conn.release();
  }
};

exports.updateUserPassword = async (password, username) => {
  let conn;
  try {
    conn = await pool.getConnection();

    const result = await conn.query(
      `UPDATE user SET 
          password_hash=?
       WHERE username=?`,
      [password, username],
    );

    if (result.affectedRows === 0) throw new AppError("Query error", 500);

    return result.affectedRows;
  } catch (err) {
    throw err;
  } finally {
    if (conn) conn.release();
  }
};
