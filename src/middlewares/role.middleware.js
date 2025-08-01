const { sendError } = require('../utils/response.util');

const authorize = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, 'No autenticado');
    }

    const userRole = req.user.globalRole?.name || req.user.role;
    
    if (!allowedRoles.includes(userRole)) {
      return sendError(res, 403, 'Sin permisos suficientes');
    }

    next();
  };
};

module.exports = { authorize };