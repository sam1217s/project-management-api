const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { validateProfile, validateRole } = require('../validators/user.validator');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { handleValidation } = require('../middlewares/validation.middleware');

// Todas requieren autenticación
router.use(authenticate);

router.get('/', authorize(['Admin']), userController.getUsers);
router.get('/profile', userController.getProfile);
router.put('/profile', validateProfile, handleValidation, userController.updateProfile);
router.delete('/:id', authorize(['Admin']), userController.deleteUser);
router.put('/:id/role', authorize(['Admin']), validateRole, handleValidation, userController.changeRole);

module.exports = router;