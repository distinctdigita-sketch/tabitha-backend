// src/routes/dashboard.js
const express = require('express');
const { protect, checkPermission } = require('../middleware/auth');
const Child = require('../models/Child');
const Staff = require('../models/Staff');

const router = express.Router();

// Protect all routes
router.use(protect);

// Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const totalChildren = await Child.countDocuments();
    const activeChildren = await Child.countDocuments({ current_status: 'Active' });
    const totalStaff = await Staff.countDocuments();
    const activeStaff = await Staff.countDocuments({ is_active: true });

    // Calculate changes (mock data for now)
    const stats = {
      totalChildren,
      totalChildrenChange: 8,
      activeStaff,
      activeStaffChange: 2,
      activeAdmissions: activeChildren,
      activeAdmissionsChange: 3,
      pendingCases: 12,
      pendingCasesChange: -2
    };

    res.status(200).json({
      status: 'success',
      data: { stats }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching dashboard statistics'
    });
  }
});

// Get recent activities
router.get('/activities', async (req, res) => {
  try {
    // Mock data for now - you can implement real activity tracking later
    const recentActivities = [
      {
        id: 1,
        type: 'admission',
        title: 'New child admission',
        description: 'New child was admitted to the home',
        timestamp: new Date().toISOString(),
        user: `${req.user.first_name} ${req.user.last_name}`,
        priority: 'normal'
      }
    ];

    res.status(200).json({
      status: 'success',
      data: { recentActivities }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching recent activities'
    });
  }
});

module.exports = router;