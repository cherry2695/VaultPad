const multer = require('multer');
const path = require('path');
const { getFileSizeLimit, isValidFileType, generateStoredName } = require('../utils/fileUtils');

const createUploader = (category) => {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, generateStoredName(ext));
    },
  });

  const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (isValidFileType(file.mimetype, ext, category)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type for category ${category}`));
    }
  };

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: getFileSizeLimit(category),
    },
  });
};

const uploaders = {
  images: createUploader('images'),
  videos: createUploader('videos'),
  pdf: createUploader('pdf'),
  excel: createUploader('excel'),
  word: createUploader('word'),
  audio: createUploader('audio'),
};

const getUploaderForCategory = (category) => {
  return uploaders[category] || uploaders.images; // fallback
};

module.exports = { uploaders, getUploaderForCategory };
