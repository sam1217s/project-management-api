// src/validators/task.validator.js
const { body } = require('express-validator');

const validateTask = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Título debe tener entre 3 y 100 caracteres'),

  body('description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Descripción debe tener entre 10 y 1000 caracteres'),

  body('assignedTo')
    .optional()
    .isMongoId()
    .withMessage('ID de usuario asignado inválido'),

  body('priority')
    .optional()
    .isIn(['Low', 'Medium', 'High', 'Critical'])
    .withMessage('Prioridad inválida'),

  body('estimatedHours')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Horas estimadas deben ser positivas'),

  body('dueDate')
    .isISO8601()
    .withMessage('Fecha límite inválida'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags deben ser un array')
];

const validateTaskStatus = [
  body('status')
    .isMongoId()
    .withMessage('ID de estado inválido')
];

const validateAssign = [
  body('user')
    .isMongoId()
    .withMessage('ID de usuario inválido')
];

module.exports = { validateTask, validateTaskStatus, validateAssign };