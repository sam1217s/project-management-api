const { GoogleGenerativeAI } = require('@google/generative-ai');
const Task = require('../models/Task.model');
const Project = require('../models/Project.model');
const Comment = require('../models/comment.model');
const { sendResponse, sendError } = require('../utils/response.util');

// Inicializar Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.0-pro' });

class AIController {
  // Generar tareas automáticamente
  async generateTasks(req, res) {
    try {
      const { projectDescription, projectId, category, estimatedHours } = req.body;

      // Verificar acceso al proyecto
      const project = await Project.findById(projectId).populate('category');
      if (!project) {
        return sendError(res, 404, 'Proyecto no encontrado');
      }

      const hasAccess = project.owner.toString() === req.user._id.toString() ||
                       project.members.some(member => 
                         member.user.toString() === req.user._id.toString() && 
                         member.permissions.includes('write')
                       );

      if (!hasAccess) {
        return sendError(res, 403, 'No tienes permisos para generar tareas en este proyecto');
      }

      // Crear prompt para OpenAI
      const prompt = this.createTaskGenerationPrompt(projectDescription, project.category.name, estimatedHours);

      try {
        const result = await model.generateContent(prompt);
        const aiResponse = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || result?.response?.text || '';
        const generatedTasks = this.parseAITaskResponse(aiResponse);

        // Opcional: Crear las tareas automáticamente si se especifica
        if (req.body.autoCreate) {
          const createdTasks = await this.createTasksFromAI(generatedTasks, projectId, req.user._id);
          
          sendResponse(res, 201, true, 'Tareas generadas y creadas exitosamente', {
            generatedTasks,
            createdTasks,
            aiMetadata: {
              prompt,
              model: 'gemini-1.0-pro',
              generatedAt: new Date()
            }
          });
        } else {
          sendResponse(res, 200, true, 'Tareas generadas exitosamente', {
            generatedTasks,
            aiMetadata: {
              prompt,
              model: 'gemini-1.0-pro',
              generatedAt: new Date()
            }
          });
        }
      } catch (aiError) {
        console.error('Error con Gemini:', aiError);
        sendError(res, 500, 'Error generando tareas con Gemini');
      }
    } catch (error) {
      console.error('Error en generación de tareas:', error);
      sendError(res, 500, 'Error interno del servidor');
    }
  }

  // Analizar proyecto y sugerir mejoras
  async analyzeProject(req, res) {
    try {
      const { projectId } = req.body;

      const project = await Project.findById(projectId)
        .populate('category')
        .populate('status')
        .populate('owner', 'firstName lastName')
        .populate('members.user', 'firstName lastName');

      if (!project) {
        return sendError(res, 404, 'Proyecto no encontrado');
      }

      // Obtener tareas del proyecto
      const tasks = await Task.find({ project: projectId, isActive: true })
        .populate('status', 'name')
        .populate('assignedTo', 'firstName lastName');

      // Obtener comentarios recientes
      const recentComments = await Comment.find({
        projectId,
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        isDeleted: false
      }).populate('author', 'firstName lastName');

      // Crear análisis con IA
      const analysisPrompt = this.createProjectAnalysisPrompt(project, tasks, recentComments);

      try {
        const result = await model.generateContent(analysisPrompt);
        const analysis = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || result?.response?.text || '';
        const parsedAnalysis = this.parseProjectAnalysis(analysis);

        sendResponse(res, 200, true, 'Análisis de proyecto completado', {
          analysis: parsedAnalysis,
          projectStats: {
            totalTasks: tasks.length,
            completedTasks: tasks.filter(t => t.completedAt).length,
            overdueTasks: tasks.filter(t => t.dueDate < new Date() && !t.completedAt).length,
            progress: project.progress,
            daysRemaining: project.daysRemaining
          },
          aiMetadata: {
            analyzedAt: new Date(),
            model: 'gemini-1.0-pro'
          }
        });
      } catch (aiError) {
        console.error('Error con análisis Gemini:', aiError);
        sendError(res, 500, 'Error analizando proyecto con Gemini');
      }
    } catch (error) {
      console.error('Error en análisis de proyecto:', error);
      sendError(res, 500, 'Error interno del servidor');
    }
  }

