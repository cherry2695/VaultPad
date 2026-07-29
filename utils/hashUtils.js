const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const hashCode = (code) => {
  return crypto.createHash('sha256').update(code.toLowerCase().trim()).digest('hex');
};

const hashForStorage = async (code) => {
  const salt = await bcrypt.genSalt(12);
  return await bcrypt.hash(code.trim(), salt);
};

const verifyCode = async (code, codeHash) => {
  return await bcrypt.compare(code.trim(), codeHash);
};

const generateLookupHash = (code) => {
  return hashCode(code);
};

module.exports = {
  hashCode,
  hashForStorage,
  verifyCode,
  generateLookupHash,
};
