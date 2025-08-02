👥 División de Trabajo - API Gestión de Proyectos
👨‍💻 Samuel Gomez - Módulo de Autenticación y Usuarios
🎯 Responsabilidades

Configuración inicial del proyecto
Sistema de autenticación completo
Gestión de usuarios y roles
Middleware de seguridad

📋 Tareas Específicas
1. Configuración Base

 Configurar servidor Express
 Conexión a MongoDB
 Configuración de middlewares globales
 Manejo de errores centralizado
 Rate limiting

2. Modelos

 User.model.js - Modelo de usuarios
 Role.model.js - Modelo de roles

3. Autenticación

 auth.controller.js - Controlador de autenticación
 auth.routes.js - Rutas de autenticación
 auth.service.js - Servicios de autenticación
 auth.validator.js - Validaciones de autenticación

4. Gestión de Usuarios

 user.controller.js - Controlador de usuarios
 user.routes.js - Rutas de usuarios
 user.validator.js - Validaciones de usuarios

5. Roles y Permisos

 role.controller.js - Controlador de roles
 role.routes.js - Rutas de roles
 role.middleware.js - Middleware de autorización

6. Servicios

 email.service.js - Servicio de emails
 encryption.util.js - Utilidades de encriptación

🛠️ Endpoints a desarrollar
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
POST /api/auth/forgot-password
POST /api/auth/reset-password
POST /api/auth/verify-email       # NUEVA RUTA
POST /api/auth/resend-verification # NUEVA RUTA

GET  /api/users
GET  /api/users/profile
PUT  /api/users/profile
DELETE /api/users/:id
PUT  /api/users/:id/role

GET  /api/roles
POST /api/roles
PUT  /api/roles/:id
DELETE /api/roles/:id