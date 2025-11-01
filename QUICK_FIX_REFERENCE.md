# ⚡ Quick Fix Reference - CheckinPhoto

Tài liệu tham khảo nhanh cho các lỗi thường gặp.

---

## 🔴 Camera Errors

### Error: `Cannot read property 'back' of undefined`

```javascript
// ❌ WRONG
import { Camera, CameraType } from 'expo-camera';
const [type, setType] = useState(CameraType.back);
<Camera type={type} />

// ✅ CORRECT
import { CameraView } from 'expo-camera';
const [facing, setFacing] = useState('back');
<CameraView facing={facing} />
```

### Warning: `CameraView does not support children`

```javascript
// ❌ WRONG
<CameraView>
  <View><Button /></View>
</CameraView>

// ✅ CORRECT
<View style={{ flex: 1 }}>
  <CameraView style={{ flex: 1 }} />
  <View style={{ position: 'absolute', bottom: 0 }}>
    <Button />
  </View>
</View>
```

---

## 🔴 FileSystem Errors

### Error: `Cannot read property 'Base64' of undefined`

```javascript
// ❌ WRONG
import * as FileSystem from 'expo-file-system';

// ✅ CORRECT
import * as FileSystem from 'expo-file-system/legacy';
```

### Warning: `Method getInfoAsync is deprecated`

```javascript
// ✅ TEMPORARY FIX
import * as FileSystem from 'expo-file-system/legacy';

// 🚀 FUTURE (TODO)
import { File, Directory } from 'expo-file-system';
```

---

## 🔴 Location Errors

### Error: `Location request failed due to unsatisfied device settings`

```javascript
// ❌ WRONG
const loc = await Location.getCurrentPositionAsync({});

// ✅ CORRECT
try {
  const loc = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
} catch (error) {
  console.warn('Location unavailable:', error.message);
  // Continue without location
}
```

**User Actions:**
- Bật GPS/Location Services
- Cho phép app truy cập location
- Emulator: Set location trong settings

---

## 🔴 Network Errors

### Error: `Network request failed`

**Checklist:**
1. Backend đã chạy? → `cd backend && node server.js`
2. IP đúng chưa? → Check `client/config.js`
3. Firewall chặn? → Allow port 9999
4. Cùng WiFi? → Phone và laptop cùng mạng

```javascript
// client/config.js
const DEV_CONFIG = {
  // Emulator
  API_BASE_URL: 'http://localhost:9999/api',
  
  // Physical device - thay YOUR_IP
  // API_BASE_URL: 'http://192.168.1.100:9999/api',
};
```

**Find your IP:**
- Windows: `ipconfig`
- Mac/Linux: `ifconfig`

---

## 🔴 MongoDB Errors

### Error: `MONGO_URI not set`

```bash
# 1. Tạo file .env
cd backend
cp .env.example .env

# 2. Chỉnh sửa .env
MONGO_URI=mongodb://localhost:27017/checkinphoto
```

### Error: `MongoDB connection failed`

**Local MongoDB:**
```bash
# Windows
net start MongoDB

# Mac
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

**MongoDB Atlas:**
- Check password đúng chưa
- Whitelist IP: 0.0.0.0/0
- Network connection OK?

---

## 🔴 API Key Errors

### Error: `GOOGLE_MAPS_API_KEY not set`

```bash
# backend/.env
GOOGLE_MAPS_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**Get API Key:**
1. https://console.cloud.google.com/
2. Enable "Geocoding API"
3. Create Credentials → API Key

### Error: `GEMINI_API_KEY not set`

```bash
# backend/.env
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**Get API Key:**
1. https://makersuite.google.com/app/apikey
2. Create API key

---

## 🔴 Permission Errors

### Camera permission denied

**iOS:**
Settings → App → Camera → Allow

**Android:**
Settings → Apps → Permissions → Camera → Allow

**Code:**
```javascript
const [permission, requestPermission] = useCameraPermissions();

if (!permission?.granted) {
  await requestPermission();
}
```

### Location permission denied

**iOS:**
Settings → App → Location → While Using

**Android:**
Settings → Apps → Permissions → Location → Allow

---

## 🔴 Build Errors

### Error: `expo-camera not installed`

```bash
cd client
npx expo install expo-camera
```

### Error: `Module not found`

```bash
# Clear cache
cd client
rm -rf node_modules
npm install

# Clear Expo cache
npx expo start -c
```

---

## 🔴 Runtime Errors

### App crashes on camera open

1. Check permissions granted
2. Check camera hardware available
3. Check CameraView syntax correct
4. Check no children inside CameraView

### Photos not saving

1. Check MediaLibrary permission
2. Check FileSystem import from legacy
3. Check directory exists
4. Check disk space

### AI analysis fails

1. Check backend running
2. Check GEMINI_API_KEY set
3. Check network connection
4. Check image size < 10MB
5. Check base64 encoding works

---

## 📋 Quick Commands

```bash
# Start backend
cd backend
node server.js

# Start client
cd client
npx expo start

# Clear cache
npx expo start -c

# Check backend
curl http://localhost:9999

# Find IP
ipconfig          # Windows
ifconfig          # Mac/Linux

# MongoDB status
mongosh           # Test connection
```

---

## 🔍 Debug Checklist

**Camera not working:**
- [ ] Import from `expo-camera` correct?
- [ ] Using `CameraView` not `Camera`?
- [ ] Using `facing` not `type`?
- [ ] No children inside CameraView?
- [ ] Permissions granted?

**FileSystem errors:**
- [ ] Import from `expo-file-system/legacy`?
- [ ] Directory exists?
- [ ] Path correct?

**Location errors:**
- [ ] GPS enabled?
- [ ] Permission granted?
- [ ] Using try-catch?
- [ ] Accuracy option set?

**Network errors:**
- [ ] Backend running?
- [ ] IP correct in config.js?
- [ ] Same WiFi network?
- [ ] Firewall allows port 9999?

**API errors:**
- [ ] .env file exists?
- [ ] API keys set?
- [ ] API keys valid?
- [ ] Quota not exceeded?

---

## 📚 Full Documentation

- **CAMERA_FIX.md** - Camera issues chi tiết
- **EXPO_SDK_54_MIGRATION.md** - Migration guide
- **SETUP.md** - Setup từng bước
- **README.md** - Tổng quan dự án
- **CHANGELOG.md** - Lịch sử thay đổi

---

## 🆘 Still Having Issues?

1. Check error message carefully
2. Search in documentation above
3. Check GitHub issues
4. Create new issue with:
   - Error message
   - Steps to reproduce
   - Environment (OS, Node version, etc.)
   - Screenshots/logs

---

**Last Updated:** 2025-11-01  
**Expo SDK:** 54.0.21

