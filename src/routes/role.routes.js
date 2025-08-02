const express = require('express');
const router = express.Router();
const roleController = require('../controllers/role.controller');
const { validateRole } = require('../validators/role.validator');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { handleValidation } = require('../middlewares/validation.middleware');

router.use(authenticate);

router.get('/', roleController.getRoles);
router.post('/', authorize(['Admin']), validateRole, handleValidation, roleController.createRole);
router.put('/:id', authorize(['Admin']), validateRole, handleValidation, roleController.updateRole);
router.delete('/:id', authorize(['Admin']), roleController.deleteRole);

module.exports = router;
