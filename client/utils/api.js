/**
 * API Utility Functions
 * Xử lý các API calls với error handling và timeout
 */

import CONFIG from '../config';

/**
 * Wrapper cho fetch với timeout và error handling
 */
async function fetchWithTimeout(url, options = {}, timeout = CONFIG.TIMEOUT) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - Vui lòng kiểm tra kết nối mạng');
    }
    throw error;
  }
}

/**
 * Phân tích ảnh với backend
 */
export async function analyzeImage(imageUri, latitude, longitude) {
  if (CONFIG.OFFLINE_MODE) {
    throw new Error('Offline mode - API calls disabled');
  }

  try {
    const response = await fetchWithTimeout(
      `${CONFIG.API_BASE_URL}/analyze`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUri,
          latitude,
          longitude,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('analyzeImage error:', error);
    throw error;
  }
}

/**
 * Upload ảnh lên server
 */
export async function uploadImage(formData) {
  if (CONFIG.OFFLINE_MODE) {
    throw new Error('Offline mode - API calls disabled');
  }

  try {
    const response = await fetchWithTimeout(
      `${CONFIG.API_BASE_URL}/upload`,
      {
        method: 'POST',
        body: formData,
        // Không set Content-Type header khi upload FormData
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('uploadImage error:', error);
    throw error;
  }
}

/**
 * Lấy danh sách posts từ server
 */
export async function getPosts(limit = 50, skip = 0) {
  if (CONFIG.OFFLINE_MODE) {
    throw new Error('Offline mode - API calls disabled');
  }

  try {
    const response = await fetchWithTimeout(
      `${CONFIG.API_BASE_URL}/posts?limit=${limit}&skip=${skip}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('getPosts error:', error);
    throw error;
  }
}

/**
 * Kiểm tra kết nối với server
 */
export async function checkServerConnection() {
  try {
    const response = await fetchWithTimeout(
      CONFIG.API_BASE_URL.replace('/api', ''),
      {
        method: 'GET',
      },
      5000 // 5 seconds timeout
    );

    return response.ok;
  } catch (error) {
    console.error('Server connection check failed:', error);
    return false;
  }
}

/**
 * Format error message cho người dùng
 */
export function formatErrorMessage(error) {
  if (!error) return 'Đã xảy ra lỗi không xác định';
  
  if (typeof error === 'string') return error;
  
  if (error.message) {
    // Translate common error messages
    if (error.message.includes('Network request failed')) {
      return 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.';
    }
    if (error.message.includes('timeout')) {
      return 'Yêu cầu quá thời gian chờ. Vui lòng thử lại.';
    }
    if (error.message.includes('Failed to fetch')) {
      return 'Không thể kết nối đến server. Kiểm tra địa chỉ API trong config.js';
    }
    return error.message;
  }
  
  return 'Đã xảy ra lỗi không xác định';
}

