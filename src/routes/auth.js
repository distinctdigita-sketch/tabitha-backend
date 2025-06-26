// src/routes/auth.js - Complete fixed version
const express = require('express');
const { body } = require('express-validator');
const {
  login,
  logout,
  protect,
  getMe,
  updatePassword,
  updateMe,
  createStaffAccount,
  manageUsers
} = require('../controllers/authController');

const router = express.Router();

// Public route - Login only
router.post('/login', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
], login);

// Protected routes
router.use(protect);

router.post('/logout', logout);
router.get('/me', getMe);
router.post('/manageUsers', manageUsers);

// Staff creation route (admin only)
// Update the createStaffAccount route validation in src/routes/auth.js
router.post('/createStaffAccount', [
  body('first_name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('last_name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('phone')
    .matches(/^(\+234|0)[789][01]\d{8}$/)
    .withMessage('Please provide a valid Nigerian phone number'),
  body('position')
    .notEmpty()
    .withMessage('Position is required')
    .isIn([
      'Director', 'Assistant Director', 'Administrator', 'System Administrator',
      'Social Worker', 'Child Care Worker', 'Teacher', 'Nurse', 'Medical Officer',
      'Cook', 'Security Officer', 'Cleaner', 'Maintenance', 'Volunteer', 'Intern',
      'Manager', 'Supervisor', 'Counselor', 'Driver'
    ])
    .withMessage('Invalid position selected'),
  body('department')
    .notEmpty()
    .withMessage('Department is required')
    .isIn(['Administration', 'Child Care', 'Education', 'Medical', 'Kitchen', 'Security', 'Maintenance', 'Social Services'])
    .withMessage('Invalid department selected'),
  body('role')
    .optional()
    .isIn(['super_admin', 'admin', 'manager', 'staff', 'volunteer', 'read_only'])
    .withMessage('Invalid role specified'),
  body('emergency_contact.name')
    .notEmpty()
    .withMessage('Emergency contact name is required'),
  body('emergency_contact.relationship')
    .notEmpty()
    .withMessage('Emergency contact relationship is required'),
  body('emergency_contact.phone')
    .matches(/^(\+234|0)[789][01]\d{8}$/)
    .withMessage('Emergency contact phone must be a valid Nigerian number'),
  body('date_of_birth')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date of birth'),
  body('nin')
    .optional()
    .isLength({ min: 11, max: 11 })
    .isNumeric()
    .withMessage('NIN must be exactly 11 digits'),
  body('salary')
    .optional()
    .isNumeric()
    .withMessage('Salary must be a number')
], createStaffAccount);

router.patch('/updatePassword', [
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('passwordCurrent')
    .notEmpty()
    .withMessage('Current password is required')
], updatePassword);

router.patch('/updateMe', updateMe);

module.exports = router;