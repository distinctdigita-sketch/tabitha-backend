// scripts/createIndexes.js - Run this after your app is working
require('dotenv').config();
const mongoose = require('mongoose');

const createAllIndexes = async () => {
  try {
    console.log('🔧 Database Index Creation Tool');
    console.log('===============================\n');
    
    // Connect to database
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database\n');
    
    // Import models to register them
    console.log('📋 Loading models...');
    try {
      require('../src/models/Staff');
      console.log('✅ Staff model loaded');
    } catch (error) {
      console.log('⚠️  Staff model not found:', error.message);
    }
    
    // Add other models here as you create them
    require('../src/models/Child');
    
    // Wait for models to be fully registered
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Get all registered models
    const modelNames = mongoose.modelNames();
    console.log('📊 Available models:', modelNames);
    
    if (modelNames.length === 0) {
      console.log('⚠️  No models found. Make sure your models are properly defined.');
      process.exit(1);
    }
    
    // Create indexes for each model
    for (const modelName of modelNames) {
      console.log(`\n🔧 Creating indexes for ${modelName}...`);
      await createModelIndexes(modelName);
    }
    
    console.log('\n✅ All indexes created successfully!');
    console.log('📈 Your app performance should be improved for searches and queries.');
    
  } catch (error) {
    console.error('\n❌ Index creation failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
    process.exit(0);
  }
};

const createModelIndexes = async (modelName) => {
  try {
    const Model = mongoose.model(modelName);
    
    if (!Model.collection) {
      console.log(`⚠️  Collection for ${modelName} not ready`);
      return;
    }
    
    switch (modelName) {
      case 'Staff':
        await createStaffIndexes(Model);
        break;
      
      case 'Children':
        await createChildrenIndexes(Model);
        break;
      
      default:
        console.log(`📝 No custom indexes defined for ${modelName}`);
    }
    
  } catch (error) {
    console.log(`❌ Error creating indexes for ${modelName}:`, error.message);
  }
};

const createStaffIndexes = async (Staff) => {
  try {
    // Text search index for search functionality
    await Staff.collection.createIndex({
      first_name: 'text',
      last_name: 'text',
      email: 'text',
      position: 'text',
      department: 'text'
    }, { 
      background: true,
      name: 'staff_text_search'
    });
    console.log('  ✅ Text search index created');
    
    // Unique indexes (will skip if already exist)
    try {
      await Staff.collection.createIndex(
        { email: 1 }, 
        { unique: true, background: true, name: 'staff_email_unique' }
      );
      console.log('  ✅ Email unique index created');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('  📝 Email index already exists');
      } else {
        console.log('  ⚠️  Email index:', e.message);
      }
    }
    
    try {
      await Staff.collection.createIndex(
        { employee_id: 1 }, 
        { unique: true, background: true, name: 'staff_employee_id_unique' }
      );
      console.log('  ✅ Employee ID unique index created');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('  📝 Employee ID index already exists');
      } else {
        console.log('  ⚠️  Employee ID index:', e.message);
      }
    }
    
    // Query optimization indexes
    await Staff.collection.createIndex(
      { role: 1 }, 
      { background: true, name: 'staff_role' }
    );
    console.log('  ✅ Role index created');
    
    await Staff.collection.createIndex(
      { is_active: 1 }, 
      { background: true, name: 'staff_is_active' }
    );
    console.log('  ✅ Active status index created');
    
    await Staff.collection.createIndex(
      { department: 1 }, 
      { background: true, name: 'staff_department' }
    );
    console.log('  ✅ Department index created');
    
    await Staff.collection.createIndex(
      { created_at: -1 }, 
      { background: true, name: 'staff_created_at' }
    );
    console.log('  ✅ Created date index created');
    
    // Compound indexes for common queries
    await Staff.collection.createIndex(
      { role: 1, is_active: 1 }, 
      { background: true, name: 'staff_role_active' }
    );
    console.log('  ✅ Role + Active compound index created');
    
    await Staff.collection.createIndex(
      { department: 1, is_active: 1 }, 
      { background: true, name: 'staff_dept_active' }
    );
    console.log('  ✅ Department + Active compound index created');
    
  } catch (error) {
    console.log('  ❌ Staff indexes error:', error.message);
  }
};

const createChildrenIndexes = async (Children) => {
  try {
    console.log('  🔧 Creating Children model indexes...');
    
    // Text search for children
    await Children.collection.createIndex({
      first_name: 'text',
      last_name: 'text',
      // Add other searchable fields
    }, { 
      background: true,
      name: 'children_text_search'
    });
    console.log('  ✅ Children text search index created');
    
    // Add more children-specific indexes here
    
  } catch (error) {
    console.log('  ❌ Children indexes error:', error.message);
  }
};

// List existing indexes
const listIndexes = async () => {
  try {
    console.log('\n📊 Current Database Indexes:');
    console.log('============================');
    
    const modelNames = mongoose.modelNames();
    
    for (const modelName of modelNames) {
      const Model = mongoose.model(modelName);
      
      if (Model.collection) {
        console.log(`\n📋 ${modelName} Collection:`);
        const indexes = await Model.collection.listIndexes().toArray();
        
        indexes.forEach(index => {
          console.log(`  • ${index.name || 'unnamed'}: ${JSON.stringify(index.key)}`);
        });
      }
    }
    
  } catch (error) {
    console.log('❌ Error listing indexes:', error.message);
  }
};

// Command line interface
const args = process.argv.slice(2);
const command = args[0];

if (require.main === module) {
  switch (command) {
    case 'create':
      createAllIndexes();
      break;
    
    case 'list':
      mongoose.connect(process.env.MONGODB_URI)
        .then(() => {
          require('../src/models/Staff'); // Load models
          return listIndexes();
        })
        .then(() => mongoose.disconnect())
        .then(() => process.exit(0))
        .catch(error => {
          console.error('Error:', error.message);
          process.exit(1);
        });
      break;
    
    default:
      console.log('Database Index Management Tool');
      console.log('==============================');
      console.log('Usage:');
      console.log('  node scripts/createIndexes.js create  - Create all indexes');
      console.log('  node scripts/createIndexes.js list    - List existing indexes');
      console.log('');
      console.log('Examples:');
      console.log('  npm run create:indexes');
      console.log('  npm run list:indexes');
      break;
  }
}

module.exports = {
  createAllIndexes,
  listIndexes,
  createStaffIndexes,
  createChildrenIndexes
};