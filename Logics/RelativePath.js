require("dotenv").config();
const path = require("path");

const UPLOAD_BASE_PATH =
  process.env.UPLOAD_BASE_PATH ||
  "D:/BRIGHTON/DREAM HOUSE/UPLOADS";

const relativePath = (absolutePath) => {
  return path
    .relative(UPLOAD_BASE_PATH, absolutePath)
    .replace(/\\/g, "/");
};

module.exports = { relativePath };
