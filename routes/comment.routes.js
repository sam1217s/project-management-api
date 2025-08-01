const express = require('express');
const router = express.Router();
const commentController = require('../controllers/comment.controller');
const { validateComment } = require('../validators/comment.validator');
const { authenticate } = require('../middlewares/auth.middleware');
const { handleValidation } = require('../middlewares/validation.middleware');

router.use(authenticate);

router.get('/projects/:id/comments', commentController.getProjectComments);
router.post('/projects/:id/comments', validateComment, handleValidation, commentController.createComment);
router.put('/:id', validateComment, handleValidation, commentController.updateComment);
router.delete('/:id', commentController.deleteComment);

module.exports = router;