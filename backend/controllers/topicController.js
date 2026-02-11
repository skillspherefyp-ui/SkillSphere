const { Topic, Course, Material } = require('../models');

exports.createTopic = async (req, res) => {
  try {
    const { courseId, title, materials } = req.body;

    if (!courseId || !title) {
      return res.status(400).json({ error: 'Course ID and title are required' });
    }

    // Verify course exists
    const course = await Course.findByPk(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check if the requesting user is the course creator, super admin, or has canManageAllCourses permission
    const isSuperAdmin = req.user.role === 'superadmin';
    const isOwner = course.userId === req.user.id;
    const canManageAll = req.user.permissions?.canManageAllCourses === true;

    if (!isSuperAdmin && !isOwner && !canManageAll) {
      return res.status(403).json({ error: 'You do not have permission to add topics to this course' });
    }

    // Get the highest order number for this course
    const lastTopic = await Topic.findOne({
      where: { courseId },
      order: [['order', 'DESC']]
    });

    const order = lastTopic ? lastTopic.order + 1 : 0;

    // First topic (order 0) should be unlocked, rest should be locked
    const status = order === 0 ? 'unlocked' : 'locked';

    const topic = await Topic.create({
      courseId,
      title,
      status: status,
      completed: false,
      order
    });

    // Add materials if provided
    if (materials && Array.isArray(materials) && materials.length > 0) {
      const topicMaterials = materials.map(material => ({
        ...material,
        topicId: topic.id,
        courseId: courseId
      }));
      await Material.bulkCreate(topicMaterials);
    }

    const createdTopic = await Topic.findByPk(topic.id, {
      include: [{ model: Material, as: 'materials' }]
    });

    res.status(201).json({ success: true, topic: createdTopic });
  } catch (error) {
    console.error('Create topic error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getTopicsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    const topics = await Topic.findAll({
      where: { courseId },
      include: [{ model: Material, as: 'materials' }],
      order: [['order', 'ASC']]
    });

    res.json({ success: true, topics });
  } catch (error) {
    console.error('Get topics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.updateTopic = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, status, completed, order } = req.body;

    const topic = await Topic.findByPk(id, {
      include: [{ model: Course, as: 'course' }]
    });

    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    // Check if the requesting user is the course creator, super admin, or has canManageAllCourses permission
    const course = topic.course;
    const isSuperAdmin = req.user.role === 'superadmin';
    const isOwner = course.userId === req.user.id;
    const canManageAll = req.user.permissions?.canManageAllCourses === true;

    if (!isSuperAdmin && !isOwner && !canManageAll) {
      return res.status(403).json({ error: 'You do not have permission to update this topic' });
    }

    if (title) topic.title = title;
    if (status) topic.status = status;
    if (typeof completed === 'boolean') topic.completed = completed;
    if (typeof order === 'number') topic.order = order;

    await topic.save();

    const updatedTopic = await Topic.findByPk(id, {
      include: [{ model: Material, as: 'materials' }]
    });

    res.json({ success: true, topic: updatedTopic });
  } catch (error) {
    console.error('Update topic error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.deleteTopic = async (req, res) => {
  try {
    const { id } = req.params;

    const topic = await Topic.findByPk(id, {
      include: [{ model: Course, as: 'course' }]
    });

    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    // Check if the requesting user is the course creator, super admin, or has canManageAllCourses permission
    const course = topic.course;
    const isSuperAdmin = req.user.role === 'superadmin';
    const isOwner = course.userId === req.user.id;
    const canManageAll = req.user.permissions?.canManageAllCourses === true;

    if (!isSuperAdmin && !isOwner && !canManageAll) {
      return res.status(403).json({ error: 'You do not have permission to delete this topic' });
    }

    await topic.destroy();

    res.json({ success: true, message: 'Topic deleted successfully' });
  } catch (error) {
    console.error('Delete topic error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};



