const request = require('supertest');
const app = require('../server');
const Project = require('../src/models/Project.model');
const Category = require('../src/models/Category.model');
const State = require('../src/models/State.model');
const User = require('../src/models/User.model');
const Role = require('../src/models/Role.model');

describe('Project Endpoints', () => {
  let authToken;
  let testUser;
  let testCategory;
  let testState;
  let pmRole;

  beforeAll(async () => {
    // Crear rol PM
    pmRole = await Role.create({
      name: 'Project Manager',
      description: 'Gestor de proyectos'
    });

    // Crear usuario
    testUser = await User.create({
      firstName: 'Test',
      lastName: 'PM',
      email: 'pm@test.com',
      password: 'password123',
      globalRole: pmRole._id,
      isEmailVerified: true
    });

    // Crear categoría
    testCategory = await Category.create({
      name: 'Test Category',
      description: 'Categoría de prueba',
      createdBy: testUser._id
    });

    // Crear estado
    testState = await State.create({
      name: 'Planificación',
      type: 'Project',
      description: 'Estado inicial'
    });

    // Login
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'pm@test.com',
        password: 'password123'
      });

    authToken = loginResponse.body.data.token;
  });

  beforeEach(async () => {
    await Project.deleteMany({});
  });

  describe('POST /api/projects', () => {
    test('Should create a new project with default settings', async () => {
      const projectData = {
        name: 'Test Project',
        description: 'This is a test project description with enough characters',
        category: testCategory._id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        estimatedHours: 100,
        budget: 5000,
        priority: 'High',
        tags: ['test', 'demo']
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(projectData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.project.name).toBe(projectData.name);
      expect(response.body.data.project.settings.allowComments).toBe(true);
      expect(response.body.data.project.settings.aiAssistEnabled).toBe(true);
    });

    test('Should create project with custom settings', async () => {
      const projectData = {
        name: 'Custom Settings Project',
        description: 'Project with custom settings for testing',
        category: testCategory._id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        settings: {
          allowComments: false,
          requireTaskApproval: true,
          aiAssistEnabled: false
        }
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(projectData);

      expect(response.status).toBe(201);
      expect(response.body.data.project.settings.allowComments).toBe(false);
      expect(response.body.data.project.settings.requireTaskApproval).toBe(true);
      expect(response.body.data.project.settings.aiAssistEnabled).toBe(false);
    });
  });

  describe('GET /api/projects', () => {
    beforeEach(async () => {
      await Project.create({
        name: 'Test Project',
        description: 'Test project description for listing',
        category: testCategory._id,
        owner: testUser._id,
        status: testState._id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        members: [{
          user: testUser._id,
          role: pmRole._id,
          permissions: {
            canCreateTasks: true,
            canEditTasks: true,
            canDeleteTasks: true,
            canAssignTasks: true
          }
        }]
      });
    });

    test('Should get user projects with stats', async () => {
      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.projects).toHaveLength(1);
      expect(response.body.data.stats).toBeDefined();
      expect(response.body.data.stats.total).toBe(1);
    });
  });

  describe('POST /api/projects/:id/members', () => {
    let testProject;
    let newUser;
    let devRole;

    beforeEach(async () => {
      // Crear rol developer
      devRole = await Role.findOne({ name: 'Developer' }) ||
                await Role.create({ name: 'Developer', description: 'Developer role' });

      // Crear nuevo usuario
      newUser = await User.create({
        firstName: 'New',
        lastName: 'Developer',
        email: 'dev@test.com',
        password: 'password123',
        globalRole: devRole._id
      });

      // Crear proyecto
      testProject = await Project.create({
        name: 'Test Project',
        description: 'Test description for member testing',
        category: testCategory._id,
        owner: testUser._id,
        status: testState._id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        members: [{
          user: testUser._id,
          role: pmRole._id,
          permissions: {
            canCreateTasks: true,
            canEditTasks: true,
            canDeleteTasks: true,
            canAssignTasks: true
          }
        }]
      });
    });

    test('Should add member with custom permissions', async () => {
      const memberData = {
        user: newUser._id,
        role: devRole._id,
        permissions: {
          canCreateTasks: true,
          canEditTasks: false,
          canDeleteTasks: false,
          canAssignTasks: false
        }
      };

      const response = await request(app)
        .post(`/api/projects/${testProject._id}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(memberData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.project.members).toHaveLength(2);
    });
  });

  describe('PUT /api/projects/:id/settings', () => {
    let testProject;

    beforeEach(async () => {
      testProject = await Project.create({
        name: 'Settings Test Project',
        description: 'Project for testing settings updates',
        category: testCategory._id,
        owner: testUser._id,
        status: testState._id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        members: [{
          user: testUser._id,
          role: pmRole._id
        }]
      });
    });

    test('Should update project settings', async () => {
      const newSettings = {
        settings: {
          allowComments: false,
          requireTaskApproval: true,
          aiAssistEnabled: false
        }
      };

      const response = await request(app)
        .put(`/api/projects/${testProject._id}/settings`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(newSettings);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.settings.allowComments).toBe(false);
      expect(response.body.data.settings.requireTaskApproval).toBe(true);
    });
  });
});