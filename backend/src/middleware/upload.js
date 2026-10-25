import multer from "multer";

const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  if (!file.mimetype.startsWith("image/")) {
    return cb(new Error("Seules les images sont acceptées"));
  }
  cb(null, true);
}

export const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
