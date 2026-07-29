const mongoose = require('mongoose');

const workspaceSchema = new mongoose.Schema(
  {
    lookupHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    codeHash: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      default: 'My Workspace',
      maxlength: 100,
    },
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light',
    },
    settings: {
      fontSize: { type: Number, default: 14, min: 10, max: 24 },
      readingMode: { type: Boolean, default: false },
      lineNumbers: { type: Boolean, default: true },
      autoSave: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

workspaceSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.lookupHash;
  delete obj.codeHash;
  return obj;
};

module.exports = mongoose.model('Workspace', workspaceSchema);
