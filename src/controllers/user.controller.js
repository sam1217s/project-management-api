const User = require('../models/User.model');
const Role = require('../models/Role.model');
const { sendResponse, sendError } = require('../utils/response.util');

class UserController {
  // Listar usuarios (Admin)
  async getUsers(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const users = await User.find({ isActive: true })
        .populate('globalRole', 'name description')
        .select('-password')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      const total = await User.countDocuments({ isActive: true });

      sendResponse(res, 200, true, 'Usuarios obtenidos', {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error usuarios:', error);
      sendError(res, 500, 'Error interno del servidor');
    }
  }

  // Perfil usuario actual
  async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.userId)
        .populate('globalRole', 'name description')
        .select('-password');

      sendResponse(res, 200, true, 'Perfil obtenido', { user });
    } catch (error) {
      console.error('Error perfil:', error);
      sendError(res, 500, 'Error interno del servidor');
    }
  }

  // Actualizar perfil
  async updateProfile(req, res) {
    try {
      const { firstName, lastName, phone } = req.body;
      
      const user = await User.findByIdAndUpdate(
        req.user.userId,
        { firstName, lastName, phone },
        { new: true, runValidators: true }
      ).populate('globalRole', 'name description');

      sendResponse(res, 200, true, 'Perfil actualizado', { user });
    } catch (error) {
      console.error('Error actualizar perfil:', error);
      sendError(res, 500, 'Error interno del servidor');
    }
  }

  // Eliminar usuario (Admin)
  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      await User.findByIdAndUpdate(id, { isActive: false });

      sendResponse(res, 200, true, 'Usuario eliminado');
    } catch (error) {
      console.error('Error eliminar usuario:', error);
      sendError(res, 500, 'Error interno del servidor');
    }
  }

  // Cambiar rol (Admin)
  async changeRole(req, res) {
    try {
      const { id } = req.params;
      const { roleId } = req.body;

      const user = await User.findByIdAndUpdate(
        id,
        { globalRole: roleId },
        { new: true }
      ).populate('globalRole', 'name description');

      sendResponse(res, 200, true, 'Rol actualizado', { user });
    } catch (error) {
      console.error('Error cambiar rol:', error);
      sendError(res, 500, 'Error interno del servidor');
    }
  }
}

module.exports = new UserController();