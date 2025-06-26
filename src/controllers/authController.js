// src/controllers/authController.js - Fixed version with proper exports
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const Staff = require('../models/Staff');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  
  // Remove password from output
  user.password = undefined;
  
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
};

// LOGIN - Enhanced with security features
const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'fail',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Check if email and password exist
    if (!email || !password) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide email and password!'
      });
    }

    // Check if user exists && password is correct
    const user = await Staff.findOne({ email }).select('+password +login_attempts +account_locked_until');

    if (!user || !(await user.correctPassword(password, user.password))) {
      // Track failed login attempts
      if (user) {
        await trackFailedLogin(user);
      }
      
      return res.status(401).json({
        status: 'fail',
        message: 'Incorrect email or password'
      });
    }

    // Check if account is locked
    if (user.account_locked && user.account_locked_until > Date.now()) {
      const lockTimeRemaining = Math.ceil((user.account_locked_until - Date.now()) / (1000 * 60));
      return res.status(423).json({
        status: 'fail',
        message: `Account locked. Try again in ${lockTimeRemaining} minutes.`
      });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({
        status: 'fail',
        message: 'Your account has been deactivated. Please contact an administrator.'
      });
    }

    // Reset failed login attempts on successful login
    if (user.login_attempts > 0) {
      user.login_attempts = 0;
      user.account_locked = false;
      user.account_locked_until = undefined;
    }

    // Update last login
    user.last_login = new Date();
    
    // Check if password must be changed
    const mustChangePassword = user.password_must_change;
    
    await user.save({ validateBeforeSave: false });

    // Send response with password change requirement
    const token = signToken(user._id);
    user.password = undefined;

    res.status(200).json({
      status: 'success',
      token,
      mustChangePassword,
      data: {
        user
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong during login'
    });
  }
};

// Track failed login attempts and implement account locking
const trackFailedLogin = async (user) => {
  try {
    user.login_attempts = (user.login_attempts || 0) + 1;
    
    // Lock account after 5 failed attempts
    if (user.login_attempts >= 5) {
      user.account_locked = true;
      user.account_locked_until = Date.now() + (30 * 60 * 1000); // 30 minutes
      console.log(`🔒 Account locked for user: ${user.email}`);
    }
    
    await user.save({ validateBeforeSave: false });
  } catch (error) {
    console.error('Error tracking failed login:', error);
  }
};

const generateEmployeeId = async () => {
  try {
    const year = new Date().getFullYear();
    
    // Find the highest existing employee ID for this year
    const lastEmployee = await Staff.findOne({
      employee_id: { $regex: `^THS-${year}-` }
    }).sort({ employee_id: -1 });
    
    let nextNumber = 1;
    if (lastEmployee && lastEmployee.employee_id) {
      const lastNumber = parseInt(lastEmployee.employee_id.split('-')[2]);
      nextNumber = lastNumber + 1;
    }
    
    return `THS-${year}-${nextNumber.toString().padStart(3, '0')}`;
  } catch (error) {
    console.error('Error generating employee ID:', error);
    throw error;
  }
};

