require("dotenv").config();
const app = require("./app");

const PORT = process.env.PORT || 5000;

const { pool } = require("./config/db");

(async () => {
  try {
    const conn = await pool.getConnection();
    console.log("✅ Database Connected");
    conn.release();
  } catch (err) {
    console.error("❌ Database Connection Failed:", err);
  }
})();

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
