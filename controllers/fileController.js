const File = require('../models/File');
const ActivityLog = require('../models/ActivityLog');
const path = require('path');
const sharp = require('sharp');
const { formatFileSize, sanitizeFilename, isValidFileType } = require('../utils/fileUtils');
const { sendSuccess, sendError, sendNotFound } = require('../utils/responseUtils');

const uploadFile = async (req, res, next) => {
  try {
    const { workspaceId, category } = req.body;
    const fileData = req.file;
    
    if (!fileData) return sendError(res, 'No file uploaded', 400);
    
    const extension = path.extname(fileData.originalname).toLowerCase();
    if (!isValidFileType(fileData.mimetype, extension, category)) {
      return sendError(res, 'Invalid file type for category', 400);
    }
    
    let fileSize = fileData.size;
    let storedPath = fileData.path;
    
    if (category === 'images' && (extension === '.jpg' || extension === '.jpeg' || extension === '.png' || extension === '.webp')) {
      try {
        const metadata = await sharp(storedPath).metadata();
        if (metadata.width > 2000) {
          const newPath = storedPath + '_optimized';
          await sharp(storedPath).resize(2000, null, { withoutEnlargement: true }).jpeg({ quality: 85 }).toFile(newPath);
          const fs = require('fs');
          fs.unlinkSync(storedPath);
          fs.renameSync(newPath, storedPath);
          const stats = fs.statSync(storedPath);
          fileSize = stats.size;
        }
      } catch (err) {
        console.error('Image optimization failed', err);
      }
    }
    
    const file = new File({
      workspaceId,
      category,
      originalName: fileData.originalname,
      displayName: fileData.originalname,
      storedName: fileData.filename,
      mimeType: fileData.mimetype,
      extension,
      fileSize,
    });
    
    await file.save();
    
    await ActivityLog.create({
      workspaceId,
      action: 'UPLOAD_FILE',
      details: { fileId: file._id, category },
    });
    
    return sendSuccess(res, file, 'File uploaded successfully', 201);
  } catch (error) {
    next(error);
  }
};

const getFiles = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const { category } = req.query;
    
    const query = { workspaceId, isDeleted: false };
    if (category) query.category = category;
    
    let files = await File.find(query).sort({ uploadDate: -1 });
    
    const formattedFiles = files.map(f => {
      const obj = f.toObject();
      obj.formattedSize = formatFileSize(obj.fileSize);
      return obj;
    });
    
    return sendSuccess(res, formattedFiles, 'Files fetched');
  } catch (error) {
    next(error);
  }
};

const getFilesByWorkspace = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const files = await File.find({ workspaceId, isDeleted: false }).sort({ uploadDate: -1 });
    return sendSuccess(res, files, 'All files fetched');
  } catch (error) {
    next(error);
  }
};

const deleteFile = async (req, res, next) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) return sendNotFound(res, 'File');
    
    file.isDeleted = true;
    file.deletedAt = new Date();
    await file.save();
    
    return sendSuccess(res, null, 'File deleted');
  } catch (error) {
    next(error);
  }
};

const renameFile = async (req, res, next) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) return sendNotFound(res, 'File');
    
    let { displayName } = req.body;
    if (displayName) {
      file.displayName = sanitizeFilename(displayName);
      await file.save();
    }
    
    return sendSuccess(res, file, 'File renamed');
  } catch (error) {
    next(error);
  }
};

const downloadFile = async (req, res, next) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file || file.isDeleted) return sendNotFound(res, 'File');
    
    const filePath = path.join(process.cwd(), 'uploads', file.storedName);
    
    const normalized = path.normalize(filePath);
    if (!normalized.startsWith(path.join(process.cwd(), 'uploads'))) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    res.setHeader('Content-Type', file.mimeType);
    return res.download(normalized, file.originalName, (err) => {
      if (err && !res.headersSent) {
        res.status(500).json({ success: false, message: 'Could not download file' });
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadFile,
  getFiles,
  getFilesByWorkspace,
  deleteFile,
  renameFile,
  downloadFile,
};
