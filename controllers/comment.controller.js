const Comment = require('../models/comment.model');
const Project = require('../models/Project.model');
const Task = require('../models/Task.model');
const { sendResponse, sendError, createPagination } = require('../utils/response.util');

class CommentController {
  // Obtener comentarios de un proyecto
  async getProjectComments(req, res) {
    try {
      const { id } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const skip = (page - 1) * limit;

      // Verificar acceso al proyecto
      const project = await Project.findById(id);
      if (!project) {
        return sendError(res, 404, 'Proyecto no encontrado');
      }

      const hasAccess = project.owner.toString() === req.user._id.toString() ||
                       project.members.some(member => member.user.toString() === req.user._id.toString());

      if (!hasAccess) {
        return sendError(res, 403, 'No tienes acceso a este proyecto');
      }

      const comments = await Comment.find({
        projectId: id,
        isDeleted: false,
        parentComment: { $exists: false } // Solo comentarios principales
      })
      .populate('author', 'firstName lastName avatar')
      .populate('mentions.user', 'firstName lastName')
      .populate({
        path: 'parentComment',
        populate: {
          path: 'author',
          select: 'firstName lastName avatar'
        }
      })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

      // Obtener respuestas para cada comentario
      for (let comment of comments) {
        const replies = await Comment.find({
          parentComment: comment._id,
          isDeleted: false
        })
        .populate('author', 'firstName lastName avatar')
        .sort({ createdAt: 1 })
        .limit(5); // Limitar respuestas mostradas

        comment.replies = replies;
      }

      const total = await Comment.countDocuments({
        projectId: id,
        isDeleted: false,
        parentComment: { $exists: false }
      });

      sendResponse(res, 200, true, 'Comentarios obtenidos exitosamente', {
        comments,
        pagination: createPagination(page, limit, total)
      });
    } catch (error) {
      console.error('Error obteniendo comentarios:', error);
      sendError(res, 500, 'Error interno del servidor');
    }
  }

  // Crear comentario en proyecto
  async createProjectComment(req, res) {
    try {
      const { id } = req.params;
      const { content, parentComment, mentions } = req.body;

      // Verificar acceso al proyecto
      const project = await Project.findById(id);
      if (!project) {
        return sendError(res, 404, 'Proyecto no encontrado');
      }

      const hasAccess = project.owner.toString() === req.user._id.toString() ||
                       project.members.some(member => member.user.toString() === req.user._id.toString());

      if (!hasAccess) {
        return sendError(res, 403, 'No tienes acceso a este proyecto');
      }

      // Crear comentario
      const comment = await Comment.create({
        content,
        author: req.user._id,
        projectId: id,
        parentComment,
        mentions
      });

      await comment.populate('author', 'firstName lastName avatar');

      sendResponse(res, 201, true, 'Comentario creado exitosamente', { comment });
    } catch (error) {
      console.error('Error creando comentario:', error);
      sendError(res, 500, 'Error interno del servidor');
    }
  }

  // Actualizar comentario
  async updateComment(req, res) {
    try {
      const { id } = req.params;
      const { content } = req.body;

      const comment = await Comment.findById(id);
      if (!comment || comment.isDeleted) {
        return sendError(res, 404, 'Comentario no encontrado');
      }

      // Solo el autor puede editar
      if (comment.author.toString() !== req.user._id.toString()) {
        return sendError(res, 403, 'Solo puedes editar tus propios comentarios');
      }

      comment.content = content;
      comment.isEdited = true;
      comment.editedAt = new Date();
      
      await comment.save();
      await comment.populate('author', 'firstName lastName avatar');

      sendResponse(res, 200, true, 'Comentario actualizado exitosamente', { comment });
    } catch (error) {
      console.error('Error actualizando comentario:', error);
      sendError(res, 500, 'Error interno del servidor');
    }
  }

  // Eliminar comentario
  async deleteComment(req, res) {
    try {
      const { id } = req.params;

      const comment = await Comment.findById(id);
      if (!comment || comment.isDeleted) {
        return sendError(res, 404, 'Comentario no encontrado');
      }

      // Solo el autor o admin pueden eliminar
      const canDelete = comment.author.toString() === req.user._id.toString() ||
                       req.user.globalRole.name === 'Admin';

      if (!canDelete) {
        return sendError(res, 403, 'No tienes permisos para eliminar este comentario');
      }

      comment.isDeleted = true;
      comment.deletedAt = new Date();
      await comment.save();

      sendResponse(res, 200, true, 'Comentario eliminado exitosamente');
    } catch (error) {
      console.error('Error eliminando comentario:', error);
      sendError(res, 500, 'Error interno del servidor');
    }
  }

  // Agregar reacción a comentario
  async addReaction(req, res) {
    try {
      const { id } = req.params;
      const { type = 'like' } = req.body;

      const comment = await Comment.findById(id);
      if (!comment || comment.isDeleted) {
        return sendError(res, 404, 'Comentario no encontrado');
      }

      // Verificar si ya reaccionó
      const existingReaction = comment.reactions.find(
        reaction => reaction.user.toString() === req.user._id.toString()
      );

      if (existingReaction) {
        existingReaction.type = type;
      } else {
        comment.reactions.push({
          user: req.user._id,
          type
        });
      }

      await comment.save();

      sendResponse(res, 200, true, 'Reacción agregada exitosamente', {
        reactionSummary: comment.reactionSummary
      });
    } catch (error) {
      console.error('Error agregando reacción:', error);
      sendError(res, 500, 'Error interno del servidor');
    }
  }
}

module.exports = new CommentController();