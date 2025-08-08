const express = require('express');
const router = express.Router();
const controller = require('../controllers/state.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const adminMiddleware = require('../middlewares/admin.middleware');

router.get('/projects', controller.getProjectStates);
router.get('/tasks', controller.getTaskStates);
router.post('/', authMiddleware, adminMiddleware, controller.createState);
router.put('/:id', authMiddleware, adminMiddleware, controller.updateState);
router.delete('/:id', authMiddleware, adminMiddleware, controller.deleteState);

module.exports = router;