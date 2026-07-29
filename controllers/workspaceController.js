const Workspace = require('../models/Workspace');
const Note = require('../models/Note');
const File = require('../models/File');
const ActivityLog = require('../models/ActivityLog');
const { hashForStorage, generateLookupHash, verifyCode } = require('../utils/hashUtils');
const { sendSuccess, sendUnauthorized, sendNotFound } = require('../utils/responseUtils');

const enterWorkspace = async (req, res, next) => {
  try {
    const { code } = req.body;
    const normalizedCode = code.trim();
    const lookupHash = generateLookupHash(normalizedCode);
    
    let workspace = await Workspace.findOne({ lookupHash });
    
    if (!workspace) {
      const codeHash = await hashForStorage(normalizedCode);
      workspace = new Workspace({
        lookupHash,
        codeHash,
        name: 'My Workspace',
      });
      await workspace.save();
      
      await ActivityLog.create({
        workspaceId: workspace._id,
        action: 'CREATE_WORKSPACE',
      });
      
      return sendSuccess(res, { workspaceId: workspace._id, isNew: true }, 'Workspace created successfully');
    }
    
    const valid = await verifyCode(normalizedCode, workspace.codeHash);
    if (!valid) {
      return sendUnauthorized(res, 'Invalid workspace code');
    }
    
    await ActivityLog.create({
      workspaceId: workspace._id,
      action: 'ENTER_WORKSPACE',
    });
    
    return sendSuccess(res, { workspaceId: workspace._id, isNew: false }, 'Entered workspace successfully');
  } catch (error) {
    next(error);
  }
};

const getWorkspace = async (req, res, next) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return sendNotFound(res, 'Workspace');
    }
    
    const noteCount = await Note.countDocuments({ workspaceId: workspace._id, isDeleted: false });
    const fileCount = await File.countDocuments({ workspaceId: workspace._id, isDeleted: false });
    
    const safeData = workspace.toSafeObject();
    safeData.noteCount = noteCount;
    safeData.fileCount = fileCount;
    
    return sendSuccess(res, safeData, 'Workspace fetched');
  } catch (error) {
    next(error);
  }
};

const renderWorkspace = async (req, res, next) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.redirect('/');
    }
    res.render('workspace', { workspace: workspace.toSafeObject() });
  } catch (error) {
    next(error);
  }
};

const updateSettings = async (req, res, next) => {
  try {
    const { theme, fontSize, readingMode, lineNumbers, autoSave, name } = req.body;
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) return sendNotFound(res, 'Workspace');
    
    if (theme) workspace.theme = theme;
    if (name) workspace.name = name;
    
    if (fontSize !== undefined) workspace.settings.fontSize = fontSize;
    if (readingMode !== undefined) workspace.settings.readingMode = readingMode;
    if (lineNumbers !== undefined) workspace.settings.lineNumbers = lineNumbers;
    if (autoSave !== undefined) workspace.settings.autoSave = autoSave;
    
    await workspace.save();
    return sendSuccess(res, workspace.toSafeObject(), 'Settings updated');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  enterWorkspace,
  getWorkspace,
  renderWorkspace,
  updateSettings,
};
