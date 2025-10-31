const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const aiService = require('../services/aiService');
const CardPost = require('../models/CardPost.model');

// ensure uploads dir exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

// POST /api/analyze
// body: { latitude, longitude, imageUri }
router.post('/analyze', async (req, res) => {
  try {
    const { latitude, longitude, imageUri } = req.body;
    const result = {};

    // 1) Geocode using Google Maps Geocoding API if coords provided
    if (latitude && longitude && process.env.GOOGLE_MAPS_API_KEY) {
      const key = process.env.GOOGLE_MAPS_API_KEY;
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${key}`;
      const geoRes = await axios.get(url);
      const first = geoRes.data.results && geoRes.data.results[0];
      if (first) {
        // extract locality / sublocality / administrative levels
        const components = first.address_components || [];
        const city = components.find(c => c.types.includes('locality'))?.long_name
          || components.find(c => c.types.includes('administrative_area_level_2'))?.long_name
          || null;
        const district = components.find(c => c.types.includes('sublocality'))?.long_name
          || components.find(c => c.types.includes('administrative_area_level_3'))?.long_name
          || null;
        result.address = {
          formatted: first.formatted_address,
          city,
          district
        };
      }
    }

    // 2) AI analysis (Gemini) if API key configured
    if (process.env.GEMINI_API_KEY) {
      try {
        // aiService.analyzeImage expects an image URL or identifier the model can access.
        // NOTE: For Gemini to analyze local files, you must provide a public URL (e.g., upload to GCS) or adapt aiService.
        if (imageUri) {
          const ai = await aiService.analyzeImage(imageUri);
          result.ai = ai;
        } else {
          result.ai = { warning: 'No imageUri provided for AI analysis' };
        }
      } catch (e) {
        console.error('AI analyze error', e);
        result.aiError = e.message || String(e);
      }
    } else {
      result.ai = { warning: 'GEMINI_API_KEY not configured in backend env' };
    }

    res.json(result);
  } catch (error) {
    console.error('Analyze error', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/upload
// Accepts multipart form: image file (optional), title, description, location (JSON), aiDescription
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    const { title, description, location, aiDescription } = req.body;
    let loc = null;
    if (location) {
      try { loc = JSON.parse(location); } catch (e) { loc = null; }
    }

    // image path
    let imagePath = null;
    if (req.file) {
      imagePath = `/uploads/${req.file.filename}`; // we'll serve statically from /uploads
    } else if (req.body.imageUri) {
      imagePath = req.body.imageUri;
    }

    // provide minimal required author/title/description if missing
    const post = new CardPost({
      author: {
        id: null,
        name: req.body.authorName || 'Anonymous',
        avatar: req.body.authorAvatar || ''
      },
      title: title || (aiDescription ? (aiDescription.slice(0, 40) || 'Photo') : 'Untitled'),
      description: description || aiDescription || '',
      image: imagePath || '',
      location: loc || undefined,
      aiDescription: aiDescription || undefined
    });

    await post.save();
    res.json({ ok: true, post });
  } catch (error) {
    console.error('Upload error', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
// backend/routes/gallery.js
router.post('/analyze-image', async (req, res) => {
  try {
    const { imageUri } = req.body;
    const analysis = await aiService.analyzeImage(imageUri);
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/upload', async (req, res) => {
  try {
    const { image, suggestions, location } = req.body;
    // Xử lý upload ảnh
    // Lưu vào database
    res.status(200).json({ message: 'Upload successful' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/posts - list saved posts
router.get('/posts', async (req, res) => {
  try {
    const posts = await CardPost.find().sort({ createdAt: -1 }).lean();
    // convert any local image paths to full URLs if needed (assume server serves /uploads)
    const host = req.protocol + '://' + req.get('host');
    const mapped = posts.map(p => ({
      ...p,
      image: p.image && p.image.startsWith('/uploads') ? host + p.image : p.image
    }));
    res.json(mapped);
  } catch (error) {
    console.error('Get posts error', error);
    res.status(500).json({ error: error.message });
  }
});