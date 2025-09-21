const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const RFIDService = require('../services/rfidService');

// @desc    Record attendance via RFID
// @route   GET /api/attendance/scan
exports.recordAttendance = async (req, res) => {
  try {
    RFIDService.onTag(async (tagId) => {
      try {
        const student = await Student.findOne({ rfidTag: tagId, isActive: true });
        
        if (!student) {
          return res.status(404).json({ 
            success: false,
            message: 'Student not found for this RFID tag'
          });
        }
        
        // Check if attendance already recorded today
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const endOfDay = new Date(today.setHours(23, 59, 59, 999));
        
        const existingAttendance = await Attendance.findOne({
          student: student._id,
          date: { 
            $gte: startOfDay,
            $lt: endOfDay
          }
        });
        
        if (existingAttendance) {
          return res.status(400).json({ 
            success: false,
            message: 'Attendance already recorded today'
          });
        }
        
        const attendance = await Attendance.create({
          student: student._id,
          recordedBy: req.user.id,
          deviceType: 'rfid'
        });
        
        // Emit real-time event
        const io = req.app.get('io');
        io.to('rfid-updates').emit('attendance-recorded', {
          student: {
            id: student._id,
            name: student.name,
            class: student.class,
            section: student.section
          },
          attendance: {
            id: attendance._id,
            date: attendance.date,
            status: attendance.status
          }
        });
        
        res.status(201).json({
          success: true,
          message: 'Attendance recorded',
          attendance: {
            id: attendance._id,
            student: {
              id: student._id,
              name: student.name,
              class: student.class,
              section: student.section
            },
            date: attendance.date,
            status: attendance.status
          }
        });
      } catch (err) {
        console.error(err);
        res.status(500).json({ 
          success: false,
          message: 'Server error'
        });
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Manual attendance recording
// @route   POST /api/attendance/manual
exports.manualAttendance = async (req, res) => {
  try {
    const { studentId, status, notes } = req.body;
    
    const student = await Student.findById(studentId);
    if (!student || !student.isActive) {
      return res.status(404).json({ 
        success: false,
        message: 'Student not found'
      });
    }
    
    // Check if attendance already recorded today
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));
    
    const existingAttendance = await Attendance.findOne({
      student: studentId,
      date: { 
        $gte: startOfDay,
        $lt: endOfDay
      }
    });
    
    if (existingAttendance) {
      return res.status(400).json({ 
        success: false,
        message: 'Attendance already recorded today'
      });
    }
    
    const attendance = await Attendance.create({
      student: studentId,
      status: status || 'present',
      recordedBy: req.user.id,
      notes,
      deviceType: 'manual'
    });
    
    // Emit real-time event
    const io = req.app.get('io');
    io.to('rfid-updates').emit('attendance-recorded', {
      student: {
        id: student._id,
        name: student.name,
        class: student.class,
        section: student.section
      },
      attendance: {
        id: attendance._id,
        date: attendance.date,
        status: attendance.status
      }
    });
    
    res.status(201).json({
      success: true,
      attendance
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get attendance report
// @route   GET /api/attendance/report
exports.getAttendanceReport = async (req, res) => {
  try {
    const { startDate, endDate, class: className, studentId, page = 1, limit = 10 } = req.query;
    
    // Validate dates
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide startDate and endDate'
      });
    }
    
    // Build query
    const query = {
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };
    
    if (className) {
      const students = await Student.find({ class: className, isActive: true });
      query.student = { $in: students.map(s => s._id) };
    }
    
    if (studentId) {
      query.student = studentId;
    }
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { date: -1 },
      populate: {
        path: 'student',
        select: 'name studentId class section'
      }
    };
    
    const attendance = await Attendance.find(query)
      .populate('student', 'name studentId class section')
      .populate('recordedBy', 'username firstName lastName')
      .limit(options.limit * 1)
      .skip((options.page - 1) * options.limit)
      .sort(options.sort);
    
    const total = await Attendance.countDocuments(query);
    
    // Calculate summary
    const summary = {
      present: await Attendance.countDocuments({ ...query, status: 'present' }),
      absent: await Attendance.countDocuments({ ...query, status: 'absent' }),
      late: await Attendance.countDocuments({ ...query, status: 'late' }),
      excused: await Attendance.countDocuments({ ...query, status: 'excused' })
    };
    
    res.status(200).json({
      success: true,
      count: attendance.length,
      total,
      page: options.page,
      pages: Math.ceil(total / options.limit),
      attendance,
      summary
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get today's attendance
// @route   GET /api/attendance/today
exports.getTodaysAttendance = async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));
    
    const attendance = await Attendance.find({
      date: { $gte: startOfDay, $lte: endOfDay }
    })
    .populate('student', 'name studentId class section rollNumber')
    .populate('recordedBy', 'username firstName lastName')
    .sort({ 'student.class': 1, 'student.section': 1, 'student.rollNumber': 1 });
    
    res.status(200).json({
      success: true,
      count: attendance.length,
      attendance
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false,
      message: 'Server error'
    });
  }
};