const express = require('express');
const router  = express.Router();

function isOAuthConfigured() {
  const id  = process.env.GOOGLE_CLIENT_ID  || '';
  const sec = process.env.GOOGLE_CLIENT_SECRET || '';
  return id.length > 10 &&
    !id.includes('YOUR_GOOGLE_CLIENT_ID') &&
    sec.length > 10 &&
    !sec.includes('YOUR_GOOGLE_CLIENT_SECRET');
}

// Landing page
router.get('/', (req, res) => {
  res.render('index', {
    user:            req.user || null,
    oauthConfigured: isOAuthConfigured(),
  });
});

// Settings page (requires auth)
router.get('/settings', (req, res) => {
  if (!req.user) return res.redirect('/');
  res.render('settings', { user: req.user });
});

module.exports = router;
