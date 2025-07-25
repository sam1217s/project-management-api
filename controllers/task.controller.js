const aiService = require('../service/ai.service');

// Controlador para dividir idea en tareas usando IA
async function dividirIdeaEnTareas(req, res) {
  try {
    const { idea } = req.body;
    const tasks = await aiService.dividirIdeaEnTareas(idea);
    res.json({ tasks });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  dividirIdeaEnTareas,
};
