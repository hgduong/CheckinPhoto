const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const connectDB = require('./config/db');

// Kết nối MongoDB
connectDB();

// Middleware
app.use(cors()); // Cho phép CORS từ mọi nguồn (có thể cấu hình chi tiết hơn)
app.use(express.json({ limit: '50mb' })); // Tăng giới hạn cho base64 images
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount gallery routes
const galleryRouter = require('./routes/gallery');
app.use('/api', galleryRouter);

// Root endpoint
app.get('/', async (req, res) => {
  try {
    res.json({
      message: 'CheckinPhoto API Server',
      version: '1.0.0',
      endpoints: {
        analyze: 'POST /api/analyze',
        upload: 'POST /api/upload',
        posts: 'GET /api/posts'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

const PORT = process.env.PORT || 9999;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📍 API: http://localhost:${PORT}/api`);
  console.log(`📁 Uploads: http://localhost:${PORT}/uploads`);
  console.log(`🌐 Network: http://0.0.0.0:${PORT}/api`);
});