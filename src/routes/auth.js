// routes/auth.js - Fixed version to resolve undefined function error
const express = require('express');
const { body } = require('express-validator');

// Import all functions with explicit logging to debug
const authController = require('../controllers/authController');

// Debug: Log what's actually being imported
console.log('🔍 Debugging Auth Controller Imports:');
console.log('Available functions:', Object.keys(authController));

// Destructure with error handling
const {
  login,
  logout,
  protect,
  restrictTo,
  getMe,
  updatePassword,
  updateMe,
  createStaffAccount,  // This might be undefined
  manageUsers,
  getAllUsers
} = authController;

// Debug: Check if createStaffAccount is defined
console.log('createStaffAccount function:', typeof createStaffAccount);

const router = express.Router();

// ===== PUBLIC ROUTES (No authentication required) =====
router.post('/login', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
], login);

// ===== PROTECTED ROUTES (Authentication required) =====
router.use(protect); // All routes after this middleware are protected

router.post('/logout', logout);
router.get('/me', getMe);

router.patch('/updateMyPassword', [
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number and special character'),
  body('passwordConfirm')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    })
], updatePassword);

router.patch('/updateMe', updateMe);

// ===== SUPERADMIN ONLY ROUTES =====
router.use(restrictTo('superadmin')); // Only superadmin can access these routes

// Fixed route - check if function exists before using
if (typeof createStaffAccount === 'function') {
  router.post('/create-staff-account', [
    body('first_name')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Staff first name must be between 2 and 50 characters'),
    body('last_name')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Staff last name must be between 2 and 50 characters'),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide staff member\'s valid email address'),
    body('phone')
      .matches(/^\+234[789][01]\d{8}$/)
      .withMessage('Please provide valid Nigerian phone number (+234...)'),
    body('position')
      .trim()
      .notEmpty()
      .withMessage('Staff position/job title is required'),
    body('department')
      .trim()
      .notEmpty()
      .withMessage('Staff department is required'),
    body('role')
      .isIn(['admin', 'staff', 'volunteer', 'read_only'])
      .withMessage('Invalid system access role specified')
  ], createStaffAccount);
} else {
  console.error('❌ createStaffAccount function is not defined in authController');
  
  // Fallback route with error message
  router.post('/create-staff-account', (req, res) => {
    res.status(500).json({
      status: 'error',
      message: 'createStaffAccount function is not available. Please check the controller.'
    });
  });
}

router.get('/staff-accounts', getAllUsers);
router.patch('/manage-staff-account', manageUsers);

module.exports = router;