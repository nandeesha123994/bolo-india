const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadPath = path.join(__dirname, "../../uploads");

// Create uploads folder if it doesn't exist
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);

    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else if (
    ["video/mp4", "video/webm", "video/quicktime"].includes(file.mimetype)
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only image, MP4, WebM, and MOV files are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB for images and videos
  },
});

module.exports = upload;
