const express = require('express');
const { body, param } = require('express-validator');
const { protect, restrictTo, checkPermission } = require('../middleware/auth');
const {
  getAllStaff,
  getStaff,
  updateStaff,
  deactivateStaff,
  getStaffStats,
  updateStaffPermissions
} = require('../controllers/staffController');

const router = express.Router();

// Protect all routes
router.use(protect);

// Validation rules
const updateStaffValidation = [
  body('first_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('last_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('phone')
    .optional()
    .matches(/^(\+234|0)[789][01]\d{8}$/)
    .withMessage('Please provide a valid Nigerian phone number'),
  body('nin')
    .optional()
    .isLength({ min: 11, max: 11 })
    .isNumeric()
    .withMessage('NIN must be exactly 11 digits')
];

const permissionsValidation = [
  body('role')
    .isIn(['super_admin', 'admin', 'manager', 'staff', 'volunteer', 'read_only'])
    .withMessage('Invalid role specified'),
  body('permissions')
    .optional()
    .isArray()
    .withMessage('Permissions must be an array')
];

const paramValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid staff ID format')
];

// Statistics route
router.get('/stats', checkPermission('staff', 'read'), getStaffStats);

// CRUD routes
router
  .route('/')
  .get(checkPermission('staff', 'read'), getAllStaff);

router
  .route('/:id')
  .get(checkPermission('staff', 'read'), paramValidation, getStaff)
  .patch(checkPermission('staff', 'update'), paramValidation, updateStaffValidation, updateStaff)
  .delete(restrictTo('admin', 'super_admin'), paramValidation, deactivateStaff);

// Admin-only permission management
router.patch(
  '/:id/permissions',
  restrictTo('admin', 'super_admin'),
  paramValidation,
  permissionsValidation,
  updateStaffPermissions
);

module.exports = router;