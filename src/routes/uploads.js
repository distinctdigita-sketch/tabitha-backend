const express = require('express');
const { param } = require('express-validator');
const { protect, checkPermission } = require('../middleware/auth');
const {
  upload,
  uploadChildPhoto,
  uploadChildDocument,
  uploadStaffPhoto,
  deleteFile
} = require('../controllers/uploadController');

const router = express.Router();

// Protect all routes
router.use(protect);

// Validation
const paramValidation = [
  param('childId').optional().isMongoId().withMessage('Invalid child ID'),
  param('staffId').optional().isMongoId().withMessage('Invalid staff ID'),
  param('entityType').optional().isIn(['children', 'staff']).withMessage('Invalid entity type'),
  param('entityId').optional().isMongoId().withMessage('Invalid entity ID'),
  param('fileId').optional().isMongoId().withMessage('Invalid file ID')
];

// Children file uploads
router.post(
  '/children/:childId/photo',
  checkPermission('children', 'update'),
  paramValidation,
  upload.single('photo'),
  uploadChildPhoto
);

router.post(
  '/children/:childId/document',
  checkPermission('children', 'update'),
  paramValidation,
  upload.single('document'),
  uploadChildDocument
);

// Staff file uploads
router.post(
  '/staff/:staffId/photo',
  checkPermission('staff', 'update'),
  paramValidation,
  upload.single('photo'),
  uploadStaffPhoto
);

// Delete files
router.delete(
  '/:entityType/:entityId/files/:fileId',
  paramValidation,
  deleteFile
);

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        status: 'fail',
        message: 'File too large. Maximum size is 5MB.'
      });
    }
  }
  
  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      status: 'fail',
      message: error.message
    });
  }
  
  next(error);
});

module.exports = router;