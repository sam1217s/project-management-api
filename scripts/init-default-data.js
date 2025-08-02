const mongoose = require('mongoose');
const Role = require('../src/models/Role.model');
const User = require('../src/models/User.model');
require('dotenv').config();

const initDefaultData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/project_management');
    console.log('📡 Conectado a MongoDB');

    // Limpiar datos existentes (solo para desarrollo)
    await User.deleteMany({});
    await Role.deleteMany({});
    console.log('🧹 Base de datos limpiada');

    // Crear roles por defecto
    const roles = [
      { name: 'Admin', description: 'Administrador del sistema con todos los permisos' },
      { name: 'Project Manager', description: 'Gestor de proyectos con permisos de gestión' },
      { name: 'Developer', description: 'Desarrollador con permisos básicos' },
      { name: 'Viewer', description: 'Solo lectura del sistema' }
    ];

    const createdRoles = {};
    for (const roleData of roles) {
      const role = await Role.create(roleData);
      createdRoles[roleData.name] = role;
      console.log(`✅ Rol creado: ${roleData.name} (${role._id})`);
    }

    // 🔧 CORRECCIÓN: Contraseñas con mínimo 6 caracteres
    // Crear usuario admin
    const adminUser = await User.create({
      firstName: 'Admin',
      lastName: 'System',
      email: 'admin@test.com',
      password: 'admin123',  // ✅ 8 caracteres
      globalRole: createdRoles['Admin']._id,
      isEmailVerified: true,
      isActive: true
    });

    // Crear usuario PM de prueba
    const pmUser = await User.create({
      firstName: 'Project',
      lastName: 'Manager',
      email: 'pm@test.com',
      password: 'pm123456',  // 🔧 CORREGIDO: ahora 8 caracteres
      globalRole: createdRoles['Project Manager']._id,
      isEmailVerified: true,
      isActive: true
    });

    // Crear usuario developer de prueba
    const devUser = await User.create({
      firstName: 'Developer',
      lastName: 'User',
      email: 'dev@test.com',
      password: 'dev123456',  // 🔧 CORREGIDO: ahora 9 caracteres
      globalRole: createdRoles['Developer']._id,
      isEmailVerified: true,
      isActive: true
    });

    // Crear usuario viewer de prueba
    const viewerUser = await User.create({
      firstName: 'Viewer',
      lastName: 'User',
      email: 'viewer@test.com',
      password: 'viewer123',  // ✅ 9 caracteres
      globalRole: createdRoles['Viewer']._id,
      isEmailVerified: true,
      isActive: true
    });

    console.log('\n🎉 DATOS INICIALES CREADOS EXITOSAMENTE:');
    console.log('========================================');
    console.log('📧 Admin:   admin@test.com   / admin123');
    console.log('📧 PM:      pm@test.com      / pm123456');
    console.log('📧 Dev:     dev@test.com     / dev123456');
    console.log('📧 Viewer:  viewer@test.com  / viewer123');
    console.log('========================================');
    
    console.log('\n📊 IDs para Postman/Testing:');
    console.log(`Admin Role ID:    ${createdRoles['Admin']._id}`);
    console.log(`PM Role ID:       ${createdRoles['Project Manager']._id}`);
    console.log(`Dev Role ID:      ${createdRoles['Developer']._id}`);
    console.log(`Viewer Role ID:   ${createdRoles['Viewer']._id}`);
    console.log(`Admin User ID:    ${adminUser._id}`);
    console.log(`PM User ID:       ${pmUser._id}`);
    console.log(`Dev User ID:      ${devUser._id}`);
    console.log(`Viewer User ID:   ${viewerUser._id}`);

    console.log('\n🚀 PRÓXIMOS PASOS:');
    console.log('1. Reiniciar servidor: npm run dev');
    console.log('2. Login en Postman con admin@test.com / admin123');
    console.log('3. Probar endpoints: GET /api/users, GET /api/roles');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error inicializando datos:', error);
    
    // Mostrar detalles específicos del error
    if (error.name === 'ValidationError') {
      console.log('\n🔍 DETALLES DEL ERROR:');
      Object.keys(error.errors).forEach(key => {
        console.log(`❌ ${key}: ${error.errors[key].message}`);
      });
    }
    
    process.exit(1);
  }
};

if (require.main === module) {
  initDefaultData();
}

module.exports = initDefaultData;