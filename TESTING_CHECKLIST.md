# ✅ Testing Checklist - CheckinPhoto

Checklist để test app sau khi sửa lỗi.

---

## 🚀 Trước khi test

### Setup
- [ ] Backend đã chạy: `cd backend && node server.js`
- [ ] Client đã chạy: `cd client && npx expo start`
- [ ] MongoDB đã kết nối
- [ ] API keys đã set trong `.env`

### Environment
- [ ] Node.js version >= 16
- [ ] Expo CLI installed
- [ ] Emulator/Simulator hoặc physical device ready
- [ ] WiFi connection stable

---

## 📱 Camera Tests

### Basic Camera
- [ ] Camera screen mở được
- [ ] Camera preview hiển thị
- [ ] Không có error "Cannot read property 'back'"
- [ ] Không có warning "CameraView does not support children"

### Camera Controls
- [ ] Nút "Flip" hiển thị
- [ ] Click "Flip" → camera đổi front/back
- [ ] Nút chụp ảnh (tròn trắng) hiển thị
- [ ] Click nút chụp → chụp được ảnh
- [ ] Preview ảnh hiển thị sau khi chụp

### Camera Permissions
- [ ] App yêu cầu camera permission
- [ ] Cho phép → camera hoạt động
- [ ] Từ chối → hiển thị message yêu cầu permission

---

## 📍 Location Tests

### Location Capture
- [ ] App yêu cầu location permission
- [ ] GPS bật → lấy được coordinates
- [ ] GPS tắt → app vẫn hoạt động (không crash)
- [ ] Không có error "Location request failed" (hoặc chỉ warning)

### Location Display
- [ ] Địa chỉ hiển thị trong preview (nếu có GPS)
- [ ] Fallback message nếu không có GPS
- [ ] Coordinates chính xác (check trên map)

---

## 🤖 AI Analysis Tests

### Image Analysis
- [ ] Sau khi chụp ảnh → AI analysis tự động chạy
- [ ] Loading indicator hiển thị
- [ ] AI suggestion hiển thị (hoặc fallback caption)
- [ ] Không có error "Cannot read property 'Base64'"

### AI Response
- [ ] Caption có ý nghĩa (tiếng Việt)
- [ ] Có thể edit caption
- [ ] Fallback caption nếu AI fail

---

## 💾 Save & Storage Tests

### Local Save
- [ ] Click "Save" → ảnh lưu local
- [ ] Không có error FileSystem
- [ ] Không có warning "getInfoAsync deprecated"
- [ ] Ảnh xuất hiện trong Gallery

### Upload to Server
- [ ] Click "Upload" → upload lên backend
- [ ] Loading indicator hiển thị
- [ ] Success message hiển thị
- [ ] Ảnh xuất hiện trong Gallery (từ server)

---

## 🖼️ Gallery Tests

### Display
- [ ] Gallery screen mở được
- [ ] Ảnh local hiển thị
- [ ] Ảnh từ server hiển thị
- [ ] Grouped by region (nếu có location)

### Interaction
- [ ] Click ảnh → xem chi tiết
- [ ] Swipe/scroll smooth
- [ ] Refresh để load ảnh mới

---

## 🗺️ Map Tests

### Map Display
- [ ] Map screen mở được
- [ ] Map tiles load
- [ ] Markers hiển thị (nếu có posts với location)

### Map Interaction
- [ ] Zoom in/out
- [ ] Pan/drag map
- [ ] Click marker → xem thông tin
- [ ] Callout hiển thị ảnh và info

---

## 🌐 Network Tests

### Online Mode
- [ ] Backend running → tất cả features hoạt động
- [ ] AI analysis hoạt động
- [ ] Upload hoạt động
- [ ] Fetch posts từ server

### Offline Mode
- [ ] Backend stopped → app vẫn mở được
- [ ] Camera vẫn hoạt động
- [ ] Save local vẫn hoạt động
- [ ] Fallback caption hiển thị
- [ ] Graceful error messages

### Network Errors
- [ ] Timeout → user-friendly error message
- [ ] Connection failed → fallback behavior
- [ ] Không crash app

---

## 🔐 Permissions Tests

### Camera Permission
- [ ] First time → request permission
- [ ] Granted → camera hoạt động
- [ ] Denied → show message + button to settings

### Location Permission
- [ ] First time → request permission
- [ ] Granted → location capture
- [ ] Denied → app vẫn hoạt động (no crash)

