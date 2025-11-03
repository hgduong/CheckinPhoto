# 📸 CheckinPhoto

Ứng dụng check-in và chia sẻ ảnh với tích hợp AI phân tích ảnh và định vị địa lý.

## 🌟 Tính năng

- **📷 Camera**: Chụp ảnh với tự động gắn thẻ vị trí
- **🤖 AI Analysis**: Sử dụng Google Gemini để phân tích ảnh và gợi ý mô tả
- **📍 Location Services**: Tích hợp Google Maps để chuyển đổi tọa độ thành địa chỉ
- **🖼️ Gallery**: Xem ảnh đã lưu, nhóm theo khu vực
- **🗺️ Map View**: Hiển thị vị trí người dùng và bài đăng trên bản đồ
- **💾 Offline Support**: Lưu ảnh local, hoạt động cả khi không có mạng

## 🛠️ Tech Stack

### Frontend (Client)
- React Native (Expo SDK 54)
- React Navigation
- Expo Camera, Location, MediaLibrary
- AsyncStorage cho offline storage

### Backend (Server)
- Node.js + Express
- MongoDB + Mongoose
- Multer (file uploads)
- Google Maps Geocoding API
- Google Gemini AI API

## 📋 Yêu cầu hệ thống

- Node.js >= 16.x
- npm hoặc yarn
- MongoDB (local hoặc MongoDB Atlas)
- Expo CLI: `npm install -g expo-cli`
- Android Studio / Xcode (cho emulator) hoặc Expo Go app

## 🚀 Hướng dẫn cài đặt

### 1. Clone repository

```bash
git clone <repository-url>
cd CheckinPhoto
```

### 2. Cài đặt Backend

```bash
cd backend
npm install
```

Tạo file `.env` trong thư mục `backend/`:

```bash
cp .env.example .env
```

Chỉnh sửa file `.env` với thông tin của bạn:

```env
MONGO_URI=mongodb://localhost:27017/checkinphoto
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
PORT=9999
NODE_ENV=development
```

### 3. Cài đặt Client

```bash
cd ../client
npm install
```

Chỉnh sửa file `client/config.js`:

```javascript
const DEV_CONFIG = {
  // Thay đổi IP này khi test trên thiết bị thật
  API_BASE_URL: 'http://localhost:9999/api',
  // API_BASE_URL: 'http://192.168.1.100:9999/api', // Ví dụ cho thiết bị thật
  TIMEOUT: 30000,
  OFFLINE_MODE: false,
};
```

## ▶️ Chạy ứng dụng

### Khởi động Backend

```bash
cd backend
npm run dev
# hoặc
node server.js
```

Server sẽ chạy tại: `http://localhost:9999`

### Khởi động Client

```bash
cd client
npx expo start
```

Sau đó:
- Nhấn `a` để mở Android emulator
- Nhấn `i` để mở iOS simulator
- Quét QR code bằng Expo Go app trên điện thoại

## 🔑 Lấy API Keys

### Google Maps API Key

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới hoặc chọn project có sẵn
3. Bật **Geocoding API**
4. Vào **Credentials** → **Create Credentials** → **API Key**
5. Copy API key và paste vào file `.env`

### Google Gemini API Key

