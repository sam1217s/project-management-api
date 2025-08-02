const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const { sendError } = require('../utils/response.util');

const authenticate = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return sendError(res, 401, 'Token requerido');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'defaultsecret');

    const user = await User.findById(decoded.userId)
      .populate('globalRole')
      .select('-password');

    if (!user?.isActive) {
      return sendError(res, 401, 'Token inválido');
    }

    req.user = { ...decoded, globalRole: user.globalRole };
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return sendError(res, 401, 'Token inválido');
    }
    if (error.name === 'TokenExpiredError') {
      return sendError(res, 401, 'Token expirado');
    }
    sendError(res, 500, 'Error de autenticación');
  }
};

module.exports = { authenticate };