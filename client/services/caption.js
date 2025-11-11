// client/services/aiCaptionService.js
import * as FileSystem from "expo-file-system/legacy";

// === GEMINI API KEY ===
const GEMINI_API_KEY = "AIzaSyB3gqMjQfO087vy2ia0lzoGmEJJRLk1pRA";

/**
 * Sinh caption có vần, gợi cảm xúc, gắn với thời gian & địa điểm ảnh
 * @param {string} imageUri
 * @param {Object} info - { full, createdAt }
 * @returns {Promise<string>}
 */
export const generateAICaption = async (imageUri, info) => {
  try {
    const time = new Date(info.createdAt || Date.now());
    const hour = time.getHours();
    const timeStr = time.toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const locStr = info.full || "một nơi nào đó ở Việt Nam";

    // Phân tích khoảng thời gian trong ngày để AI hiểu bối cảnh
    let timeOfDay = "một khoảnh khắc yên bình";
    if (hour >= 5 && hour < 10) timeOfDay = "buổi sáng";
    else if (hour >= 10 && hour < 13) timeOfDay = "buổi trưa";
    else if (hour >= 13 && hour < 18) timeOfDay = "buổi chiều";
    else if (hour >= 18 && hour < 22) timeOfDay = "buổi tối";
    else timeOfDay = "đêm muộn";

    // Đọc ảnh nếu có file
    let base64 = "";
    if (imageUri && (imageUri.startsWith("file://") || imageUri.startsWith("/"))) {
      base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    }

    // 🎯 PROMPT cải tiến: kết hợp thời gian + địa điểm + cảm xúc
    const prompt = `
Bạn là người viết caption sáng tạo.
Hãy viết một câu caption ngắn gọn, tiếng Việt, có vần nhẹ hoặc cảm xúc tự nhiên cho bức ảnh được chụp vào ${timeOfDay} (${timeStr}) tại ${locStr}.
Giọng văn: thả thính nhẹ, có chút thơ, ấm áp hoặc sâu lắng tuỳ thời điểm trong ngày.
Phù hợp với phong cách mạng xã hội hiện đại (Facebook/Instagram).
Không dùng hashtag, không emoji, không thêm lời giải thích. 
Chỉ trả về dòng caption duy nhất.
`;

    const parts = [{ text: prompt }];
    if (base64) parts.push({ inlineData: { data: base64, mimeType: "image/jpeg" } });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: { temperature: 0.9, maxOutputTokens: 80 },
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return text || "Khoảnh khắc ngọt như nắng chiều nơi xa...";
  } catch (e) {
    console.warn("AI Caption error:", e);
    return "Gió khẽ, nắng vương – lòng người vấn vương...";
  }
};
