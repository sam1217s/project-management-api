const { check } = require('express-validator');

exports.categoryValidationRules = () => [
  check('name').notEmpty().withMessage('Name is required').trim(),
  check('description').optional().trim()
];

exports.stateValidationRules = () => [
  check('name').notEmpty().withMessage('Name is required').trim(),
  check('type').isIn(['project', 'task']).withMessage('Invalid state type'),
  check('description').optional().trim()
];