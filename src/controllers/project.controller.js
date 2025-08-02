const Project = require('../models/Project.model');
const State = require('../models/State.model');
const Category = require('../models/Category.model');
const User = require('../models/User.model');
const Role = require('../models/Role.model');
const { sendResponse, sendError } = require('../utils/response.util');

class ProjectController {
  // Listar proyectos del usuario con estadísticas
  async getProjects(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      const { status, priority, category } = req.query;

      // Filtros base
      const filter = {
        isActive: true,
        $or: [
          { owner: req.user.userId },
          { 'members.user': req.user.userId }
        ]
      };

      // Filtros adicionales
      if (status) filter.status = status;
      if (priority) filter.priority = priority;
      if (category) filter.category = category;

      const projects = await Project.find(filter)
        .populate('owner', 'firstName lastName email avatar')
        .populate('category', 'name description')
        .populate('status', 'name description')
        .populate('members.user', 'firstName lastName email avatar')
        .populate('members.role', 'name')
        .skip(skip)
        .limit(limit)
        .sort({ updatedAt: -1 });

      const total = await Project.countDocuments(filter);

      // Estadísticas adicionales
      const stats = await this.getProjectStats(req.user.userId);

      sendResponse(res, 200, true, 'Proyectos obtenidos exitosamente', {
        projects,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        stats,
        filters: { status, priority, category }
      });
    } catch (error) {
      console.error('Error obtener proyectos:', error);
      sendError(res, 500, 'Error interno del servidor');
    }
  }

  // Crear proyecto con configuraciones para tasks/comments
  async createProject(req, res) {
    try {
      const {
        name,
        description,
        category,
        startDate,
        endDate,
        estimatedHours,
        budget,
        priority,
        tags,
        settings
      } = req.body;

      // Verificar categoría
      const categoryExists = await Category.findById(category);
      if (!categoryExists || !categoryExists.isActive) {
        return sendError(res, 400, 'Categoría no válida');
      }

      // Estado inicial para proyecto
      let initialState = await State.findOne({
        type: 'Project',
        name: 'Planificación'
      });

      if (!initialState) {
        initialState = await State.create({
          name: 'Planificación',
          type: 'Project',
          description: 'Estado inicial del proyecto'
        });
      }

      // Obtener rol del usuario para el proyecto
      const userRole = await Role.findById(req.user.globalRole._id);

      // Configuraciones por defecto para integración con Maryamm
      const defaultSettings = {
        allowComments: true,
        allowTaskCreation: true,
        requireTaskApproval: userRole?.name === 'Developer',
        notifyOnTaskComplete: true,
        aiAssistEnabled: true,
        ...settings
      };

      // Permisos por defecto basados en rol
      const getPermissionsByRole = (roleName) => {
        switch(roleName) {
          case 'Admin':
            return {
              canCreateTasks: true,
              canEditTasks: true,
              canDeleteTasks: true,
              canAssignTasks: true
            };
          case 'Project Manager':
            return {
              canCreateTasks: true,
              canEditTasks: true,
              canDeleteTasks: true,
              canAssignTasks: true
            };
          case 'Developer':
            return {
              canCreateTasks: true,
              canEditTasks: true,
              canDeleteTasks: false,
              canAssignTasks: false
            };
          default:
            return {
              canCreateTasks: false,
              canEditTasks: false,
              canDeleteTasks: false,
              canAssignTasks: false
            };
        }
      };

      // Crear proyecto
      const project = await Project.create({
        name,
        description,
        category,
        owner: req.user.userId,
        startDate,
        endDate,
        estimatedHours,
        budget,
        priority,
        tags: tags || [],
        status: initialState._id,
        settings: defaultSettings,
        members: [{
          user: req.user.userId,
          role: userRole._id,
          permissions: getPermissionsByRole(userRole?.name)
        }],
        aiMetadata: {
          healthScore: 0,
          riskLevel: 'Low',
          recommendations: []
        }
      });

      // Poblar relaciones
      await project.populate([
        { path: 'owner', select: 'firstName lastName email avatar' },
        { path: 'category', select: 'name description' },
        { path: 'status', select: 'name description' },
        { path: 'members.user', select: 'firstName lastName email avatar' },
        { path: 'members.role', select: 'name' }
      ]);

      sendResponse(res, 201, true, 'Proyecto creado exitosamente', { project });
    } catch (error) {
      console.error('Error crear proyecto:', error);
      sendError(res, 500, 'Error interno del servidor');
    }
  }

  // Obtener proyecto específico con detalles completos
  async getProject(req, res) {
    try {
      const { id } = req.params;
      const includeStats = req.query.stats === 'true';

      const project = await Project.findById(id)
        .populate('owner', 'firstName lastName email avatar')
        .populate('category', 'name description')
        .populate('status', 'name description')
        .populate('members.user', 'firstName lastName email avatar')
        .populate('members.role', 'name');

      if (!project || !project.isActive) {
        return sendError(res, 404, 'Proyecto no encontrado');
      }

      // Verificar acceso
      const hasAccess = project.owner._id.toString() === req.user.userId ||
                       project.members.some(member => 
                         member.user._id.toString() === req.user.userId
                       );

      if (!hasAccess) {
        return sendError(res, 403, 'Sin acceso al proyecto');
      }

      let responseData = { project };

      // Incluir estadísticas si se solicitan
      if (includeStats) {
        try {
          // Estas estadísticas se completarán cuando Maryamm implemente Task
          const mongoose = require('mongoose');
          const Task = mongoose.model('Task');
          const Comment = mongoose.model('Comment');
          
          const [tasks, comments] = await Promise.all([
            Task.find({ project: id, isActive: true }).populate('status assignedTo'),
            Comment.find({ projectid: id }).populate('author')
          ]);

          const projectStats = {
            tasks: {
              total: tasks.length,
              completed: tasks.filter(t => t.completedAt).length,
              pending: tasks.filter(t => !t.completedAt).length,
              overdue: tasks.filter(t => t.dueDate < new Date() && !t.completedAt).length
            },
            comments: {
              total: comments.length,
              recent: comments.slice(-5)
            },
            progress: tasks.length > 0 ? 
              Math.round((tasks.filter(t => t.completedAt).length / tasks.length) * 100) : 0
          };

          responseData.stats = projectStats;
        } catch (statError) {
          // Si Task/Comment no existen aún, estadísticas básicas
          responseData.stats = {
            tasks: { total: 0, completed: 0, pending: 0, overdue: 0 },
            comments: { total: 0, recent: [] },
            progress: 0
          };
        }
      }

      sendResponse(res, 200, true, 'Proyecto obtenido exitosamente', responseData);
    } catch (error) {
      console.error('Error obtener proyecto:', error);
      sendError(res, 500, 'Error interno del servidor');
    }
  }

  // Actualizar proyecto
  async updateProject(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const project = await Project.findById(id);
      if (!project || !project.isActive) {
        return sendError(res, 404, 'Proyecto no encontrado');
      }

      // Verificar permisos (owner o PM del proyecto)
      const canEdit = project.owner.toString() === req.user.userId ||
                     project.members.some(member => 
                       member.user.toString() === req.user.userId && 
                       member.role.name === 'Project Manager'
                     );

      if (!canEdit) {
        return sendError(res, 403, 'Sin permisos para editar este proyecto');
      }

      // Validar categoría si se actualiza
      if (updateData.category) {
        const categoryExists = await Category.findById(updateData.category);
        if (!categoryExists || !categoryExists.isActive) {
          return sendError(res, 400, 'Categoría no válida');
        }
      }

      // No permitir cambio de owner por esta ruta
      delete updateData.owner;
      delete updateData.members;

      const updatedProject = await Project.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      ).populate([
        { path: 'owner', select: 'firstName lastName email avatar' },
        { path: 'category', select: 'name description' },
        { path: 'status', select: 'name description' },
        { path: 'members.user', select: 'firstName lastName email avatar' },
        { path: 'members.role', select: 'name' }
      ]);

      sendResponse(res, 200, true, 'Proyecto actualizado exitosamente', { project: updatedProject });
    } catch (error) {
      console.error('Error actualizar proyecto:', error);
      sendError(res, 500, 'Error interno del servidor');
    }
  }

  // Eliminar proyecto (soft delete)
  async deleteProject(req, res) {
    try {
      const { id } = req.params;

      const project = await Project.findById(id);
      if (!project || !project.isActive) {
        return sendError(res, 404, 'Proyecto no encontrado');
      }

      // Solo owner o Admin pueden eliminar
      const canDelete = project.owner.toString() === req.user.userId ||
                       req.user.role === 'Admin';

      if (!canDelete) {
        return sendError(res, 403, 'Sin permisos para eliminar este proyecto');
      }

      await Project.findByIdAndUpdate(id, { isActive: false });

      sendResponse(res, 200, true, 'Proyecto eliminado exitosamente');
    } catch (error) {
      console.error('Error eliminar proyecto:', error);
      sendError(res, 500, 'Error interno del servidor');
    }
  }

  // Agregar miembro al proyecto con permisos específicos
  async addMember(req, res) {
    try {
      const { id } = req.params;
      const { user, role, permissions } = req.body;

      const project = await Project.findById(id);
      if (!project || !project.isActive) {
        return sendError(res, 404, 'Proyecto no encontrado');
      }

      // Solo owner puede agregar miembros
      if (project.owner.toString() !== req.user.userId) {
        return sendError(res, 403, 'Solo el propietario puede agregar miembros');
      }

      // Verificar que el usuario existe
      const userExists = await User.findById(user);
      if (!userExists || !userExists.isActive) {
        return sendError(res, 400, 'Usuario no válido');
      }

      // Verificar que el rol existe
      const roleExists = await Role.findById(role);
      if (!roleExists || !roleExists.isActive) {
        return sendError(res, 400, 'Rol no válido');
      }

      // Verificar que no sea ya miembro
      const isAlreadyMember = project.members.some(
        member => member.user.toString() === user
      );

      if (isAlreadyMember) {
        return sendError(res, 400, 'El usuario ya es miembro del proyecto');
      }

      // Permisos por defecto basados en rol si no se especifican
      const defaultPermissions = permissions || this.getPermissionsByRole(roleExists.name);

      // Agregar miembro
      project.members.push({ 
        user, 
        role,
        permissions: defaultPermissions
      });
      await project.save();

      await project.populate([
        { path: 'members.user', select: 'firstName lastName email avatar' },
        { path: 'members.role', select: 'name' }
      ]);

      sendResponse(res, 200, true, 'Miembro agregado exitosamente', {
        project: {
          _id: project._id,
          name: project.name,
          members: project.members
        }
      });
    } catch (error) {
      console.error('Error agregar miembro:', error);
      sendError(res, 500, 'Error interno del servidor');
    }
  }

  // Remover miembro del proyecto
  async removeMember(req, res) {
    try {
      const { id, userId } = req.params;

      const project = await Project.findById(id);
      if (!project || !project.isActive) {
        return sendError(res, 404, 'Proyecto no encontrado');
      }

      // Solo owner puede remover miembros
      if (project.owner.toString() !== req.user.userId) {
        return sendError(res, 403, 'Solo el propietario puede remover miembros');
      }

      // No se puede remover al owner
      if (userId === project.owner.toString()) {
        return sendError(res, 400, 'No se puede remover al propietario del proyecto');
      }

      // Verificar que es miembro
      const memberIndex = project.members.findIndex(
        member => member.user.toString() === userId
      );

      if (memberIndex === -1) {
        return sendError(res, 400, 'El usuario no es miembro del proyecto');
      }

      // Remover miembro
      project.members.splice(memberIndex, 1);
      await project.save();

      sendResponse(res, 200, true, 'Miembro removido exitosamente');
    } catch (error) {
      console.error('Error remover miembro:', error);
      sendError(res, 500, 'Error interno del servidor');
    }
  }

  // Cambiar estado del proyecto
  async changeStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const project = await Project.findById(id);
      if (!project || !project.isActive) {
        return sendError(res, 404, 'Proyecto no encontrado');
      }

      // Verificar permisos (owner o PM del proyecto)
      const canChange = project.owner.toString() === req.user.userId ||
                       project.members.some(member => 
                         member.user.toString() === req.user.userId && 
                         member.role.name === 'Project Manager'
                       );

      if (!canChange) {
        return sendError(res, 403, 'Sin permisos para cambiar el estado');
      }

      // Verificar estado válido
      const newStatus = await State.findById(status);
      if (!newStatus || !newStatus.isActive || newStatus.type !== 'Project') {
        return sendError(res, 400, 'Estado no válido para proyectos');
      }

      project.status = status;
      
      // Actualizar progreso si el proyecto se completa
      if (newStatus.name === 'Completado') {
        project.aiMetadata.healthScore = 100;
      }

      await project.save();
      await project.populate('status', 'name description');

      sendResponse(res, 200, true, 'Estado actualizado exitosamente', {
        project: {
          _id: project._id,
          name: project.name,
          status: project.status,
          aiMetadata: project.aiMetadata
        }
      });
    } catch (error) {
      console.error('Error cambiar estado:', error);
      sendError(res, 500, 'Error interno del servidor');
    }
  }

  // Actualizar configuraciones del proyecto
  async updateSettings(req, res) {
    try {
      const { id } = req.params;
      const { settings } = req.body;

      const project = await Project.findById(id);
      if (!project || !project.isActive) {
        return sendError(res, 404, 'Proyecto no encontrado');
      }

      // Solo owner puede cambiar configuraciones
      if (project.owner.toString() !== req.user.userId) {
        return sendError(res, 403, 'Solo el propietario puede cambiar configuraciones');
      }

      project.settings = { ...project.settings, ...settings };
      await project.save();

      sendResponse(res, 200, true, 'Configuraciones actualizadas', {
        settings: project.settings
      });
    } catch (error) {
      console.error('Error actualizar configuraciones:', error);
      sendError(res, 500, 'Error interno del servidor');
    }
  }

  // Actualizar permisos de miembro
  async updateMemberPermissions(req, res) {
    try {
      const { id, userId } = req.params;
      const { permissions } = req.body;

      const project = await Project.findById(id);
      if (!project || !project.isActive) {
        return sendError(res, 404, 'Proyecto no encontrado');
      }

      // Solo owner puede cambiar permisos
      if (project.owner.toString() !== req.user.userId) {
        return sendError(res, 403, 'Solo el propietario puede cambiar permisos');
      }

      const memberIndex = project.members.findIndex(
        member => member.user.toString() === userId
      );

      if (memberIndex === -1) {
        return sendError(res, 400, 'Usuario no es miembro del proyecto');
      }

      project.members[memberIndex].permissions = {
        ...project.members[memberIndex].permissions,
        ...permissions
      };

      await project.save();

      sendResponse(res, 200, true, 'Permisos actualizados exitosamente', {
        member: project.members[memberIndex]
      });
    } catch (error) {
      console.error('Error actualizar permisos:', error);
      sendError(res, 500, 'Error interno del servidor');
    }
  }

  // Helper: Obtener estadísticas del usuario
  async getProjectStats(userId) {
    try {
      const totalProjects = await Project.countDocuments({
        $or: [{ owner: userId }, { 'members.user': userId }],
        isActive: true
      });

      const ownedProjects = await Project.countDocuments({
        owner: userId,
        isActive: true
      });

      const memberProjects = totalProjects - ownedProjects;

      const overdueProjects = await Project.countDocuments({
        $or: [{ owner: userId }, { 'members.user': userId }],
        isActive: true,
        endDate: { $lt: new Date() }
      });

      return {
        total: totalProjects,
        owned: ownedProjects,
        member: memberProjects,
        overdue: overdueProjects
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      return { total: 0, owned: 0, member: 0, overdue: 0 };
    }
  }

  // Helper: Permisos por rol
  getPermissionsByRole(roleName) {
    switch(roleName) {
      case 'Admin':
        return {
          canCreateTasks: true,
          canEditTasks: true,
          canDeleteTasks: true,
          canAssignTasks: true
        };
      case 'Project Manager':
        return {
          canCreateTasks: true,
          canEditTasks: true,
          canDeleteTasks: true,
          canAssignTasks: true
        };
      case 'Developer':
        return {
          canCreateTasks: true,
          canEditTasks: true,
          canDeleteTasks: false,
          canAssignTasks: false
        };
      default:
        return {
          canCreateTasks: false,
          canEditTasks: false,
          canDeleteTasks: false,
          canAssignTasks: false
        };
    }
  }
}

module.exports = new ProjectController();