const express = require('express');
const {
  getStudents,
  getStudent,
  addStudent,
  updateStudent,
  deleteStudent,
  getStudentStats
} = require('../controllers/studentController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes protected
router.use(protect);

router.route('/')
  .get(authorize('admin', 'teacher'), getStudents)
  .post(authorize('admin', 'teacher'), addStudent);

router.route('/:id')
  .get(authorize('admin', 'teacher'), getStudent)
  .put(authorize('admin', 'teacher'), updateStudent)
  .delete(authorize('admin'), deleteStudent);

router.get('/stats/overview', authorize('admin', 'teacher'), getStudentStats);

module.exports = router;