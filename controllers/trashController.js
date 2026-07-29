const Note = require('../models/Note');
const File = require('../models/File');
const fs = require('fs');
const path = require('path');
const { sendSuccess, sendNotFound } = require('../utils/responseUtils');

const getTrash = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    
    const notes = await Note.find({ workspaceId, isDeleted: true });
    const files = await File.find({ workspaceId, isDeleted: true });
    
    return sendSuccess(res, { notes, files }, 'Trash fetched');
  } catch (error) {
    next(error);
  }
};

const restoreNote = async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return sendNotFound(res, 'Note');
    
    note.isDeleted = false;
    note.deletedAt = null;
    await note.save();
    
    return sendSuccess(res, note, 'Note restored');
  } catch (error) {
    next(error);
  }
};

const restoreFile = async (req, res, next) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) return sendNotFound(res, 'File');
    
    file.isDeleted = false;
    file.deletedAt = null;
    await file.save();
    
    return sendSuccess(res, file, 'File restored');
  } catch (error) {
    next(error);
  }
};

const permanentDeleteNote = async (req, res, next) => {
  try {
    const note = await Note.findByIdAndDelete(req.params.id);
    if (!note) return sendNotFound(res, 'Note');
    return sendSuccess(res, null, 'Note permanently deleted');
  } catch (error) {
    next(error);
  }
};

const permanentDeleteFile = async (req, res, next) => {
  try {
    const file = await File.findByIdAndDelete(req.params.id);
    if (!file) return sendNotFound(res, 'File');
    
    const filePath = path.join(process.cwd(), 'uploads', file.storedName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    return sendSuccess(res, null, 'File permanently deleted');
  } catch (error) {
    next(error);
  }
};

const emptyTrash = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    
    await Note.deleteMany({ workspaceId, isDeleted: true });
    
    const filesToDelete = await File.find({ workspaceId, isDeleted: true });
    for (const f of filesToDelete) {
      const filePath = path.join(process.cwd(), 'uploads', f.storedName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    await File.deleteMany({ workspaceId, isDeleted: true });
    
    return sendSuccess(res, null, 'Trash emptied');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTrash,
  restoreNote,
  restoreFile,
  permanentDeleteNote,
  permanentDeleteFile,
  emptyTrash,
};
