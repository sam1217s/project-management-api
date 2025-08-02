const mongoose = require('mongoose');
const Project = require('../src/models/Project.model');
const User = require('../src/models/User.model');
const Category = require('../src/models/Category.model');
const State = require('../src/models/State.model');
const Role = require('../src/models/Role.model');
require('dotenv').config();

const seedProjects = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB para seed de proyectos');

    // Obtener datos necesarios
    const adminUser = await User.findOne({ email: 'admin@test.com' });
    const webCategory = await Category.findOne({ name: 'Web Development' }) ||
                       await Category.create({
                         name: 'Web Development',
                         description: 'Desarrollo de aplicaciones web',
                         createdBy: adminUser._id
                       });

    const planningState = await State.findOne({ name: 'Planificación', type: 'Project' });
    const progressState = await State.findOne({ name: 'En Progreso', type: 'Project' });
    const pmRole = await Role.findOne({ name: 'Project Manager' });
    const devRole = await Role.findOne({ name: 'Developer' });

    const sampleProjects = [
      {
        name: 'E-commerce Platform',
        description: 'Desarrollo de plataforma de comercio electrónico con React y Node.js. Incluye carrito de compras, pagos en línea, gestión de inventario y panel de administración.',
        category: webCategory._id,
        owner: adminUser._id,
        status: progressState._id,
        priority: 'High',
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-06-30'),
        estimatedHours: 500,
        budget: 25000,
        tags: ['react', 'nodejs', 'ecommerce', 'stripe'],
        members: [{
          user: adminUser._id,
          role: pmRole._id,
          permissions: {
            canCreateTasks: true,
            canEditTasks: true,
            canDeleteTasks: true,
            canAssignTasks: true
          }
        }],
        settings: {
          allowComments: true,
          allowTaskCreation: true,
          requireTaskApproval: false,
          notifyOnTaskComplete: true,
          aiAssistEnabled: true
        },
        aiMetadata: {
          healthScore: 75,
          riskLevel: 'Medium',
          recommendations: [
            'Revisar cronograma de desarrollo',
            'Aumentar cobertura de testing',
            'Implementar CI/CD pipeline'
          ]
        }
      },
      {
        name: 'Mobile Banking App',
        description: 'Aplicación móvil para banca digital con autenticación biométrica, transferencias, pagos y gestión de cuentas.',
        category: webCategory._id,
        owner: adminUser._id,
        status: planningState._id,
        priority: 'Critical',
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-12-31'),
        estimatedHours: 800,
        budget: 50000,
        tags: ['mobile', 'banking', 'security', 'flutter'],
        members: [{
          user: adminUser._id,
          role: pmRole._id,
          permissions: {
            canCreateTasks: true,
            canEditTasks: true,
            canDeleteTasks: true,
            canAssignTasks: true
          }
        }],
        settings: {
          allowComments: true,
          allowTaskCreation: true,
          requireTaskApproval: true,
          notifyOnTaskComplete: true,
          aiAssistEnabled: true
        },
        aiMetadata: {
          healthScore: 20,
          riskLevel: 'Low',
          recommendations: [
            'Definir arquitectura de seguridad',
            'Seleccionar stack tecnológico',
            'Crear wireframes y prototipos'
          ]
        }
      },
      {
        name: 'Company Intranet',
        description: 'Sistema interno para gestión de empleados, documentos, comunicación interna y recursos humanos.',
        category: webCategory._id,
        owner: adminUser._id,
        status: progressState._id,
        priority: 'Medium',
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-08-15'),
        estimatedHours: 300,
        budget: 15000,
        tags: ['intranet', 'hr', 'internal', 'vue'],
        members: [{
          user: adminUser._id,
          role: pmRole._id,
          permissions: {
            canCreateTasks: true,
            canEditTasks: true,
            canDeleteTasks: true,
            canAssignTasks: true
          }
        }],
        settings: {
          allowComments: true,
          allowTaskCreation: true,
          requireTaskApproval: false,
          notifyOnTaskComplete: false,
          aiAssistEnabled: false
        },
        aiMetadata: {
          healthScore: 60,
          riskLevel: 'Low',
          recommendations: [
            'Integrar con sistema de RRHH existente',
            'Mejorar UX del dashboard'
          ]
        }
      }
    ];

    // Limpiar proyectos existentes
    await Project.deleteMany({});

    // Crear proyectos de ejemplo
    for (const projectData of sampleProjects) {
      const project = await Project.create(projectData);
      console.log(`✅ Proyecto creado: ${project.name}`);
    }

    console.log('🎉 Seed de proyectos completado exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en seed de proyectos:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  seedProjects();
}

module.exports = seedProjects;