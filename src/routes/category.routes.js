const express = require('express');
const router = express.Router();
const controller = require('../controllers/category.controller');
const validationMiddleware = require('../middlewares/validation.middleware');
const authMiddleware = require('../middlewares/auth.middleware');

router.get('/', controller.getAllCategories);
router.post('/', authMiddleware, validationMiddleware.validateCategory, controller.createCategory);
router.put('/:id', authMiddleware, validationMiddleware.validateCategory, controller.updateCategory);
router.delete('/:id', authMiddleware, controller.deleteCategory);

module.exports = router;