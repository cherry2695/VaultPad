const { v4: uuidv4 } = require('uuid');

const generateStoredName = (extension) => `${uuidv4()}${extension}`;

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileSizeLimit = (category) => {
  const limits = {
    images: 10485760, // 10MB
    pdf: 20971520, // 20MB
    word: 20971520, // 20MB
    excel: 20971520, // 20MB
    audio: 52428800, // 50MB
    videos: 104857600, // 100MB
    notes: 5242880, // 5MB
  };
  return limits[category] || 5242880;
};

const getAllowedMimeTypes = (category) => {
  const mimes = {
    images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    videos: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo'],
    pdf: ['application/pdf'],
    word: ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    excel: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'],
    audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/flac'],
  };
  return mimes[category] || [];
};

const getAllowedExtensions = (category) => {
  const exts = {
    images: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
    videos: ['.mp4', '.webm', '.ogg', '.mov', '.avi'],
    pdf: ['.pdf'],
    word: ['.doc', '.docx'],
    excel: ['.xls', '.xlsx', '.csv'],
    audio: ['.mp3', '.wav', '.ogg', '.aac', '.flac'],
  };
  return exts[category] || [];
};

const isValidFileType = (mimeType, extension, category) => {
  const allowedMimes = getAllowedMimeTypes(category);
  const allowedExts = getAllowedExtensions(category);
  return allowedMimes.includes(mimeType) && allowedExts.includes(extension.toLowerCase());
};

const sanitizeFilename = (name) => {
  return name.replace(/[^a-z0-9_.-]/gi, '_').toLowerCase();
};

module.exports = {
  generateStoredName,
  formatFileSize,
  getFileSizeLimit,
  getAllowedMimeTypes,
  getAllowedExtensions,
  isValidFileType,
  sanitizeFilename,
};
