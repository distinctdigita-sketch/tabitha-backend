const Staff = require('../models/Staff');
const { validationResult } = require('express-validator');

// Get all staff with filtering and pagination
const getAllStaff = async (req, res, next) => {
  try {
    // Build query
    const queryObj = { ...req.query };
    const excludedFields = ['page', 'sort', 'limit', 'fields', 'search'];
    excludedFields.forEach(el => delete queryObj[el]);

    // Advanced filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
    let query = Staff.find(JSON.parse(queryStr));

    // Text search
    if (req.query.search) {
      query = query.find({
        $text: { $search: req.query.search }
      });
    }

    // Sorting
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-hire_date first_name');
    }

    // Field limiting (exclude password)
    if (req.query.fields) {
      const fields = req.query.fields.split(',').join(' ');
      query = query.select(fields);
    } else {
      query = query.select('-password -__v');
    }

    // Pagination
    const page = req.query.page * 1 || 1;
    const limit = req.query.limit * 1 || 20;
    const skip = (page - 1) * limit;

    query = query.skip(skip).limit(limit);

    // Execute query
    const staff = await query.populate('created_by', 'first_name last_name');
    
    // Get total count for pagination
    const total = await Staff.countDocuments(JSON.parse(queryStr));

    res.status(200).json({
      status: 'success',
      results: staff.length,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      data: {
        staff
      }
    });
  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching staff records'
    });
  }
};

// Get staff member by ID
const getStaff = async (req, res, next) => {
  try {
    const staff = await Staff.findById(req.params.id)
      .select('-password')
      .populate('created_by', 'first_name last_name')
      .populate('last_modified_by', 'first_name last_name');

    if (!staff) {
      return res.status(404).json({
        status: 'fail',
        message: 'No staff member found with that ID'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        staff
      }
    });
  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching staff record'
    });
  }
};

// Update staff member
const updateStaff = async (req, res, next) => {
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

    // Remove sensitive fields that shouldn't be updated here
    const restrictedFields = ['password', 'role', 'permissions'];
    restrictedFields.forEach(field => delete req.body[field]);

    // Add last_modified_by field
    req.body.last_modified_by = req.user._id;

    const staff = await Staff.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    })
    .select('-password')
    .populate('created_by last_modified_by', 'first_name last_name');

    if (!staff) {
      return res.status(404).json({
        status: 'fail',
        message: 'No staff member found with that ID'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        staff
      }
    });
  } catch (error) {
    console.error('Update staff error:', error);
    res.status(400).json({
      status: 'fail',
      message: error.message
    });
  }
};

// Deactivate staff member
const deactivateStaff = async (req, res, next) => {
  try {
    const staff = await Staff.findByIdAndUpdate(
      req.params.id,
      { 
        is_active: false,
        employment_status: 'Terminated',
        last_modified_by: req.user._id
      },
      { new: true }
    ).select('-password');

    if (!staff) {
      return res.status(404).json({
        status: 'fail',
        message: 'No staff member found with that ID'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Staff member deactivated successfully',
      data: {
        staff
      }
    });
  } catch (error) {
    console.error('Deactivate staff error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error deactivating staff member'
    });
  }
};

// Get staff statistics
const getStaffStats = async (req, res, next) => {
  try {
    const departmentStats = await Staff.aggregate([
      {
        $match: { is_active: true }
      },
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 },
          positions: { $addToSet: '$position' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const roleStats = await Staff.aggregate([
      {
        $match: { is_active: true }
      },
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    const employmentStats = await Staff.aggregate([
      {
        $group: {
          _id: '$employment_status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalActive = await Staff.countDocuments({ is_active: true });
    const totalStaff = await Staff.countDocuments();

    res.status(200).json({
      status: 'success',
      data: {
        totalStaff,
        totalActive,
        departmentStats,
        roleStats,
        employmentStats
      }
    });
  } catch (error) {
    console.error('Get staff stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching staff statistics'
    });
  }
};

// Update staff permissions (admin only)
const updateStaffPermissions = async (req, res, next) => {
  try {
    const { role, permissions } = req.body;

    const staff = await Staff.findByIdAndUpdate(
      req.params.id,
      { 
        role,
        permissions,
        last_modified_by: req.user._id
      },
      { 
        new: true,
        runValidators: true
      }
    ).select('-password');

    if (!staff) {
      return res.status(404).json({
        status: 'fail',
        message: 'No staff member found with that ID'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Staff permissions updated successfully',
      data: {
        staff
      }
    });
  } catch (error) {
    console.error('Update permissions error:', error);
    res.status(400).json({
      status: 'fail',
      message: error.message
    });
  }
};

module.exports = {
  getAllStaff,
  getStaff,
  updateStaff,
  deactivateStaff,
  getStaffStats,
  updateStaffPermissions
};