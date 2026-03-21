const express = require('express');
const router = express.Router();
const InterDeptController = require('../controllers/InterDeptController');

// Get/Sync user's departmental assignments
router.get('/users/:userId', InterDeptController.getUserAssignedDepts);
router.post('/users/:userId', InterDeptController.saveUserAssignments);

// List all eligible users (with interdepartment flag)
router.get('/inter-users', InterDeptController.getInterDeptUsers);

module.exports = router;
