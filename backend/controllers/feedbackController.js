const { Feedback, Course } = require('../models');

exports.createFeedback = async (req, res) => {
  try {
    const { courseName, expertName, feedback, rating, courseId } = req.body;

    if (!courseName || !expertName || !feedback || !rating) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Verify course exists if courseId provided
    if (courseId) {
      const course = await Course.findByPk(courseId);
      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }
    }

    const feedbackRecord = await Feedback.create({
      courseName,
      expertName,
      feedback,
      rating,
      courseId
    });

    res.status(201).json({ success: true, feedback: feedbackRecord });
  } catch (error) {
    console.error('Create feedback error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getAllFeedback = async (req, res) => {
  try {
    const feedbacks = await Feedback.findAll({
      include: [{ model: Course, as: 'course', attributes: ['id', 'name'] }],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, feedbacks });
  } catch (error) {
    console.error('Get feedbacks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getFeedbackById = async (req, res) => {
  try {
    const { id } = req.params;

    const feedback = await Feedback.findByPk(id, {
      include: [{ model: Course, as: 'course' }]
    });

    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    res.json({ success: true, feedback });
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.updateFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { courseName, expertName, feedback, rating } = req.body;

    const feedbackRecord = await Feedback.findByPk(id);

    if (!feedbackRecord) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    if (courseName) feedbackRecord.courseName = courseName;
    if (expertName) feedbackRecord.expertName = expertName;
    if (feedback) feedbackRecord.feedback = feedback;
    if (rating && rating >= 1 && rating <= 5) feedbackRecord.rating = rating;

    await feedbackRecord.save();

    res.json({ success: true, feedback: feedbackRecord });
  } catch (error) {
    console.error('Update feedback error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.deleteFeedback = async (req, res) => {
  try {
    const { id } = req.params;

    const feedback = await Feedback.findByPk(id);

    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    await feedback.destroy();

    res.json({ success: true, message: 'Feedback deleted successfully' });
  } catch (error) {
    console.error('Delete feedback error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};



