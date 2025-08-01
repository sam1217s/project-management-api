const axios = require('axios');
const Task = require('../models/Task.model');
const Project = require('../models/Project.model');
const Comment = require('../models/Comment.model');
const State = require('../models/State.model');
const { sendResponse, sendError } = require('../utils/response.util');

// Configuración DeepSeek
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

class AIController {
  // Función helper para llamar a DeepSeek
  async callDeepSeek(messages, maxTokens = 2000, temperature = 0.7) {
    if (!DEEPSEEK_API_KEY) {
      throw new Error('DeepSeek API no configurado');
    }

    try {
      const response = await axios.post(DEEPSEEK_API_URL, {
        model: 'deepseek-chat',
        messages: messages,
        max_tokens: maxTokens,
        temperature: temperature,
        stream: false
      }, {
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('Error DeepSeek:', error.response?.data || error.message);
      throw error;
    }
  }

  // Generar tareas automáticamente
  async generateTasks(req, res) {
    try {
      const { projectDescription, projectId } = req.body;

      // Verificar acceso al proyecto
      const project = await Project.findById(projectId).populate('category');
      if (!project) {
        return sendError(res, 404, 'Proyecto no encontrado');
      }

      const hasAccess = project.owner.toString() === req.user.userId ||
                       project.members.some(member => 
                         member.user.toString() === req.user.userId
                       );

      if (!hasAccess) {
        return sendError(res, 403, 'Sin acceso al proyecto');
      }

      if (!DEEPSEEK_API_KEY) {
        // Fallback sin IA
        const fallbackTasks = this.generateFallbackTasks(project.category.name, projectDescription);
        return sendResponse(res, 200, true, 'Tareas generadas (modo básico)', {
          generatedTasks: fallbackTasks.tasks,
          projectId,
          aiMetadata: { model: 'fallback', provider: 'Internal', generatedAt: new Date() }
        });
      }

      const messages = [
        {
          role: 'system',
          content: 'Eres un experto project manager. Genera tareas específicas en formato JSON válido.'
        },
        {
          role: 'user',
          content: `Proyecto: ${project.name}
Categoría: ${project.category.name}
Descripción: ${projectDescription}

Genera 8-12 tareas en formato JSON:
{
  "tasks": [
    {
      "title": "Título específico",
      "description": "Descripción detallada",
      "estimatedHours": 8,
      "priority": "High"
    }
  ]
}`
        }
      ];

      try {
        const aiResponse = await this.callDeepSeek(messages, 2500, 0.7);
        
        let generatedTasks;
        try {
          const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
          generatedTasks = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        } catch (parseError) {
          generatedTasks = null;
        }

        if (!generatedTasks) {
          generatedTasks = this.generateFallbackTasks(project.category.name, projectDescription);
        }

        sendResponse(res, 200, true, 'Tareas generadas con DeepSeek AI', {
          generatedTasks: generatedTasks.tasks || [],
          projectId,
          aiMetadata: {
            model: 'deepseek-chat',
            provider: 'DeepSeek',
            generatedAt: new Date()
          }
        });
      } catch (aiError) {
        const fallbackTasks = this.generateFallbackTasks(project.category.name, projectDescription);
        sendResponse(res, 200, true, 'Tareas generadas (fallback)', {
          generatedTasks: fallbackTasks.tasks,
          projectId
        });
      }
    } catch (error) {
      console.error('Error generar tareas:', error);
      sendError(res, 500, 'Error interno del servidor');
    }
  }

  // Otros métodos de IA (analizar, estimar, etc.)
  async analyzeProject(req, res) {
    try {
      const { projectId } = req.body;
      const project = await Project.findById(projectId);
      
      if (!project) {
        return sendError(res, 404, 'Proyecto no encontrado');
      }

      const tasks = await Task.find({ project: projectId, isActive: true });
      const completedTasks = tasks.filter(t => t.completedAt);
      const progress = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

      const analysis = {
        overallHealth: progress > 70 ? 'Good' : progress > 40 ? 'Fair' : 'Poor',
        healthScore: progress,
        risks: progress < 50 ? ['Progreso lento'] : ['Sin riesgos críticos'],
        recommendations: ['Revisar cronograma', 'Mejorar comunicación'],
        summary: `Proyecto con ${progress}% de progreso`
      };

      sendResponse(res, 200, true, 'Análisis completado', { analysis });
    } catch (error) {
      sendError(res, 500, 'Error interno del servidor');
    }
  }

  async estimateTime(req, res) {
    try {
      const { taskDescription, complexity = 'Medium' } = req.body;
      
      const wordCount = taskDescription.split(' ').length;
      const multiplier = { Low: 0.7, Medium: 1.0, High: 1.4 };
      const baseHours = Math.max(4, Math.ceil(wordCount / 6) * multiplier[complexity]);

      const estimation = {
        recommended: baseHours,
        range: { min: Math.ceil(baseHours * 0.7), max: Math.ceil(baseHours * 1.4) },
        confidence: 'Medium'
      };

      sendResponse(res, 200, true, 'Estimación completada', { estimation });
    } catch (error) {
      sendError(res, 500, 'Error interno del servidor');
    }
  }

  async generateSummary(req, res) {
    try {
      const { projectId } = req.body;
      const project = await Project.findById(projectId);
      
      if (!project) {
        return sendError(res, 404, 'Proyecto no encontrado');
      }

      const summary = `# Resumen del Proyecto: ${project.name}\n\nEstado actual del proyecto con información básica.`;
      
      sendResponse(res, 200, true, 'Resumen generado', { summary });
    } catch (error) {
      sendError(res, 500, 'Error interno del servidor');
    }
  }

  async suggestImprovements(req, res) {
    try {
      const suggestions = [
        '📋 Implementar reuniones de seguimiento semanales',
        '📊 Crear dashboard de métricas del proyecto',
        '🎯 Definir criterios de aceptación más claros'
      ];

      sendResponse(res, 200, true, 'Sugerencias generadas', { suggestions });
    } catch (error) {
      sendError(res, 500, 'Error interno del servidor');
    }
  }

  // Helper para generar tareas básicas
  generateFallbackTasks(projectType, description) {
    const basicTasks = [
      {
        title: "Análisis de requerimientos",
        description: "Definir y documentar requerimientos funcionales y no funcionales",
        estimatedHours: 8,
        priority: "High"
      },
      {
        title: "Diseño de arquitectura",
        description: "Crear diseño técnico y arquitectura del sistema",
        estimatedHours: 12,
        priority: "High"
      },
      {
        title: "Configuración inicial",
        description: "Configurar entorno de desarrollo y herramientas",
        estimatedHours: 6,
        priority: "Medium"
      },
      {
        title: "Implementación backend",
        description: "Desarrollar lógica de negocio y API endpoints",
        estimatedHours: 24,
        priority: "Critical"
      },
      {
        title: "Desarrollo frontend",
        description: "Crear interfaz de usuario y componentes",
        estimatedHours: 20,
        priority: "High"
      },
      {
        title: "Testing y QA",
        description: "Implementar tests y control de calidad",
        estimatedHours: 12,
        priority: "High"
      }
    ];

    return { tasks: basicTasks };
  }
}

module.exports = new AIController();
