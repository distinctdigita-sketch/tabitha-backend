const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const staffSchema = new mongoose.Schema({
  // Personal Information
  employee_id: {
    type: String,
    unique: true,
    required: [true, 'Employee ID is required']
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
    required: true
  },
  nin: {
    type: String,
    unique: true,
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
  
  // Emergency Contact
  emergency_contact: {
    name: { type: String, required: true },
    relationship: { type: String, required: true },
    phone: { type: String, required: true },
    address: String
  },
  
  // Employment Information
  position: {
    type: String,
    required: [true, 'Position is required'],
    enum: [
      'Director', 'Assistant Director', 'Social Worker', 'Child Care Worker',
      'Teacher', 'Nurse', 'Cook', 'Security', 'Cleaner', 'Administrator',
      'Volunteer', 'Intern'
    ]
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    enum: [
      'Administration', 'Child Care', 'Education', 'Health Care', 
      'Kitchen', 'Security', 'Maintenance', 'Social Services'
    ]
  },
  hire_date: {
    type: Date,
    required: [true, 'Hire date is required'],
    default: Date.now
  },
  employment_status: {
    type: String,
    enum: ['Active', 'On Leave', 'Suspended', 'Terminated', 'Resigned'],
    default: 'Active'
  },
  salary: {
    type: Number,
    min: [0, 'Salary cannot be negative']
  },
  
  // Permissions and Access
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'manager', 'staff', 'volunteer', 'read_only'],
    default: 'staff'
  },
  permissions: [{
    module: {
      type: String,
      enum: ['children', 'staff', 'reports', 'settings', 'financial']
    },
    actions: [{
      type: String,
      enum: ['create', 'read', 'update', 'delete', 'export']
    }]
  }],
  
  // Qualifications
  education: [{
    institution: String,
    qualification: String,
    year_obtained: Number,
    field_of_study: String
  }],
  certifications: [{
    name: String,
    issuing_organization: String,
    date_obtained: Date,
    expiry_date: Date,
    certificate_number: String
  }],
  
  // Background Check
  background_check: {
    status: {
      type: String,
      enum: ['Pending', 'Cleared', 'Flagged', 'Expired'],
      default: 'Pending'
    },
    date_conducted: Date,
    conducted_by: String,
    expiry_date: Date,
    notes: String
  },
  
  // Photo and Documents
  photo: {
    filename: String,
    path: String,
    uploaded_date: { type: Date, default: Date.now }
  },
  documents: [{
    type: {
      type: String,
      enum: ['CV', 'Certificate', 'ID Copy', 'Reference Letter', 'Contract', 'Other']
    },
    filename: String,
    path: String,
    uploaded_date: { type: Date, default: Date.now }
  }],
  
  // Account Settings
  is_active: {
    type: Boolean,
    default: true
  },
  last_login: Date,
  password_changed_at: Date,
  password_reset_token: String,
  password_reset_expires: Date,
  
  // Tracking
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

// Pre-save middleware to hash password
staffSchema.pre('save', async function(next) {
  // Only hash password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  // Hash password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);
  
  // Set password changed timestamp
  this.password_changed_at = Date.now() - 1000;
  
  next();
});

// Pre-save middleware to generate employee ID
staffSchema.pre('save', async function(next) {
  if (!this.employee_id) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({
      employee_id: { $regex: `^EMP-${year}-` }
    });
    this.employee_id = `EMP-${year}-${String(count + 1).padStart(3, '0')}`;
  }
  next();
});

// Instance method to check password
staffSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Instance method to check if password changed after JWT was issued
staffSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.password_changed_at) {
    const changedTimestamp = parseInt(this.password_changed_at.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// Index for text search
staffSchema.index({ 
  first_name: 'text', 
  last_name: 'text',
  position: 'text',
  department: 'text'
});

// Index for common queries
staffSchema.index({ employment_status: 1 });
staffSchema.index({ role: 1 });
staffSchema.index({ department: 1 });
staffSchema.index({ email: 1 });

module.exports = mongoose.model('Staff', staffSchema);