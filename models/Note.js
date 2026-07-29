const mongoose = require('mongoose');

const versionSchema = new mongoose.Schema({
  versionNumber: Number,
  content: String,
  savedAt: Date,
}, { _id: false });

const noteSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['notes', 'python', 'java', 'cpp', 'sql', 'javascript', 'html', 'css'],
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: 'Untitled',
      maxlength: 255,
    },
    content: {
      type: String,
      default: '',
      maxlength: 5242880,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    isFavorite: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    wordCount: {
      type: Number,
      default: 0,
    },
    charCount: {
      type: Number,
      default: 0,
    },
    versions: {
      type: [versionSchema],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Note', noteSchema);
