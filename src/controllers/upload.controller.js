const { successResponse, errorResponse } = require('../utils/response.util');
const uploadService = require('../services/upload.service');
const path = require('path');
const { UPLOAD_DIR } = require('../utils/constants');

exports.uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return errorResponse(res, 400, 'No file uploaded');
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    return successResponse(res, 201, 'Avatar uploaded successfully', { url: fileUrl });
  } catch (error) {
    next(error);
  }
};

exports.uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return errorResponse(res, 400, 'No file uploaded');
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    return successResponse(res, 201, 'Document uploaded successfully', { url: fileUrl });
  } catch (error) {
    next(error);
  }
};

exports.deleteFile = async (req, res, next) => {
  try {
    const { filename } = req.params;
    const deleted = uploadService.deleteFile(filename);
    if (!deleted) {
      return errorResponse(res, 404, 'File not found');
    }
    return successResponse(res, 200, 'File deleted successfully');
  } catch (error) {
    next(error);
  }
};