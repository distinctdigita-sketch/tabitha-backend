const Child = require('../models/Child');
const { validationResult } = require('express-validator');

// Get all children with advanced filtering, sorting, and pagination
const getAllChildren = async (req, res, next) => {
  try {
    // Build query
    const queryObj = { ...req.query };
    const excludedFields = ['page', 'sort', 'limit', 'fields', 'search'];
    excludedFields.forEach(el => delete queryObj[el]);

    // Advanced filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
    let query = Child.find(JSON.parse(queryStr));

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
      query = query.sort('-admission_date');
    }

    // Field limiting
    if (req.query.fields) {
      const fields = req.query.fields.split(',').join(' ');
      query = query.select(fields);
    } else {
      query = query.select('-__v');
    }

    // Pagination
    const page = req.query.page * 1 || 1;
    const limit = req.query.limit * 1 || 20;
    const skip = (page - 1) * limit;

    query = query.skip(skip).limit(limit);

    // Execute query
    const children = await query.populate('created_by', 'first_name last_name');
    
    // Get total count for pagination
    const total = await Child.countDocuments(JSON.parse(queryStr));

    res.status(200).json({
      status: 'success',
      results: children.length,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      data: {
        children
      }
    });
  } catch (error) {
    console.error('Get children error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching children records'
    });
  }
};

// Get child by ID
const getChild = async (req, res, next) => {
  try {
    const child = await Child.findById(req.params.id)
      .populate('created_by', 'first_name last_name')
      .populate('last_modified_by', 'first_name last_name');

    if (!child) {
      return res.status(404).json({
        status: 'fail',
        message: 'No child found with that ID'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        child
      }
    });
  } catch (error) {
    console.error('Get child error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching child record'
    });
  }
};

// Create new child
const createChild = async (req, res, next) => {
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

    // Add created_by field
    req.body.created_by = req.user._id;

    const newChild = await Child.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        child: newChild
      }
    });
  } catch (error) {
    console.error('Create child error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'fail',
        message: 'A child with this information already exists'
      });
    }
    
    res.status(400).json({
      status: 'fail',
      message: error.message
    });
  }
};

// Update child
const updateChild = async (req, res, next) => {
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

    // Add last_modified_by field
    req.body.last_modified_by = req.user._id;

    const child = await Child.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('created_by last_modified_by', 'first_name last_name');

    if (!child) {
      return res.status(404).json({
        status: 'fail',
        message: 'No child found with that ID'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        child
      }
    });
  } catch (error) {
    console.error('Update child error:', error);
    res.status(400).json({
      status: 'fail',
      message: error.message
    });
  }
};

// Delete child (soft delete by changing status)
const deleteChild = async (req, res, next) => {
  try {
    const child = await Child.findByIdAndUpdate(
      req.params.id,
      { 
        current_status: 'Exited',
        exit_date: new Date(),
        exit_reason: 'Record archived',
        last_modified_by: req.user._id
      },
      { new: true }
    );

    if (!child) {
      return res.status(404).json({
        status: 'fail',
        message: 'No child found with that ID'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Child record archived successfully'
    });
  } catch (error) {
    console.error('Delete child error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error archiving child record'
    });
  }
};

// Get children statistics
const getChildrenStats = async (req, res, next) => {
  try {
    const stats = await Child.aggregate([
      {
        $group: {
          _id: '$current_status',
          count: { $sum: 1 },
          avgAge: { 
            $avg: {
              $divide: [
                { $subtract: [new Date(), '$date_of_birth'] },
                365.25 * 24 * 60 * 60 * 1000
              ]
            }
          }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const genderStats = await Child.aggregate([
      {
        $match: { current_status: 'Active' }
      },
      {
        $group: {
          _id: '$gender',
          count: { $sum: 1 }
        }
      }
    ]);

    const ageGroups = await Child.aggregate([
      {
        $match: { current_status: 'Active' }
      },
      {
        $addFields: {
          age: {
            $divide: [
              { $subtract: [new Date(), '$date_of_birth'] },
              365.25 * 24 * 60 * 60 * 1000
            ]
          }
        }
      },
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                { case: { $lt: ['$age', 3] }, then: '0-2 years' },
                { case: { $lt: ['$age', 6] }, then: '3-5 years' },
                { case: { $lt: ['$age', 12] }, then: '6-11 years' },
                { case: { $lt: ['$age', 18] }, then: '12-17 years' }
              ],
              default: '18+ years'
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        statusStats: stats,
        genderStats,
        ageGroups
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching statistics'
    });
  }
};

// Search children with fuzzy matching
const searchChildren = async (req, res, next) => {
  try {
    const { query, page = 1, limit = 20 } = req.query;
    
    if (!query) {
      return res.status(400).json({
        status: 'fail',
        message: 'Search query is required'
      });
    }

    // Text search with MongoDB
    const children = await Child.find(
      { $text: { $search: query } },
      { score: { $meta: 'textScore' } }
    )
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .populate('created_by', 'first_name last_name');

    // Also search by exact ID match
    const idMatch = await Child.findOne({ child_id: query.toUpperCase() })
      .populate('created_by', 'first_name last_name');

    let results = [...children];
    if (idMatch && !children.find(child => child._id.equals(idMatch._id))) {
      results.unshift(idMatch);
    }

    res.status(200).json({
      status: 'success',
      results: results.length,
      data: {
        children: results
      }
    });
  } catch (error) {
    console.error('Search children error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error searching children records'
    });
  }
};

// Get autocomplete suggestions
const getAutocompleteSuggestions = async (req, res, next) => {
  try {
    const { field, query } = req.query;
    
    if (!field || !query) {
      return res.status(400).json({
        status: 'fail',
        message: 'Field and query parameters are required'
      });
    }

    let suggestions = [];

    // Get distinct values for the field that match the query
    const regex = new RegExp(query, 'i');
    
    if (field === 'first_name' || field === 'last_name') {
      suggestions = await Child.distinct(field, { 
        [field]: { $regex: regex },
        current_status: 'Active'
      });
    } else if (field === 'medical_conditions') {
      const children = await Child.find({
        'medical_conditions.condition': { $regex: regex },
        current_status: 'Active'
      }, 'medical_conditions');
      
      suggestions = [...new Set(
        children.flatMap(child => 
          child.medical_conditions
            .filter(condition => regex.test(condition.condition))
            .map(condition => condition.condition)
        )
      )];
    }

    // Limit to 10 suggestions
    suggestions = suggestions.slice(0, 10);

    res.status(200).json({
      status: 'success',
      data: {
        suggestions
      }
    });
  } catch (error) {
    console.error('Autocomplete error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching suggestions'
    });
  }
};

module.exports = {
  getAllChildren,
  getChild,
  createChild,
  updateChild,
  deleteChild,
  getChildrenStats,
  searchChildren,
  getAutocompleteSuggestions
};