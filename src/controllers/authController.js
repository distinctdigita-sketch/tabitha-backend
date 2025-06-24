const jwt = require('jsonwebtoken');
const Staff = require('../models/Staff');
const { validationResult } = require('express-validator');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
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

const register = async (req, res, next) => {
  try {
    // Check for validation errors
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
      email,
      password,
      phone,
      date_of_birth,
      gender,
      marital_status,
      nin,
      position,
      department,
      role,
      emergency_contact,
      address
    } = req.body;

    // Check if user already exists
    const existingUser = await Staff.findOne({ 
      $or: [
        { email },
        { nin: nin || null }
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        status: 'fail',
        message: 'User with this email or NIN already exists'
      });
    }

    // Create new staff member
    const newUser = await Staff.create({
      first_name,
      last_name,
      email,
      password,
      phone,
      date_of_birth,
      gender,
      marital_status,
      nin,
      position,
      department,
      role: role || 'staff', // Default role
      emergency_contact,
      address,
      created_by: req.user ? req.user._id : null
    });

    createSendToken(newUser, 201, res);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({
      status: 'fail',
      message: error.message
    });
  }
};

const login = async (req, res, next) => {
  try {
    // Check for validation errors
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
    const user = await Staff.findOne({ email }).select('+password');

    if (!user || !(await user.correctPassword(password, user.password))) {
      return res.status(401).json({
        status: 'fail',
        message: 'Incorrect email or password'
      });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({
        status: 'fail',
        message: 'Your account has been deactivated. Please contact an administrator.'
      });
    }

    // Update last login
    user.last_login = new Date();
    await user.save({ validateBeforeSave: false });

    createSendToken(user, 200, res);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong during login'
    });
  }
};

const logout = (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully'
  });
};

const getMe = async (req, res, next) => {
  try {
    const user = await Staff.findById(req.user.id).populate('created_by', 'first_name last_name');
    
    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching user profile'
    });
  }
};

const updatePassword = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'fail',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Get user from collection
    const user = await Staff.findById(req.user.id).select('+password');

    // Check if current password is correct
    if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
      return res.status(401).json({
        status: 'fail',
        message: 'Your current password is wrong.'
      });
    }

    // Update password
    user.password = req.body.password;
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

    // Filtered out unwanted fields that are not allowed to be updated
    const allowedFields = [
      'first_name', 'last_name', 'phone', 'address', 'emergency_contact'
    ];
    
    const filteredBody = {};
    Object.keys(req.body).forEach(el => {
      if (allowedFields.includes(el)) filteredBody[el] = req.body[el];
    });

    // Update user document
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

module.exports = {
  register,
  login,
  logout,
  getMe,
  updatePassword,
  updateMe
};