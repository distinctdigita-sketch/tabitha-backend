// scripts/seedSuperAdmin.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const connectDB = require('../src/config/database');
const Staff = require('../src/models/Staff');

const createSuperAdmin = async () => {
  try {
    await connectDB();
    
    // Check if superadmin already exists
    const existingSuperAdmin = await Staff.findOne({ 
      role: 'superadmin' 
    });
    
    if (existingSuperAdmin) {
      console.log('⚠️  SuperAdmin already exists!');
      console.log(`Email: ${existingSuperAdmin.email}`);
      process.exit(0);
    }
    
    // Create superadmin user
    const superAdminData = {
      first_name: 'Super',
      last_name: 'Administrator',
      email: 'admin@tabithahome.org',
      password: 'TH-Admin@2025', // Strong default password
      phone: '+234-800-TABITHA',
      date_of_birth: new Date('1980-01-01'),
      gender: 'Male',
      marital_status: 'Single',
      nin: '12345678901', // Placeholder NIN
      
      // Address
      address: {
        street: 'Tabitha Home Complex',
        city: 'Lagos',
        state: 'Lagos',
        lga: 'Lagos Island',
        postal_code: '100001'
      },
      
      // Employment Details
      position: 'System Administrator',
      department: 'Administration',
      employment_type: 'Full-time',
      employment_status: 'Active',
      date_hired: new Date(),
      salary: 0, // Not disclosed
      
      // Role and Permissions
      role: 'super_admin',
      permissions: [
        'manage_all_users',
        'manage_all_children',
        'manage_all_staff',
        'view_all_reports',
        'manage_system_settings',
        'delete_records',
        'export_data',
        'manage_backups'
      ],
      
      // Security
      is_active: true,
      account_locked: false,
      password_must_change: true, // Force password change on first login
      
      // Audit
      created_by: null, // System created
      last_login: null,
      
      emergency_contact: {
        name: 'Admin Name',
        phone: '+234XXXXXXXXXX',
        relationship: 'Self'
      },
      employee_id: 'EMP001'
    };
    
    const superAdmin = new Staff(superAdminData);
    await superAdmin.save();
    
    console.log('🎉 SuperAdmin created successfully!');
    console.log('=====================================');
    console.log('📧 Email:', superAdmin.email);
    console.log('🔑 Password:', 'TH-Admin@2025');
    console.log('🆔 Employee ID:', superAdmin.employee_id);
    console.log('=====================================');
    console.log('⚠️  IMPORTANT: Change the password after first login!');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error creating SuperAdmin:', error);
    process.exit(1);
  }
};

createSuperAdmin();