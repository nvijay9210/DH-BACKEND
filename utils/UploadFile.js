const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { compressImage } = require("../Logics/ImageCompress");
const { PDFDocument } = require("pdf-lib");
const { relativePath } = require("../Logics/RelativePath");
const { AppError } = require("../Logics/AppError");

// ==============================
// 📌 CONFIG
// ==============================
const MAX_FILE_SIZE =
  (process.env.MAX_FILE_SIZE || 10) * 1024 * 1024;

const UPLOAD_BASE_PATH =
  process.env.UPLOAD_BASE_PATH ||
  "D:/BRIGHTON/Goldloan/Backend/Uploads";

// ==============================
// 📌 MEMORY STORAGE
// ==============================
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE }
});

// ==============================
// 📌 HELPER: Ensure Folder
// ==============================
const ensureFolder = (folder) => {
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }
};

// ==============================
// 📌 HELPER: Compress PDF
// ==============================
async function compressPDF(buffer) {
  try {
    const pdfDoc = await PDFDocument.load(buffer);
    return await pdfDoc.save({
      useObjectStreams: true,
      compress: true
    });
  } catch {
    return buffer;
  }
}

// ==============================
// 📌 CORE FILE PROCESSOR
// ==============================
const processFile = async (file, folderPath, type) => {
  let finalBuffer = file.buffer;

  // Image Compression
  if (type === "image" && file.mimetype.startsWith("image")) {
    finalBuffer = await compressImage(file.buffer, 80);
  }

  // PDF Compression
  if (file.mimetype === "application/pdf") {
    finalBuffer = await compressPDF(file.buffer);
  }

  ensureFolder(folderPath);

  const fileName =
    Date.now() +
    "_" +
    Math.round(Math.random() * 1e6) +
    path.extname(file.originalname);

  const fullPath = path.join(folderPath, fileName);

  fs.writeFileSync(fullPath, finalBuffer);

  return await relativePath(fullPath);
};

// ==============================
// 🚀 DYNAMIC MIDDLEWARE FACTORY
// ==============================
const dynamicUpload = ({ folder, fields }) => {
  return [
    memoryUpload.fields(fields),

    async (req, res, next) => {
      try {
        if (!req.files) return next();

        const tenantId = req.body.tenant_id;
        if (!tenantId) {
          return next(new AppError("tenant_id required", 400));
        }

        const tenantBasePath = path.join(
          UPLOAD_BASE_PATH,
          `tenant_${tenantId}`,
          folder
        );

        const uploadedFiles = {};

        for (const fieldConfig of fields) {
          const fieldName = fieldConfig.name;
          const type = fieldConfig.type || "file";

          const files = req.files[fieldName];

          if (!files) continue;

          uploadedFiles[fieldName] = [];

          for (const file of files) {
            const savedPath = await processFile(
              file,
              tenantBasePath,
              type
            );

            uploadedFiles[fieldName].push(savedPath);
          }
        }

        // Attach result to body
        for (const key in uploadedFiles) {
          if (uploadedFiles[key].length === 1) {
            req.body[key] = uploadedFiles[key][0]; // single
          } else {
            req.body[key] = uploadedFiles[key]; // multiple
          }
        }

        next();
      } catch (error) {
        next(error);
      }
    }
  ];
};

// ==============================
// 🗑 DELETE FILE FUNCTION
// ==============================
const deleteFile = async (filePath) => {
  try {
    if (!filePath) return;

    const fullPath = path.join(UPLOAD_BASE_PATH, filePath);

    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
      console.log("File deleted:", fullPath);
    } else {
      console.log("File not found, skip delete:", fullPath);
    }
  } catch (error) {
    console.error("Delete file error:", error.message);
  }
};


module.exports = { dynamicUpload,deleteFile };
