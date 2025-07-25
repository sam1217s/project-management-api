const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'El título de la tarea es requerido'],
    trim: true,
    maxlength: [100, 'El título no puede exceder 100 caracteres']
  },
  description: {
    type: String,
    required: [true, 'La descripción es requerida'],
    maxlength: [1000, 'La descripción no puede exceder 1000 caracteres']
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'El proyecto es requerido'],
    index: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El creador es requerido'],
    index: true
  },
  status: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'State',
    required: [true, 'El estado es requerido']
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium',
    index: true
  },
  estimatedHours: {
    type: Number,
    min: [0, 'Las horas estimadas deben ser positivas'],
    default: 0
  },
  actualHours: {
    type: Number,
    min: [0, 'Las horas reales deben ser positivas'],
    default: 0
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: [true, 'La fecha límite es requerida'],
    validate: {
      validator: function(dueDate) {
        return dueDate > this.startDate;
      },
      message: 'La fecha límite debe ser posterior a la fecha de inicio'
    }
  },
  completedAt: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [20, 'Los tags no pueden exceder 20 caracteres']
  }],
  dependencies: [{
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task'
    },
    type: {
      type: String,
      enum: ['blocks', 'depends_on'],
      default: 'depends_on'
    }
  }],
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    mimetype: String,
    size: Number,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  subtasks: [{
    title: {
      type: String,
      required: true,
      maxlength: 200
    },
    completed: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  aiGenerated: {
    type: Boolean,
    default: false
  },
  aiMetadata: {
    confidence: {
      type: Number,
      min: 0,
      max: 1
    },
    estimationSource: String,
    generatedPrompt: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual para calcular progreso de subtareas
taskSchema.virtual('subtaskProgress').get(function() {
  if (this.subtasks.length === 0) return 0;
  const completed = this.subtasks.filter(subtask => subtask.completed).length;
  return Math.round((completed / this.subtasks.length) * 100);
});

// Virtual para verificar si está retrasada
taskSchema.virtual('isOverdue').get(function() {
  return this.dueDate < new Date() && !this.completedAt;
});

// Virtual para días restantes
taskSchema.virtual('daysRemaining').get(function() {
  if (this.completedAt) return 0;
  const today = new Date();
  const diffTime = this.dueDate - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual para verificar si puede iniciarse (dependencias completadas)
taskSchema.virtual('canStart').get(function() {
  // Implementar lógica de dependencias
  return true; // Simplificado por ahora
});

// Middleware para actualizar proyecto cuando se completa tarea
taskSchema.pre('save', async function(next) {
  // Si la tarea se está completando
  if (this.isModified('completedAt') && this.completedAt && !this.wasCompleted) {
    this.wasCompleted = true;
    
    // Actualizar progreso del proyecto
    const Project = require('./Project.model');
    const project = await Project.findById(this.project);
    
    if (project) {
      const totalTasks = await mongoose.model('Task').countDocuments({
        project: this.project,
        isActive: true
      });
      
      const completedTasks = await mongoose.model('Task').countDocuments({
        project: this.project,
        isActive: true,
        completedAt: { $exists: true, $ne: null }
      });
      
      project.progress = Math.round((completedTasks / totalTasks) * 100);
      await project.save();
    }
  }
  
  next();
});

// Índices para optimización
taskSchema.index({ project: 1, assignedTo: 1 });
taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ assignedTo: 1, dueDate: 1 });
taskSchema.index({ project: 1, priority: 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ isActive: 1 });

// Índice de texto para búsqueda
taskSchema.index({
  title: 'text',
  description: 'text',
  tags: 'text'
}, {
  weights: {
    title: 10,
    description: 5,
    tags: 1
  }
});

module.exports = mongoose.model('Task', taskSchema);