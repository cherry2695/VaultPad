const express = require('express');
const router  = express.Router();

// Pass req.user (set by passport) to the EJS template
router.get('/', (req, res) => res.render('index', { user: req.user || null }));

module.exports = router;
