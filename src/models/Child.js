const mongoose = require('mongoose');

const childSchema = new mongoose.Schema({
  // Personal Information
  first_name: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  middle_name: {
    type: String,
    trim: true,
    maxlength: [50, 'Middle name cannot exceed 50 characters']
  },
  last_name: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
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
  
  // Nigerian-specific fields
  state_of_origin: {
    type: String,
    required: [true, 'State of origin is required'],
    enum: [
      'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
      'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
      'FCT', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi',
      'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun',
      'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
    ]
  },
  lga: {
    type: String,
    required: [true, 'Local Government Area is required'],
    trim: true
  },
  nationality: {
    type: String,
    default: 'Nigerian',
    trim: true
  },
  preferred_language: {
    type: String,
    enum: ['English', 'Hausa', 'Yoruba', 'Igbo', 'Fulfulde', 'Other'],
    default: 'English'
  },
  religion: {
    type: String,
    enum: ['Christianity', 'Islam', 'Traditional', 'Other'],
    trim: true
  },
  tribal_marks: {
    type: String,
    trim: true,
    maxlength: [200, 'Tribal marks description cannot exceed 200 characters']
  },
  
  // Medical Information
  blood_type: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown']
  },
  genotype: {
    type: String,
    enum: ['AA', 'AS', 'SS', 'AC', 'SC', 'CC', 'Unknown'],
    required: [true, 'Genotype is required for health planning']
  },
  height_cm: {
    type: Number,
    min: [30, 'Height must be at least 30cm'],
    max: [250, 'Height cannot exceed 250cm']
  },
  weight_kg: {
    type: Number,
    min: [1, 'Weight must be at least 1kg'],
    max: [200, 'Weight cannot exceed 200kg']
  },
  allergies: [{
    type: String,
    trim: true
  }],
  medical_conditions: [{
    condition: String,
    diagnosed_date: Date,
    current_treatment: String,
    notes: String
  }],
  immunization_status: {
    bcg: { type: Boolean, default: false },
    polio: { type: Boolean, default: false },
    dpt: { type: Boolean, default: false },
    measles: { type: Boolean, default: false },
    yellow_fever: { type: Boolean, default: false },
    hepatitis_b: { type: Boolean, default: false },
    last_updated: { type: Date, default: Date.now }
  },
  
  // Administrative Information
  child_id: {
    type: String,
    unique: true
    // Removed required: true since it will be auto-generated
  },
  admission_date: {
    type: Date,
    required: [true, 'Admission date is required'],
    default: Date.now
  },
  arrival_circumstances: {
    type: String,
    required: [true, 'Arrival circumstances are required'],
    trim: true,
    maxlength: [500, 'Arrival circumstances cannot exceed 500 characters']
  },
  current_status: {
    type: String,
    enum: ['Active', 'Exited', 'Transferred', 'Adopted', 'Family Reunification'],
    default: 'Active'
  },
  exit_date: Date,
  exit_reason: String,
  
  // Living Arrangements
  room_assignment: {
    type: String,
    trim: true
  },
  bed_number: {
    type: String,
    trim: true
  },
  
  // Legal Information
  birth_certificate_number: {
    type: String,
    trim: true,
    unique: true,
    sparse: true
  },
  government_registration_number: {
    type: String,
    trim: true
  },
  court_case_number: {
    type: String,
    trim: true
  },
  legal_guardian_name: {
    type: String,
    trim: true
  },
  legal_guardian_contact: {
    type: String,
    trim: true
  },
  next_of_kin_name: {
    type: String,
    trim: true
  },
  next_of_kin_contact: {
    type: String,
    trim: true
  },
  emergency_contact: {
    name: String,
    relationship: String,
    phone: String,
    address: String
  },
  
  // Care and Development
  behavioral_assessment_score: {
    type: Number,
    min: 1,
    max: 10
  },
  social_worker_notes: {
    type: String,
    trim: true
  },
  ambition: {
    type: String,
    trim: true,
    maxlength: [300, 'Ambition description cannot exceed 300 characters']
  },
  
  // Education
  education_level: {
    type: String,
    enum: [
      'Pre-School', 'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 
      'Primary 5', 'Primary 6', 'JSS 1', 'JSS 2', 'JSS 3', 'SSS 1', 
      'SSS 2', 'SSS 3', 'Tertiary', 'Vocational Training', 'Out of School'
    ]
  },
  school_name: {
    type: String,
    trim: true
  },
  
  // Files and Photos
  photos: [{
    filename: String,
    path: String,
    uploaded_date: { type: Date, default: Date.now },
    is_primary: { type: Boolean, default: false }
  }],
  documents: [{
    type: String,
    filename: String,
    path: String,
    uploaded_date: { type: Date, default: Date.now }
  }],
  
  // Tracking
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true
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

// Virtual for age calculation
childSchema.virtual('age').get(function() {
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

// Virtual for full name
childSchema.virtual('full_name').get(function() {
  const parts = [this.first_name, this.middle_name, this.last_name].filter(Boolean);
  return parts.join(' ');
});

// Pre-save middleware to generate child ID
childSchema.pre('save', async function(next) {
  if (!this.child_id) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({
      child_id: { $regex: `^TH-${year}-` }
    });
    this.child_id = `TH-${year}-${String(count + 1).padStart(3, '0')}`;
  }
  next();
});

// Index for text search
childSchema.index({ 
  first_name: 'text', 
  middle_name: 'text', 
  last_name: 'text',
  social_worker_notes: 'text'
});

// Index for common queries
childSchema.index({ current_status: 1 });
childSchema.index({ admission_date: -1 });
childSchema.index({ gender: 1 });
childSchema.index({ state_of_origin: 1 });

module.exports = mongoose.model('Child', childSchema);