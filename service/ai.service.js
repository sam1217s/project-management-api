const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_API_KEY = 'AIzaSyC126kmOQjBH3H6bh1kqa2Cv57XsFza-bU';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

async function dividirIdeaEnTareas(idea) {
  if (!idea) throw new Error('Idea de proyecto requerida');
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
  const prompt = `Divide la siguiente idea de proyecto en tareas concretas y detalladas, responde en formato de lista:\n\nIdea: ${idea}`;
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

module.exports = {
  dividirIdeaEnTareas,
};
