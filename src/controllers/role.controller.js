const Role = require('../models/Role.model');
const { sendResponse, sendError } = require('../utils/response.util');

class RoleController {
  // Listar roles
  async getRoles(req, res) {
    try {
      const roles = await Role.find({ isActive: true }).sort({ name: 1 });
      sendResponse(res, 200, true, 'Roles obtenidos', { roles });
    } catch (error) {
      console.error('Error roles:', error);
      sendError(res, 500, 'Error interno del servidor');
    }
  }

  // Crear rol (Admin)
  async createRole(req, res) {
    try {
      const { name, description } = req.body;

      const role = await Role.create({ name, description });

      sendResponse(res, 201, true, 'Rol creado', { role });
    } catch (error) {
      console.error('Error crear rol:', error);
      if (error.code === 11000) {
        return sendError(res, 400, 'El rol ya existe');
      }
      sendError(res, 500, 'Error interno del servidor');
    }
  }

  // Actualizar rol (Admin)
  async updateRole(req, res) {
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      const role = await Role.findByIdAndUpdate(
        id,
        { name, description },
        { new: true, runValidators: true }
      );

      if (!role) {
        return sendError(res, 404, 'Rol no encontrado');
      }

      sendResponse(res, 200, true, 'Rol actualizado', { role });
    } catch (error) {
      console.error('Error actualizar rol:', error);
      sendError(res, 500, 'Error interno del servidor');
    }
  }

  // Eliminar rol (Admin)
  async deleteRole(req, res) {
    try {
      const { id } = req.params;

      await Role.findByIdAndUpdate(id, { isActive: false });

      sendResponse(res, 200, true, 'Rol eliminado');
    } catch (error) {
      console.error('Error eliminar rol:', error);
      sendError(res, 500, 'Error interno del servidor');
    }
  }
}

module.exports = new RoleController();