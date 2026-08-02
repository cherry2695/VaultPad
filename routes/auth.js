const express  = require('express');
const passport = require('passport');
const router   = express.Router();

// ── Kick off Google OAuth ─────────────────────────────────────
router.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// ── Google callback ───────────────────────────────────────────
router.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/?auth=failed' }),
  (req, res) => {
    // Successful auth — go back to landing page (they'll enter a code)
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

// ── Current user (JSON, used by client JS) ────────────────────
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

module.exports = router;
