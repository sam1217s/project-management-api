const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Ruta de prueba para verificar el router
router.post('/test', (req, res) => {
  res.json({ ok: true, msg: 'La ruta /api/test funciona correctamente.' });
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post('/gemini', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt requerido' });
    }
    const model = genAI.getGenerativeModel({ model: 'gemini-1.0-pro' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    res.json({ text: response.text() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ruta para dividir una idea de proyecto en tareas usando Gemini
router.post('/gemini/tasks', async (req, res) => {
  try {
    const { idea } = req.body;
    if (!idea) {
      return res.status(400).json({ error: 'Idea de proyecto requerida' });
    }
    const model = genAI.getGenerativeModel({ model: 'gemini-1.0-pro' });
    const prompt = `Divide la siguiente idea de proyecto en tareas concretas y detalladas, responde en formato de lista:\n\nIdea: ${idea}`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    res.json({ tasks: response.text() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
