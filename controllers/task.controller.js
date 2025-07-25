const Task = require('../models/Task.model');
const Project = require('../models/Project.model');
const State = require('../models/State.model');
const User = require('../models/User.model');
const { sendResponse, sendError, createPagination } = require('../utils/response.util');

class TaskController {
  // Obtener tareas de un proyecto
  async getProjectTasks(req, res) {
    try {
      const { projectId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 10, 50);
      const skip = (page - 1) * limit;
      
      const { search, status, assignedTo, priority, dueDate } = req.query;

      // Verificar que el usuario tiene acceso al proyecto
      const project = await Project.findById(projectId);
      if (!project) {
        return sendError(res, 404, 'Proyecto no encontrado');
      }

      const isMember = project.owner.toString() === req.user._id.toString() ||
                      project.members.some(member => member.user.toString() === req.user._id.toString());
      
      if (!isMember) {
        return sendError(res, 403, 'No tienes acceso a este proyecto');
      }

      // Construir filtros
      const filter = {
        project: projectId,
        isActive: true
      };

      if (search) {
        filter.$text = { $search: search };
      }
      if (status) filter.status = status;
      if (assignedTo) filter.assignedTo = assignedTo;
      if (priority) filter.priority = priority;
      
      if (dueDate) {
        const date = new Date(dueDate);
        filter.dueDate = {
          $gte: new Date(date.setHours(0, 0, 0, 0)),
          $lt: new Date(date.setHours(23, 59, 59, 999))
        };
      }

      const tasks = await Task.find(filter)
        .populate('assignedTo', 'firstName lastName email avatar')
        .populate('createdBy', 'firstName lastName email')
        .populate('status', 'name color')
        .populate('dependencies.task', 'title status')
        .skip(skip)
        .limit(limit)
        .sort({ priority: -1, dueDate: 1, createdAt: -1 });

      const total = await Task.countDocuments(filter);

      sendResponse(res, 200, true, 'Tareas obtenidas exitosamente', {
        tasks,
        pagination: createPagination(page, limit, total)
      });
    } catch (error) {
      console.error('Error obteniendo tareas:', error);
      sendError(res, 500, 'Error interno del servidor');
    }
  }

