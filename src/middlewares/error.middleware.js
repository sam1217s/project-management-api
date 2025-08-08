const { errorResponse } = require('../utils/response.util');

exports.handleErrors = (err, req, res, next) => {
  console.error(err.stack);
  
  // Handle Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return errorResponse(res, 413, 'File size too large');
  }
  
  if (err.message === 'Invalid file type') {
    return errorResponse(res, 400, 'Invalid file type');
  }

  // Default error handler
  return errorResponse(res, 500, 'Something went wrong', err.message);
};