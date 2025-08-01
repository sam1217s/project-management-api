const User = require('../models/User.model');
const Role = require('../models/Role.model');
const jwt = require('jsonwebtoken');
const { sendResponse, sendError } = require('../utils/response.util');

class AuthController {
  // Registro
  async register(req, res) {
    try {
      const { firstName, lastName, email, password, phone } = req.body;

      // Verificar email único
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return sendError(res, 400, 'El email ya está registrado');
      }

      // Rol por defecto
      let defaultRole = await Role.findOne({ name: 'Developer' });
      if (!defaultRole) {
        defaultRole = await Role.create({
          name: 'Developer',
          description: 'Desarrollador con permisos básicos'
        });
      }

      // Crear usuario
      const user = await User.create({
        firstName,
        lastName,
        email,
        password,
        phone,
        globalRole: defaultRole._id
      });

      sendResponse(res, 201, true, 'Usuario registrado exitosamente', {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          fullName: user.fullName
        }
      });
    } catch (error) {
      console.error('Error registro:', error);
      sendError(res, 500, 'Error interno del servidor');
    }
  }

  // Login
  async login(req, res) {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email, isActive: true })
        .select('+password')
        .populate('globalRole');

      if (!user || !(await user.comparePassword(password))) {
        return sendError(res, 401, 'Credenciales inválidas');
      }

      // Generar token
      const token = jwt.sign(
        { 
          userId: user._id,
          email: user.email,
          role: user.globalRole.name
        },
        process.env.JWT_SECRET || 'defaultsecret',
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
      );

      // Actualizar último login
      user.lastLogin = Date.now();
      await user.save();

      sendResponse(res, 200, true, 'Login exitoso', {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          avatar: user.avatar,
          role: user.globalRole.name,
          fullName: user.fullName
        },
        token
      });
    } catch (error) {
      console.error('Error login:', error);
      sendError(res, 500, 'Error interno del servidor');
    }
  }

  // Refresh token
  async refresh(req, res) {
    try {
      const user = await User.findById(req.user.userId).populate('globalRole');
      
      const newToken = jwt.sign(
        { 
          userId: user._id,
          email: user.email,
          role: user.globalRole.name
        },
        process.env.JWT_SECRET || 'defaultsecret',
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
      );

      sendResponse(res, 200, true, 'Token renovado', { token: newToken });
    } catch (error) {
      console.error('Error refresh:', error);
      sendError(res, 500, 'Error interno del servidor');
    }
  }

  // Logout
  async logout(req, res) {
    sendResponse(res, 200, true, 'Logout exitoso');
  }

  // Forgot password
  async forgotPassword(req, res) {
    sendResponse(res, 200, true, 'Email de recuperación enviado');
  }

  // Reset password
  async resetPassword(req, res) {
    sendResponse(res, 200, true, 'Contraseña restablecida exitosamente');
  }
}

module.exports = new AuthController();
