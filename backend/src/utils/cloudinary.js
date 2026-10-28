import { v2 as cloudinary } from "cloudinary";

function configure() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export function uploadImageBuffer(buffer) {
  configure();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder: "crm-contacts" }, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
    stream.end(buffer);
  });
}

// Deletes the Cloudinary asset behind a contact's photoUrl, e.g.
// ".../upload/v169.../crm-contacts/abc123.jpg" -> public_id "crm-contacts/abc123".
// Best-effort: logs and swallows failures rather than blocking the Mongo
// deletion that always calls this (a dangling Cloudinary asset is preferable
// to a contact/account that fails to delete because of it).
export function deleteImageByUrl(url) {
  const afterUpload = url?.split("/upload/")[1];
  if (!afterUpload) return Promise.resolve();
  const publicId = afterUpload.replace(/^v\d+\//, "").replace(/\.[a-zA-Z0-9]+$/, "");
  configure();
  return cloudinary.uploader.destroy(publicId).catch((err) => {
    console.error("Cloudinary delete failed:", err.message);
  });
}
