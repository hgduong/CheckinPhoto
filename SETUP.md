# 🚀 Hướng dẫn Setup Chi tiết - CheckinPhoto

Tài liệu này hướng dẫn từng bước để setup và chạy ứng dụng CheckinPhoto.

## 📋 Checklist Chuẩn bị

- [ ] Node.js đã cài đặt (v16 trở lên)
- [ ] npm hoặc yarn
- [ ] Git
- [ ] MongoDB (local hoặc Atlas account)
- [ ] Google Cloud account (cho Maps API)
- [ ] Google AI Studio account (cho Gemini API)
- [ ] Android Studio / Xcode hoặc Expo Go app

## Bước 1: Clone và Cài đặt Dependencies

### 1.1. Clone Repository

```bash
git clone <repository-url>
cd CheckinPhoto
```

### 1.2. Cài đặt Backend Dependencies

```bash
cd backend
npm install
```

**Packages được cài:**
- express: Web framework
- mongoose: MongoDB ODM
- multer: File upload middleware
- axios: HTTP client
- @google/generative-ai: Gemini AI SDK
- cors: CORS middleware
- dotenv: Environment variables

### 1.3. Cài đặt Client Dependencies

```bash
cd ../client
npm install
```

**Packages được cài:**
- expo: React Native framework
- react-navigation: Navigation
- expo-camera: Camera API
- expo-location: Location API
- expo-media-library: Media storage
- react-native-maps: Map component
- @react-native-async-storage/async-storage: Local storage

## Bước 2: Setup MongoDB

### Option A: MongoDB Local (Khuyến nghị cho development)

#### Windows:
1. Download MongoDB Community Server: https://www.mongodb.com/try/download/community
2. Chạy installer, chọn "Complete" installation
3. Chọn "Install MongoDB as a Service"
4. Mở Command Prompt và chạy:
```bash
mongod --version
```

5. MongoDB sẽ tự động chạy tại `mongodb://localhost:27017`

#### macOS:
```bash
# Cài đặt qua Homebrew
brew tap mongodb/brew
brew install mongodb-community

# Khởi động MongoDB
brew services start mongodb-community

# Kiểm tra
mongosh
```

#### Linux (Ubuntu/Debian):
```bash
# Import public key
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Add repository
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Install
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start service
sudo systemctl start mongod
sudo systemctl enable mongod
```

### Option B: MongoDB Atlas (Cloud - Miễn phí)

1. Truy cập https://www.mongodb.com/cloud/atlas
2. Đăng ký tài khoản miễn phí
3. Click "Build a Database" → Chọn "Free" tier
4. Chọn region gần nhất (Singapore cho VN)
5. Đặt tên cluster và click "Create"
6. Tạo Database User:
   - Username: `admin`
   - Password: Tạo password mạnh (lưu lại)
7. Whitelist IP:
   - Click "Network Access"
   - Click "Add IP Address"
   - Chọn "Allow Access from Anywhere" (0.0.0.0/0)
8. Lấy Connection String:
   - Click "Connect" → "Connect your application"
   - Copy connection string
   - Thay `<password>` bằng password đã tạo

Connection string mẫu:
```
mongodb+srv://admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/checkinphoto?retryWrites=true&w=majority
```

## Bước 3: Setup Google Maps API

1. Truy cập https://console.cloud.google.com/
2. Tạo project mới:
   - Click "Select a project" → "New Project"
   - Đặt tên: "CheckinPhoto"
   - Click "Create"

3. Bật Geocoding API:
   - Vào "APIs & Services" → "Library"
   - Tìm "Geocoding API"
   - Click "Enable"

4. Tạo API Key:
   - Vào "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - Copy API key (dạng: `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`)

5. (Tùy chọn) Restrict API Key:
   - Click vào API key vừa tạo
   - Trong "API restrictions", chọn "Restrict key"
   - Chọn "Geocoding API"
   - Save

## Bước 4: Setup Google Gemini AI

1. Truy cập https://makersuite.google.com/app/apikey
2. Đăng nhập với Google account
3. Click "Get API Key"
4. Click "Create API key in new project" hoặc chọn project có sẵn
5. Copy API key (dạng: `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`)

**Lưu ý:** 
- Gemini API có quota miễn phí: 60 requests/minute
- Nếu vượt quota, cần upgrade lên paid plan

## Bước 5: Cấu hình Backend

### 5.1. Tạo file .env

```bash
cd backend
cp .env.example .env
```

### 5.2. Chỉnh sửa .env

Mở file `backend/.env` và điền thông tin:

```env
# MongoDB Connection
MONGO_URI=mongodb://localhost:27017/checkinphoto
# Hoặc nếu dùng Atlas:
# MONGO_URI=mongodb+srv://admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/checkinphoto?retryWrites=true&w=majority

# Google Maps API Key
GOOGLE_MAPS_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Google Gemini AI API Key
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Server Port
PORT=9999

# Node Environment
NODE_ENV=development
```

### 5.3. Test Backend

```bash
cd backend
node server.js
```

Bạn sẽ thấy:
```
✅ Server running on port 9999
📍 API: http://localhost:9999/api
📁 Uploads: http://localhost:9999/uploads
MongoDB connected successfully
```

Test API:
```bash
# Mở browser hoặc dùng curl
curl http://localhost:9999
```

