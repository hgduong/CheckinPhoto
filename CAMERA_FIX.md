# 📸 Camera Fix - Expo Camera API Changes

## Vấn đề

**Lỗi:** `TypeError: Cannot read property 'back' of undefined`

## Nguyên nhân

Expo Camera đã thay đổi API từ version 17.x:
- **Cũ (v16 trở xuống):** `Camera` component + `CameraType.back/front`
- **Mới (v17+):** `CameraView` component + `facing="back"/"front"`

## Giải pháp

### ❌ Code cũ (KHÔNG hoạt động):

```javascript
import { Camera, CameraType, useCameraPermissions } from 'expo-camera';

const [type, setType] = useState(CameraType.back);

function toggleCameraType() {
  setType(current =>
    current === CameraType.back ? CameraType.front : CameraType.back
  );
}

<Camera
  style={styles.camera}
  type={type}
  ref={cameraRef}
/>
```

### ✅ Code mới (ĐÃ SỬA):

```javascript
import { CameraView, useCameraPermissions } from 'expo-camera';

const [facing, setFacing] = useState('back'); // 'back' hoặc 'front'

function toggleCameraFacing() {
  setFacing(current => (current === 'back' ? 'front' : 'back'));
}

<CameraView
  style={styles.camera}
  facing={facing}
  ref={cameraRef}
/>
```

## Các thay đổi chính

| Cũ | Mới |
|---|---|
| `Camera` | `CameraView` |
| `CameraType` | Không còn export |
| `type={CameraType.back}` | `facing="back"` |
| `type={CameraType.front}` | `facing="front"` |

## API Methods vẫn giữ nguyên

```javascript
// Chụp ảnh - KHÔNG thay đổi
const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });

// Permissions - KHÔNG thay đổi
const [permission, requestPermission] = useCameraPermissions();
```

## Migration Guide

Nếu bạn có code cũ, hãy thay đổi:

1. **Import:**
   ```javascript
   // Cũ
   import { Camera, CameraType } from 'expo-camera';
   
   // Mới
   import { CameraView } from 'expo-camera';
   ```

2. **State:**
   ```javascript
   // Cũ
   const [type, setType] = useState(CameraType.back);
   
   // Mới
   const [facing, setFacing] = useState('back');
   ```

3. **Toggle function:**
   ```javascript
   // Cũ
   function toggleCameraType() {
     setType(current =>
       current === CameraType.back ? CameraType.front : CameraType.back
     );
   }
   
   // Mới
   function toggleCameraFacing() {
     setFacing(current => (current === 'back' ? 'front' : 'back'));
   }
   ```

4. **Component:**
   ```javascript
   // Cũ
   <Camera type={type} ... />
   
   // Mới
   <CameraView facing={facing} ... />
   ```

## Tài liệu tham khảo

- [Expo Camera Documentation](https://docs.expo.dev/versions/latest/sdk/camera/)
- [Expo Camera v17 Migration Guide](https://docs.expo.dev/versions/v54.0.0/sdk/camera/)

## Kiểm tra version

Xem file `client/package.json`:
```json
{
  "dependencies": {
    "expo-camera": "~17.0.8"  // Version 17+ = API mới
  }
}
```

---

## 🐛 Các lỗi khác đã sửa

### 1. ❌ CameraView children warning

**Lỗi:**
```
WARN  The <CameraView> component does not support children.
```

**Nguyên nhân:** CameraView không cho phép có children components bên trong.

**Giải pháp:** Move buttons ra ngoài và dùng `position: 'absolute'`

```javascript
// ❌ Sai
<CameraView>
  <View style={styles.buttonContainer}>
    <Button />
  </View>
</CameraView>

// ✅ Đúng
<View style={styles.container}>
  <CameraView />
  <View style={styles.buttonContainer}>
    <Button />
  </View>
</View>

// Styles
buttonContainer: {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  // ...
}
```

### 2. ❌ FileSystem.EncodingType.Base64 undefined

**Lỗi:**
```
ERROR  Cannot read property 'Base64' of undefined
```

**Nguyên nhân:** FileSystem API đã thay đổi trong Expo SDK 54.

**Giải pháp:** Import từ `expo-file-system/legacy`

```javascript
// ❌ Cũ
import * as FileSystem from "expo-file-system";

// ✅ Mới
import * as FileSystem from "expo-file-system/legacy";

// Sử dụng như cũ
const base64 = await FileSystem.readAsStringAsync(image, {
  encoding: FileSystem.EncodingType.Base64,
});
```

**Files đã sửa:**
- `client/screens/CameraScreen.js`
- `client/screens/CreateCaptionScreen.js`

### 3. ⚠️ Location request failed

**Warning:**
```
WARN  Could not get location: [Error: Location request failed due to unsatisfied device settings]
```

**Nguyên nhân:** GPS chưa bật hoặc settings không đủ.

**Giải pháp:** Thêm accuracy option và handle error gracefully

```javascript
// ✅ Cải thiện
try {
  loc = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
} catch (e) {
  console.warn('Could not get location:', e.message || e);
  // Không có location cũng OK, tiếp tục
}
```

**Lưu ý cho người dùng:**
- Bật GPS/Location Services trên thiết bị
- Cho phép app truy cập location
- Nếu dùng emulator, set location trong settings

### 4. ⚠️ FileSystem deprecated methods

**Warning:**
```
WARN  Method getInfoAsync imported from "expo-file-system" is deprecated.
```

**Giải pháp:** Đã migrate sang legacy API (tạm thời)

```javascript
import * as FileSystem from "expo-file-system/legacy";
```

**TODO (tương lai):** Migrate sang new FileSystem API với `File` và `Directory` classes.

---

## ✅ Checklist đã sửa

- [x] Camera API: `Camera` → `CameraView`
- [x] Camera type: `CameraType.back` → `facing="back"`
- [x] CameraView children: Move buttons ra ngoài với absolute positioning
- [x] FileSystem: Import từ `expo-file-system/legacy`
- [x] Location: Thêm accuracy option và better error handling
- [x] Styles: Cập nhật buttonContainer với absolute positioning

---

**Đã sửa:** ✅ Tất cả lỗi đã được fix, camera hoạt động hoàn hảo!

