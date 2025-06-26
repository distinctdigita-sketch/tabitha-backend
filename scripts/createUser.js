// scripts/createUser.js - CLI tool for superadmin to create users
const readline = require('readline');

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
    await connectDB();
    
    console.log('🏥 Tabitha Home - Create Staff Account');
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
    staffData.marital_status = maritalStatuses[parseInt(maritalChoice) - 1];
    
    staffData.position = await question('Job Title/Position: ');
    staffData.department = await question('Department: ');
    
    console.log('\nSystem Access Level:');
    console.log('1. admin - Can manage children, staff, generate reports');
    console.log('2. staff - Can view/edit children records, create reports');
    console.log('3. volunteer - Can view children records, limited access');
    console.log('4. read_only - Can only view records');
    const roleChoice = await question('Choice (1-4): ');
    
    const roles = ['admin', 'staff', 'volunteer', 'read_only'];
    staffData.role = roles[parseInt(roleChoice) - 1];
    
    // Optional fields
    const addOptional = await question('\nAdd optional details? (y/n): ');
    if (addOptional.toLowerCase() === 'y') {
      staffData.nin = await question('NIN (11 digits, optional): ');
      staffData.salary = await question('Monthly Salary (optional): ');
      
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
    
    // Default values for required fields
    staffData.date_of_birth = new Date('1990-01-01'); // Will be updated later
    staffData.employment_type = 'Full-time';
    staffData.employment_status = 'Active';
    staffData.date_hired = new Date();
    staffData.is_active = true;
    staffData.password_must_change = true;
    
    // Generate personalized temporary password
    const tempPassword = generateStaffPassword(staffData.first_name, staffData.last_name);
    staffData.password = tempPassword;
    
    // Set role-based permissions
    staffData.permissions = getRolePermissions(staffData.role);
    
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
    console.error('❌ Error creating staff account:', error);
  } finally {
    rl.close();
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
    admin: [
      'manage_children',
      'manage_staff',
      'view_reports',
      'manage_documents',
      'export_data'
    ],
    staff: [
      'view_children',
      'edit_children',
      'view_staff',
      'create_reports'
    ],
    volunteer: [
      'view_children',
      'view_basic_reports'
    ],
    read_only: [
      'view_children',
      'view_reports'
    ]
  };
  
  return permissions[role] || permissions.read_only;
};

// Run if called directly
if (require.main === module) {
  createUserCLI();
}

module.exports = { createUserCLI, generateRandomPassword, getRolePermissions };