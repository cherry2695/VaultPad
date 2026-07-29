const { body, param, query, validationResult } = require('express-validator');
const { sendValidationError } = require('../utils/responseUtils');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendValidationError(res, errors.array());
  }
  next();
};

const validateWorkspaceEntry = [
  body('code').trim().isLength({ min: 3, max: 100 }).withMessage('Code must be between 3 and 100 characters').escape(),
];

const validateNoteCreate = [
  body('workspaceId').isMongoId().withMessage('Invalid workspace ID'),
  body('category').isIn(['notes', 'python', 'java', 'cpp', 'sql', 'javascript', 'html', 'css']).withMessage('Invalid category'),
  body('title').optional().trim().escape().isLength({ max: 255 }).withMessage('Title too long'),
  body('content').optional().isLength({ max: 5242880 }).withMessage('Content exceeds maximum length'),
];

const validateNoteUpdate = [
  param('id').isMongoId().withMessage('Invalid note ID'),
  body('title').optional().trim().escape().isLength({ max: 255 }),
  body('content').optional().isLength({ max: 5242880 }),
];

const validateObjectId = [
  param('id').isMongoId().withMessage('Invalid ID'),
];

// For routes that use :workspaceId param
const validateWorkspaceId = [
  param('workspaceId').isMongoId().withMessage('Invalid workspace ID'),
];

const validateSearch = [
  query('q').trim().isLength({ min: 1, max: 200 }).withMessage('Query must be between 1 and 200 characters'),
  query('workspaceId').isMongoId().withMessage('Invalid workspace ID'),
];

module.exports = {
  validateWorkspaceEntry,
  validateNoteCreate,
  validateNoteUpdate,
  validateObjectId,
  validateWorkspaceId,
  validateSearch,
  handleValidationErrors,
};
