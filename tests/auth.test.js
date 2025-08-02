const request = require('supertest');
const app = require('../server');
const User = require('../src/models/User.model');
const Role = require('../src/models/Role.model');

describe('Authentication Endpoints', () => {
  beforeEach(async () => {
    // Limpiar base de datos de prueba
    await User.deleteMany({});
    await Role.deleteMany({});
    
    // Crear rol de prueba
    await Role.create({
      name: 'Developer',
      description: 'Desarrollador de prueba',
      permissions: []
    });
  });

  describe('POST /api/auth/register', () => {
    test('Should register a new user', async () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@email.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
    });

    test('Should not register user with invalid email', async () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'invalid-email',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Crear usuario de prueba verificado
      const role = await Role.findOne({ name: 'Developer' });
      await User.create({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@email.com',
        password: 'password123',
        globalRole: role._id,
        isEmailVerified: true
      });
    });

    test('Should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@email.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.tokens.accessToken).toBeDefined();
    });

    test('Should not login with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@email.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});