const { sendError } = require('../utils/response.util');

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Error de validación Mongoose
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(error => ({
      field: error.path,
      message: error.message
    }));
    return sendError(res, 400, 'Errores de validación', errors);
  }

  // Error de duplicado MongoDB
  if (err.code === 11000) {
    return sendError(res, 400, 'Recurso ya existe');
  }

  // Error de casting Mongoose
  if (err.name === 'CastError') {
    return sendError(res, 400, 'ID inválido');
  }

  // Error por defecto
  sendError(res, 500, 'Error interno del servidor');
};

module.exports = errorHandler;