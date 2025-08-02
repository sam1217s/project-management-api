const { body, param } = require('express-validator');

const validateProject = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Nombre debe tener entre 3 y 100 caracteres'),

  body('description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Descripción debe tener entre 10 y 1000 caracteres'),

  body('category')
    .isMongoId()
    .withMessage('ID de categoría inválido'),

  body('startDate')
    .isISO8601()
    .withMessage('Fecha de inicio inválida'),

  body('endDate')
    .isISO8601()
    .withMessage('Fecha de fin inválida')
    .custom((endDate, { req }) => {
      if (new Date(endDate) <= new Date(req.body.startDate)) {
        throw new Error('Fecha de fin debe ser posterior al inicio');
      }
      return true;
    }),

  body('estimatedHours')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Horas estimadas deben ser positivas'),

  body('budget')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Presupuesto debe ser positivo'),

  body('priority')
    .optional()
    .isIn(['Low', 'Medium', 'High', 'Critical'])
    .withMessage('Prioridad inválida'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags deben ser un array'),

  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('Cada tag debe tener entre 1 y 20 caracteres'),

  body('settings')
    .optional()
    .isObject()
    .withMessage('Settings debe ser un objeto'),

  body('settings.allowComments')
    .optional()
    .isBoolean()
    .withMessage('allowComments debe ser booleano'),

  body('settings.allowTaskCreation')
    .optional()
    .isBoolean()
    .withMessage('allowTaskCreation debe ser booleano'),

  body('settings.requireTaskApproval')
    .optional()
    .isBoolean()
    .withMessage('requireTaskApproval debe ser booleano'),

  body('settings.notifyOnTaskComplete')
    .optional()
    .isBoolean()
    .withMessage('notifyOnTaskComplete debe ser booleano'),

  body('settings.aiAssistEnabled')
    .optional()
    .isBoolean()
    .withMessage('aiAssistEnabled debe ser booleano')
];

const validateMember = [
  body('user')
    .isMongoId()
    .withMessage('ID de usuario inválido'),

  body('role')
    .isMongoId()
    .withMessage('ID de rol inválido'),

  body('permissions')
    .optional()
    .isObject()
    .withMessage('Permisos debe ser un objeto'),

  body('permissions.canCreateTasks')
    .optional()
    .isBoolean()
    .withMessage('canCreateTasks debe ser booleano'),

  body('permissions.canEditTasks')
    .optional()
    .isBoolean()
    .withMessage('canEditTasks debe ser booleano'),

  body('permissions.canDeleteTasks')
    .optional()
    .isBoolean()
    .withMessage('canDeleteTasks debe ser booleano'),

  body('permissions.canAssignTasks')
    .optional()
    .isBoolean()
    .withMessage('canAssignTasks debe ser booleano')
];

const validateStatus = [
  body('status')
    .isMongoId()
    .withMessage('ID de estado inválido')
];

const validateSettings = [
  body('settings')
    .isObject()
    .withMessage('Settings es requerido y debe ser un objeto'),

  body('settings.allowComments')
    .optional()
    .isBoolean()
    .withMessage('allowComments debe ser booleano'),

  body('settings.allowTaskCreation')
    .optional()
    .isBoolean()
    .withMessage('allowTaskCreation debe ser booleano'),

  body('settings.requireTaskApproval')
    .optional()
    .isBoolean()
    .withMessage('requireTaskApproval debe ser booleano'),

  body('settings.notifyOnTaskComplete')
    .optional()
    .isBoolean()
    .withMessage('notifyOnTaskComplete debe ser booleano'),

  body('settings.aiAssistEnabled')
    .optional()
    .isBoolean()
    .withMessage('aiAssistEnabled debe ser booleano')
];

const validatePermissions = [
  body('permissions')
    .isObject()
    .withMessage('Permisos es requerido y debe ser un objeto'),

  body('permissions.canCreateTasks')
    .optional()
    .isBoolean()
    .withMessage('canCreateTasks debe ser booleano'),

  body('permissions.canEditTasks')
    .optional()
    .isBoolean()
    .withMessage('canEditTasks debe ser booleano'),

  body('permissions.canDeleteTasks')
    .optional()
    .isBoolean()
    .withMessage('canDeleteTasks debe ser booleano'),

  body('permissions.canAssignTasks')
    .optional()
    .isBoolean()
    .withMessage('canAssignTasks debe ser booleano')
];

module.exports = {
  validateProject,
  validateMember,
  validateStatus,
  validateSettings,
  validatePermissions
};
