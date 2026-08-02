const express  = require('express');
const passport = require('passport');
const router   = express.Router();

// ── Helper: check if Google OAuth is actually configured ──────
function isOAuthConfigured() {
  const id  = process.env.GOOGLE_CLIENT_ID  || '';
  const sec = process.env.GOOGLE_CLIENT_SECRET || '';
  return id.length > 10 &&
    !id.includes('YOUR_GOOGLE_CLIENT_ID') &&
    sec.length > 10 &&
    !sec.includes('YOUR_GOOGLE_CLIENT_SECRET');
}

// ── Kick off Google OAuth ─────────────────────────────────────
router.get('/auth/google', (req, res, next) => {
  if (!isOAuthConfigured()) {
    // Credentials not set → send back to landing page with a clear message
    return res.redirect('/?auth=not-configured');
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

// ── Google callback ───────────────────────────────────────────
router.get('/auth/google/callback',
  (req, res, next) => {
    if (!isOAuthConfigured()) return res.redirect('/?auth=not-configured');
    next();
  },
  passport.authenticate('google', { failureRedirect: '/?auth=failed' }),
  (req, res) => {
    res.redirect('/?auth=success');
  }
);

// ── Sign out ──────────────────────────────────────────────────
router.post('/auth/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => res.redirect('/'));
  });
});

// ── Current user JSON ─────────────────────────────────────────
router.get('/auth/me', (req, res) => {
  if (!req.user) return res.json({ loggedIn: false, user: null });
  res.json({
    loggedIn: true,
    user: {
      displayName: req.user.displayName,
      firstName:   req.user.firstName,
      email:       req.user.email,
      avatar:      req.user.avatar,
    },
  });
});

// ── OAuth status (used by landing page JS) ────────────────────
router.get('/auth/status', (req, res) => {
  res.json({ configured: isOAuthConfigured(), loggedIn: !!req.user });
});

module.exports = router;
