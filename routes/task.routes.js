const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validateTask, validateTaskStatus, validateAssignment } = require('../validators/task.validator');
const { validateRequest } = require('../middlewares/validation.middleware');

// Todas las rutas requieren autenticación
router.use(authenticate);

// Rutas de tareas
router.get('/my-tasks', taskController.getMyTasks);
router.get('/projects/:projectId/tasks', taskController.getProjectTasks);
router.post('/projects/:projectId/tasks', validateTask, validateRequest, taskController.createTask);
router.get('/:id', taskController.getTask);
router.put('/:id', validateTask, validateRequest, taskController.updateTask);
router.put('/:id/status', validateTaskStatus, validateRequest, taskController.changeTaskStatus);
router.put('/:id/assign', validateAssignment, validateRequest, taskController.assignTask);
router.put('/:id/subtasks/:subtaskId', taskController.updateSubtask);

module.exports = router;