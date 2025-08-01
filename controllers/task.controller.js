// src/controllers/task.controller.js
const Task = require('../models/Task.model');
const Project = require('../models/Project.model');
const State = require('../models/State.model');
const { sendResponse, sendError } = require('../utils/response.util');

class TaskController {
  // Listar tareas del proyecto
  async getProjectTasks(req, res) {
    try {
      const { projectId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      const status = req.query.status;
      const priority = req.query.priority;
      const assignedTo = req.query.assignedTo;

      // Verificar acceso al proyecto
      const project = await Project.findById(projectId);
      if (!project || !project.isActive) {
        return sendError(res, 404, 'Proyecto no encontrado');
      }

      const hasAccess = project.owner.toString() === req.user.userId ||
                       project.members.some(member => 
                         member.user.toString() === req.user.userId
                       );

      if (!hasAccess) {
        return sendError(res, 403, 'Sin acceso al proyecto');
      }

      // Construir filtros
      const filter = { project: projectId, isActive: true };
      if (status) filter.status = status;
      if (priority) filter.priority = priority;
      if (assignedTo) filter.assignedTo = assignedTo;

      const tasks = await Task.find(filter)
        .populate('assignedTo', 'firstName lastName email avatar')
        .populate('createdBy', 'firstName lastName email')
        .populate('status', 'name description')
        .skip(skip)
        .limit(limit)
        .sort({ dueDate: 1, priority: -1, createdAt: -1 });

      const total = await Task.countDocuments(filter);

      sendResponse(res, 200, true, 'Tareas obtenidas', {
        tasks,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        filters: { status, priority, assignedTo }
      });
    } catch (error) {
      console.error('Error obtener tareas:', error);
      sendError(res, 500, 'Error interno del servidor');
    }
  }

  // Crear tarea
  async createTask(req, res) {
    try {
      const { projectId } = req.params;
      const {
        title,
        description,
        assignedTo,
        priority,
        estimatedHours,
        dueDate,
        tags
      } = req.body;

      // Verificar proyecto
      const project = await Project.findById(projectId);
      if (!project || !project.isActive) {
        return sendError(res, 404, 'Proyecto no encontrado');
      }

      // Verificar permisos
      const canCreate = project.owner.toString() === req.user.userId ||
                       project.members.some(member => 
                         member.user.toString() === req.user.userId
                       );

      if (!canCreate) {
        return sendError(res, 403, 'Sin permisos para crear tareas');
      }

      // Estado inicial
      let initialState = await State.findOne({
        type: 'Task',
        name: 'Pendiente'
      });

      if (!initialState) {
        initialState = await State.create({
          name: 'Pendiente',
          type: 'Task',
          description: 'Estado inicial para tareas'
        });
      }

      // Crear tarea
      const task = await Task.create({
        title,
        description,
        project: projectId,
        assignedTo,
        createdBy: req.user.userId,
        status: initialState._id,
        priority,
        estimatedHours,
        dueDate,
        tags: tags || []
      });

      await task.populate([
        { path: 'assignedTo', select: 'firstName lastName email avatar' },
        { path: 'createdBy', select: 'firstName lastName email' },
        { path: 'status', select: 'name description' },
        { path: 'project', select: 'name' }
      ]);

      sendResponse(res, 201, true, 'Tarea creada exitosamente', { task });
    } catch (error) {
      console.error('Error crear tarea:', error);
      sendError(res, 500, 'Error interno del servidor');
    }
  }

  // Obtener tarea específica
  async getTask(req, res) {
    try {
      const { id } = req.params;

      const task = await Task.findById(id)
        .populate('assignedTo', 'firstName lastName email avatar')
        .populate('createdBy', 'firstName lastName email')
        .populate('status', 'name description')
        .populate('project', 'name owner members');

      if (!task || !task.isActive) {
        return sendError(res, 404, 'Tarea no encontrada');
      }

      // Verificar acceso
      const project = task.project;
      const hasAccess = project.owner.toString() === req.user.userId ||
                       project.members.some(member => 
                         member.user.toString() === req.user.userId
                       );

      if (!hasAccess) {
        return sendError(res, 403, 'Sin acceso a la tarea');
      }

      sendResponse(res, 200, true, 'Tarea obtenida', { task });
    } catch (error) {
      console.error('Error obtener tarea:', error);
      sendError(res, 500, 'Error interno del servidor');
    }
  }

  // Actualizar tarea
  async updateTask(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const task = await Task.findById(id).populate('project');
      if (!task || !task.isActive) {
        return sendError(res, 404, 'Tarea no encontrada');
      }

      // Verificar permisos
      const project = task.project;
      const canEdit = project.owner.toString() === req.user.userId ||
                     task.assignedTo?.toString() === req.user.userId ||
                     task.createdBy.toString() === req.user.userId ||
                     project.members.some(member => 
                       member.user.toString() === req.user.userId
                     );

      if (!canEdit) {
        return sendError(res, 403, 'Sin permisos para editar esta tarea');
      }

      // Actualizar tarea
      const updatedTask = await Task.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      ).populate([
        { path: 'assignedTo', select: 'firstName lastName email avatar' },
        { path: 'createdBy', select: 'firstName lastName email' },
        { path: 'status', select: 'name description' },
        { path: 'project', select: 'name' }
      ]);

      sendResponse(res, 200, true, 'Tarea actualizada exitosamente', { task: updatedTask });
    } catch (error) {
      console.error('Error actualizar tarea:', error);
      sendError(res, 500, 'Error interno del servidor');
    }
  }

  // Eliminar tarea (soft delete)
  async deleteTask(req, res) {
    try {
      const { id } = req.params;

      const task = await Task.findById(id).populate('project');
      if (!task || !task.isActive) {
        return sendError(res, 404, 'Tarea no encontrada');
      }

      // Solo owner del proyecto puede eliminar
      if (task.project.owner.toString() !== req.user.userId) {
        return sendError(res, 403, 'Solo el propietario del proyecto puede eliminar tareas');
      }

      await Task.findByIdAndUpdate(id, { isActive: false });

      sendResponse(res, 200, true, 'Tarea eliminada exitosamente');
    } catch (error) {
      console.error('Error eliminar tarea:', error);
      sendError(res, 500, 'Error interno del servidor');
    }
  }

  // Cambiar estado de tarea
  async changeTaskStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const task = await Task.findById(id);
      if (!task || !task.isActive) {
        return sendError(res, 404, 'Tarea no encontrada');
      }

      // Verificar permisos
      const canChange = task.assignedTo?.toString() === req.user.userId ||
                       task.createdBy.toString() === req.user.userId;

      if (!canChange) {
        return sendError(res, 403, 'Solo el asignado o creador puede cambiar el estado');
      }

      // Verificar estado válido
      const newStatus = await State.findById(status);
      if (!newStatus || !newStatus.isActive || newStatus.type !== 'Task') {
        return sendError(res, 400, 'Estado no válido para tareas');
      }

      task.status = status;

      // Si el estado indica completada, marcar fecha
      if (newStatus.name === 'Completada') {
        task.completedAt = new Date();
      } else {
        task.completedAt = null;
      }

      await task.save();
      await task.populate('status', 'name description');

      sendResponse(res, 200, true, 'Estado de tarea actualizado', {
        task: {
          _id: task._id,
          title: task.title,
          status: task.status,
          completedAt: task.completedAt
        }
      });
    } catch (error) {
      console.error('Error cambiar estado:', error);
      sendError(res, 500, 'Error interno del servidor');
    }
  }

  // Asignar tarea
  async assignTask(req, res) {
    try {
      const { id } = req.params;
      const { user } = req.body;

      const task = await Task.findById(id).populate('project');
      if (!task || !task.isActive) {
        return sendError(res, 404, 'Tarea no encontrada');
      }

      // Solo owner del proyecto puede asignar
      if (task.project.owner.toString() !== req.user.userId) {
        return sendError(res, 403, 'Solo el propietario del proyecto puede asignar tareas');
      }

      // Verificar que el usuario es miembro del proyecto
      const isProjectMember = task.project.owner.toString() === user ||
                             task.project.members.some(member => 
                               member.user.toString() === user
                             );

      if (!isProjectMember) {
        return sendError(res, 400, 'El usuario debe ser miembro del proyecto');
      }

      task.assignedTo = user;
      await task.save();

      await task.populate('assignedTo', 'firstName lastName email avatar');

      sendResponse(res, 200, true, 'Tarea asignada exitosamente', {
        task: {
          _id: task._id,
          title: task.title,
          assignedTo: task.assignedTo
        }
      });
    } catch (error) {
      console.error('Error asignar tarea:', error);
      sendError(res, 500, 'Error interno del servidor');
    }
  }

  // Mis tareas
  async getMyTasks(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      const status = req.query.status;
      const priority = req.query.priority;

      const filter = {
        assignedTo: req.user.userId,
        isActive: true
      };

      if (status) filter.status = status;
      if (priority) filter.priority = priority;

      const tasks = await Task.find(filter)
        .populate('project', 'name')
        .populate('status', 'name description')
        .populate('createdBy', 'firstName lastName')
        .skip(skip)
        .limit(limit)
        .sort({ dueDate: 1, priority: -1 });

      const total = await Task.countDocuments(filter);

      // Estadísticas adicionales
      const stats = {
        total: await Task.countDocuments({ assignedTo: req.user.userId, isActive: true }),
        completed: await Task.countDocuments({ 
          assignedTo: req.user.userId, 
          isActive: true, 
          completedAt: { $exists: true } 
        }),
        overdue: await Task.countDocuments({
          assignedTo: req.user.userId,
          isActive: true,
          dueDate: { $lt: new Date() },
          completedAt: { $exists: false }
        })
      };

      sendResponse(res, 200, true, 'Mis tareas obtenidas', {
        tasks,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        stats
      });
    } catch (error) {
      console.error('Error obtener mis tareas:', error);
      sendError(res, 500, 'Error interno del servidor');
    }
  }
}

module.exports = new TaskController();