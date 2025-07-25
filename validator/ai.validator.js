const { body } = require('express-validator');

const generateTasks = [
  body('projectDescription')
    .trim()
    .isLength({ min: 20, max: 2000 })
    .withMessage('La descripción del proyecto debe tener entre 20 y 2000 caracteres'),

  body('projectId')
    .isMongoId()
    .withMessage('ID de proyecto inválido'),

  body('estimatedHours')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('Las horas estimadas deben ser un número positivo'),

  body('autoCreate')
    .optional()
    .isBoolean()
    .withMessage('autoCreate debe ser un booleano')
];

const analyzeProject = [
  body('projectId')
    .isMongoId()
    .withMessage('ID de proyecto inválido')
];

const estimateTime = [
  body('taskDescription')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('La descripción de la tarea debe tener entre 10 y 1000 caracteres'),

  body('complexity')
    .optional()
    .isIn(['Low', 'Medium', 'High', 'Very High'])
    .withMessage('Complejidad inválida'),

  body('technology')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('La tecnología no puede exceder 100 caracteres'),

  body('teamExperience')
    .optional()
    .isIn(['Junior', 'Intermediate', 'Senior', 'Expert'])
    .withMessage('Experiencia del equipo inválida')
];

const generateSummary = [
  body('projectId')
    .isMongoId()
    .withMessage('ID de proyecto inválido'),

  body('period')
    .optional()
    .isIn(['week', 'month'])
    .withMessage('Período inválido (week o month)')
];

module.exports = {
  validateAIRequest: {
    generateTasks,
    analyzeProject,
    estimateTime,
    generateSummary
  }
};