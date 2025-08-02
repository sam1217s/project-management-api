const { body } = require('express-validator');

const validateProfile = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Nombre: 2-50 caracteres'),
  
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Apellido: 2-50 caracteres'),
  
  body('phone')
    .optional()
    .matches(/^\+?[\d\s-()]+$/)
    .withMessage('Teléfono inválido')
];

const validateRole = [
  body('roleId')
    .isMongoId()
    .withMessage('ID de rol inválido')
];

module.exports = { validateProfile, validateRole };