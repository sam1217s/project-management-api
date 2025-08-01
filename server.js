const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.json());

// Rutas
const aiRoutes = require(__dirname + '/routes/ai.routes');
app.use('/api', aiRoutes);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
// Rutas existentes...
app.use('/api/auth', require('./src/routes/auth.routes'));
app.use('/api/users', require('./src/routes/user.routes'));
app.use('/api/roles', require('./src/routes/role.routes'));
app.use('/api/categories', require('./src/routes/category.routes'));
app.use('/api/states', require('./src/routes/state.routes'));
app.use('/api/upload', require('./src/routes/upload.routes'));
app.use('/api/projects', require('./src/routes/project.routes'));

// ✅ NUEVAS RUTAS DE MARIAM:
app.use('/api/tasks', require('./src/routes/task.routes'));
app.use('/api/comments', require('./src/routes/comment.routes'));
app.use('/api/ai', require('./src/routes/ai.routes'));

// Middleware de errores (al final)
app.use(require('./src/middlewares/error.middleware'));

