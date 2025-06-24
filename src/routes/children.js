const express = require('express');
const { body, param } = require('express-validator');
const { protect, restrictTo, checkPermission } = require('../middleware/auth');
const {
  getAllChildren,
  getChild,
  createChild,
  updateChild,
  deleteChild,
  getChildrenStats,
  searchChildren,
  getAutocompleteSuggestions
} = require('../controllers/childrenController');

const router = express.Router();

// Protect all routes
router.use(protect);

// Validation rules
const childValidation = [
  body('first_name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('last_name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('date_of_birth')
    .isISO8601()
    .withMessage('Please provide a valid date of birth')
    .custom((value) => {
      const today = new Date();
      const birthDate = new Date(value);
      if (birthDate >= today) {
        throw new Error('Date of birth must be in the past');
      }
      return true;
    }),
  body('gender')
    .isIn(['Male', 'Female'])
    .withMessage('Gender must be either Male or Female'),
  body('state_of_origin')
    .isIn([
      'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
      'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
      'FCT', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi',
      'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun',
      'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
    ])
    .withMessage('Please select a valid Nigerian state'),
  body('genotype')
    .isIn(['AA', 'AS', 'SS', 'AC', 'SC', 'CC', 'Unknown'])
    .withMessage('Please select a valid genotype'),
  body('arrival_circumstances')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Arrival circumstances must be between 10 and 500 characters'),
  body('height_cm')
    .optional()
    .isNumeric()
    .isFloat({ min: 30, max: 250 })
    .withMessage('Height must be between 30 and 250 cm'),
  body('weight_kg')
    .optional()
    .isNumeric()
    .isFloat({ min: 1, max: 200 })
    .withMessage('Weight must be between 1 and 200 kg')
];

const paramValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid child ID format')
];

// Public search and autocomplete (for staff use)
router.get('/search', checkPermission('children', 'read'), searchChildren);
router.get('/autocomplete', checkPermission('children', 'read'), getAutocompleteSuggestions);
router.get('/stats', checkPermission('children', 'read'), getChildrenStats);

// CRUD routes
router
  .route('/')
  .get(checkPermission('children', 'read'), getAllChildren)
  .post(checkPermission('children', 'create'), childValidation, createChild);

router
  .route('/:id')
  .get(checkPermission('children', 'read'), paramValidation, getChild)
  .patch(checkPermission('children', 'update'), paramValidation, childValidation, updateChild)
  .delete(restrictTo('admin', 'super_admin'), paramValidation, deleteChild);

module.exports = router;