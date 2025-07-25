const { body } = require('express-validator');

const validateComment = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('El contenido debe tener entre 1 y 2000 caracteres'),

  body('parentComment')
    .optional()
    .isMongoId()
    .withMessage('ID de comentario padre inválido'),

  body('mentions')
    .optional()
    .isArray()
    .withMessage('Las menciones deben ser un array'),

  body('mentions.*.user')
    .optional()
    .isMongoId()
    .withMessage('ID de usuario mencionado inválido')
];

module.exports = {
  validateComment
};