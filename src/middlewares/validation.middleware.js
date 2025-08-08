const { validationResult } = require('express-validator');
const { errorResponse } = require('../utils/response.util');

exports.validateCategory = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(res, 400, 'Validation errors', errors.array());
  }
  next();
};

exports.validateState = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(res, 400, 'Validation errors', errors.array());
  }
  next();
};