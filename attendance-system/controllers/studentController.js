const Student = require('../models/Student');
const Attendance = require('../models/Attendance');

// @desc    Get all students
// @route   GET /api/students
exports.getStudents = async (req, res) => {
  try {
    const { class: className, section, page = 1, limit = 10, search } = req.query;
    
    // Build query
    const query = {};
    
    if (className) query.class = className;
    if (section) query.section = section;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } },
        { rfidTag: { $regex: search, $options: 'i' } }
      ];
    }
    query.isActive = true;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { class: 1, section: 1, rollNumber: 1 }
    };

    const students = await Student.find(query)
      .limit(options.limit * 1)
      .skip((options.page - 1) * options.limit)
      .sort(options.sort);

    const total = await Student.countDocuments(query);

    res.status(200).json({
      success: true,
      count: students.length,
      total,
      page: options.page,
      pages: Math.ceil(total / options.limit),
      students
    });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get single student
// @route   GET /api/students/:id
exports.getStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.status(200).json({
      success: true,
      student
    });
  } catch (error) {
    console.error('Get student error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Add student
// @route   POST /api/students
exports.addStudent = async (req, res) => {
  try {
    const { name, studentId, rfidTag, class: className, section, rollNumber, parentName, parentPhone, address } = req.body;

    // Check if student ID or RFID already exists
    const existingStudent = await Student.findOne({
      $or: [{ studentId }, { rfidTag }]
    });

    if (existingStudent) {
      return res.status(400).json({
        success: false,
        message: 'Student ID or RFID tag already exists'
      });
    }

    const student = await Student.create({
      name,
      studentId,
      rfidTag,
      class: className,
      section,
      rollNumber,
      parentName,
      parentPhone,
      address
    });

    res.status(201).json({
      success: true,
      student
    });
  } catch (error) {
    console.error('Add student error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update student
// @route   PUT /api/students/:id
exports.updateStudent = async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.status(200).json({
      success: true,
      student
    });
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete student
// @route   DELETE /api/students/:id
exports.deleteStudent = async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { isActive: false, updatedAt: Date.now() },
      { new: true }
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Student deactivated successfully'
    });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get student statistics
// @route   GET /api/students/stats
exports.getStudentStats = async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments({ isActive: true });
    
    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));
    
    const presentToday = await Attendance.countDocuments({
      date: { $gte: startOfDay, $lte: endOfDay },
      status: 'present'
    });

    res.status(200).json({
      success: true,
      totalStudents,
      presentToday
    });
  } catch (error) {
    console.error('Get student stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};