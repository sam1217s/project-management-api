const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_API_KEY = 'AIzaSyC126kmOQjBH3H6bh1kqa2Cv57XsFza-bU';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

router.post('/gemini', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt requerido' });
    }
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    res.json({ text: response.text() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

// Ruta para dividir una idea de proyecto en tareas usando Gemini
router.post('/gemini/tasks', async (req, res) => {
  try {
    const { idea } = req.body;
    if (!idea) {
      return res.status(400).json({ error: 'Idea de proyecto requerida' });
    }
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const prompt = `Divide la siguiente idea de proyecto en tareas concretas y detalladas, responde en formato de lista:\n\nIdea: ${idea}`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    res.json({ tasks: response.text() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
