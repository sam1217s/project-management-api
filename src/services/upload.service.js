const fs = require('fs');
const path = require('path');
const { UPLOAD_DIR } = require('../utils/constants');

exports.deleteFile = (filename) => {
  const filePath = path.join(UPLOAD_DIR, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
};