const bcrypt = require('bcryptjs');
const crypto = require('crypto');

class EncryptionUtil {
  // Hash password
  static async hashPassword(password, saltRounds = 12) {
    return await bcrypt.hash(password, saltRounds);
  }

  // Compare password
  static async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  // Generate random token
  static generateRandomToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  // Generate verification token
  static generateVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Hash token for storage
  static hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}

module.exports = EncryptionUtil;