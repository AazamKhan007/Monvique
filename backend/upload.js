const fs = require("fs");
const multer = require("multer");
const path = require("node:path");

const uploadsPath = path.join(__dirname, "..", "public", "uploads");
const isVercel = process.env.VERCEL === "1";

if (!isVercel && !fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsPath);
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
    cb(null, uniqueName);
  },
});

const memoryStorage = multer.memoryStorage();

const upload = multer({
  storage: isVercel ? memoryStorage : diskStorage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

module.exports = {
  upload,
};
