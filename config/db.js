require("dotenv").config();
const mariadb = require("mariadb");


const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  connectionLimit: 10,
  acquireTimeout: 20000
});

module.exports = { pool };
