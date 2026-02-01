const { Certificate, Course, User, Enrollment } = require('../models');
const crypto = require('crypto');

// Get all certificates for authenticated student
exports.getMyCertificates = async (req, res) => {
  try {
    const certificates = await Certificate.findAll({
      where: { userId: req.user.id },
      include: [
        { model: Course, as: 'course' }
      ],
      order: [['issuedDate', 'DESC']]
    });

    res.json({ success: true, certificates });
  } catch (error) {
    console.error('Get my certificates error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Generate certificate for completed course
exports.generateCertificate = async (req, res) => {
  try {
    const { courseId, grade } = req.body;

    if (!courseId) {
      return res.status(400).json({ error: 'Course ID is required' });
    }

    // Check if enrollment is completed
    const enrollment = await Enrollment.findOne({
      where: {
        userId: req.user.id,
        courseId,
        status: 'completed'
      }
    });

    if (!enrollment) {
      return res.status(400).json({ error: 'Course must be completed to generate certificate' });
    }

    // Check if certificate already exists
    const existing = await Certificate.findOne({
      where: {
        userId: req.user.id,
        courseId
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'Certificate already generated for this course' });
    }

    // Get course and user
    const course = await Course.findByPk(courseId);
    const user = await User.findByPk(req.user.id);

    // Generate unique certificate number
    const certificateNumber = generateCertificateNumber(user.id, courseId);
    const verificationUrl = `${req.protocol}://${req.get('host')}/api/certificates/verify/${certificateNumber}`;

    // Create certificate
    const certificate = await Certificate.create({
      userId: req.user.id,
      courseId,
      certificateNumber,
      verificationUrl,
      grade: grade || 'Pass',
      issuedDate: new Date()
    });

    // Include course details in response
    const certificateWithDetails = await Certificate.findByPk(certificate.id, {
      include: [{ model: Course, as: 'course' }]
    });

    res.status(201).json({ success: true, certificate: certificateWithDetails });
  } catch (error) {
    console.error('Generate certificate error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Verify certificate
exports.verifyCertificate = async (req, res) => {
  try {
    const { certificateNumber } = req.params;

    const certificate = await Certificate.findOne({
      where: { certificateNumber },
      include: [
        { model: Course, as: 'course' },
        { model: User, as: 'user', attributes: ['id', 'name', 'email'] }
      ]
    });

    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    res.json({
      success: true,
      valid: true,
      certificate: {
        certificateNumber: certificate.certificateNumber,
        studentName: certificate.user.name,
        courseName: certificate.course.name,
        issuedDate: certificate.issuedDate,
        grade: certificate.grade
      }
    });
  } catch (error) {
    console.error('Verify certificate error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Helper function to generate unique certificate number
function generateCertificateNumber(userId, courseId) {
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `CERT-${userId}-${courseId}-${timestamp}-${random}`;
}

module.exports = exports;
