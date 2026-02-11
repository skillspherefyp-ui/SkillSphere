const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const path = require('path');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// General storage for uploads (PDFs, images, materials)
const generalStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isPdf = file.mimetype === 'application/pdf';
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    const uniqueName = `${Date.now()}-${nameWithoutExt}${ext}`;
    return {
      folder: 'skillsphere/uploads',
      resource_type: isPdf ? 'raw' : 'image',
      public_id: isPdf ? uniqueName : undefined,
      allowed_formats: ['pdf', 'jpg', 'jpeg', 'png'],
    };
  },
});

// Template storage for certificate backgrounds and signatures
const templateStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'skillsphere/templates',
    resource_type: 'image',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  },
});

module.exports = { cloudinary, generalStorage, templateStorage };
