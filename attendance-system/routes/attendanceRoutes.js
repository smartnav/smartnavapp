const express = require('express');
const {
  recordAttendance,
  manualAttendance,
  getAttendanceReport,
  getTodaysAttendance
} = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes protected
router.use(protect);

router.get('/scan', authorize('teacher'), recordAttendance);
router.post('/manual', authorize('teacher'), manualAttendance);
router.get('/report', authorize('admin', 'teacher'), getAttendanceReport);
router.get('/today', authorize('admin', 'teacher'), getTodaysAttendance);

module.exports = router;