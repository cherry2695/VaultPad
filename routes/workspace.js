const express = require('express');
const router = express.Router();
const workspaceController = require('../controllers/workspaceController');
const { validateWorkspaceEntry, validateObjectId, handleValidationErrors } = require('../middleware/validateRequest');

router.post('/api/workspace/enter', validateWorkspaceEntry, handleValidationErrors, workspaceController.enterWorkspace);
router.get('/workspace/:id', validateObjectId, handleValidationErrors, workspaceController.renderWorkspace);
router.get('/api/workspace/:id', validateObjectId, handleValidationErrors, workspaceController.getWorkspace);
router.patch('/api/workspace/:id/settings', validateObjectId, handleValidationErrors, workspaceController.updateSettings);

module.exports = router;