1. Truy cập [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Đăng nhập với Google account
3. Click **Get API Key** → **Create API key**
4. Copy API key và paste vào file `.env`

### MongoDB

**Option 1: MongoDB Local**
```bash
# Cài đặt MongoDB Community Edition
# Windows: https://www.mongodb.com/try/download/community
# Mac: brew install mongodb-community
# Linux: sudo apt-get install mongodb

# Khởi động MongoDB
mongod
```

**Option 2: MongoDB Atlas (Cloud - Miễn phí)**
1. Truy cập [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Tạo tài khoản miễn phí
3. Tạo cluster mới (chọn Free tier)
4. Lấy connection string và paste vào `.env`

## 📱 API Endpoints

### POST `/api/analyze`
Phân tích ảnh với AI và geocoding

**Request:**
```json
{
  "latitude": 21.0285,
  "longitude": 105.8542,
  "imageUri": "data:image/jpeg;base64,..."
}
```

**Response:**
```json
{
  "address": {
    "formatted": "Hoàn Kiếm, Hà Nội, Vietnam",
    "city": "Hà Nội",
    "district": "Hoàn Kiếm",
    "country": "Vietnam"
  },
  "ai": {
    "aiDescription": "Hồ Hoàn Kiếm - Biểu tượng của Hà Nội...",
    "similarPlaces": [...],
    "fullText": "..."
  }
}
```

### POST `/api/upload`
Upload ảnh và metadata lên server

**Request:** `multipart/form-data`
- `image`: File ảnh
- `title`: Tiêu đề
- `description`: Mô tả
- `location`: JSON string `{"type":"Point","coordinates":[lng,lat]}`
- `aiDescription`: Mô tả từ AI
- `authorName`: Tên tác giả
- `authorAvatar`: URL avatar

**Response:**
```json
{
  "success": true,
  "message": "Upload successful",
  "post": { ... }
}
```

### GET `/api/posts`
Lấy danh sách posts

**Query params:**
- `limit`: Số lượng posts (default: 50)
- `skip`: Bỏ qua n posts đầu (default: 0)

**Response:**
```json
{
  "success": true,
  "count": 10,
  "posts": [...]
}
```

## 🎯 Luồng hoạt động

1. **Chụp ảnh**: Người dùng mở Camera và chụp ảnh
2. **Lấy vị trí**: App tự động lấy GPS coordinates
3. **Phân tích**:
   - Gửi ảnh (base64) + tọa độ lên backend
   - Backend gọi Google Maps API để lấy địa chỉ
   - Backend gọi Gemini AI để phân tích ảnh
4. **Hiển thị**: App hiển thị gợi ý AI và địa chỉ
5. **Chỉnh sửa**: Người dùng có thể chỉnh sửa caption
6. **Lưu**:
   - Lưu local vào AsyncStorage (offline)
   - Hoặc upload lên server (online)

## 🔧 Cấu hình nâng cao

### Chạy trên thiết bị thật

1. Tìm IP máy tính:
   - **Windows**: `ipconfig` → tìm IPv4 Address
   - **Mac/Linux**: `ifconfig` → tìm inet

2. Cập nhật `client/config.js`:
```javascript
API_BASE_URL: 'http://192.168.1.100:9999/api', // Thay bằng IP của bạn
```

3. Đảm bảo điện thoại và máy tính cùng mạng WiFi

### Chế độ Offline

Để chạy app hoàn toàn offline (không cần backend):

```javascript
// client/config.js
const DEV_CONFIG = {
  API_BASE_URL: 'http://localhost:9999/api',
  TIMEOUT: 30000,
  OFFLINE_MODE: true, // Bật chế độ offline
};
```

## 🐛 Troubleshooting

### Lỗi "Network request failed"
- Kiểm tra backend đã chạy chưa
- Kiểm tra IP trong `config.js` đúng chưa
- Kiểm tra firewall có chặn port 9999 không

### Lỗi "MONGO_URI not set"
- Tạo file `.env` trong thư mục `backend/`
- Copy nội dung từ `.env.example`
- Điền đúng MongoDB connection string

### Lỗi Camera/Location permissions
- Chạy lại app và cho phép permissions
- Trên iOS: Settings → App → Permissions
- Trên Android: Settings → Apps → Permissions

### Gemini AI không hoạt động
- Kiểm tra `GEMINI_API_KEY` trong `.env`
- Model mới: `gemini-1.5-flash` (đã cập nhật)
- Kiểm tra quota API key tại [Google AI Studio](https://makersuite.google.com/)

## 📂 Cấu trúc thư mục

```
CheckinPhoto/
├── backend/
│   ├── config/
│   │   └── db.js              # MongoDB connection
│   ├── models/
│   │   └── CardPost.model.js  # Post schema
│   ├── routes/
│   │   └── gallery.js         # API routes
│   ├── services/
│   │   └── aiService.js       # Gemini AI integration
│   ├── uploads/               # Uploaded images
│   ├── .env.example           # Environment template
│   ├── server.js              # Express server
│   └── package.json
│
├── client/
│   ├── assets/                # Images, icons
│   ├── navigation/
│   │   ├── BottomTabs.js      # Tab navigation
│   │   └── CameraStack.js     # Camera stack
│   ├── screens/
│   │   ├── CameraScreen.js    # Camera
│   │   ├── CreateCaptionScreen.js  # Caption editor
│   │   ├── GalleryScreen.js   # Photo gallery
│   │   ├── HomeScreen.js      # Home feed
│   │   ├── MapScreen.js       # Map view
│   │   └── ProfileScreen.js   # User profile
│   ├── utils/
│   │   └── api.js             # API utilities
│   ├── config.js              # App configuration
│   ├── App.js                 # Root component
│   └── package.json
│
└── README.md
```

## 🤝 Đóng góp

Mọi đóng góp đều được chào đón! Vui lòng:
1. Fork repository
2. Tạo branch mới (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Mở Pull Request

## 📄 License

MIT License - xem file LICENSE để biết thêm chi tiết

## 📞 Liên hệ

Nếu có vấn đề hoặc câu hỏi, vui lòng tạo issue trên GitHub.

---

**Made with ❤️ using React Native & Node.js**
