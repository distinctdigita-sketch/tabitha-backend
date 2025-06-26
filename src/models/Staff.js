// src/models/Staff.js - Complete Fixed Version
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const staffSchema = new mongoose.Schema({
  // Personal Information
  employee_id: {
    type: String,
    unique: true
    // Removed required: true since it will be auto-generated
  },
  first_name: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  last_name: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  date_of_birth: {
    type: Date,
    required: [true, 'Date of birth is required']
  },
  gender: {
    type: String,
    required: [true, 'Gender is required'],
    enum: ['Male', 'Female']
  },
  marital_status: {
    type: String,
    enum: ['Single', 'Married', 'Divorced', 'Widowed'],
    default: 'Single'
  },
  nin: {
    type: String,
    unique: true,
    sparse: true, // Allow null values but enforce uniqueness when present
    trim: true,
    minlength: [11, 'NIN must be 11 digits'],
    maxlength: [11, 'NIN must be 11 digits']
  },
  
  // Address Information
  address: {
    street: String,
    city: String,
    state: {
      type: String,
      enum: [
        'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
        'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
        'FCT', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi',
        'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun',
        'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
      ]
    },
    lga: String,
    postal_code: String
  },
  
  // Emergency Contact - ALL REQUIRED
  emergency_contact: {
    name: { 
      type: String, 
      required: [true, 'Emergency contact name is required'] 
    },
    relationship: { 
      type: String, 
      required: [true, 'Emergency contact relationship is required'] 
    },
    phone: { 
      type: String, 
      required: [true, 'Emergency contact phone is required'] 
    },
    address: String
  },
  
  // Employment Information
  position: {
    type: String,
    required: [true, 'Position is required'],
    enum: [
      'Director', 
      'Assistant Director', 
      'Administrator',
      'System Administrator',
      'Social Worker', 
      'Child Care Worker',
      'Teacher', 
      'Nurse', 
      'Medical Officer',
      'Cook', 
      'Security Officer',
      'Cleaner', 
      'Maintenance',
      'Volunteer', 
      'Intern',
      'Manager',
      'Supervisor',
      'Counselor',
      'Driver'
    ]
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    enum: [
      'Administration', 
      'Child Care', 
      'Education', 
      'Medical', 
      'Kitchen', 
      'Security', 
      'Maintenance', 
      'Social Services'
    ]
  },
  date_hired: {
    type: Date,
    required: [true, 'Hire date is required'],
    default: Date.now
  },
  employment_status: {
    type: String,
    enum: ['Active', 'On Leave', 'Suspended', 'Terminated', 'Resigned'],
    default: 'Active'
  },
  employment_type: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Contract', 'Volunteer'],
    default: 'Full-time'
  },
  salary: {
    type: Number,
    min: [0, 'Salary cannot be negative'],
    default: 0
  },
  
  // Permissions and Access - Fixed structure
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'manager', 'staff', 'volunteer', 'read_only'],
    default: 'staff'
  },
  permissions: [{
    type: String,
    enum: [
      'all',
      'manage_children', 'view_children', 'update_children', 'create_children',
      'manage_staff', 'view_staff', 'update_staff', 'create_staff',
      'view_reports', 'create_reports', 'export_reports',
      'manage_settings', 'view_settings'
    ]
  }],
  
  // Security and Status
  is_active: {
    type: Boolean,
    default: true
  },
  password_must_change: {
    type: Boolean,
    default: true
  },
  last_login: Date,
  login_attempts: {
    type: Number,
    default: 0
  },
  account_locked: {
    type: Boolean,
    default: false
  },
  account_locked_until: Date,
  password_changed_at: Date,
  
  // File Management
  photo_url: String,
  documents: [{
    type: {
      type: String,
      enum: ['CV', 'Certificate', 'Contract', 'ID', 'Other']
    },
    name: String,
    url: String,
    uploaded_at: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Audit Trail
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  },
  last_modified_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name
staffSchema.virtual('full_name').get(function() {
  return `${this.first_name} ${this.last_name}`;
});

// Virtual for age
staffSchema.virtual('age').get(function() {
  if (!this.date_of_birth) return null;
  const today = new Date();
  const birthDate = new Date(this.date_of_birth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
});

// CRITICAL: Pre-save middleware to generate employee_id
staffSchema.pre('save', async function(next) {
  // Only generate employee_id for new documents that don't have one
  if (this.isNew && !this.employee_id) {
    try {
      const year = new Date().getFullYear();
      
      // Find the highest existing employee ID for this year
      const lastEmployee = await this.constructor.findOne({
        employee_id: { $regex: `^THS-${year}-` }
      }).sort({ employee_id: -1 });
      
      let nextNumber = 1;
      if (lastEmployee && lastEmployee.employee_id) {
        const lastNumber = parseInt(lastEmployee.employee_id.split('-')[2]);
        nextNumber = lastNumber + 1;
      }
      
      this.employee_id = `THS-${year}-${nextNumber.toString().padStart(3, '0')}`;
      console.log(`Generated employee_id: ${this.employee_id}`);
    } catch (error) {
      console.error('Error generating employee_id:', error);
      return next(error);
    }
  }
  next();
});

// Pre-save middleware to hash password
staffSchema.pre('save', async function(next) {
  // Only hash password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    this.password = await bcrypt.hash(this.password, 12);
    
    // Set password changed timestamp
    this.password_changed_at = new Date(Date.now() - 1000);
    
    next();
  } catch (error) {
    return next(error);
  }
});

// Instance method to check password
staffSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Instance method to check if password changed after JWT was issued
staffSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.password_changed_at) {
    const changedTimestamp = parseInt(
      this.password_changed_at.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// Create indexes
staffSchema.index({ email: 1 });
staffSchema.index({ employee_id: 1 });
staffSchema.index({ nin: 1 }, { sparse: true });
staffSchema.index({ is_active: 1 });
staffSchema.index({ department: 1 });
staffSchema.index({ role: 1 });

// Index for text search
staffSchema.index({ 
  first_name: 'text', 
  last_name: 'text',
  position: 'text',
  department: 'text'
});

const Staff = mongoose.model('Staff', staffSchema);

module.exports = Staff;