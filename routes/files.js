const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const { getUploaderForCategory } = require('../middleware/uploadMiddleware');
const {
  validateObjectId,
  validateWorkspaceId,
  handleValidationErrors,
} = require('../middleware/validateRequest');

// Dynamic multer middleware — reads category from request body before multer runs
const dynamicUpload = (req, res, next) => {
  // category may be in body; for multipart, multer reads it last, so we use a temporary approach:
  // parse the category from query string OR use a pre-upload middleware that buffers
  // Simpler: always parse body first, use multer with the right uploader
  const category = req.query.category || 'images';
  const uploader = getUploaderForCategory(category).single('file');
  uploader(req, res, (err) => {
    if (err) return next(err);
    next();
  });
};

// NOTE: /all must come before /:workspaceId to avoid Express matching 'all' as a workspaceId param
router.get('/api/files/:workspaceId/all', validateWorkspaceId, handleValidationErrors, fileController.getFilesByWorkspace);
router.get('/api/files/:workspaceId', validateWorkspaceId, handleValidationErrors, fileController.getFiles);

router.post('/api/files/upload', dynamicUpload, fileController.uploadFile);
router.delete('/api/files/:id', validateObjectId, handleValidationErrors, fileController.deleteFile);
router.patch('/api/files/:id/rename', validateObjectId, handleValidationErrors, fileController.renameFile);
router.get('/api/files/:id/download', validateObjectId, handleValidationErrors, fileController.downloadFile);

module.exports = router;
