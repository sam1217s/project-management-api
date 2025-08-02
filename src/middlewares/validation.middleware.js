const { validationResult } = require('express-validator');
const { sendError } = require('../utils/response.util');

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));

    return sendError(res, 400, 'Errores de validación', formattedErrors);
  }
  
  next();
};

module.exports = { handleValidation };