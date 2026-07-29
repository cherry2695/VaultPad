const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['images', 'videos', 'pdf', 'excel', 'word', 'audio'],
      required: true,
      index: true,
    },
    originalName: {
      type: String,
      required: true,
      maxlength: 255,
    },
    displayName: {
      type: String,
      maxlength: 255,
    },
    storedName: {
      type: String,
      required: true,
      unique: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    extension: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
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
    uploadDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('File', fileSchema);