// SUPERADMIN CREATE STAFF ACCOUNT - Creates account using staff member's real information
const createStaffAccount = async (req, res, next) => {
  try {
    console.log('🔍 createStaffAccount called with data:', req.body);

    const employee_id = await generateEmployeeId();
    
    // Check if requester has permission
    if (!['super_admin', 'admin'].includes(req.user.role)) {
      console.log('Permission denied for user role:', req.user.role);
      return res.status(403).json({
        status: 'fail',
        message: 'Only admin users can create staff accounts'
      });
    }

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({
        status: 'fail',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      
      first_name,
      last_name,
      email,
      phone,
      date_of_birth,
      gender = 'Male',
      marital_status = 'Single',
      nin,
      position,
      department,
      role = 'staff',
      employment_type = 'Full-time',
      salary,
      emergency_contact
    } = req.body;

    // Validate required fields
    if (!first_name || !last_name || !email || !phone || !position || !department) {
      console.log('Missing required fields');
      return res.status(400).json({
        status: 'fail',
        message: 'Missing required fields: first_name, last_name, email, phone, position, department'
      });
    }

    // Validate emergency contact
    if (!emergency_contact || !emergency_contact.name || !emergency_contact.relationship || !emergency_contact.phone) {
      console.log('Missing emergency contact information');
      return res.status(400).json({
        status: 'fail',
        message: 'Emergency contact information is required (name, relationship, phone)'
      });
    }

    // Check if staff member already has an account
    const existingStaff = await Staff.findOne({ 
      $or: [
        { email },
        { nin: nin && nin.length === 11 ? nin : null }
      ].filter(Boolean)
    });
    
    if (existingStaff) {
      console.log('Staff member already exists:', email);
      return res.status(400).json({
        status: 'fail',
        message: 'Staff member already has an account in the system'
      });
    }

    // Generate temporary password
    const tempPassword = generateStaffPassword(first_name, last_name);

    // Set role-based permissions
    const permissions = getRolePermissions(role);

    // Create staff account - employee_id will be auto-generated by pre-save middleware
    const staffData = {
      employee_id,
      first_name,
      last_name,
      email,
      password: tempPassword,
      phone,
      date_of_birth: date_of_birth ? new Date(date_of_birth) : new Date('1990-01-01'),
      gender,
      marital_status,
      nin: nin || undefined,
      emergency_contact: {
        name: emergency_contact.name,
        relationship: emergency_contact.relationship,
        phone: emergency_contact.phone,
        address: emergency_contact.address || ''
      },
      position,
      department,
      role,
      employment_type,
      employment_status: 'Active',
      salary: salary ? parseInt(salary) : 0,
      date_hired: new Date(),
      is_active: true,
      password_must_change: true,
      permissions,
      created_by: req.user._id
    };

    console.log('Creating staff with data:', { ...staffData, password: '[HIDDEN]' });

    const staffAccount = new Staff(staffData);
    await staffAccount.save();

    // Don't send password in response
    staffAccount.password = undefined;

    console.log('Staff account created successfully:', staffAccount.email);

    res.status(201).json({
      status: 'success',
      message: 'Staff account created successfully',
      data: {
        user: staffAccount,
        tempPassword // Send temporarily for display
      }
    });
  } catch (error) {
    console.error('Create staff account error:', error);
    
    // Handle specific mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      
      return res.status(400).json({
        status: 'fail',
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        status: 'fail',
        message: `${field} already exists in the system`
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Error creating staff account'
    });
  }
};

// Update the helper functions
const generateStaffPassword = (firstName, lastName) => {
  const firstPart = firstName.substring(0, 3).toLowerCase();
  const lastPart = lastName.substring(0, 3).toLowerCase();
  const randomNum = Math.floor(Math.random() * 999) + 100;
  return `${firstPart}${lastPart}${randomNum}!`;
};

const getRolePermissions = (role) => {
  const permissions = {
    super_admin: ['all'],
    admin: [
      'manage_children', 'manage_staff', 'view_reports', 'create_reports', 'manage_settings'
    ],
    manager: [
      'view_children', 'update_children', 'view_staff', 'view_reports'
    ],
    staff: [
      'view_children', 'update_children'
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

// SUPERADMIN MANAGE USERS - List, activate/deactivate, etc.
const manageUsers = async (req, res, next) => {
  try {
    // Check if requester is superadmin or admin
    if (!['superadmin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        status: 'fail',
        message: 'Insufficient permissions'
      });
    }

    const { action, userId } = req.body;
    const targetUser = await Staff.findById(userId);

    if (!targetUser) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }

    // Prevent superadmin from being modified by non-superadmin
    if (targetUser.role === 'superadmin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        status: 'fail',
        message: 'Cannot modify superadmin account'
      });
    }

    switch (action) {
      case 'activate':
        targetUser.is_active = true;
        targetUser.account_locked = false;
        targetUser.login_attempts = 0;
        break;
      
      case 'deactivate':
        targetUser.is_active = false;
        break;
      
      case 'unlock':
        targetUser.account_locked = false;
        targetUser.account_locked_until = undefined;
        targetUser.login_attempts = 0;
        break;
      
      case 'reset_password':
        const newPassword = generateStaffPassword(targetUser.first_name, targetUser.last_name);
        targetUser.password = newPassword;
        targetUser.password_must_change = true;
        await targetUser.save();
        
        return res.status(200).json({
          status: 'success',
          message: 'Password reset successfully',
          temporaryPassword: newPassword
        });
      
      default:
        return res.status(400).json({
          status: 'fail',
          message: 'Invalid action'
        });
    }

    await targetUser.save({ validateBeforeSave: false });

    res.status(200).json({
      status: 'success',
      message: `User ${action}d successfully`,
      data: {
        user: targetUser
      }
    });

  } catch (error) {
    console.error('Manage user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error managing user'
    });
  }
};

