const { body, param } = require('express-validator');

const validateTask = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('El título debe tener entre 3 y 100 caracteres'),

  body('description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('La descripción debe tener entre 10 y 1000 caracteres'),

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
    .withMessage('Las horas estimadas deben ser un número positivo'),

  body('dueDate')
    .isISO8601()
    .withMessage('Fecha límite inválida'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('Los tags deben ser un array'),

  body('tags.*')
    .optional()
    .isLength({ min: 1, max: 20 })
    .withMessage('Cada tag debe tener entre 1 y 20 caracteres'),

  body('subtasks')
    .optional()
    .isArray()
    .withMessage('Las subtareas deben ser un array'),

  body('subtasks.*.title')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('El título de la subtarea debe tener entre 1 y 200 caracteres')
];

const validateTaskStatus = [
  body('statusId')
    .isMongoId()
    .withMessage('ID de estado inválido')
];

const validateAssignment = [
  body('userId')
    .isMongoId()
    .withMessage('ID de usuario inválido')
];

module.exports = {
  validateTask,
  validateTaskStatus,
  validateAssignment
};