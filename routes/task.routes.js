const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');

// Ruta para dividir idea en tareas usando IA
router.post('/dividir-idea', taskController.dividirIdeaEnTareas);

module.exports = router;
