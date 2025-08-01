const { body } = require('express-validator');

const generateTasks = [
  body('projectDescription')
    .trim()
    .isLength({ min: 20, max: 2000 })
    .withMessage('Descripción del proyecto: 20-2000 caracteres'),

  body('projectId')
    .isMongoId()
    .withMessage('ID de proyecto inválido')
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
    .withMessage('Descripción de tarea: 10-1000 caracteres'),

  body('complexity')
    .optional()
    .isIn(['Low', 'Medium', 'High'])
    .withMessage('Complejidad inválida')
];

const generateSummary = [
  body('projectId')
    .isMongoId()
    .withMessage('ID de proyecto inválido')
];

const suggestImprovements = [
  body('projectId')
    .isMongoId()
    .withMessage('ID de proyecto inválido')
];

module.exports = {
  validateAI: {
    generateTasks,
    analyzeProject,
    estimateTime,
    generateSummary,
    suggestImprovements
  }
};