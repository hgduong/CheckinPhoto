import axios from 'axios';

const GEMINI_API_KEY = 'AIzaSyB3gqMjQfO087vy2ia0lzoGmEJJRLk1pRA';

export const callGemini = async (userMessage) => {
  try {
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + GEMINI_API_KEY,
      {
        contents: [
          {
            parts: [{ text: userMessage }]
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const reply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return reply || "Không có phản hồi từ Gemini.";
  } catch (error) {
    console.error("Lỗi gọi Gemini:", error);
    return "Lỗi khi gọi API Gemini.";
  }
};
