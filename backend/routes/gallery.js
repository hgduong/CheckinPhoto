const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const aiService = require('../services/aiService');
const CardPost = require('../models/CardPost.model');

// Đảm bảo thư mục uploads tồn tại
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Cấu hình Multer cho upload file
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.jpg';
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
    cb(null, uniqueName);
  }
});

// Giới hạn kích thước file và loại file
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file ảnh (jpeg, jpg, png, gif, webp)'));
    }
  }
});

/**
 * POST /api/analyze
 * Phân tích ảnh: Geocoding + AI analysis
 * Body: { latitude, longitude, imageUri }
 */
router.post('/analyze', async (req, res) => {
  try {
    const { latitude, longitude, imageUri } = req.body;
    const result = {};

    // 1) Geocode sử dụng Google Maps Geocoding API
    if (latitude && longitude && process.env.GOOGLE_MAPS_API_KEY) {
      try {
        const key = process.env.GOOGLE_MAPS_API_KEY;
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${key}`;
        const geoRes = await axios.get(url, { timeout: 5000 });

        const first = geoRes.data.results && geoRes.data.results[0];
        if (first) {
          const components = first.address_components || [];
          const city = components.find(c => c.types.includes('locality'))?.long_name
            || components.find(c => c.types.includes('administrative_area_level_2'))?.long_name
            || null;
          const district = components.find(c => c.types.includes('sublocality'))?.long_name
            || components.find(c => c.types.includes('administrative_area_level_3'))?.long_name
            || null;
          const country = components.find(c => c.types.includes('country'))?.long_name || null;

          result.address = {
            formatted: first.formatted_address,
            city,
            district,
            country
          };
        }
      } catch (geoError) {
        console.error('Geocoding error:', geoError.message);
        result.addressError = 'Không thể lấy địa chỉ từ tọa độ';
      }
    } else if (!process.env.GOOGLE_MAPS_API_KEY) {
      result.address = { warning: 'GOOGLE_MAPS_API_KEY not configured' };
    }

    // 2) AI analysis với Gemini
    if (process.env.GEMINI_API_KEY && imageUri) {
      try {
        const ai = await aiService.analyzeImage(imageUri);
        result.ai = ai;
      } catch (aiError) {
        console.error('AI analyze error:', aiError);
        result.ai = {
          error: 'Không thể phân tích ảnh',
          details: aiError.message
        };
      }
    } else if (!process.env.GEMINI_API_KEY) {
      result.ai = { warning: 'GEMINI_API_KEY not configured' };
    } else if (!imageUri) {
      result.ai = { warning: 'No imageUri provided for AI analysis' };
    }

    res.json(result);
  } catch (error) {
    console.error('Analyze error:', error);
    res.status(500).json({
      error: 'Lỗi khi phân tích',
      details: error.message
    });
  }
});

/**
 * POST /api/upload
 * Upload ảnh và lưu vào database
 * Accepts multipart form: image file, title, description, location (JSON), aiDescription
 */
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    const { title, description, location, aiDescription, authorName, authorAvatar } = req.body;

    // Parse location nếu là JSON string
    let loc = null;
    if (location) {
      try {
        loc = typeof location === 'string' ? JSON.parse(location) : location;
      } catch (e) {
        console.warn('Invalid location JSON:', e);
        loc = null;
      }
    }

    // Xác định đường dẫn ảnh
    let imagePath = null;
    if (req.file) {
      imagePath = `/uploads/${req.file.filename}`;
    } else if (req.body.imageUri) {
      imagePath = req.body.imageUri;
    }

    if (!imagePath) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Tạo post mới
    const post = new CardPost({
      author: {
        id: null,
        name: authorName || 'Anonymous',
        avatar: authorAvatar || 'https://via.placeholder.com/50'
      },
      title: title || (aiDescription ? aiDescription.slice(0, 40) : 'Untitled Photo'),
      description: description || aiDescription || 'No description',
      image: imagePath,
      location: loc || undefined,
      aiDescription: aiDescription || undefined
    });

    await post.save();

    res.json({
      success: true,
      message: 'Upload successful',
      post
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: 'Upload failed',
      details: error.message
    });
  }
});

/**
 * GET /api/posts
 * Lấy danh sách tất cả posts
 * Query params: limit, skip (cho pagination)
 */
router.get('/posts', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;

    const posts = await CardPost.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    // Convert local image paths to full URLs
    const host = req.protocol + '://' + req.get('host');
    const mapped = posts.map(p => ({
      ...p,
      image: p.image && p.image.startsWith('/uploads') ? host + p.image : p.image
    }));

    res.json({
      success: true,
      count: mapped.length,
      posts: mapped
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({
      error: 'Failed to fetch posts',
      details: error.message
    });
  }
});

module.exports = router;