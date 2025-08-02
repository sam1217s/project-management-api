const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
    index: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 1000
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
    index: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    // Permisos específicos para tareas (usado por Maryamm)
    permissions: {
      canCreateTasks: { type: Boolean, default: true },
      canEditTasks: { type: Boolean, default: true },
      canDeleteTasks: { type: Boolean, default: false },
      canAssignTasks: { type: Boolean, default: false }
    }
  }],
  status: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'State',
    required: true,
    index: true
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium',
    index: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true,
    validate: {
      validator: function(endDate) {
        return endDate > this.startDate;
      },
      message: 'La fecha de fin debe ser posterior a la de inicio'
    }
  },
  estimatedHours: {
    type: Number,
    min: 0,
    default: 0
  },
  actualHours: {
    type: Number,
    min: 0,
    default: 0
  },
  budget: {
    type: Number,
    min: 0,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 20
  }],
  // Campos adicionales para integración con tasks y comments
  settings: {
    allowComments: { type: Boolean, default: true },
    allowTaskCreation: { type: Boolean, default: true },
    requireTaskApproval: { type: Boolean, default: false },
    notifyOnTaskComplete: { type: Boolean, default: true },
    aiAssistEnabled: { type: Boolean, default: true }
  },
  // Metadatos para IA (usado por Maryamm)
  aiMetadata: {
    lastAnalysis: { type: Date },
    healthScore: { type: Number, min: 0, max: 100, default: 0 },
    riskLevel: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Low' },
    recommendations: [String]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true }
});

// Virtual para conteo de tareas (será usado por Maryamm)
projectSchema.virtual('taskCount', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'project',
  count: true
});

// Virtual para conteo de comentarios (será usado por Maryamm)
projectSchema.virtual('commentCount', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'projectid',
  count: true
});

// Virtual para progreso basado en tareas
projectSchema.virtual('progress').get(function() {
  // Este cálculo se actualizará cuando Maryamm implemente las tareas
  return this.aiMetadata?.healthScore || 0;
});

// Virtual para días restantes
projectSchema.virtual('daysRemaining').get(function() {
  const today = new Date();
  const diffTime = this.endDate - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual para verificar si está retrasado
projectSchema.virtual('isOverdue').get(function() {
  return this.daysRemaining < 0 && this.status?.name !== 'Completado';
});

// Índices compuestos para mejor rendimiento
projectSchema.index({ owner: 1, isActive: 1 });
projectSchema.index({ 'members.user': 1, isActive: 1 });
projectSchema.index({ category: 1, status: 1 });
projectSchema.index({ priority: 1, endDate: 1 });

// Middleware para actualizar actualHours cuando se calculen desde tareas
projectSchema.methods.updateProgressFromTasks = async function() {
  const Task = mongoose.model('Task');
  
  try {
    const tasks = await Task.find({ project: this._id, isActive: true });
    const completedTasks = tasks.filter(task => task.completedAt);
    const progress = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;
    
    this.aiMetadata.healthScore = progress;
    this.actualHours = tasks.reduce((total, task) => total + (task.actualHours || 0), 0);
    
    return this.save();
  } catch (error) {
    console.error('Error updating progress:', error);
  }
};

module.exports = mongoose.model('Project', projectSchema);
