const { body } = require('express-validator');

const validateRole = [
  body('name')
    .trim()
    .isIn(['Admin', 'Project Manager', 'Developer', 'Viewer'])
    .withMessage('Rol inválido'),
  
  body('description')
    .trim()
    .isLength({ min: 10, max: 200 })
    .withMessage('Descripción: 10-200 caracteres')
];

module.exports = { validateRole };