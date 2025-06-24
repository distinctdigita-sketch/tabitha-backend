const Child = require('../models/Child');
const Staff = require('../models/Staff');

// Get dashboard summary
const getDashboardSummary = async (req, res, next) => {
  try {
    // Children statistics
    const totalChildren = await Child.countDocuments({ current_status: 'Active' });
    const newAdmissionsThisMonth = await Child.countDocuments({
      admission_date: {
        $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      }
    });

    // Staff statistics
    const totalStaff = await Staff.countDocuments({ is_active: true });
    
    // Age distribution
    const ageDistribution = await Child.aggregate([
      { $match: { current_status: 'Active' } },
      {
        $addFields: {
          age: {
            $floor: {
              $divide: [
                { $subtract: [new Date(), '$date_of_birth'] },
                365.25 * 24 * 60 * 60 * 1000
              ]
            }
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
      }
    ]);

    // Gender distribution
    const genderDistribution = await Child.aggregate([
      { $match: { current_status: 'Active' } },
      {
        $group: {
          _id: '$gender',
          count: { $sum: 1 }
        }
      }
    ]);

    // Recent admissions
    const recentAdmissions = await Child.find({ current_status: 'Active' })
      .sort({ admission_date: -1 })
      .limit(5)
      .select('first_name last_name admission_date age gender')
      .populate('created_by', 'first_name last_name');

    res.status(200).json({
      status: 'success',
      data: {
        summary: {
          totalChildren,
          newAdmissionsThisMonth,
          totalStaff,
          lastUpdated: new Date()
        },
        ageDistribution,
        genderDistribution,
        recentAdmissions
      }
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error generating dashboard summary'
    });
  }
};

// Get children demographics report
const getChildrenDemographics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    let matchCondition = { current_status: 'Active' };
    
    if (startDate && endDate) {
      matchCondition.admission_date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // State of origin distribution
    const stateDistribution = await Child.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: '$state_of_origin',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Language distribution
    const languageDistribution = await Child.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: '$preferred_language',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Education level distribution
    const educationDistribution = await Child.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: '$education_level',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Admission trends (monthly for the past year)
    const admissionTrends = await Child.aggregate([
      {
        $match: {
          admission_date: {
            $gte: new Date(new Date().getFullYear() - 1, new Date().getMonth(), 1)
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$admission_date' },
            month: { $month: '$admission_date' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        stateDistribution,
        languageDistribution,
        educationDistribution,
        admissionTrends,
        reportGenerated: new Date(),
        dateRange: { startDate, endDate }
      }
    });
  } catch (error) {
    console.error('Demographics report error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error generating demographics report'
    });
  }
};

// Get health summary report
const getHealthSummary = async (req, res, next) => {
  try {
    // Genotype distribution
    const genotypeDistribution = await Child.aggregate([
      { $match: { current_status: 'Active' } },
      {
        $group: {
          _id: '$genotype',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Blood type distribution
    const bloodTypeDistribution = await Child.aggregate([
      { $match: { current_status: 'Active' } },
      {
        $group: {
          _id: '$blood_type',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Children with medical conditions
    const medicalConditions = await Child.aggregate([
      { $match: { 
        current_status: 'Active',
        'medical_conditions.0': { $exists: true }
      }},
      { $unwind: '$medical_conditions' },
      {
        $group: {
          _id: '$medical_conditions.condition',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Immunization coverage
    const immunizationCoverage = await Child.aggregate([
      { $match: { current_status: 'Active' } },
      {
        $group: {
          _id: null,
          totalChildren: { $sum: 1 },
          bcgCount: { $sum: { $cond: ['$immunization_status.bcg', 1, 0] } },
          polioCount: { $sum: { $cond: ['$immunization_status.polio', 1, 0] } },
          dptCount: { $sum: { $cond: ['$immunization_status.dpt', 1, 0] } },
          measlesCount: { $sum: { $cond: ['$immunization_status.measles', 1, 0] } },
          yellowFeverCount: { $sum: { $cond: ['$immunization_status.yellow_fever', 1, 0] } },
          hepatitisBCount: { $sum: { $cond: ['$immunization_status.hepatitis_b', 1, 0] } }
        }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        genotypeDistribution,
        bloodTypeDistribution,
        medicalConditions,
        immunizationCoverage: immunizationCoverage[0] || {},
        reportGenerated: new Date()
      }
    });
  } catch (error) {
    console.error('Health summary error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error generating health summary'
    });
  }
};

module.exports = {
  getDashboardSummary,
  getChildrenDemographics,
  getHealthSummary
};