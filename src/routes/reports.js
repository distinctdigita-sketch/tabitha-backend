const express = require('express');
const { protect, checkPermission } = require('../middleware/auth');
const {
  getDashboardSummary,
  getChildrenDemographics,
  getHealthSummary
} = require('../controllers/reportsController');

const router = express.Router();

// Protect all routes
router.use(protect);

// Report routes
router.get('/dashboard', checkPermission('reports', 'read'), getDashboardSummary);
router.get('/demographics', checkPermission('reports', 'read'), getChildrenDemographics);
router.get('/health', checkPermission('reports', 'read'), getHealthSummary);

module.exports = router;