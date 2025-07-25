const express = require('express');
const router = express.Router();
const commentController = require('../controllers/comment.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validateComment } = require('../validators/comment.validator');
const { validateRequest } = require('../middlewares/validation.middleware');

// Todas las rutas requieren autenticación
router.use(authenticate);

// Rutas de comentarios
router.get('/projects/:id/comments', commentController.getProjectComments);
router.post('/projects/:id/comments', validateComment, validateRequest, commentController.createProjectComment);
router.put('/:id', validateComment, validateRequest, commentController.updateComment);
router.delete('/:id', commentController.deleteComment);
router.post('/:id/reactions', commentController.addReaction);

module.exports = router;