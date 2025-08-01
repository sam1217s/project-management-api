const Comment = require('../models/Comment.model');
const Project = require('../models/Project.model');
const { sendResponse, sendError } = require('../utils/response.util');

class CommentController {
  // Obtener comentarios del proyecto
  async getProjectComments(req, res) {
    try {
      const { id } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      // Verificar acceso al proyecto
      const project = await Project.findById(id);
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

      const comments = await Comment.find({ projectid: id })
        .populate('author', 'firstName lastName email avatar')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      const total = await Comment.countDocuments({ projectid: id });

      sendResponse(res, 200, true, 'Comentarios obtenidos', {
        comments,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error obtener comentarios:', error);
      sendError(res, 500, 'Error interno del servidor');
    }
  }

  // Crear comentario
  async createComment(req, res) {
    try {
      const { id } = req.params;
      const { content } = req.body;

      // Verificar acceso al proyecto
      const project = await Project.findById(id);
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

      const comment = await Comment.create({
        content,
        author: req.user.userId,
        projectid: id
      });

      await comment.populate('author', 'firstName lastName email avatar');

      sendResponse(res, 201, true, 'Comentario creado exitosamente', { comment });
    } catch (error) {
      console.error('Error crear comentario:', error);
      sendError(res, 500, 'Error interno del servidor');
    }
  }

  // Editar comentario
  async updateComment(req, res) {
    try {
      const { id } = req.params;
      const { content } = req.body;

      const comment = await Comment.findById(id);
      if (!comment) {
        return sendError(res, 404, 'Comentario no encontrado');
      }

      // Solo el autor puede editar
      if (comment.author.toString() !== req.user.userId) {
        return sendError(res, 403, 'Solo puedes editar tus propios comentarios');
      }

      comment.content = content;
      comment.editedAt = new Date();
      await comment.save();

      await comment.populate('author', 'firstName lastName email avatar');

      sendResponse(res, 200, true, 'Comentario actualizado exitosamente', { comment });
    } catch (error) {
      console.error('Error actualizar comentario:', error);
      sendError(res, 500, 'Error interno del servidor');
    }
  }

  // Eliminar comentario
  async deleteComment(req, res) {
    try {
      const { id } = req.params;

      const comment = await Comment.findById(id);
      if (!comment) {
        return sendError(res, 404, 'Comentario no encontrado');
      }

      // Solo el autor o admin pueden eliminar
      const canDelete = comment.author.toString() === req.user.userId ||
                       req.user.role === 'Admin';

      if (!canDelete) {
        return sendError(res, 403, 'Sin permisos para eliminar este comentario');
      }

      await Comment.findByIdAndDelete(id);

      sendResponse(res, 200, true, 'Comentario eliminado exitosamente');
    } catch (error) {
      console.error('Error eliminar comentario:', error);
      sendError(res, 500, 'Error interno del servidor');
    }
  }
}

module.exports = new CommentController();