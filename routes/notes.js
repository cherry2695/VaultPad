const express = require('express');
const router = express.Router();
const noteController = require('../controllers/noteController');
const {
  validateNoteCreate,
  validateNoteUpdate,
  validateObjectId,
  validateWorkspaceId,
  handleValidationErrors,
} = require('../middleware/validateRequest');

// Routes using :workspaceId — must come before :id routes to avoid ambiguity
router.get('/api/notes/:workspaceId/pinned', validateWorkspaceId, handleValidationErrors, noteController.getPinnedNotes);
router.get('/api/notes/:workspaceId/favorites', validateWorkspaceId, handleValidationErrors, noteController.getFavoriteNotes);
router.get('/api/notes/:workspaceId/recent', validateWorkspaceId, handleValidationErrors, noteController.getRecentNotes);
router.get('/api/notes/:workspaceId', validateWorkspaceId, handleValidationErrors, noteController.getNotes);

// Routes using :id
router.post('/api/notes', validateNoteCreate, handleValidationErrors, noteController.createNote);
router.put('/api/notes/:id', validateNoteUpdate, handleValidationErrors, noteController.updateNote);
router.delete('/api/notes/:id', validateObjectId, handleValidationErrors, noteController.deleteNote);
router.patch('/api/notes/:id/pin', validateObjectId, handleValidationErrors, noteController.togglePin);
router.patch('/api/notes/:id/favorite', validateObjectId, handleValidationErrors, noteController.toggleFavorite);
router.get('/api/notes/:id/versions', validateObjectId, handleValidationErrors, noteController.getVersionHistory);
router.post('/api/notes/:id/restore-version', validateObjectId, handleValidationErrors, noteController.restoreVersion);

module.exports = router;
