const Note = require('../models/Note');
const ActivityLog = require('../models/ActivityLog');
const { sendSuccess, sendNotFound } = require('../utils/responseUtils');

const getNotes = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const { category } = req.query;
    
    const query = { workspaceId, isDeleted: false };
    if (category) query.category = category;
    
    const notes = await Note.find(query).sort({ isPinned: -1, updatedAt: -1 });
    return sendSuccess(res, notes, 'Notes fetched');
  } catch (error) {
    next(error);
  }
};

const createNote = async (req, res, next) => {
  try {
    const { workspaceId, category, title, content } = req.body;
    const strContent = content || '';
    
    const note = new Note({
      workspaceId,
      category,
      title: title || 'Untitled',
      content: strContent,
      wordCount: strContent.trim().split(/\s+/).filter(w => w).length,
      charCount: strContent.length,
    });
    
    await note.save();
    
    await ActivityLog.create({
      workspaceId,
      action: 'CREATE_NOTE',
      details: { noteId: note._id, category },
    });
    
    return sendSuccess(res, note, 'Note created', 201);
  } catch (error) {
    next(error);
  }
};

const updateNote = async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note || note.isDeleted) return sendNotFound(res, 'Note');
    
    const { title, content, isPinned, isFavorite } = req.body;
    let newVersionCreated = false;
    
    if (title !== undefined) note.title = title;
    if (isPinned !== undefined) note.isPinned = isPinned;
    if (isFavorite !== undefined) note.isFavorite = isFavorite;
    
    if (content !== undefined && content !== note.content) {
      const oldContent = note.content;
      const timeSinceLastVersion = note.versions.length ? 
        Date.now() - new Date(note.versions[note.versions.length - 1].savedAt).getTime() : 
        Infinity;
        
      if (Math.abs(content.length - oldContent.length) > 50 || timeSinceLastVersion > 5 * 60 * 1000) {
        note.versions.push({
          versionNumber: note.versions.length + 1,
          content: oldContent,
          savedAt: new Date(),
        });
        
        if (note.versions.length > 20) {
          note.versions.shift(); 
        }
        newVersionCreated = true;
      }
      
      note.content = content;
      note.wordCount = content.trim().split(/\s+/).filter(w => w).length;
      note.charCount = content.length;
    }
    
    await note.save();
    return sendSuccess(res, { note, newVersionCreated }, 'Note updated');
  } catch (error) {
    next(error);
  }
};

const deleteNote = async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return sendNotFound(res, 'Note');
    
    note.isDeleted = true;
    note.deletedAt = new Date();
    await note.save();
    
    return sendSuccess(res, null, 'Note deleted');
  } catch (error) {
    next(error);
  }
};

const togglePin = async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return sendNotFound(res, 'Note');
    note.isPinned = !note.isPinned;
    await note.save();
    return sendSuccess(res, note, 'Note pin toggled');
  } catch (error) {
    next(error);
  }
};

const toggleFavorite = async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return sendNotFound(res, 'Note');
    note.isFavorite = !note.isFavorite;
    await note.save();
    return sendSuccess(res, note, 'Note favorite toggled');
  } catch (error) {
    next(error);
  }
};

const getVersionHistory = async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return sendNotFound(res, 'Note');
    
    const versions = note.versions.map(v => ({
      versionNumber: v.versionNumber,
      savedAt: v.savedAt,
      charCount: v.content ? v.content.length : 0,
      content: v.content,
    })).sort((a, b) => b.versionNumber - a.versionNumber);
    
    return sendSuccess(res, versions, 'Version history fetched');
  } catch (error) {
    next(error);
  }
};

const restoreVersion = async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return sendNotFound(res, 'Note');
    
    const { versionNumber } = req.body;
    const version = note.versions.find(v => v.versionNumber === Number(versionNumber));
    if (!version) return sendNotFound(res, 'Version');
    
    note.versions.push({
      versionNumber: note.versions.length ? note.versions[note.versions.length - 1].versionNumber + 1 : 1,
      content: note.content,
      savedAt: new Date(),
    });
    
    if (note.versions.length > 20) note.versions.shift();
    
    note.content = version.content;
    note.wordCount = note.content.trim().split(/\s+/).filter(w => w).length;
    note.charCount = note.content.length;
    
    await note.save();
    return sendSuccess(res, note, 'Version restored');
  } catch (error) {
    next(error);
  }
};

const getPinnedNotes = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const notes = await Note.find({ workspaceId, isPinned: true, isDeleted: false });
    return sendSuccess(res, notes, 'Pinned notes fetched');
  } catch (error) {
    next(error);
  }
};

const getFavoriteNotes = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const notes = await Note.find({ workspaceId, isFavorite: true, isDeleted: false });
    return sendSuccess(res, notes, 'Favorite notes fetched');
  } catch (error) {
    next(error);
  }
};

const getRecentNotes = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const notes = await Note.find({ workspaceId, isDeleted: false }).sort({ updatedAt: -1 }).limit(10);
    return sendSuccess(res, notes, 'Recent notes fetched');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotes,
  createNote,
  updateNote,
  deleteNote,
  togglePin,
  toggleFavorite,
  getVersionHistory,
  restoreVersion,
  getPinnedNotes,
  getFavoriteNotes,
  getRecentNotes,
};
