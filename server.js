const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.json());

// Rutas
app.use('/api/ai', require('./routes/ai.routes'));
// Agrega aquí otras rutas si las necesitas

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});