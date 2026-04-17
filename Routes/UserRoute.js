const express = require("express");
const router = express.Router();
const userController = require("../Controller/UserController");
const { asyncHandler } = require("../utils/Async"); // ✅ Use imported asyncHandler only
const authMiddleware = require("../Middleware/AuthMiddleware");
const { validateIds } = require("../Middleware/ContextMiddleware");
const ssoAuth = require("../Keycloak/SSOAuth");
const { validateRequest } = require("../Middleware/ValidationMiddleware");
const { pool } = require("../config/db");
const { default: axios } = require("axios");
const { dynamicUpload } = require("../utils/UploadFile");

// Authentication
router.post(
  "/Login",
  validateRequest("login"),
  asyncHandler(userController.login),
);
router.get(
  "/logout",
  ssoAuth.validateToken,
  asyncHandler(userController.logout),
);

// User Management
router.get(
  "/UserDetails",
  ssoAuth.validateToken,
  asyncHandler(userController.userDetails),
);
router.get(
  "/UserList",
  ssoAuth.validateToken,
  asyncHandler(userController.userList),
);
router.get(
  "/FullUserList",
  ssoAuth.validateToken,
  asyncHandler(userController.fullUserList),
);

router.put(
  "/UserAccess",
  ssoAuth.validateToken,
  validateRequest("userAccess"),
  asyncHandler(userController.userAccess),
);
router.put(
  "/AdminPassChange",
  ssoAuth.validateToken,
  asyncHandler(userController.adminPassChange),
);

router.post(
  "/NewUser",
  ssoAuth.validateToken,
  validateRequest("createUser"),
  asyncHandler(userController.newUser),
);
router.post(
  "/addUser",
  ssoAuth.validateToken,
  validateRequest("createUser"),
  dynamicUpload({
    folder: "User",
    fields: [
      { name: "user_photo", type: "photo", maxCount: 10 },
      { name: "id_card_photo", type: "photo", maxCount: 10 },
    ],
  }),
  asyncHandler(userController.addUser),
);
router.post(
  "/addUser",
  ssoAuth.validateToken,
  validateRequest("createUser"),
  dynamicUpload({
    folder: "User",
    fields: [
      { name: "user_photo", type: "photo", maxCount: 10 },
      { name: "id_card_photo", type: "photo", maxCount: 10 },
    ],
  }),
  asyncHandler(userController.addUser),
);
router.put(
  "/updateUser/:user_id",
  ssoAuth.validateToken,
  // validateRequest("createUser"),
  dynamicUpload({
    folder: "User",
    fields: [
      { name: "user_photo", type: "photo", maxCount: 10 },
      { name: "id_card_photo", type: "photo", maxCount: 10 },
    ],
  }),
  asyncHandler(userController.updateUser),
);
router.post(
  "/SwitchBranch",
  ssoAuth.validateToken,
  asyncHandler(userController.switchBranch),
); // ✅ Added missing route

router.delete(
  "/:user_id",
  ssoAuth.validateToken,
  validateIds,
  asyncHandler(userController.deleteUser),
);

router.post("/check-username", async (req, res) => {
  const { username } = req.body;

  const realm = req.cookies.realm; // ⬅️ realm from cookie
  const token = req.cookies.access_token; // ⬅️ token from cookie

  if (!username) return res.status(400).json({ message: "username required" });

  if (!realm || !token)
    return res.status(401).json({ message: "Missing auth cookies" });

  // const uname = username.toLowerCase().trim();
  const uname = username.trim();

  // --------------------------
  // 1) Keycloak check
  // --------------------------
  let existsInKC = false;
  try {
    const kcUrl = `${process.env.KEYCLOAK_BASE_URL}/admin/realms/${realm}/users`;

    const kcRes = await axios.get(kcUrl, {
      params: { username: uname },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    existsInKC = kcRes.data.length > 0;
  } catch (err) {
    console.log("KC error:", err.response?.data || err.message);
  }

  // --------------------------
  // 2) DB check
  // --------------------------
  let existsInDB = false,
    conn;

  try {
    conn = await pool.getConnection();

    const rows = await conn.query(
      `SELECT user_id FROM user WHERE username = ? LIMIT 1`,
      [uname],
    );

    // console.log("rows:", rows, uname);

    conn.release();

    existsInDB = rows && rows.length > 0;
  } catch (err) {
    console.log("DB error:", err);
  } finally {
    conn.release();
  }

  // --------------------------
  // Final response
  // --------------------------
  res.json({
    existsInKC,
    existsInDB,
    existsAnywhere: existsInKC || existsInDB,
  });
});

module.exports = router;