// GET ALL USERS - For superadmin/admin
const getAllUsers = async (req, res, next) => {
  try {
    // Check permissions
    if (!['superadmin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        status: 'fail',
        message: 'Insufficient permissions'
      });
    }

    const {
      page = 1,
      limit = 20,
      search = '',
      role = '',
      status = '',
      department = ''
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (search) {
      filter.$or = [
        { first_name: { $regex: search, $options: 'i' } },
        { last_name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { position: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (role) filter.role = role;
    if (department) filter.department = department;
    if (status === 'active') filter.is_active = true;
    if (status === 'inactive') filter.is_active = false;

    // Execute query with pagination
    const users = await Staff.find(filter)
      .populate('created_by', 'first_name last_name')
      .sort({ created_at: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-password');

    const total = await Staff.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      results: users.length,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: {
        users
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching users'
    });
  }
};


// Keep existing functions
const logout = (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully'
  });
};

const getMe = async (req, res, next) => {
  try {
    // req.user is set by the protect middleware
    const user = await Staff.findById(req.user.id)
      .select('-password')
      .populate('created_by', 'first_name last_name');

    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching user data'
    });
  }
};

const updatePassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'fail',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const user = await Staff.findById(req.user.id).select('+password');

    // Check if current password is correct (skip for forced password change)
    if (!req.body.forced && !(await user.correctPassword(req.body.passwordCurrent, user.password))) {
      return res.status(401).json({
        status: 'fail',
        message: 'Your current password is wrong.'
      });
    }

    // Update password
    user.password = req.body.password;
    user.password_must_change = false; // Reset forced change flag
    await user.save();

    createSendToken(user, 200, res);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error updating password'
    });
  }
};

const updateMe = async (req, res, next) => {
  try {
    // Create error if user POSTs password data
    if (req.body.password || req.body.passwordConfirm) {
      return res.status(400).json({
        status: 'fail',
        message: 'This route is not for password updates. Please use /updatePassword.'
      });
    }

    // Allowed fields for update
    const allowedFields = ['first_name', 'last_name', 'phone', 'address'];
    const filteredBody = {};
    
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredBody[key] = req.body[key];
      }
    });

    const updatedUser = await Staff.findByIdAndUpdate(req.user.id, filteredBody, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      status: 'success',
      data: {
        user: updatedUser
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error updating profile'
    });
  }
};

// JWT Protection Middleware
const protect = async (req, res, next) => {
  try {
    // Getting token and check if it's there
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        status: 'fail',
        message: 'You are not logged in! Please log in to get access.'
      });
    }

    // Verification token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // Check if user still exists
    const currentUser = await Staff.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({
        status: 'fail',
        message: 'The user belonging to this token does no longer exist.'
      });
    }

    // Check if user is active
    if (!currentUser.is_active) {
      return res.status(401).json({
        status: 'fail',
        message: 'Your account has been deactivated.'
      });
    }

    // Check if user changed password after the token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        status: 'fail',
        message: 'User recently changed password! Please log in again.'
      });
    }

    // Grant access to protected route
    req.user = currentUser;
    next();
  } catch (error) {
    return res.status(401).json({
      status: 'fail',
      message: 'Invalid token. Please log in again!'
    });
  }
};

// Role-based authorization
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to perform this action'
      });
    }
    next();
  };
};

// EXPLICIT EXPORTS - This should fix the undefined function error
module.exports = {
  login,
  logout,
  protect,
  restrictTo,
  getMe,
  updatePassword,
  updateMe,
  createStaffAccount,    // Make sure this is explicitly exported
  manageUsers,
  getAllUsers,
  generateStaffPassword,
  getRolePermissions,
  trackFailedLogin,
  signToken,
  createSendToken
};

// Debug: Log exports on load
console.log('✅ Auth Controller loaded with functions:', Object.keys(module.exports));