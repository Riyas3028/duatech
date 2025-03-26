// const multer = require("multer");
// const fs = require("fs");
// const path = require("path");

// // Ensure 'uploads/' directory exists
// const uploadDir = path.join(__dirname, "../public/uploads/re-image");
// if (!fs.existsSync(uploadDir)) {
//   fs.mkdirSync(uploadDir, { recursive: true });
// }

// // Configure storage
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, uploadDir); // Use the created uploads directory
//   },
//   filename: function (req, file, cb) {
//     cb(null, file.fieldname + "-" + Date.now() + path.extname(file.originalname));
//   },
// });

// // File filter to allow only images
// const fileFilter = (req, file, cb) => {
//   if (file.mimetype.startsWith("image/")) {
//     cb(null, true);
//   } else {
//     cb(new Error("Only images are allowed!"), false);
//   }
// };

// // Setup Multer
// const upload = multer({
//   storage: storage,
//   fileFilter: fileFilter,
//   limits: { fileSize: 2 * 1024 * 1024 }, // 2MB file size limit
// });

// // Middleware for single and multiple uploads
// const uploadSingle = upload.single("image");
// const uploadMultiple = upload.array("productImages", 5);

// module.exports = { uploadSingle, uploadMultiple };

