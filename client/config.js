/**
 * Cấu hình API cho CheckinPhoto App
 *
 * Hướng dẫn:
 * - Khi chạy trên emulator/simulator: dùng localhost
 * - Khi chạy trên thiết bị thật: thay localhost bằng IP máy tính (ví dụ: 192.168.1.100)
 * - Để tìm IP máy tính:
 *   + Windows: mở CMD và gõ `ipconfig`, tìm IPv4 Address
 *   + Mac/Linux: mở Terminal và gõ `ifconfig`, tìm inet
 */

// Cấu hình cho development
const DEV_CONFIG = {
  // Thay đổi IP này thành IP máy tính của bạn khi test trên thiết bị thật
  API_BASE_URL: 'http://localhost:9999/api',
  // API_BASE_URL: 'http://192.168.1.100:9999/api', // Ví dụ cho thiết bị thật

  // Timeout cho API requests (ms)
  TIMEOUT: 30000,

  // Bật/tắt chế độ offline (chỉ lưu local, không gọi API)
  OFFLINE_MODE: false,
};

// Cấu hình cho production
const PROD_CONFIG = {
  API_BASE_URL: 'https://your-production-api.com/api',
  TIMEOUT: 30000,
  OFFLINE_MODE: false,
};

// Tự động chọn config dựa trên môi trường
const CONFIG = __DEV__ ? DEV_CONFIG : PROD_CONFIG;

export default CONFIG;

// Export riêng lẻ để dễ sử dụng
export const API_BASE_URL = CONFIG.API_BASE_URL;
export const TIMEOUT = CONFIG.TIMEOUT;
export const OFFLINE_MODE = CONFIG.OFFLINE_MODE;
