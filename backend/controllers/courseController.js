const { Course, Category, Topic, Material, Enrollment } = require('../models');

exports.createCourse = async (req, res) => {
  try {
    const { name, description, level, language, categoryId, duration, materials, thumbnailImage } = req.body;

    console.log('📝 Creating course...');
    console.log('🖼️  Received thumbnailImage:', thumbnailImage);

    if (!name || !description || !level || !language || !categoryId || !duration) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    // Verify category exists
    const category = await Category.findByPk(categoryId);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const courseToCreate = {
      name,
      description,
      level,
      language,
      categoryId,
      duration,
      status: 'draft',
      userId: req.user.id,
      thumbnailImage: thumbnailImage || null
    };

    console.log('💾 Creating course in database with:', courseToCreate);

    const course = await Course.create(courseToCreate);

    // Add materials if provided
    if (materials && Array.isArray(materials) && materials.length > 0) {
      const courseMaterials = materials.map(material => ({
        ...material,
        courseId: course.id
      }));
      await Material.bulkCreate(courseMaterials);
    }

    const createdCourse = await Course.findByPk(course.id, {
      include: [
        { model: Category, as: 'category' },
        { model: Material, as: 'materials' }
      ]
    });

    console.log('✅ Course created successfully with ID:', course.id);
    console.log('🖼️  Saved thumbnailImage:', createdCourse.thumbnailImage);

    res.status(201).json({ success: true, course: createdCourse });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getAllCourses = async (req, res) => {
  try {
    const { User } = require('../models');
    const courses = await Course.findAll({
      include: [
        { model: Category, as: 'category' },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'role']
        },
        {
          model: Topic,
          as: 'topics',
          include: [{ model: Material, as: 'materials' }],
          separate: true,
          order: [['order', 'ASC']]
        },
        { model: Material, as: 'materials' }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Get enrollment count for each course
    const coursesWithEnrollment = await Promise.all(
      courses.map(async (course) => {
        const enrollmentCount = await Enrollment.count({
          where: { courseId: course.id }
        });
        const courseData = course.toJSON();
        courseData.enrollmentCount = enrollmentCount;
        return courseData;
      })
    );

    res.json({ success: true, courses: coursesWithEnrollment });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getCourseById = async (req, res) => {
  try {
    const { User } = require('../models');
    const { id } = req.params;

    const course = await Course.findByPk(id, {
      include: [
        { model: Category, as: 'category' },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'role']
        },
        { model: Topic, as: 'topics', order: [['order', 'ASC']] },
        { model: Material, as: 'materials' }
      ]
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Get enrollment count for this course
    const enrollmentCount = await Enrollment.count({
      where: { courseId: course.id }
    });

    const courseData = course.toJSON();
    courseData.enrollmentCount = enrollmentCount;

    res.json({ success: true, course: courseData });
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, level, language, categoryId, duration, status, thumbnailImage } = req.body;

    const course = await Course.findByPk(id);

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Permission check: SuperAdmin, Admin with canManageAllCourses, or course owner
    const isSuperAdmin = req.user.role === 'superadmin';
    const isOwner = course.userId === req.user.id;
    const canManageAll = req.user.permissions?.canManageAllCourses === true;

    if (!isSuperAdmin && !isOwner && !canManageAll) {
      return res.status(403).json({ error: 'You do not have permission to update this course' });
    }

    if (categoryId) {
      const category = await Category.findByPk(categoryId);
      if (!category) {
        return res.status(404).json({ error: 'Category not found' });
      }
      course.categoryId = categoryId;
    }

    if (name) course.name = name;
    if (description) course.description = description;
    if (level) course.level = level;
    if (language) course.language = language;
    if (duration) course.duration = duration;
    if (status) course.status = status;
    if (thumbnailImage !== undefined) course.thumbnailImage = thumbnailImage;

    await course.save();

    const { User } = require('../models');
    const updatedCourse = await Course.findByPk(id, {
      include: [
        { model: Category, as: 'category' },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'role']
        },
        {
          model: Topic,
          as: 'topics',
          include: [{ model: Material, as: 'materials' }],
          separate: true,
          order: [['order', 'ASC']]
        },
        { model: Material, as: 'materials' }
      ]
    });

    res.json({ success: true, course: updatedCourse });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findByPk(id);

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Permission check: SuperAdmin, Admin with canManageAllCourses, or course owner
    const isSuperAdmin = req.user.role === 'superadmin';
    const isOwner = course.userId === req.user.id;
    const canManageAll = req.user.permissions?.canManageAllCourses === true;

    if (!isSuperAdmin && !isOwner && !canManageAll) {
      return res.status(403).json({ error: 'You do not have permission to delete this course' });
    }

    // Manually delete related records first
    // Delete materials associated with topics of this course
    const topics = await Topic.findAll({ where: { courseId: id } });
    for (const topic of topics) {
      await Material.destroy({ where: { topicId: topic.id } });
    }

    // Delete materials directly associated with this course
    await Material.destroy({ where: { courseId: id } });

    // Delete all topics of this course
    await Topic.destroy({ where: { courseId: id } });

    // Delete course itself
    await course.destroy();

    res.json({ success: true, message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.publishCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findByPk(id);

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Permission check: SuperAdmin, Admin with canManageAllCourses, or course owner
    const isSuperAdmin = req.user.role === 'superadmin';
    const isOwner = course.userId === req.user.id;
    const canManageAll = req.user.permissions?.canManageAllCourses === true;

    if (!isSuperAdmin && !isOwner && !canManageAll) {
      return res.status(403).json({ error: 'You do not have permission to publish/unpublish this course' });
    }

    course.status = 'published';
    await course.save();

    res.json({ success: true, message: 'Course published successfully', course });
  } catch (error) {
    console.error('Publish course error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};



