const mongoose = require('mongoose');

const workspaceSchema = new mongoose.Schema(
  {
    // ── Auth scope ─────────────────────────────────────────────
    // After Google Auth was added, every new workspace is tied to a user.
    // Legacy (pre-auth) workspaces have userId: null.
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    // ── Code hashes ───────────────────────────────────────────
    // lookupHash = SHA-256(userId + ":" + normalizedCode)
    //              Unique per user, so two users can share the same code.
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

    // ── Meta ──────────────────────────────────────────────────
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
      fontSize:    { type: Number, default: 14, min: 10, max: 24 },
      readingMode: { type: Boolean, default: false },
      lineNumbers: { type: Boolean, default: true },
      autoSave:    { type: Boolean, default: true },
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
