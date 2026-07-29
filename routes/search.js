const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const { validateSearch, handleValidationErrors } = require('../middleware/validateRequest');

router.get('/api/search', validateSearch, handleValidationErrors, searchController.globalSearch);

module.exports = router;
