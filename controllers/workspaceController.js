const Workspace   = require('../models/Workspace');
const Note        = require('../models/Note');
const File        = require('../models/File');
const ActivityLog = require('../models/ActivityLog');
const { hashForStorage, generateUserScopedHash, verifyCode } = require('../utils/hashUtils');
const { sendSuccess, sendError, sendUnauthorized, sendNotFound } = require('../utils/responseUtils');

// ─────────────────────────────────────────────────────────────────
//  Helper — pick the right lookup hash depending on auth status
// ─────────────────────────────────────────────────────────────────
function buildLookupHash(userId, code) {
  if (userId) return generateUserScopedHash(userId.toString(), code);
  // Legacy / unauthenticated path (kept so old workspaces still work)
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(code.toLowerCase().trim()).digest('hex');
}

// ─────────────────────────────────────────────────────────────────
//  POST /api/workspace/enter
// ─────────────────────────────────────────────────────────────────
const enterWorkspace = async (req, res, next) => {
  try {
    // Require Google Auth
    if (!req.user) {
      return sendUnauthorized(res, 'Please sign in with Google to access your private vault.');
    }

    const { code } = req.body;
    const normalizedCode = code.trim();
    const userId     = req.user._id;
    const lookupHash = buildLookupHash(userId, normalizedCode);

    let workspace = await Workspace.findOne({ lookupHash, userId });

    if (!workspace) {
      const codeHash = await hashForStorage(normalizedCode);
      workspace = new Workspace({ userId, lookupHash, codeHash, name: 'My Workspace' });
      await workspace.save();
      await ActivityLog.create({ workspaceId: workspace._id, action: 'CREATE_WORKSPACE' });
      return sendSuccess(res, { workspaceId: workspace._id, isNew: true }, 'Workspace created');
    }

    const valid = await verifyCode(normalizedCode, workspace.codeHash);
    if (!valid) return sendUnauthorized(res, 'Invalid workspace code');

    await ActivityLog.create({ workspaceId: workspace._id, action: 'ENTER_WORKSPACE' });
    return sendSuccess(res, { workspaceId: workspace._id, isNew: false }, 'Entered workspace');
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────
//  GET /api/workspace/:id
// ─────────────────────────────────────────────────────────────────
const getWorkspace = async (req, res, next) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) return sendNotFound(res, 'Workspace');

    // Ownership check
    if (req.user && workspace.userId && workspace.userId.toString() !== req.user._id.toString()) {
      return sendUnauthorized(res, 'You do not have access to this workspace');
    }

    const noteCount = await Note.countDocuments({ workspaceId: workspace._id, isDeleted: false });
    const fileCount = await File.countDocuments({ workspaceId: workspace._id, isDeleted: false });
    const safeData  = workspace.toSafeObject();
    safeData.noteCount = noteCount;
    safeData.fileCount = fileCount;

    return sendSuccess(res, safeData, 'Workspace fetched');
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────
//  GET /workspace/:id  (render HTML)
// ─────────────────────────────────────────────────────────────────
const renderWorkspace = async (req, res, next) => {
  try {
    if (!req.user) return res.redirect('/?auth=required');

    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) return res.redirect('/');

    // Ownership check
    if (workspace.userId && workspace.userId.toString() !== req.user._id.toString()) {
      return res.redirect('/');
    }

    res.render('workspace', {
      workspace: workspace.toSafeObject(),
      user: req.user,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────
//  PATCH /api/workspace/:id/settings
// ─────────────────────────────────────────────────────────────────
const updateSettings = async (req, res, next) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) return sendNotFound(res, 'Workspace');

    if (req.user && workspace.userId && workspace.userId.toString() !== req.user._id.toString()) {
      return sendUnauthorized(res, 'Access denied');
    }

    const { theme, fontSize, readingMode, lineNumbers, autoSave, name } = req.body;
    if (theme)                          workspace.theme = theme;
    if (name)                           workspace.name  = name;
    if (fontSize    !== undefined) workspace.settings.fontSize    = fontSize;
    if (readingMode !== undefined) workspace.settings.readingMode = readingMode;
    if (lineNumbers !== undefined) workspace.settings.lineNumbers = lineNumbers;
    if (autoSave    !== undefined) workspace.settings.autoSave    = autoSave;

    await workspace.save();
    return sendSuccess(res, workspace.toSafeObject(), 'Settings updated');
  } catch (error) {
    next(error);
  }
};

module.exports = { enterWorkspace, getWorkspace, renderWorkspace, updateSettings };
