const { pool } = require("../config/db");
const { deleteFile } = require("../utils/UploadFile");

/* ===============================
   Create Project
=================================*/
exports.createProject = async (data, tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();

    const query = `
      INSERT INTO project_list 
      (tenant_id, branch_id,
       Project_name, Project_type, Project_cost, Margin,
       Project_Estimation_Cost, Project_start_date,
       Estimated_end_date, Site_location,
       Project_status, Contractor, Site_supervisor,
       Photo, Created_by, CREATED_DATETIME)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const result = await conn.query(query, [
      tenant_id,
      branch_id,
      data.Project_name,
      data.Project_type,
      data.Project_cost,
      data.Margin,
      data.Project_Estimation_Cost,
      data.Project_start_date,
      data.Estimated_end_date,
      data.Site_location,
      data.ProjectStatus,
      data.Contractor,
      data.Site_supervisor,
      data.Photo || null,
      data.Username,
    ]);

    return result;
  } catch (error) {
    console.error("❌ createProject Error:", error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Update Project
=================================*/
exports.updateProject = async (data, tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();

    const result = await conn.query(
      `UPDATE project_list 
       SET Project_name=?, Project_type=?, Project_cost=?, Margin=?,
           Project_Estimation_Cost=?, Project_start_date=?,
           Estimated_end_date=?, Site_location=?, Contractor=?,
           Site_supervisor=?, Photo=?, Project_status=?
       WHERE Project_id=? AND tenant_id=? AND branch_id=?`,
      [
        data.Project_name,
        data.Project_type,
        data.Project_cost,
        data.Margin,
        data.Project_Estimation_Cost,
        data.Project_start_date,
        data.Estimated_end_date,
        data.Site_location,
        data.Contractor,
        data.Site_supervisor,
        data.Photo,
        data.Project_status,
        data.Project_id,
        tenant_id,
        branch_id,
      ]
    );

    return result;
  } catch (error) {
    console.error("❌ updateProject Error:", error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Get Project List
=================================*/
exports.getProjectList = async (tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();

    const rows = await conn.query(
      `
      SELECT Project_name, Project_id, Photo,
             Project_Estimation_Cost, Project_status
      FROM project_list
      WHERE tenant_id = ? AND branch_id = ?
      ORDER BY Project_id DESC
    `,
      [tenant_id, branch_id]
    );

    return rows;
  } catch (error) {
    console.error("❌ getProjectList Error:", error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Project Total Cost
=================================*/
exports.getProjectTotalCost = async (tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();

    const rows = await conn.query(
      `
      SELECT IFNULL(SUM(amount),0) as TotalAmount 
      FROM payment_details 
      WHERE tenant_id = ? AND branch_id = ?
      AND project_id NOT IN (
        SELECT project_id FROM project_list 
        WHERE project_status='Completed' AND tenant_id = ? AND branch_id = ?
      )
    `,
      [tenant_id, branch_id, tenant_id, branch_id]
    );

    return rows[0];
  } catch (error) {
    console.error("❌ getProjectTotalCost Error:", error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Project Spended (Optimized)
=================================*/
exports.getProjectSpended = async (tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();

    const rows = await conn.query(
      `
      SELECT 
        (SELECT IFNULL(SUM(lwd.paid),0) 
         FROM labour_worked_details lwd
         INNER JOIN project_list p ON lwd.Project_id = p.Project_id
         WHERE p.tenant_id = ? AND p.branch_id = ?
         AND p.project_status != 'Completed'
        ) AS Labour,
        (SELECT IFNULL(SUM(od.paid),0) 
         FROM order_details od
         INNER JOIN project_list p ON od.Project_id = p.Project_id
         WHERE p.tenant_id = ? AND p.branch_id = ?
         AND p.project_status != 'Completed'
        ) AS Orders
    `,
      [tenant_id, branch_id, tenant_id, branch_id]
    );

    return {
      AmountSpended: Number(rows[0].Labour) + Number(rows[0].Orders),
    };
  } catch (error) {
    console.error("❌ getProjectSpended Error:", error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Individual Project Spended (Optimized)
=================================*/
exports.getIndividualProjectSpended = async (tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();

    const rows = await conn.query(
      `
      SELECT 
        p.Project_id,
        IFNULL(l.Labour,0) as Labour_Spended,
        IFNULL(o.Orders,0) as Material_Spended,
        (IFNULL(l.Labour,0) + IFNULL(o.Orders,0)) as AmountSpended
      FROM project_list p
      LEFT JOIN (
          SELECT Project_id, SUM(Paid) as Labour
          FROM labour_worked_details
          GROUP BY Project_id
      ) l ON p.Project_id = l.Project_id
      LEFT JOIN (
          SELECT Project_id, SUM(Paid) as Orders
          FROM order_details
          GROUP BY Project_id
      ) o ON p.Project_id = o.Project_id
      WHERE p.tenant_id = ? AND p.branch_id = ?
    `,
      [tenant_id, branch_id]
    );

    return rows;
  } catch (error) {
    console.error("❌ getIndividualProjectSpended Error:", error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Individual Project Total (Optimized)
=================================*/
exports.getIndividualProjectTotal = async (tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();

    const rows = await conn.query(
      `
      SELECT 
        p.Project_id,
        IFNULL(SUM(pd.Amount),0) as Amount
      FROM project_list p
      LEFT JOIN payment_details pd 
        ON p.Project_id = pd.Project_id AND pd.tenant_id = ? AND pd.branch_id = ?
      WHERE p.tenant_id = ? AND p.branch_id = ?
      GROUP BY p.Project_id
    `,
      [tenant_id, branch_id, tenant_id, branch_id]
    );

    return rows;
  } catch (error) {
    console.error("❌ getIndividualProjectTotal Error:", error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Get Project By ID
=================================*/
exports.getProjectById = async (id, tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();

    const rows = await conn.query(
      `SELECT * FROM project_list 
       WHERE Project_id = ? AND tenant_id = ? AND branch_id = ?`,
      [id, tenant_id, branch_id]
    );

    return rows[0];
  } catch (error) {
    console.error("❌ getProjectById Error:", error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Delete Project Payment
=================================*/
exports.deleteProjectPayment = async (paymentId, tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();

    const result = await conn.query(
      `DELETE FROM payment_details 
       WHERE Payment_id = ? AND tenant_id = ? AND branch_id = ?`,
      [paymentId, tenant_id, branch_id]
    );

    return result;
  } catch (error) {
    console.error("❌ deleteProjectPayment Error:", error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Project Details Service (Insert)
=================================*/
exports.projectDetailsService = async (details, tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();

    const convert = (str) => {
      if (!str) return null;
      const date = new Date(str);
      const mnth = ("0" + (date.getMonth() + 1)).slice(-2);
      const day = ("0" + date.getDate()).slice(-2);
      return [date.getFullYear(), mnth, day].join("-");
    };

    const {
      Project_name,
      Project_type,
      Project_cost,
      Margin,
      Project_Estimation_Cost,
      Project_start_date,
      Estimated_end_date,
      ProjectStatus,
      Site_location,
      Contractor,
      Site_supervisor,
      Username,
      photo,
    } = details;

    await conn.query(
      `INSERT INTO project_list 
       (tenant_id, branch_id, Project_name, Project_type, Project_cost, Margin, 
        Project_Estimation_Cost, Project_start_date, Estimated_end_date, 
        Site_location, Project_Status, Contractor, Site_supervisor, 
        Photo, Created_by, CREATED_DATETIME) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        tenant_id,
        branch_id,
        Project_name,
        Project_type,
        Project_cost,
        Margin,
        Project_Estimation_Cost,
        Project_start_date,
        Estimated_end_date,
        Site_location,
        ProjectStatus,
        Contractor,
        Site_supervisor,
        photo,
        Username,
      ]
    );

    console.log("✅ Data inserted successfully");
    return "Data inserted successfully";
  } catch (error) {
    console.error("❌ projectDetailsService Error:", error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Project List (Legacy)
=================================*/
exports.projectList = async (tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();
    console.log(tenant_id, branch_id);

    const rows = await conn.query(
      "SELECT Project_name, Project_id, Photo, Project_Estimation_Cost, Project_status FROM project_list WHERE tenant_id = ? AND branch_id = ? ORDER BY Project_id DESC",
      [tenant_id, branch_id]
    );

    return rows;
  } catch (err) {
    console.error("❌ projectList Error:", err);
    throw err;
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Project Total Cost (Legacy)
=================================*/
exports.ProjectTotalCost = async (tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();

    const rows = await conn.query(
      "SELECT IFNULL(SUM(amount),0) as TotalAmount FROM payment_details WHERE tenant_id = ? AND branch_id = ? AND project_id NOT IN (SELECT project_id FROM project_list WHERE project_status='Completed' AND tenant_id = ? AND branch_id = ?)",
      [tenant_id, branch_id, tenant_id, branch_id]
    );

    return rows[0];
  } catch (err) {
    console.error("❌ ProjectTotalCost Error:", err);
    throw err;
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Project Spended (Legacy)
=================================*/
exports.ProjectSpended = async (tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();

    const row2 = await conn.query(
      "SELECT IFNULL(SUM(lwd.paid),0) as Labour FROM labour_worked_details lwd INNER JOIN project_list p ON lwd.Project_id = p.Project_id WHERE p.tenant_id = ? AND p.branch_id = ? AND p.project_status != 'Completed'",
      [tenant_id, branch_id]
    );

    const row3 = await conn.query(
      "SELECT IFNULL(SUM(od.paid),0) as Orders FROM order_details od INNER JOIN project_list p ON od.Project_id = p.Project_id WHERE p.tenant_id = ? AND p.branch_id = ? AND p.project_status != 'Completed'",
      [tenant_id, branch_id]
    );

    const AmountSpended = Number(row2[0].Labour) + Number(row3[0].Orders);
    return AmountSpended;
  } catch (err) {
    console.error("❌ ProjectSpended Error:", err);
    throw err;
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Individual Project Spended (Legacy)
=================================*/
exports.IndividualProjectSpended = async (tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();

    const row = await conn.query(
      "SELECT Project_id FROM project_list WHERE tenant_id = ? AND branch_id = ?",
      [tenant_id, branch_id]
    );

    const lists = [];
    const promises = row.map(async (items) => {
      const row3= await conn.query(
        "SELECT IFNULL(SUM(Amount),0) as Orders FROM payment_details WHERE Project_id = ? AND tenant_id = ? AND branch_id = ?",
        [items.Project_id, tenant_id, branch_id]
      );
      const Amount = Number(row3[0].Orders || 0);
      lists.push({ Project_id: items.Project_id, Amount });
    });

    await Promise.all(promises);
    return lists;
  } catch (err) {
    console.error("❌ IndividualProjectSpended Error:", err);
    throw err;
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Individual Project Total (Legacy)
=================================*/
exports.IndividualProjectTotal = async (tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();

    const row = await conn.query(
      "SELECT Project_id FROM project_list WHERE tenant_id = ? AND branch_id = ?",
      [tenant_id, branch_id]
    );

    const lists = [];
    const promises = row.map(async (items) => {
      const row3 = await conn.query(
        "SELECT IFNULL(SUM(Amount),0) as Orders FROM payment_details WHERE Project_id = ? AND tenant_id = ? AND branch_id = ?",
        [items.Project_id, tenant_id, branch_id]
      );
      const Amount = Number(row3[0].Orders || 0);
      lists.push({ Project_id: items.Project_id, Amount });
    });

    await Promise.all(promises);
    return lists;
  } catch (err) {
    console.error("❌ IndividualProjectTotal Error:", err);
    throw err;
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Fetch Project Edit
=================================*/
exports.FetchProjectEdit = async (details, tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();

    const Project = await conn.query(
      "SELECT * FROM project_list WHERE Project_id = ? AND tenant_id = ? AND branch_id = ?",
      [details.pro_id, tenant_id, branch_id]
    );

    return Project[0];
  } catch (err) {
    console.error("❌ FetchProjectEdit Error:", err);
    throw err;
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Edit Project Details
=================================*/
exports.EditProject_Details = async (details, tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();

    const {
      Project_name,
      Project_type,
      Project_cost,
      Project_start_date,
      Margin,
      Project_Estimation_Cost,
      Estimated_end_date,
      Site_location,
      Contractor,
      photo,
      Project_status,
      Site_supervisor,
      Project_id,
    } = details;

    // 📌 Get Existing Photo (with tenant/branch filter)
    const rows = await conn.query(
      "SELECT Photo FROM project_list WHERE Project_id = ? AND tenant_id = ? AND branch_id = ?",
      [Project_id, tenant_id, branch_id]
    );

    if (!rows || rows.length === 0) {
      throw new Error("Project not found or access denied");
    }

    const oldPhoto = rows.Photo || null;

    // 🗑 Delete old photo if changed
    if (oldPhoto && photo && oldPhoto !== photo) {
      await deleteFile(oldPhoto);
    }

    // 📅 Convert Dates
    const convert = (str) => {
      if (!str) return null;
      const date = new Date(str);
      const mnth = ("0" + (date.getMonth() + 1)).slice(-2);
      const day = ("0" + date.getDate()).slice(-2);
      return [date.getFullYear(), mnth, day].join("-");
    };

    const Startdate = convert(Project_start_date);
    const Enddate = convert(Estimated_end_date);

    // 💾 Update DB
    const result = await conn.query(
      `UPDATE project_list SET 
        Project_name = ?, Project_type = ?, Project_cost = ?, Margin = ?, 
        Project_Estimation_Cost = ?, Project_start_date = ?, 
        Estimated_end_date = ?, Site_location = ?, Contractor = ?, 
        Site_supervisor = ?, Photo = ?, Project_status = ? 
      WHERE Project_id = ? AND tenant_id = ? AND branch_id = ?`,
      [
        Project_name,
        Project_type,
        Project_cost,
        Margin,
        Project_Estimation_Cost,
        Startdate,
        Enddate,
        Site_location,
        Contractor,
        Site_supervisor,
        photo,
        Project_status,
        Project_id,
        tenant_id,
        branch_id,
      ]
    );

    return "Data Updated successfully";
  } catch (error) {
    console.error("❌ EditProject_Details Error:", error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
};
