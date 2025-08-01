const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const { validateAI } = require('../validators/ai.validator');
const { authenticate } = require('../middlewares/auth.middleware');
const { handleValidation } = require('../middlewares/validation.middleware');

router.use(authenticate);

router.post('/generate-tasks', validateAI.generateTasks, handleValidation, aiController.generateTasks);
router.post('/analyze-project', validateAI.analyzeProject, handleValidation, aiController.analyzeProject);
router.post('/estimate-time', validateAI.estimateTime, handleValidation, aiController.estimateTime);
router.post('/generate-summary', validateAI.generateSummary, handleValidation, aiController.generateSummary);
router.post('/suggest-improvements', validateAI.suggestImprovements, handleValidation, aiController.suggestImprovements);

module.exports = router;