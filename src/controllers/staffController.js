const Staff = require('../models/Staff');
const { validationResult } = require('express-validator');

// Get all staff with filtering and pagination
const getAllStaff = async (req, res, next) => {
  try {
    const {
      search,
      department,
      status,
      role,
      page = 1,
      limit = 50,
      sortBy = 'date_hired',
      sortOrder = 'desc'
    } = req.query;

    // Build query object
    let query = {};

    // Search functionality
    if (search) {
      query.$or = [
        { first_name: { $regex: search, $options: 'i' } },
        { last_name: { $regex: search, $options: 'i' } },
        { employee_id: { $regex: search, $options: 'i' } },
        { position: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } }
      ];
    }

    // Department filter
    if (department) {
      const departments = department.split(',');
      query.department = { $in: departments };
    }

    // Status filter
    if (status) {
      const statuses = status.split(',');
      query.employment_status = { $in: statuses };
    }

    // Role filter
    if (role) {
      const roles = role.split(',');
      query.role = { $in: roles };
    }

    // Build sort object
    const sortObj = {};
    sortObj[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const staff = await Staff.find(query)
      .select('-password') // Exclude password field
      .populate('created_by', 'first_name last_name')
      .populate('last_modified_by', 'first_name last_name')
      .sort(sortObj)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Get total count for pagination
    const total = await Staff.countDocuments(query);

    console.log(`Found ${staff.length} staff members out of ${total} total`);

    res.status(200).json({
      status: 'success',
      results: staff.length,
      data: staff,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get all staff error:', error);
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