Response:
```json
{
  "message": "CheckinPhoto API Server",
  "version": "1.0.0",
  "endpoints": {
    "analyze": "POST /api/analyze",
    "upload": "POST /api/upload",
    "posts": "GET /api/posts"
  }
}
```

## Bước 6: Cấu hình Client

### 6.1. Tìm IP máy tính (cho test trên thiết bị thật)

**Windows:**
```bash
ipconfig
```
Tìm dòng "IPv4 Address" (ví dụ: 192.168.1.100)

**macOS/Linux:**
```bash
ifconfig
# hoặc
ip addr show
```
Tìm dòng "inet" (ví dụ: 192.168.1.100)

### 6.2. Chỉnh sửa config.js

Mở file `client/config.js`:

**Nếu test trên emulator/simulator:**
```javascript
const DEV_CONFIG = {
  API_BASE_URL: 'http://localhost:9999/api',
  TIMEOUT: 30000,
  OFFLINE_MODE: false,
};
```

**Nếu test trên thiết bị thật:**
```javascript
const DEV_CONFIG = {
  API_BASE_URL: 'http://192.168.1.100:9999/api', // Thay bằng IP của bạn
  TIMEOUT: 30000,
  OFFLINE_MODE: false,
};
```

**Chế độ offline (không cần backend):**
```javascript
const DEV_CONFIG = {
  API_BASE_URL: 'http://localhost:9999/api',
  TIMEOUT: 30000,
  OFFLINE_MODE: true, // Bật offline mode
};
```

## Bước 7: Chạy Ứng dụng

### 7.1. Khởi động Backend

Terminal 1:
```bash
cd backend
npm run dev
# hoặc
node server.js
```

### 7.2. Khởi động Client

Terminal 2:
```bash
cd client
npx expo start
```

### 7.3. Chọn platform

Sau khi Expo Dev Tools mở:

**Android Emulator:**
- Nhấn `a` trong terminal
- Hoặc scan QR code bằng Expo Go app

**iOS Simulator (chỉ macOS):**
- Nhấn `i` trong terminal

**Thiết bị thật:**
- Cài Expo Go app từ App Store/Play Store
- Scan QR code
- Đảm bảo điện thoại và máy tính cùng mạng WiFi

## Bước 8: Test Tính năng

### 8.1. Test Camera
1. Mở tab "Camera"
2. Cho phép camera permission
3. Chụp ảnh
4. Kiểm tra preview

### 8.2. Test Location
1. Cho phép location permission
2. Chụp ảnh
3. Kiểm tra địa chỉ hiển thị

### 8.3. Test AI Analysis
1. Chụp ảnh
2. Đợi AI phân tích (5-10 giây)
3. Kiểm tra gợi ý caption

### 8.4. Test Gallery
1. Lưu vài ảnh
2. Mở tab "Gallery"
3. Kiểm tra ảnh hiển thị theo region

### 8.5. Test Map
1. Mở tab "Map"
2. Kiểm tra markers hiển thị
3. Click vào marker để xem thông tin

## 🐛 Troubleshooting

### Backend không kết nối được MongoDB

**Lỗi:** `MongoDB connection failed`

**Giải pháp:**
1. Kiểm tra MongoDB đã chạy:
```bash
# Windows
net start MongoDB

# macOS/Linux
sudo systemctl status mongod
```

2. Kiểm tra MONGO_URI trong .env
3. Nếu dùng Atlas, kiểm tra:
   - Password đúng chưa
   - IP đã whitelist chưa
   - Network connection

### Client không kết nối được Backend

**Lỗi:** `Network request failed`

**Giải pháp:**
1. Kiểm tra backend đã chạy: `http://localhost:9999`
2. Kiểm tra IP trong config.js
3. Kiểm tra firewall:
```bash
# Windows: Allow port 9999
netsh advfirewall firewall add rule name="Expo" dir=in action=allow protocol=TCP localport=9999
```

4. Ping test:
```bash
ping 192.168.1.100
```

### Gemini AI không hoạt động

**Lỗi:** `AI analysis failed`

**Giải pháp:**
1. Kiểm tra GEMINI_API_KEY trong .env
2. Kiểm tra quota: https://makersuite.google.com/
3. Xem logs backend để biết lỗi cụ thể
4. Model đã cập nhật: `gemini-1.5-flash`

### Camera/Location permissions bị từ chối

**Giải pháp:**
1. Xóa app và cài lại
2. Vào Settings → App → Permissions
3. Cho phép Camera, Location, Media Library

## 📚 Tài liệu tham khảo

- [Expo Documentation](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [MongoDB Manual](https://docs.mongodb.com/)
- [Google Maps API](https://developers.google.com/maps/documentation/geocoding)
- [Google Gemini AI](https://ai.google.dev/)

## ✅ Checklist Hoàn thành

- [ ] Backend chạy thành công
- [ ] MongoDB kết nối OK
- [ ] Client chạy trên emulator/device
- [ ] Camera hoạt động
- [ ] Location hoạt động
- [ ] AI analysis hoạt động
- [ ] Gallery hiển thị ảnh
- [ ] Map hiển thị markers

---

**Chúc bạn setup thành công! 🎉**

Nếu gặp vấn đề, vui lòng tạo issue trên GitHub.

