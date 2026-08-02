const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const hashCode = (code) => {
  return crypto.createHash('sha256').update(code.toLowerCase().trim()).digest('hex');
};

// User-scoped: SHA-256(userId + ":" + normalizedCode)
// Ensures User A's "ram5" !== User B's "ram5"
const generateUserScopedHash = (userId, code) => {
  const raw = `${userId}:${code.toLowerCase().trim()}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
};

const hashForStorage = async (code) => {
  const salt = await bcrypt.genSalt(12);
  return await bcrypt.hash(code.trim(), salt);
};

const verifyCode = async (code, codeHash) => {
  return await bcrypt.compare(code.trim(), codeHash);
};

// Legacy lookup (no userId prefix) — kept for backward compat
const generateLookupHash = (code) => {
  return hashCode(code);
};

module.exports = {
  hashCode,
  hashForStorage,
  verifyCode,
  generateLookupHash,
  generateUserScopedHash,
};
