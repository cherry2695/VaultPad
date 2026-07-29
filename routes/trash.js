const express = require('express');
const router  = express.Router();
const trashController = require('../controllers/trashController');
const { validateObjectId, validateWorkspaceId, handleValidationErrors } = require('../middleware/validateRequest');

// IMPORTANT: Specific sub-routes MUST come before the /:workspaceId wildcard route
// to prevent Express from interpreting 'restore', 'permanent', 'empty' as workspaceId values.

router.post('/api/trash/restore/note/:id',    validateObjectId,    handleValidationErrors, trashController.restoreNote);
router.post('/api/trash/restore/file/:id',    validateObjectId,    handleValidationErrors, trashController.restoreFile);
router.delete('/api/trash/permanent/note/:id', validateObjectId,   handleValidationErrors, trashController.permanentDeleteNote);
router.delete('/api/trash/permanent/file/:id', validateObjectId,   handleValidationErrors, trashController.permanentDeleteFile);
router.delete('/api/trash/empty/:workspaceId', validateWorkspaceId, handleValidationErrors, trashController.emptyTrash);

// Wildcard /:workspaceId LAST
router.get('/api/trash/:workspaceId', validateWorkspaceId, handleValidationErrors, trashController.getTrash);

module.exports = router;
