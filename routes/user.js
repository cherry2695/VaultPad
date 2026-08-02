const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const path     = require('path');
const { v4: uuidv4 } = require('uuid');
const User     = require('../models/User');

// ── Multer for avatar uploads (memory, max 5MB) ──────────────────────────────
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `avatar-${uuidv4()}${ext}`);
  },
});
const avatarUpload = multer({
  storage: avatarStorage,
  limits:  { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// ── Auth guard ───────────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });
  next();
}

// ── GET /api/user/me ──────────────────────────────────────────────────────────
router.get('/api/user/me', requireAuth, (req, res) => {
  const { displayName, firstName, email, avatar } = req.user;
  res.json({ success: true, data: { displayName, firstName, email, avatar } });
});

// ── PATCH /api/user/profile ───────────────────────────────────────────────────
router.patch('/api/user/profile', requireAuth, async (req, res) => {
  try {
    const { displayName, firstName } = req.body;
    const update = {};
    if (typeof displayName === 'string') update.displayName = displayName.trim().slice(0, 80);
    if (typeof firstName   === 'string') update.firstName   = firstName.trim().slice(0, 50);

    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true });
    // Sync to session
    Object.assign(req.user, update);
    res.json({ success: true, data: { displayName: user.displayName, firstName: user.firstName } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/user/avatar ────────────────────────────────────────────────────
router.post('/api/user/avatar', requireAuth, avatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const avatarUrl = `/uploads/${req.file.filename}`;
    const user = await User.findByIdAndUpdate(req.user._id, { avatar: avatarUrl }, { new: true });
    req.user.avatar = avatarUrl;
    res.json({ success: true, data: { avatar: avatarUrl } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
