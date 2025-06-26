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

// SUPERADMIN CREATE STAFF ACCOUNT - Creates account using staff member's real information
const createStaffAccount = async (req, res, next) => {
  try {
    console.log('🔍 createStaffAccount function called');
    
    // Check if requester is superadmin
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({
        status: 'fail',
        message: 'Only superadmin can create staff accounts'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'fail',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      first_name,
      last_name,
      email,              // Staff member's real email
      phone,              // Staff member's real phone
      date_of_birth,      // Staff member's real DOB
      gender,
      marital_status,
      nin,                // Staff member's NIN (if available)
      position,           // Their actual job title
      department,         // Their actual department
      role,               // System access level
      employment_type = 'Full-time',
      salary,             // Optional
      address,            // Staff member's real address
      emergency_contact   // Important for staff records
    } = req.body;

    // Check if staff member already has an account
    const existingStaff = await Staff.findOne({ 
      $or: [
        { email },
        { nin: nin && nin.length === 11 ? nin : null }
      ].filter(Boolean)
    });
    
    if (existingStaff) {
      return res.status(400).json({
        status: 'fail',
        message: 'Staff member already has an account in the system'
      });
    }

    // Generate temporary password for the staff member
    const tempPassword = generateStaffPassword(first_name, last_name);

    // Set role-based permissions
    const permissions = getRolePermissions(role);

    // Create account for the staff member using their real information
    const staffAccount = new Staff({
      // Personal Information (Real Staff Data)
      first_name,
      last_name,
      email,                    // Staff member's actual email
      password: tempPassword,   // Temporary password they'll change
      phone,                   // Staff member's actual phone
      date_of_birth: date_of_birth || new Date('1990-01-01'),
      gender,
      marital_status,
      nin,                     // Staff member's NIN
      address,                 // Staff member's address
      emergency_contact,       // Important for HR records
      
      // Employment Information
      position,                // Their actual job title (e.g., "Child Care Worker")
      department,              // Their actual department (e.g., "Child Care")
      role,                    // System access level (admin, staff, etc.)
      permissions,
      employment_type,
      employment_status: 'Active',
      date_hired: new Date(),
      salary,
      
      // System Settings
      is_active: true,
      password_must_change: true,  // Force password change on first login
      created_by: req.user._id,    // Track who created this account
      
      // Nigerian Specific
      ...(address && {
        address: {
          street: address.street,
          city: address.city,
          state: address.state,
          lga: address.lga,
          postal_code: address.postal_code
        }
      })
    });

    await staffAccount.save();

    // Remove password from response
    staffAccount.password = undefined;

    // Log the account creation for audit trail
    console.log(`✅ Account created for staff member: ${first_name} ${last_name} (${email}) by ${req.user.first_name} ${req.user.last_name}`);

    res.status(201).json({
      status: 'success',
      message: `Account created successfully for ${first_name} ${last_name}`,
      data: {
        staff: staffAccount,
        loginCredentials: {
          email: staffAccount.email,
          temporaryPassword: tempPassword,
          employeeId: staffAccount.employee_id
        },
        instructions: {
          message: "Please provide these credentials to the staff member",
          nextSteps: [
            "Staff member should login with email and temporary password",
            "System will force password change on first login",
            "Staff member should use their personal email and phone for account recovery"
          ]
        }
      }
    });

  } catch (error) {
    console.error('Create staff account error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error creating staff account'
    });
  }
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

// Generate personalized temporary password for staff
const generateStaffPassword = (firstName, lastName) => {
  const firstInitial = firstName.charAt(0).toUpperCase();
  const lastInitial = lastName.charAt(0).toUpperCase();
  const randomNum = Math.floor(Math.random() * 9000) + 1000; // 4-digit number
  const symbols = ['@', '#', '$', '%'];
  const symbol = symbols[Math.floor(Math.random() * symbols.length)];
  
  return `TH-${firstInitial}${lastInitial}${randomNum}${symbol}`;
};

const getRolePermissions = (role) => {
  const permissions = {
    superadmin: [
      'manage_all_users',
      'manage_all_children',
      'manage_all_staff',
      'view_all_reports',
      'manage_system_settings',
      'delete_records',
      'export_data',
      'manage_backups'
    ],
    admin: [
      'manage_children',
      'manage_staff',
      'view_reports',
      'manage_documents',
      'export_data',
      'create_users' // Limited user creation
    ],
    staff: [
      'view_children',
      'edit_children',
      'view_staff',
      'create_reports',
      'manage_documents'
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