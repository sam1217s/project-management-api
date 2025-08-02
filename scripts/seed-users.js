const mongoose = require('mongoose');
const User = require('../src/models/User.model');
const Role = require('../src/models/Role.model');
require('dotenv').config();

const seedUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get roles
    const adminRole = await Role.findOne({ name: 'Admin' });
    const pmRole = await Role.findOne({ name: 'Project Manager' });
    const devRole = await Role.findOne({ name: 'Developer' });

    if (!adminRole || !pmRole || !devRole) {
      console.log('Please run init-default-data.js first');
      return;
    }

    // Test users
    const testUsers = [
      {
        firstName: 'Samuel',
        lastName: 'Gomez',
        email: 'samuel@test.com',
        password: 'password123',
        globalRole: devRole._id
      },
      {
        firstName: 'Franklin',
        lastName: 'Peña',
        email: 'franklin@test.com',
        password: 'password123',
        globalRole: devRole._id
      },
      {
        firstName: 'Mariana',
        lastName: 'Gomez',
        email: 'mariana@test.com',
        password: 'password123',
        globalRole: pmRole._id
      },
      {
        firstName: 'Mariam',
        lastName: 'Pizza',
        email: 'mariam@test.com',
        password: 'password123',
        globalRole: devRole._id
      }
    ];

    for (const userData of testUsers) {
      const existingUser = await User.findOne({ email: userData.email });
      if (!existingUser) {
        await User.create(userData);
        console.log(`✅ Usuario creado: ${userData.email}`);
      }
    }

    console.log('🎉 Usuarios de prueba creados');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  seedUsers();
}