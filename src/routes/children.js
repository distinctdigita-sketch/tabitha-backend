const express = require('express');
const { body, param } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
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

// Configure multer for photo uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/children/photos';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Create unique filename: childId-timestamp-originalname
    const uniqueName = `${req.params.id}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// File filter to accept only images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, WebP) are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

// Protect all routes
router.use(protect);

// Validation rules for creating children
const createChildValidation = [
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
  body('lga')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Local Government Area is required and must be between 2 and 50 characters'),
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
    .withMessage('Weight must be between 1 and 200 kg'),
  body('religion')
    .optional()
    .isIn(['Christianity', 'Islam', 'Traditional', 'Other'])
    .withMessage('Please select a valid religion'),
  body('education_level')
    .optional()
    .isIn([
      'Pre-School', 'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 
      'Primary 5', 'Primary 6', 'JSS 1', 'JSS 2', 'JSS 3', 'SSS 1', 
      'SSS 2', 'SSS 3', 'Tertiary', 'Vocational Training', 'Out of School'
    ])
    .withMessage('Please select a valid education level')
];

// Validation rules for updating children (all fields optional)
const updateChildValidation = [
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
  body('date_of_birth')
    .optional()
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
    .optional()
    .isIn(['Male', 'Female'])
    .withMessage('Gender must be either Male or Female'),
  body('state_of_origin')
    .optional()
    .isIn([
      'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
      'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
      'FCT', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi',
      'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun',
      'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
    ])
    .withMessage('Please select a valid Nigerian state'),
  body('lga')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Local Government Area must be between 2 and 50 characters'),
  body('genotype')
    .optional()
    .isIn(['AA', 'AS', 'SS', 'AC', 'SC', 'CC', 'Unknown'])
    .withMessage('Please select a valid genotype'),
  body('arrival_circumstances')
    .optional()
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
    .withMessage('Weight must be between 1 and 200 kg'),
  body('religion')
    .optional()
    .isIn(['Christianity', 'Islam', 'Traditional', 'Other'])
    .withMessage('Please select a valid religion'),
  body('education_level')
    .optional()
    .isIn([
      'Pre-School', 'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 
      'Primary 5', 'Primary 6', 'JSS 1', 'JSS 2', 'JSS 3', 'SSS 1', 
      'SSS 2', 'SSS 3', 'Tertiary', 'Vocational Training', 'Out of School'
    ])
    .withMessage('Please select a valid education level')
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
  .post(checkPermission('children', 'create'), createChildValidation, createChild);

router
  .route('/:id')
  .get(checkPermission('children', 'read'), paramValidation, getChild)
  .patch(checkPermission('children', 'update'), paramValidation, updateChildValidation, updateChild)
  .delete(restrictTo('admin', 'super_admin'), paramValidation, deleteChild);

// Photo upload routes
router.patch(
  '/:id/photo',
  checkPermission('children', 'update'),
  paramValidation,
  upload.single('photo'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const Child = require('../models/Child'); // Adjust path to your Child model
      
      if (!req.file) {
        return res.status(400).json({
          status: 'error',
          message: 'No photo file provided'
        });
      }

      // Find the child
      const child = await Child.findById(id);
      
      if (!child) {
        // Delete the uploaded file if child not found
        if (req.file && req.file.path) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(404).json({
          status: 'error',
          message: 'Child not found'
        });
      }

      // Delete old photo if exists
      if (child.photo_url) {
        const oldPhotoPath = path.join(__dirname, '..', child.photo_url);
        if (fs.existsSync(oldPhotoPath)) {
          try {
            fs.unlinkSync(oldPhotoPath);
          } catch (err) {
            console.error('Error deleting old photo:', err);
          }
        }
      }

      // Update child with new photo URL
      const photoUrl = `/uploads/children/photos/${req.file.filename}`;
      child.photo_url = photoUrl;
      child.last_modified_by = req.user?.name || req.user?.email || 'System';
      await child.save();

      res.status(200).json({
        status: 'success',
        message: 'Photo updated successfully',
        data: {
          child: child,
          photo_url: photoUrl
        }
      });

    } catch (error) {
      // Delete uploaded file if there's an error
      if (req.file && req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (err) {
          console.error('Error deleting file after error:', err);
        }
      }
      
      console.error('Photo upload error:', error);
      res.status(500).json({
        status: 'error',
        message: error.message || 'Failed to upload photo'
      });
    }
  }
);

// Delete photo route
router.delete(
  '/:id/photo',
  checkPermission('children', 'update'),
  paramValidation,
  async (req, res) => {
    try {
      const { id } = req.params;
      const Child = require('../models/Child'); // Adjust path to your Child model
      
      const child = await Child.findById(id);
      
      if (!child) {
        return res.status(404).json({
          status: 'error',
          message: 'Child not found'
        });
      }

      // Delete photo file if exists
      if (child.photo_url) {
        const photoPath = path.join(__dirname, '..', child.photo_url);
        if (fs.existsSync(photoPath)) {
          try {
            fs.unlinkSync(photoPath);
          } catch (err) {
            console.error('Error deleting photo file:', err);
          }
        }
      }

      // Remove photo_url from database
      child.photo_url = null;
      child.last_modified_by = req.user?.name || req.user?.email || 'System';
      await child.save();

      res.status(200).json({
        status: 'success',
        message: 'Photo deleted successfully',
        data: {
          child: child
        }
      });

    } catch (error) {
      console.error('Photo delete error:', error);
      res.status(500).json({
        status: 'error',
        message: error.message || 'Failed to delete photo'
      });
    }
  }
);

module.exports = router;