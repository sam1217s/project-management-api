const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');
const { validateTask, validateTaskStatus, validateAssign } = require('../validators/task.validator');
const { authenticate } = require('../middlewares/auth.middleware');
const { handleValidation } = require('../middlewares/validation.middleware');

router.use(authenticate);

router.get('/projects/:projectId/tasks', taskController.getProjectTasks);
router.post('/projects/:projectId/tasks', validateTask, handleValidation, taskController.createTask);
router.get('/my-tasks', taskController.getMyTasks);
router.get('/:id', taskController.getTask);
router.put('/:id', validateTask, handleValidation, taskController.updateTask);
router.delete('/:id', taskController.deleteTask);
router.put('/:id/status', validateTaskStatus, handleValidation, taskController.changeTaskStatus);
router.put('/:id/assign', validateAssign, handleValidation, taskController.assignTask);

module.exports = router;