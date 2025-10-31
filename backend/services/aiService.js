const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function analyzeImage(imageUrl) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
    
    const result = await model.generateContent([
      "Analyze this location photo and provide:",
      "1. A brief description of the location",
      "2. What makes this place special for photography",
      "3. Suggest 3 similar locations nearby that might have good photo opportunities",
      imageUrl
    ]);

    const response = await result.response;
    const text = response.text();
    
    // Parse the response to extract description and similar places
    // This is a simple implementation - you might want to make it more robust
    const [description, ...suggestions] = text.split('\n\n');
    
    return {
      aiDescription: description,
      similarPlaces: suggestions.map(suggestion => ({
        name: suggestion.split(':')[0],
        description: suggestion.split(':')[1],
        // Note: You'll need to integrate with a geocoding service 
        // to get actual coordinates for suggested places
        location: {
          type: 'Point',
          coordinates: [0, 0] // placeholder
        }
      }))
    };
  } catch (error) {
    console.error('Error analyzing image:', error);
    throw error;
  }
}

module.exports = {
  analyzeImage
};