const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const Child = require('../models/Child');
const Staff = require('../models/Staff');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = 'uploads/';
    
    if (req.route.path.includes('children')) {
      uploadPath += 'children/';
    } else if (req.route.path.includes('staff')) {
      uploadPath += 'staff/';
    } else {
      uploadPath += 'documents/';
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    cb(null, `${uniqueSuffix}-${sanitizedOriginalName}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/png', 
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, PDF, and Word documents are allowed.'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
  },
  fileFilter: fileFilter
});

// Upload child photo
const uploadChildPhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'fail',
        message: 'No file uploaded'
      });
    }

    const { childId } = req.params;
    const { isPrimary = false } = req.body;

    // Find the child
    const child = await Child.findById(childId);
    if (!child) {
      // Delete uploaded file if child not found
      await fs.unlink(req.file.path);
      return res.status(404).json({
        status: 'fail',
        message: 'Child not found'
      });
    }

    // If setting as primary, update existing primary photo
    if (isPrimary) {
      child.photos.forEach(photo => {
        photo.is_primary = false;
      });
    }

    // Add new photo
    const newPhoto = {
      filename: req.file.filename,
      path: req.file.path,
      is_primary: isPrimary
    };

    child.photos.push(newPhoto);
    child.last_modified_by = req.user._id;
    await child.save();

    res.status(200).json({
      status: 'success',
      message: 'Photo uploaded successfully',
      data: {
        photo: newPhoto,
        url: `${req.protocol}://${req.get('host')}/uploads/children/${req.file.filename}`
      }
    });
  } catch (error) {
    // Delete uploaded file on error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }
    
    console.error('Upload child photo error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error uploading photo'
    });
  }
};

// Upload child document
const uploadChildDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'fail',
        message: 'No file uploaded'
      });
    }

    const { childId } = req.params;
    const { documentType } = req.body;

    // Find the child
    const child = await Child.findById(childId);
    if (!child) {
      await fs.unlink(req.file.path);
      return res.status(404).json({
        status: 'fail',
        message: 'Child not found'
      });
    }

    // Add new document
    const newDocument = {
      type: documentType || 'Other',
      filename: req.file.filename,
      path: req.file.path
    };

    child.documents.push(newDocument);
    child.last_modified_by = req.user._id;
    await child.save();

    res.status(200).json({
      status: 'success',
      message: 'Document uploaded successfully',
      data: {
        document: newDocument,
        url: `${req.protocol}://${req.get('host')}/uploads/children/${req.file.filename}`
      }
    });
  } catch (error) {
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }
    
    console.error('Upload child document error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error uploading document'
    });
  }
};

// Upload staff photo
const uploadStaffPhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'fail',
        message: 'No file uploaded'
      });
    }

    const { staffId } = req.params;

    // Find the staff member
    const staff = await Staff.findById(staffId);
    if (!staff) {
      await fs.unlink(req.file.path);
      return res.status(404).json({
        status: 'fail',
        message: 'Staff member not found'
      });
    }

    // Delete old photo if exists
    if (staff.photo && staff.photo.path) {
      try {
        await fs.unlink(staff.photo.path);
      } catch (deleteError) {
        console.error('Error deleting old photo:', deleteError);
      }
    }

    // Update staff photo
    staff.photo = {
      filename: req.file.filename,
      path: req.file.path
    };
    staff.last_modified_by = req.user._id;
    await staff.save();

    res.status(200).json({
      status: 'success',
      message: 'Photo uploaded successfully',
      data: {
        photo: staff.photo,
        url: `${req.protocol}://${req.get('host')}/uploads/staff/${req.file.filename}`
      }
    });
  } catch (error) {
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }
    
    console.error('Upload staff photo error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error uploading photo'
    });
  }
};

// Delete file
const deleteFile = async (req, res, next) => {
  try {
    const { entityType, entityId, fileId } = req.params;

    let entity;
    if (entityType === 'children') {
      entity = await Child.findById(entityId);
    } else if (entityType === 'staff') {
      entity = await Staff.findById(entityId);
    }

    if (!entity) {
      return res.status(404).json({
        status: 'fail',
        message: `${entityType.slice(0, -1)} not found`
      });
    }

    let fileToDelete;
    let filePath;

    if (entityType === 'children') {
      // Handle photos and documents
      fileToDelete = entity.photos.id(fileId) || entity.documents.id(fileId);
      if (fileToDelete) {
        filePath = fileToDelete.path;
        if (entity.photos.id(fileId)) {
          entity.photos.pull(fileId);
        } else {
          entity.documents.pull(fileId);
        }
      }
    } else if (entityType === 'staff') {
      // Handle staff photo
      if (entity.photo && entity.photo._id.toString() === fileId) {
        filePath = entity.photo.path;
        entity.photo = undefined;
      }
    }

    if (!fileToDelete && entityType !== 'staff') {
      return res.status(404).json({
        status: 'fail',
        message: 'File not found'
      });
    }

    // Delete physical file
    if (filePath) {
      try {
        await fs.unlink(filePath);
      } catch (deleteError) {
        console.error('Error deleting physical file:', deleteError);
      }
    }

    entity.last_modified_by = req.user._id;
    await entity.save();

    res.status(200).json({
      status: 'success',
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error deleting file'
    });
  }
};

module.exports = {
  upload,
  uploadChildPhoto,
  uploadChildDocument,
  uploadStaffPhoto,
  deleteFile
};