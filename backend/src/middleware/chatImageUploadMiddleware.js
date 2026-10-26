const fs = require("node:fs");
const path = require("node:path");
const multer = require("multer");
const crypto = require("node:crypto");
const sharp = require("sharp");

const uploadPath = path.join(__dirname, "../../private-chat-uploads");
const imageExtensions = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};
const imageFormats = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const MAX_IMAGE_WIDTH = 4096;
const MAX_IMAGE_HEIGHT = 4096;
const MAX_TOTAL_IMAGE_PIXELS = 16_777_216;

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadPath),
  filename: (_req, file, callback) => {
    callback(
      null,
      `${Date.now()}-${crypto.randomUUID()}${imageExtensions[file.mimetype]}`,
    );
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, callback) => {
    if (!Object.hasOwn(imageExtensions, file.mimetype)) {
      return callback(
        new Error("Only JPEG, PNG, WebP, and GIF images are allowed"),
      );
    }

    return callback(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
});

const removeUploadedFile = async (filePath) => {
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Could not remove rejected chat image:", error);
    }
  }
};

const validateChatImageContent = async (req, res, next) => {
  if (!req.file) return next();

  try {
    const image = sharp(req.file.path, {
      animated: true,
      limitInputPixels: MAX_TOTAL_IMAGE_PIXELS,
    });
    const metadata = await image.metadata();
    const width = metadata.width;
    const height = metadata.pageHeight || metadata.height;
    const pages = metadata.pages || 1;
    const totalPixels = width * height * pages;

    if (
      metadata.format !== imageFormats[req.file.mimetype] ||
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      width <= 0 ||
      height <= 0 ||
      width > MAX_IMAGE_WIDTH ||
      height > MAX_IMAGE_HEIGHT ||
      !Number.isInteger(pages) ||
      pages <= 0 ||
      totalPixels > MAX_TOTAL_IMAGE_PIXELS
    ) {
      await removeUploadedFile(req.file.path);
      return res.status(400).json({
        message: "Image must be a valid JPEG, PNG, WebP, or GIF under the dimension limits",
      });
    }

    await sharp(req.file.path, {
      animated: true,
      limitInputPixels: MAX_TOTAL_IMAGE_PIXELS,
    })
      .resize({ width: 1, height: 1, fit: "inside" })
      .raw()
      .toBuffer();

    return next();
  } catch (error) {
    await removeUploadedFile(req.file.path);

    if (["ENOENT", "EACCES", "EPERM"].includes(error.code)) {
      console.error("Could not read chat image upload:", error);
      return res.status(500).json({
        message: "Unable to validate uploaded image",
      });
    }

    return res.status(400).json({
      message: "The uploaded file is not a valid supported image",
    });
  }
};

module.exports = { upload, validateChatImageContent };
