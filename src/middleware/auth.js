const jwt = require('jsonwebtoken');
const Staff = require('../models/Staff');

const protect = async (req, res, next) => {
  try {
    // 1) Get token and check if it exists
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        status: 'fail',
        message: 'You are not logged in! Please log in to get access.'
      });
    }

    // 2) Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3) Check if user still exists
    const currentUser = await Staff.findById(decoded.id).select('+password');
    if (!currentUser) {
      return res.status(401).json({
        status: 'fail',
        message: 'The user belonging to this token does no longer exist.'
      });
    }

    // 4) Check if user changed password after the token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        status: 'fail',
        message: 'User recently changed password! Please log in again.'
      });
    }

    // 5) Check if user is active
    if (!currentUser.is_active) {
      return res.status(401).json({
        status: 'fail',
        message: 'Your account has been deactivated. Please contact an administrator.'
      });
    }

    // Grant access to protected route
    req.user = currentUser;
    next();
  } catch (error) {
    return res.status(401).json({
      status: 'fail',
      message: 'Invalid token. Please log in again!'
    });
  }
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to perform this action'
      });
    }
    next();
  };
};

const checkPermission = (module, action) => {
  return (req, res, next) => {
    const userPermissions = req.user.permissions || [];
    const hasPermission = userPermissions.some(permission => 
      permission.module === module && permission.actions.includes(action)
    );

    if (!hasPermission && !['super_admin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        status: 'fail',
        message: `You do not have permission to ${action} ${module}`
      });
    }
    next();
  };
};

module.exports = { protect, restrictTo, checkPermission };