  // Crear nueva tarea
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
        tags,
        dependencies,
        subtasks
      } = req.body;

      // Verificar proyecto
      const project = await Project.findById(projectId);
      if (!project) {
        return sendError(res, 404, 'Proyecto no encontrado');
      }

      // Verificar permisos
      const canCreate = project.owner.toString() === req.user._id.toString() ||
                       project.members.some(member => 
                         member.user.toString() === req.user._id.toString() && 
                         member.permissions.includes('write')
                       );

      if (!canCreate) {
        return sendError(res, 403, 'No tienes permisos para crear tareas en este proyecto');
      }

      // Obtener estado inicial para tareas
      const initialState = await State.findOne({
        type: 'Task',
        isInitial: true,
        isActive: true
      });

      if (!initialState) {
        return sendError(res, 500, 'No se encontró estado inicial para tareas');
      }

      // Crear tarea
      const task = await Task.create({
        title,
        description,
        project: projectId,
        assignedTo,
        createdBy: req.user._id,
        status: initialState._id,
        priority,
        estimatedHours,
        dueDate,
        tags,
        dependencies,
        subtasks
      });

      // Poblar relaciones
      await task.populate([
        { path: 'assignedTo', select: 'firstName lastName email avatar' },
        { path: 'createdBy', select: 'firstName lastName email' },
        { path: 'status', select: 'name color' },
        { path: 'project', select: 'name' }
      ]);

      sendResponse(res, 201, true, 'Tarea creada exitosamente', { task });
    } catch (error) {
      console.error('Error creando tarea:', error);
      sendError(res, 500, 'Error interno del servidor');
    }
  }

  // Obtener tarea específica
  async getTask(req, res) {
    try {
      const { id } = req.params;

      const task = await Task.findById(id)
        .populate('assignedTo', 'firstName lastName email avatar')
        .populate('createdBy', 'firstName lastName email avatar')
        .populate('status', 'name color description')
        .populate('project', 'name owner members')
        .populate('dependencies.task', 'title status assignedTo')
        .populate('attachments.uploadedBy', 'firstName lastName');

      if (!task || !task.isActive) {
        return sendError(res, 404, 'Tarea no encontrada');
      }

      // Verificar acceso al proyecto
      const project = task.project;
      const hasAccess = project.owner.toString() === req.user._id.toString() ||
                       project.members.some(member => member.user.toString() === req.user._id.toString());

      if (!hasAccess) {
        return sendError(res, 403, 'No tienes acceso a esta tarea');
      }

      sendResponse(res, 200, true, 'Tarea obtenida exitosamente', { task });
    } catch (error) {
      console.error('Error obteniendo tarea:', error);
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
      const canEdit = project.owner.toString() === req.user._id.toString() ||
                     task.assignedTo?.toString() === req.user._id.toString() ||
                     project.members.some(member => 
                       member.user.toString() === req.user._id.toString() && 
                       member.permissions.includes('write')
                     );

      if (!canEdit) {
        return sendError(res, 403, 'No tienes permisos para editar esta tarea');
      }

      // Validar fechas si se están actualizando
      if (updateData.dueDate && updateData.startDate) {
        if (new Date(updateData.dueDate) <= new Date(updateData.startDate)) {
          return sendError(res, 400, 'La fecha límite debe ser posterior a la fecha de inicio');
        }
      }

      const updatedTask = await Task.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      ).populate([
        { path: 'assignedTo', select: 'firstName lastName email avatar' },
        { path: 'createdBy', select: 'firstName lastName email' },
        { path: 'status', select: 'name color' },
        { path: 'project', select: 'name' }
      ]);

      sendResponse(res, 200, true, 'Tarea actualizada exitosamente', {
        task: updatedTask
      });
    } catch (error) {
      console.error('Error actualizando tarea:', error);
      sendError(res, 500, 'Error interno del servidor');
    }
  }

  // Cambiar estado de tarea
  async changeTaskStatus(req, res) {
    try {
      const { id } = req.params;
      const { statusId } = req.body;

      const task = await Task.findById(id).populate(['status', 'project']);
      if (!task || !task.isActive) {
        return sendError(res, 404, 'Tarea no encontrada');
      }

      // Verificar permisos
      const canChangeStatus = task.assignedTo?.toString() === req.user._id.toString() ||
                             task.project.owner.toString() === req.user._id.toString();

      if (!canChangeStatus) {
        return sendError(res, 403, 'No tienes permisos para cambiar el estado de esta tarea');
      }

      // Verificar nuevo estado
      const newStatus = await State.findById(statusId);
      if (!newStatus || !newStatus.isActive || newStatus.type !== 'Task') {
        return sendError(res, 400, 'Estado no válido');
      }

      // Validar transición
      const currentStatus = await State.findById(task.status).populate('allowedTransitions');
      const isValidTransition = currentStatus.allowedTransitions.some(
        transition => transition._id.toString() === statusId
      ) || currentStatus._id.toString() === statusId;

      if (!isValidTransition && currentStatus.allowedTransitions.length > 0) {
        return sendError(res, 400, 'Transición de estado no válida');
      }

      task.status = statusId;

      // Si el estado es final, marcar como completada
      if (newStatus.isFinal) {
        task.completedAt = new Date();
      } else {
        task.completedAt = null;
      }

      await task.save();
      await task.populate('status', 'name color description');

      sendResponse(res, 200, true, 'Estado de tarea cambiado exitosamente', {
        task: {
          _id: task._id,
          title: task.title,
          status: task.status,
          completedAt: task.completedAt
        }
      });
    } catch (error) {
      console.error('Error cambiando estado de tarea:', error);
      sendError(res, 500, 'Error interno del servidor');
    }
  }

  // Asignar tarea a usuario
  async assignTask(req, res) {
    try {
      const { id } = req.params;
      const { userId } = req.body;

      const task = await Task.findById(id).populate('project');
      if (!task || !task.isActive) {
        return sendError(res, 404, 'Tarea no encontrada');
      }

      // Verificar permisos (solo owner o PM pueden asignar)
      const project = task.project;
      const canAssign = project.owner.toString() === req.user._id.toString() ||
                       project.members.some(member => 
                         member.user.toString() === req.user._id.toString() && 
                         member.permissions.includes('manage')
                       );

      if (!canAssign) {
        return sendError(res, 403, 'No tienes permisos para asignar tareas');
      }

      // Verificar que el usuario es miembro del proyecto
      const isProjectMember = project.owner.toString() === userId ||
                             project.members.some(member => member.user.toString() === userId);

      if (!isProjectMember) {
        return sendError(res, 400, 'El usuario debe ser miembro del proyecto');
      }

      task.assignedTo = userId;
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
      console.error('Error asignando tarea:', error);
      sendError(res, 500, 'Error interno del servidor');
    }
  }

  // Obtener tareas asignadas al usuario actual
  async getMyTasks(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 10, 50);
      const skip = (page - 1) * limit;
      
      const { status, priority, project, dueDate } = req.query;

      const filter = {
        assignedTo: req.user._id,
        isActive: true
      };

      if (status) filter.status = status;
      if (priority) filter.priority = priority;
      if (project) filter.project = project;

      if (dueDate) {
        const today = new Date();
        if (dueDate === 'overdue') {
          filter.dueDate = { $lt: today };
          filter.completedAt = { $exists: false };
        } else if (dueDate === 'today') {
          filter.dueDate = {
            $gte: new Date(today.setHours(0, 0, 0, 0)),
            $lt: new Date(today.setHours(23, 59, 59, 999))
          };
        } else if (dueDate === 'week') {
          const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          filter.dueDate = { $lte: weekFromNow };
        }
      }

      const tasks = await Task.find(filter)
        .populate('project', 'name owner')
        .populate('status', 'name color')
        .populate('createdBy', 'firstName lastName')
        .skip(skip)
        .limit(limit)
        .sort({ dueDate: 1, priority: -1 });

      const total = await Task.countDocuments(filter);

      // Estadísticas adicionales
      const stats = {
        total: await Task.countDocuments({ assignedTo: req.user._id, isActive: true }),
        completed: await Task.countDocuments({ 
          assignedTo: req.user._id, 
          isActive: true, 
          completedAt: { $exists: true } 
        }),
        overdue: await Task.countDocuments({
          assignedTo: req.user._id,
          isActive: true,
          dueDate: { $lt: new Date() },
          completedAt: { $exists: false }
        })
      };

      sendResponse(res, 200, true, 'Mis tareas obtenidas exitosamente', {
        tasks,
        stats,
        pagination: createPagination(page, limit, total)
      });
    } catch (error) {
      console.error('Error obteniendo mis tareas:', error);
      sendError(res, 500, 'Error interno del servidor');
    }
  }

  // Actualizar subtarea
  async updateSubtask(req, res) {
    try {
      const { id, subtaskId } = req.params;
      const { title, completed } = req.body;

      const task = await Task.findById(id);
      if (!task || !task.isActive) {
        return sendError(res, 404, 'Tarea no encontrada');
      }

      const subtask = task.subtasks.id(subtaskId);
      if (!subtask) {
        return sendError(res, 404, 'Subtarea no encontrada');
      }

      if (title) subtask.title = title;
      if (typeof completed === 'boolean') subtask.completed = completed;

      await task.save();

      sendResponse(res, 200, true, 'Subtarea actualizada exitosamente', {
        subtask,
        progress: task.subtaskProgress
      });
    } catch (error) {
      console.error('Error actualizando subtarea:', error);
      sendError(res, 500, 'Error interno del servidor');
    }
  }
}

module.exports = new TaskController();