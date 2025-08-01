const { body } = require('express-validator');

const validateComment = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Contenido debe tener entre 1 y 2000 caracteres')
];

module.exports = { validateComment };