### Media Library Permission
- [ ] Request khi save ảnh
- [ ] Granted → save thành công
- [ ] Denied → show error message

---

## 🐛 Error Handling Tests

### Console Errors
- [ ] Không có error "Cannot read property 'back'"
- [ ] Không có error "Cannot read property 'Base64'"
- [ ] Không có unhandled promise rejections

### Console Warnings
- [ ] Không có warning "CameraView does not support children"
- [ ] Không có warning "getInfoAsync deprecated" (hoặc ít)
- [ ] Location warning OK (nếu GPS tắt)

### User-Facing Errors
- [ ] Error messages bằng tiếng Việt
- [ ] Clear và helpful
- [ ] Có hướng dẫn fix (nếu có thể)

---

## 📊 Performance Tests

### App Launch
- [ ] App khởi động < 5 giây
- [ ] Splash screen hiển thị
- [ ] Không crash khi launch

### Camera Performance
- [ ] Camera preview smooth (>= 24fps)
- [ ] Chụp ảnh nhanh (< 2 giây)
- [ ] Flip camera smooth

### Image Processing
- [ ] AI analysis < 10 giây
- [ ] Upload < 5 giây (ảnh ~2MB)
- [ ] Save local < 1 giây

### Memory
- [ ] Không memory leak
- [ ] App không crash sau nhiều ảnh
- [ ] Gallery scroll smooth

---

## 🎨 UI/UX Tests

### Layout
- [ ] Buttons hiển thị đúng vị trí
- [ ] Không bị che khuất
- [ ] Responsive trên các màn hình

### Navigation
- [ ] Bottom tabs hoạt động
- [ ] Stack navigation hoạt động
- [ ] Back button hoạt động
- [ ] Deep linking (nếu có)

### Visual
- [ ] Icons hiển thị đúng
- [ ] Colors consistent
- [ ] Fonts load đúng
- [ ] Images không bị distorted

---

## 📱 Device-Specific Tests

### Android
- [ ] Camera hoạt động
- [ ] Permissions hoạt động
- [ ] Back button hoạt động
- [ ] Status bar OK

### iOS
- [ ] Camera hoạt động
- [ ] Permissions hoạt động
- [ ] Safe area OK
- [ ] Status bar OK

### Emulator vs Physical
- [ ] Test trên emulator
- [ ] Test trên thiết bị thật
- [ ] GPS chính xác trên thiết bị thật
- [ ] Camera quality tốt trên thiết bị thật

---

## 🔄 Regression Tests

### Features vẫn hoạt động
- [ ] Home screen
- [ ] Profile screen
- [ ] All navigation
- [ ] All existing features

### No new bugs
- [ ] Không có bug mới sau khi fix
- [ ] Không break existing features
- [ ] Backward compatible

---

## ✅ Final Checklist

### Critical
- [ ] Camera hoạt động 100%
- [ ] Không có critical errors
- [ ] App không crash
- [ ] Core features hoạt động

### Important
- [ ] AI analysis hoạt động
- [ ] Location capture hoạt động
- [ ] Save/Upload hoạt động
- [ ] Error handling tốt

### Nice to have
- [ ] Performance tốt
- [ ] UI/UX smooth
- [ ] No warnings
- [ ] Documentation complete

---

## 📝 Test Results

### Emulator Test
- **Date:** ___________
- **Platform:** Android / iOS
- **Result:** ✅ Pass / ❌ Fail
- **Notes:** ___________

### Physical Device Test
- **Date:** ___________
- **Device:** ___________
- **OS Version:** ___________
- **Result:** ✅ Pass / ❌ Fail
- **Notes:** ___________

---

## 🐛 Issues Found

| Issue | Severity | Status | Notes |
|-------|----------|--------|-------|
|       | Critical/High/Medium/Low | Open/Fixed |       |
|       |          |        |       |

---

## 🎉 Sign Off

- [ ] All critical tests passed
- [ ] All important tests passed
- [ ] Issues documented
- [ ] Ready for production / Need fixes

**Tested by:** ___________  
**Date:** ___________  
**Signature:** ___________

---

## 📚 Reference

- **FIXES_SUMMARY.md** - Các lỗi đã sửa
- **QUICK_FIX_REFERENCE.md** - Quick fixes
- **CAMERA_FIX.md** - Camera issues
- **SETUP.md** - Setup guide

---

**Happy Testing! 🧪**

