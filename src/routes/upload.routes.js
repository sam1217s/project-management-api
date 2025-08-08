const express = require('express');
const router = express.Router();
const controller = require('../controllers/upload.controller');
const { uploadAvatar, uploadDocument } = require('../middlewares/upload.middleware');
const authMiddleware = require('../middlewares/auth.middleware');

router.post('/avatar', authMiddleware, uploadAvatar, controller.uploadAvatar);
router.post('/document', authMiddleware, uploadDocument, controller.uploadDocument);
router.delete('/:filename', authMiddleware, controller.deleteFile);

module.exports = router;