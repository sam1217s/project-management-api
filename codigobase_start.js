// server.js - Archivo principal (Samuel)
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Middlewares globales
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW * 60 * 1000,
  max: process.env.RATE_LIMIT_MAX_REQUESTS,
  message: 'Demasiadas peticiones desde esta IP'
});
app.use('/api/', limiter);

// Rutas
app.use('/api/auth', require('./src/routes/auth.routes'));
app.use('/api/users', require('./src/routes/user.routes'));
app.use('/api/roles', require('./src/routes/role.routes'));
app.use('/api/categories', require('./src/routes/category.routes'));
app.use('/api/states', require('./src/routes/state.routes'));
app.use('/api/upload', require('./src/routes/upload.routes'));
app.use('/api/projects', require('./src/routes/project.routes'));
app.use('/api/tasks', require('./src/routes/task.routes'));
app.use('/api/comments', require('./src/routes/comment.routes'));
app.use('/api/ai', require('./src/routes/ai.routes'));

// Middleware de manejo de errores
app.use(require('./src/middlewares/error.middleware'));

// Conexión a base de datos
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Conectado a MongoDB'))
  .catch(err => console.error('❌ Error conectando a MongoDB:', err));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});

// ========================================
// src/models/User.model.js - Modelo Usuario (Samuel)
// ========================================
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'El nombre es requerido'],
    trim: true,
    maxlength: [50, 'El nombre no puede exceder 50 caracteres']
  },
  lastName: {
    type: String,
    required: [true, 'El apellido es requerido'],
    trim: true,
    maxlength: [50, 'El apellido no puede exceder 50 caracteres']
  },
  email: {
    type: String,
    required: [true, 'El email es requerido'],
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Email inválido']
  },
  password: {
    type: String,
    required: [true, 'La contraseña es requerida'],
    minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
    select: false
  },
  avatar: {
    type: String,
    default: null
  },
  phone: {
    type: String,
    match: [/^\+?[\d\s-()]+$/, 'Teléfono inválido']
  },
  globalRole: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    select: false
  },
  emailVerificationExpires: {
    type: Date,
    select: false
  },
  passwordResetToken: {
    type: String,
    select: false
  },
  passwordResetExpires: {
    type: Date,
    select: false
  },
  lastLogin: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual para nombre completo
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Middleware pre-save para encriptar contraseña
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Método para comparar contraseñas
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Índices
userSchema.index({ email: 1 });
userSchema.index({ isActive: 1 });

module.exports = mongoose.model('User', userSchema);

// ========================================
// src/controllers/auth.controller.js - Controlador de Autenticación (Samuel)
// ========================================
const User = require('../models/User.model');
const Role = require('../models/Role.model');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const emailService = require('../services/email.service');
const { sendResponse } = require('../utils/response.util');

class AuthController {
  // Registro de usuario
  async register(req, res) {
    try {
      const { firstName, lastName, email, password, phone } = req.body;

      // Verificar si el usuario ya existe
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return sendResponse(res, 400, false, 'El email ya está registrado');
      }

      // Obtener rol por defecto
      const defaultRole = await Role.findOne({ name: 'Developer' });
      if (!defaultRole) {
        return sendResponse(res, 500, false, 'Error de configuración del sistema');
      }

      // Generar token de verificación
      const verificationToken = crypto.randomBytes(32).toString('hex');

      // Crear usuario
      const user = await User.create({
        firstName,
        lastName,
        email,
        password,
        phone,
        globalRole: defaultRole._id,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: Date.now() + 24 * 60 * 60 * 1000 // 24 horas
      });

      // Enviar email de verificación
      await emailService.sendVerificationEmail(email, verificationToken);

      sendResponse(res, 201, true, 'Usuario registrado exitosamente. Verifica tu email.', {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email
        }
      });
    } catch (error) {
      console.error('Error en registro:', error);
      sendResponse(res, 500, false, 'Error interno del servidor');
    }
  }

  // Login de usuario
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Buscar usuario e incluir password
      const user = await User.findOne({ email, isActive: true })
        .select('+password')
        .populate('globalRole');

      if (!user || !(await user.comparePassword(password))) {
        return sendResponse(res, 401, false, 'Credenciales inválidas');
      }

      if (!user.isEmailVerified) {
        return sendResponse(res, 401, false, 'Email no verificado');
      }

      // Generar tokens
      const accessToken = this.generateAccessToken(user);
      const refreshToken = this.generateRefreshToken(user);

      // Actualizar último login
      user.lastLogin = Date.now();
      await user.save();

      sendResponse(res, 200, true, 'Login exitoso', {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          avatar: user.avatar,
          role: user.globalRole.name
        },
        accessToken,
        refreshToken
      });
    } catch (error) {
      console.error('Error en login:', error);
      sendResponse(res, 500, false, 'Error interno del servidor');
    }
  }

  // Generar token de acceso
  generateAccessToken(user) {
    return jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        role: user.globalRole.name
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );
  }

  // Generar token de refresh
  generateRefreshToken(user) {
    return jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRE }
    );
  }
}

module.exports = new AuthController();

// ========================================
// src/middlewares/auth.middleware.js - Middleware de Autenticación (Samuel)
// ========================================
const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const { sendResponse } = require('../utils/response.util');

const authenticate = async (req, res, next) => {
  try {
    let token;

    // Extraer token del header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return sendResponse(res, 401, false, 'Token de acceso requerido');
    }

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Buscar usuario
    const user = await User.findById(decoded.userId)
      .populate('globalRole')
      .select('-password');

    if (!user || !user.isActive) {
      return sendResponse(res, 401, false, 'Token inválido');
    }

    // Agregar usuario a la request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return sendResponse(res, 401, false, 'Token inválido');
    }
    if (error.name === 'TokenExpiredError') {
      return sendResponse(res, 401, false, 'Token expirado');
    }
    
    console.error('Error en autenticación:', error);
    sendResponse(res, 500, false, 'Error interno del servidor');
  }
};

module.exports = { authenticate };

// ========================================
// src/utils/response.util.js - Utilidad de Respuestas (Franklin)
// ========================================
const sendResponse = (res, statusCode, success, message, data = null, pagination = null) => {
  const response = {
    success,
    message,
    timestamp: new Date().toISOString()
  };

  if (data !== null) {
    response.data = data;
  }

  if (pagination !== null) {
    response.pagination = pagination;
  }

  return res.status(statusCode).json(response);
};

const sendError = (res, statusCode, message, errors = null) => {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString()
  };

  if (errors !== null) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

module.exports = {
  sendResponse,
  sendError
};

// ========================================
// package.json - Configuración del Proyecto
// ========================================
{
  "name": "project-management-api",
  "version": "1.0.0",
  "description": "API RESTful para gestión de proyectos y tareas con IA",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "keywords": ["api", "proyectos", "tareas", "ia", "mongodb"],
  "author": "Equipo de Desarrollo",
  "license": "MIT",
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.0.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.0",
    "express-validator": "^6.14.0",
    "multer": "^1.4.5",
    "nodemailer": "^6.9.0",
    "openai": "^4.0.0",
    "cors": "^2.8.5",
    "helmet": "^6.0.0",
    "express-rate-limit": "^6.7.0",
    "dotenv": "^16.0.0",
    "crypto": "^1.0.1"
  },
  "devDependencies": {
    "jest": "^29.0.0",
    "supertest": "^6.3.0",
    "nodemon": "^2.0.20"
  }
}