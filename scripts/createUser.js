// scripts/createUser.js - CLI tool for superadmin to create users

// FIXED: Load environment variables with correct path
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const readline = require('readline');
const mongoose = require('mongoose');

// FIXED: Use path.join for cross-platform compatibility and correct paths
const connectDB = require(path.join(__dirname, '../src/config/database'));
const Staff = require(path.join(__dirname, '../src/models/Staff'));

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
};

const createStaffAccountCLI = async () => {
  try {
    // FIXED: Better error handling with detailed logging
    console.log('🔧 Initializing staff creation...');
    
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not defined. Check your .env file.');
    }
    
    console.log('🔌 Connecting to database...');
    await connectDB();
    console.log('✅ Database connected successfully!');
    
    console.log('\n🏥 Tabitha Home - Create Staff Account');
    console.log('=======================================\n');
    console.log('Enter the REAL information for the staff member:\n');
    
    const staffData = {};
    
    // Collect actual staff member information
    staffData.first_name = await question('Staff First Name: ');
    staffData.last_name = await question('Staff Last Name: ');
    staffData.email = await question('Staff Email Address: ');
    staffData.phone = await question('Staff Phone (+234...): ');
    
    console.log('\nStaff Gender:');
    console.log('1. Male');
    console.log('2. Female');
    const genderChoice = await question('Choice (1-2): ');
    staffData.gender = genderChoice === '1' ? 'Male' : 'Female';
    
    console.log('\nMarital Status:');
    console.log('1. Single');
    console.log('2. Married');
    console.log('3. Divorced');
    console.log('4. Widowed');
    const maritalChoice = await question('Choice (1-4): ');
    const maritalStatuses = ['Single', 'Married', 'Divorced', 'Widowed'];
    staffData.marital_status = maritalStatuses[parseInt(maritalChoice) - 1] || 'Single';
    
    console.log('\nAvailable Positions:');
    const positions = [
      'Director', 'Assistant Director', 'Administrator', 'System Administrator',
      'Social Worker', 'Child Care Worker', 'Teacher', 'Nurse', 'Medical Officer',
      'Cook', 'Security Officer', 'Cleaner', 'Maintenance', 'Volunteer', 'Intern',
      'Manager', 'Supervisor', 'Counselor', 'Driver'
    ];
    positions.forEach((pos, index) => console.log(`${index + 1}. ${pos}`));
    const positionChoice = await question('Choose position (1-' + positions.length + '): ');
    staffData.position = positions[parseInt(positionChoice) - 1] || 'Staff';
    
    console.log('\nAvailable Departments:');
    const departments = [
      'Administration', 'Child Care', 'Education', 'Medical', 
      'Kitchen', 'Security', 'Maintenance', 'Social Services'
    ];
    departments.forEach((dept, index) => console.log(`${index + 1}. ${dept}`));
    const deptChoice = await question('Choose department (1-' + departments.length + '): ');
    staffData.department = departments[parseInt(deptChoice) - 1] || 'Administration';
    
    console.log('\nSystem Access Level:');
    console.log('1. super_admin - Full system access');
    console.log('2. admin - Can manage children, staff, generate reports');
    console.log('3. manager - Can manage team and moderate content');
    console.log('4. staff - Can view/edit children records, create reports');
    console.log('5. volunteer - Can view children records, limited access');
    console.log('6. read_only - Can only view records');
    const roleChoice = await question('Choice (1-6): ');
    
    const roles = ['super_admin', 'admin', 'manager', 'staff', 'volunteer', 'read_only'];
    staffData.role = roles[parseInt(roleChoice) - 1] || 'staff';
    
    // Optional fields
    const addOptional = await question('\nAdd optional details? (y/n): ');
    if (addOptional.toLowerCase() === 'y') {
      const ninInput = await question('NIN (11 digits, optional): ');
      if (ninInput && ninInput.length === 11) {
        staffData.nin = ninInput;
      }
      
      const salaryInput = await question('Monthly Salary (optional): ');
      if (salaryInput && !isNaN(salaryInput)) {
        staffData.salary = parseFloat(salaryInput);
      }
      
      console.log('\nAddress (optional):');
      const addAddress = await question('Add address? (y/n): ');
      if (addAddress.toLowerCase() === 'y') {
        staffData.address = {
          street: await question('Street Address: '),
          city: await question('City: '),
          state: await question('State: '),
          lga: await question('LGA: ')
        };
      }
    }
    
    // Emergency contact (required in schema)
    console.log('\nEmergency Contact (Required):');
    staffData.emergency_contact = {
      name: await question('Emergency Contact Name: '),
      relationship: await question('Relationship: '),
      phone: await question('Emergency Contact Phone: ')
    };
    
    // Default values for required fields
    staffData.date_of_birth = new Date('1990-01-01');
    staffData.employment_type = 'Full-time';
    staffData.employment_status = 'Active';
    staffData.date_hired = new Date();
    staffData.is_active = true;
    staffData.password_must_change = true;
    
    // Generate temporary password
    const tempPassword = generateRandomPassword();
    staffData.password = tempPassword;
    
    // Set role-based permissions
    staffData.permissions = getRolePermissions(staffData.role);
    
    console.log('\n💾 Creating staff account...');
    
    // Create staff account
    const newStaff = new Staff(staffData);
    await newStaff.save();
    
    console.log('\n🎉 Staff Account Created Successfully!');
    console.log('==========================================');
    console.log('👤 Staff Name:', `${newStaff.first_name} ${newStaff.last_name}`);
    console.log('📧 Email:', newStaff.email);
    console.log('📱 Phone:', newStaff.phone);
    console.log('💼 Position:', newStaff.position);
    console.log('🏢 Department:', newStaff.department);
    console.log('🆔 Employee ID:', newStaff.employee_id);
    console.log('👨‍💼 System Role:', newStaff.role);
    console.log('🔑 Temporary Password:', tempPassword);
    console.log('==========================================');
    console.log('📋 INSTRUCTIONS:');
    console.log('1. Give these credentials to the staff member');
    console.log('2. They must change password on first login');
    console.log('3. They should use their personal email for account recovery');
    console.log('==========================================');
    
  } catch (error) {
    console.error('\n❌ Error creating staff account:', error.message);
    console.error('📍 Full error:', error);
    
    if (error.code === 11000) {
      console.error('💡 This usually means email or employee ID already exists');
    }
    if (error.name === 'ValidationError') {
      console.error('💡 Please check that all required fields are filled correctly');
    }
  } finally {
    rl.close();
    try {
      // FIXED: Properly close database connection
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
      }
    } catch (closeError) {
      console.error('⚠️ Error closing database connection:', closeError.message);
    }
    process.exit(0);
  }
};

const generateRandomPassword = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$%';
  let password = 'TH-';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const getRolePermissions = (role) => {
  const permissions = {
    super_admin: ['all'],
    admin: [
      'manage_children', 'manage_staff', 'view_reports', 'create_reports',
      'export_reports', 'manage_settings'
    ],
    manager: [
      'manage_children', 'view_staff', 'view_reports', 'create_reports'
    ],
    staff: [
      'view_children', 'update_children', 'view_staff', 'create_reports'
    ],
    volunteer: [
      'view_children'
    ],
    read_only: [
      'view_children', 'view_reports'
    ]
  };
  
  return permissions[role] || permissions.read_only;
};

// FIXED: Better error handling for module execution
if (require.main === module) {
  // Add process handlers
  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });

  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
  });

  createStaffAccountCLI().catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

module.exports = { 
  createStaffAccountCLI, 
  generateRandomPassword, 
  getRolePermissions 
};