  // Estimar tiempo de tareas
  async estimateTime(req, res) {
    try {
      const { taskDescription, complexity, technology, teamExperience } = req.body;

      const estimationPrompt = this.createTimeEstimationPrompt(
        taskDescription, 
        complexity, 
        technology, 
        teamExperience
      );

      try {
        const result = await model.generateContent(estimationPrompt);
        const estimation = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || result?.response?.text || '';
        const parsedEstimation = this.parseTimeEstimation(estimation);

        sendResponse(res, 200, true, 'Estimación de tiempo completada', {
          estimation: parsedEstimation,
          aiMetadata: {
            estimatedAt: new Date(),
            model: 'gemini-1.0-pro',
            confidence: parsedEstimation.confidence || 0.8
          }
        });
      } catch (aiError) {
        console.error('Error con estimación Gemini:', aiError);
        sendError(res, 500, 'Error estimando tiempo con Gemini');
      }
    } catch (error) {
      console.error('Error en estimación de tiempo:', error);
      sendError(res, 500, 'Error interno del servidor');
    }
  }

  // Generar resumen de progreso
  async generateSummary(req, res) {
    try {
      const { projectId, period = 'week' } = req.body;

      const project = await Project.findById(projectId)
        .populate('category')
        .populate('status');

      if (!project) {
        return sendError(res, 404, 'Proyecto no encontrado');
      }

      // Calcular fechas según el período
      const now = new Date();
      let startDate;
      
      switch (period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      // Obtener datos del período
      const tasksInPeriod = await Task.find({
        project: projectId,
        createdAt: { $gte: startDate },
        isActive: true
      }).populate('assignedTo', 'firstName lastName');

      const completedTasks = await Task.find({
        project: projectId,
        completedAt: { $gte: startDate },
        isActive: true
      }).populate('assignedTo', 'firstName lastName');

      const summaryPrompt = this.createProgressSummaryPrompt(
        project, 
        tasksInPeriod, 
        completedTasks, 
        period
      );

      try {
        const result = await model.generateContent(summaryPrompt);
        const summary = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || result?.response?.text || '';

        sendResponse(res, 200, true, 'Resumen generado exitosamente', {
          summary,
          period,
          stats: {
            tasksCreated: tasksInPeriod.length,
            tasksCompleted: completedTasks.length,
            currentProgress: project.progress,
            totalTasks: await Task.countDocuments({ project: projectId, isActive: true })
          },
          aiMetadata: {
            generatedAt: new Date(),
            model: 'gemini-1.0-pro',
            period
          }
        });
      } catch (aiError) {
        console.error('Error generando resumen Gemini:', aiError);
        sendError(res, 500, 'Error generando resumen con Gemini');
      }
    } catch (error) {
      console.error('Error en generación de resumen:', error);
      sendError(res, 500, 'Error interno del servidor');
    }
  }

  // Métodos auxiliares para crear prompts
  createTaskGenerationPrompt(description, category, estimatedHours) {
    return `
Genera una lista de tareas específicas y detalladas para el siguiente proyecto:

DESCRIPCIÓN DEL PROYECTO:
${description}

CATEGORÍA: ${category}
HORAS ESTIMADAS TOTALES: ${estimatedHours || 'No especificado'}

Por favor, genera entre 8-15 tareas que sean:
1. Específicas y accionables
2. Apropiadas para la categoría del proyecto
3. Ordenadas lógicamente por dependencias
4. Con estimaciones de tiempo realistas

Formato de respuesta (JSON):
{
  "tasks": [
    {
      "title": "Título de la tarea",
      "description": "Descripción detallada de qué hacer",
      "estimatedHours": número,
      "priority": "Low|Medium|High|Critical",
      "tags": ["tag1", "tag2"],
      "dependencies": ["título de tarea previa si aplica"]
    }
  ]
}
    `;
  }

  createProjectAnalysisPrompt(project, tasks, comments) {
    const tasksSummary = tasks.map(t => `- ${t.title} (${t.status.name})`).join('\n');
    const commentsSummary = comments.slice(0, 5).map(c => `- ${c.content.substring(0, 100)}...`).join('\n');

    return `
Analiza el siguiente proyecto y proporciona recomendaciones:

PROYECTO: ${project.name}
DESCRIPCIÓN: ${project.description}
PROGRESO: ${project.progress}%
ESTADO: ${project.status.name}
MIEMBROS: ${project.members.length}

TAREAS (${tasks.length} total):
${tasksSummary}

COMENTARIOS RECIENTES:
${commentsSummary}

Por favor analiza:
1. Estado general del proyecto
2. Posibles riesgos o bloqueos
3. Recomendaciones para mejorar eficiencia
4. Sugerencias para el equipo

Responde en formato JSON:
{
  "overallHealth": "Excellent|Good|Fair|Poor",
  "risks": ["riesgo1", "riesgo2"],
  "recommendations": ["recomendación1", "recomendación2"],
  "nextSteps": ["paso1", "paso2"]
}
    `;
  }

  createTimeEstimationPrompt(description, complexity, technology, experience) {
    return `
Estima el tiempo necesario para completar esta tarea:

DESCRIPCIÓN: ${description}
COMPLEJIDAD: ${complexity || 'Media'}
TECNOLOGÍA: ${technology || 'General'}
EXPERIENCIA DEL EQUIPO: ${experience || 'Intermedia'}

Proporciona:
1. Estimación optimista (todo sale bien)
2. Estimación realista (escenario normal)
3. Estimación pesimista (con complicaciones)
4. Recomendación final
5. Factores de riesgo

Formato JSON:
{
  "optimistic": horas,
  "realistic": horas,
  "pessimistic": horas,
  "recommended": horas,
  "confidence": 0.1-1.0,
  "riskFactors": ["factor1", "factor2"],
  "breakdown": ["subtarea1: X horas", "subtarea2: Y horas"]
}
    `;
  }

  createProgressSummaryPrompt(project, newTasks, completedTasks, period) {
    return `
Crea un resumen ejecutivo del progreso del proyecto en la última ${period === 'week' ? 'semana' : 'mes'}:

PROYECTO: ${project.name}
PROGRESO ACTUAL: ${project.progress}%

NUEVAS TAREAS (${newTasks.length}):
${newTasks.map(t => `- ${t.title}`).join('\n')}

TAREAS COMPLETADAS (${completedTasks.length}):
${completedTasks.map(t => `- ${t.title}`).join('\n')}

Genera un resumen que incluya:
1. Logros principales
2. Métricas de productividad
3. Desafíos enfrentados
4. Próximos pasos
5. Recomendaciones

Mantén un tono profesional y ejecutivo.
    `;
  }

  // Métodos auxiliares para parsear respuestas de IA
  parseAITaskResponse(response) {
    try {
      // Intentar parsear como JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Si no es JSON, parsear manualmente
      return this.parseTasksFromText(response);
    } catch (error) {
      console.error('Error parseando respuesta de IA:', error);
      return { tasks: [] };
    }
  }

  async createTasksFromAI(generatedTasks, projectId, userId) {
    const createdTasks = [];
    
    // Obtener estado inicial
    const initialState = await State.findOne({
      type: 'Task',
      isInitial: true,
      isActive: true
    });

    for (const taskData of generatedTasks.tasks || []) {
      try {
        const task = await Task.create({
          title: taskData.title,
          description: taskData.description,
          project: projectId,
          createdBy: userId,
          status: initialState._id,
          priority: taskData.priority || 'Medium',
          estimatedHours: taskData.estimatedHours || 0,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días por defecto
          tags: taskData.tags || [],
          aiGenerated: true,
          aiMetadata: {
            confidence: 0.8,
            estimationSource: 'AI Generation',
            generatedPrompt: 'Task generation from project description'
          }
        });

        createdTasks.push(task);
      } catch (error) {
        console.error('Error creando tarea generada por IA:', error);
      }
    }

    return createdTasks;
  }

  parseTasksFromText(text) {
    // Implementar parser simple para texto plano
    const tasks = [];
    const lines = text.split('\n');
    
    let currentTask = null;
    
    for (const line of lines) {
      if (line.match(/^\d+\./)) {
        if (currentTask) tasks.push(currentTask);
        currentTask = {
          title: line.replace(/^\d+\.\s*/, ''),
          description: '',
          estimatedHours: 8,
          priority: 'Medium',
          tags: []
        };
      } else if (currentTask && line.trim()) {
        currentTask.description += line.trim() + ' ';
      }
    }
    
    if (currentTask) tasks.push(currentTask);
    
    return { tasks };
  }

  parseProjectAnalysis(analysis) {
    try {
      const jsonMatch = analysis.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Error parseando análisis:', error);
    }
    
    return {
      overallHealth: 'Good',
      risks: [],
      recommendations: [analysis],
      nextSteps: []
    };
  }

  parseTimeEstimation(estimation) {
    try {
      const jsonMatch = estimation.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Error parseando estimación:', error);
    }
    
    return {
      optimistic: 4,
      realistic: 8,
      pessimistic: 16,
      recommended: 8,
      confidence: 0.7,
      riskFactors: [],
      breakdown: []
    };
  }
}

module.exports = new AIController();