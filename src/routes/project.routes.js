const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');
const { 
  validateProject, 
  validateMember, 
  validateStatus,
  validateSettings,
  validatePermissions
} = require('../validators/project.validator');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { handleValidation } = require('../middlewares/validation.middleware');

// Todas las rutas requieren autenticación
router.use(authenticate);

// Rutas principales
router.get('/', projectController.getProjects);
router.post('/', 
  authorize(['Admin', 'Project Manager']), 
  validateProject, 
  handleValidation, 
  projectController.createProject
);
router.get('/:id', projectController.getProject);
router.put('/:id', 
  validateProject, 
  handleValidation, 
  projectController.updateProject
);
router.delete('/:id', 
  authorize(['Admin']), 
  projectController.deleteProject
);

// Gestión de miembros
router.post('/:id/members', 
  validateMember, 
  handleValidation, 
  projectController.addMember
);
router.delete('/:id/members/:userId', 
  projectController.removeMember
);
router.put('/:id/members/:userId/permissions',
  validatePermissions,
  handleValidation,
  projectController.updateMemberPermissions
);

// Estado y configuraciones
router.put('/:id/status', 
  validateStatus, 
  handleValidation, 
  projectController.changeStatus
);
router.put('/:id/settings',
  validateSettings,
  handleValidation,
  projectController.updateSettings
);

module.exports = router;