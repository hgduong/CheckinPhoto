const { GoogleGenerativeAI } = require('@google/generative-ai');

// Khởi tạo Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Phân tích ảnh bằng Google Gemini AI
 * @param {string} imageUrl - URL hoặc base64 của ảnh
 * @returns {Promise<Object>} - Kết quả phân tích
 */
async function analyzeImage(imageUrl) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    // Sử dụng model mới: gemini-2.5-flash-lite (model ổn định và nhanh)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    const prompt = `Phân tích bức ảnh này và cung cấp:
1. Mô tả ngắn gọn về địa điểm/cảnh vật trong ảnh (1-2 câu)
2. Điểm đặc biệt của địa điểm này cho nhiếp ảnh
3. Gợi ý 3 địa điểm tương tự gần đó có thể chụp ảnh đẹp

Trả lời bằng tiếng Việt, ngắn gọn và súc tích.`;

    let result;

    // Kiểm tra xem imageUrl là base64 hay URL
    if (imageUrl.startsWith('data:image')) {
      // Base64 image
      const base64Data = imageUrl.split(',')[1];
      const imagePart = {
        inlineData: {
          data: base64Data,
          mimeType: 'image/jpeg'
        }
      };
      result = await model.generateContent([prompt, imagePart]);
    } else if (imageUrl.startsWith('http')) {
      // URL image - Gemini có thể không hỗ trợ trực tiếp, cần download trước
      console.warn('URL images may not be supported directly. Consider converting to base64.');
      result = await model.generateContent([prompt, imageUrl]);
    } else {
      // File path hoặc định dạng khác
      result = await model.generateContent([prompt, imageUrl]);
    }

    const response = await result.response;
    const text = response.text();

    // Parse response - cải thiện parsing
    const lines = text.split('\n').filter(line => line.trim());
    const description = lines.slice(0, 3).join(' ').trim();

    // Trích xuất gợi ý địa điểm
    const suggestions = [];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/^\d+\./)) {
        suggestions.push(lines[i].replace(/^\d+\.\s*/, '').trim());
      }
    }

    return {
      aiDescription: description || text.substring(0, 200),
      similarPlaces: suggestions.slice(0, 3).map((suggestion, idx) => ({
        name: suggestion.split(':')[0] || `Địa điểm ${idx + 1}`,
        description: suggestion.split(':')[1] || suggestion,
        location: {
          type: 'Point',
          coordinates: [0, 0] // Placeholder - cần tích hợp geocoding
        }
      })),
      fullText: text
    };
  } catch (error) {
    console.error('Error analyzing image with Gemini:', error);

    // Trả về fallback thay vì throw error
    return {
      aiDescription: 'Không thể phân tích ảnh lúc này. Vui lòng thử lại sau.',
      similarPlaces: [],
      error: error.message
    };
  }
}

module.exports = {
  analyzeImage
};