const { User, Enrollment, Course } = require('../models');
const { Op } = require('sequelize');

// Get all students
exports.getAllStudents = async (req, res) => {
  try {
    const isSuperAdmin = req.user.role === 'superadmin';
    const canManageAllStudents = req.user.permissions?.canManageStudents === true;

    console.log('📋 Get students request:');
    console.log('  User ID:', req.user.id);
    console.log('  User role:', req.user.role);
    console.log('  Can manage all students:', canManageAllStudents);

    let students;

    if (isSuperAdmin || canManageAllStudents) {
      // SuperAdmin or admins with full permission can see all students
      students = await User.findAll({
        where: { role: 'student' },
        attributes: ['id', 'name', 'email', 'phone', 'isActive', 'createdAt'],
        order: [['createdAt', 'DESC']]
      });
    } else {
      // Admins without permission can only see students enrolled in their courses
      console.log('  Filtering students by course ownership...');

      // First, get all student IDs enrolled in this admin's courses
      const enrollments = await Enrollment.findAll({
        attributes: ['userId'],
        include: [{
          model: Course,
          as: 'course',
          where: { userId: req.user.id },
          attributes: []
        }]
      });

      console.log('  Found enrollments:', enrollments.length);

      // Extract unique student IDs
      const studentIds = [...new Set(enrollments.map(e => e.userId))];
      console.log('  Unique student IDs:', studentIds);

      // Now get the student details
      if (studentIds.length > 0) {
        students = await User.findAll({
          where: {
            role: 'student',
            id: { [Op.in]: studentIds }
          },
          attributes: ['id', 'name', 'email', 'phone', 'isActive', 'createdAt'],
          order: [['createdAt', 'DESC']]
        });
      } else {
        students = [];
      }

      console.log('  Filtered students:', students.length);
    }

    console.log('✅ Returning students:', students.length);

    res.json({ success: true, students });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all experts
exports.getAllExperts = async (req, res) => {
  try {
    const experts = await User.findAll({
      where: { role: 'expert' },
      attributes: ['id', 'name', 'email', 'phone', 'isActive', 'permissions', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, experts });
  } catch (error) {
    console.error('Get experts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Toggle user active status
exports.toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Cannot toggle superadmin status
    if (user.role === 'superadmin') {
      return res.status(403).json({ error: 'Cannot modify super admin status' });
    }

    // Check permissions for student management
    if (user.role === 'student') {
      const isSuperAdmin = req.user.role === 'superadmin';
      const canManageAllStudents = req.user.permissions?.canManageStudents === true;

      if (!isSuperAdmin && !canManageAllStudents) {
        // Admin without full permission can only toggle students enrolled in their courses
        const enrollment = await Enrollment.findOne({
          where: { userId: id },
          include: [{
            model: Course,
            as: 'course',
            where: { userId: req.user.id },
            attributes: ['id', 'name']
          }]
        });

        if (!enrollment) {
          return res.status(403).json({
            error: 'You can only manage students enrolled in your courses'
          });
        }
      }
    }

    // Toggle the status
    user.isActive = !user.isActive;
    await user.save();

    console.log(`✅ User ${user.email} status toggled to ${user.isActive ? 'active' : 'inactive'}`);

    res.json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Cannot delete superadmin
    if (user.role === 'superadmin') {
      return res.status(403).json({ error: 'Cannot delete super admin' });
    }

    await user.destroy();

    console.log(`✅ User ${user.email} deleted successfully`);

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
