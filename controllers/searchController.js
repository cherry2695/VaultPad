const Note = require('../models/Note');
const File = require('../models/File');
const { sendSuccess } = require('../utils/responseUtils');

const globalSearch = async (req, res, next) => {
  try {
    const { q, workspaceId } = req.query;
    if (!q || !workspaceId) {
      return res.status(400).json({ success: false, message: 'Query and workspaceId required' });
    }
    
    const searchRegex = { $regex: q, $options: 'i' };
    
    const notesPromise = Note.find({
      workspaceId,
      isDeleted: false,
      $or: [
        { title: searchRegex },
        { content: searchRegex }
      ]
    }).limit(50);
    
    const filesPromise = File.find({
      workspaceId,
      isDeleted: false,
      $or: [
        { originalName: searchRegex },
        { displayName: searchRegex }
      ]
    }).limit(50);
    
    const [notes, files] = await Promise.all([notesPromise, filesPromise]);
    
    return sendSuccess(res, {
      notes,
      files,
      totalResults: notes.length + files.length,
    }, 'Search results');
  } catch (error) {
    next(error);
  }
};

module.exports = { globalSearch };
