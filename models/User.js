const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId:    { type: String, required: true, unique: true, index: true },
  email:       { type: String, required: true, unique: true },
  displayName: { type: String, default: '' },
  firstName:   { type: String, default: '' },
  avatar:      { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
