const path = require('path');

module.exports = {
  UPLOAD_DIR: path.join(__dirname, '../public/uploads'),
  AVATAR_MAX_SIZE: 2 * 1024 * 1024, // 2MB
  DOCUMENT_MAX_SIZE: 5 * 1024 * 1024 // 5MB
};