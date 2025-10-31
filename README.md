# CheckinPhoto

This repository contains a React Native (Expo) client and a Node.js + Express backend for a photo check-in / sharing app.

cd E:\SWDPT\CheckinPhoto\client
npx expo start

cd E:\SWDPT\CheckinPhoto\backend
node server.js
# hoặc nếu có script npm start trong backend/package.json:
npm start

Overview of added features in this change:
- Camera preview modal with Save / Edit / Upload / Share / Retake actions (client).
- Gallery grouped by region and preview/edit/upload features (client).
- Backend endpoints:
	- POST /api/analyze  -> accept { latitude, longitude, imageUri } and return Google Geocoding address and AI analysis (Gemini) results.
	- POST /api/upload   -> accept multipart/form-data to save posts (stores image to backend/uploads and saves to MongoDB `CardPost`).

Required API keys (place these in `backend/.env`):

- GOOGLE_MAPS_API_KEY=your_google_maps_geocoding_api_key
	- Used by backend `/api/analyze` to reverse-geocode coordinates into city/district and formatted address.
	- You can obtain it from https://console.cloud.google.com/apis/credentials — enable "Geocoding API" (Maps JavaScript/Geocoding).

- GEMINI_API_KEY=your_gemini_api_key
	- Used by backend `services/aiService.js` to call Gemini (Google Generative AI). The current `aiService` implementation expects an image URL (publicly accessible) or suitable input the Gemini vision model accepts. If you want Gemini to analyze local files, upload them to public storage (e.g., Google Cloud Storage) first and pass that URL.
	- See https://cloud.google.com/generative-ai for API docs and authentication instructions.

How the flow works (client):
1. User opens Camera screen and takes a photo.
2. App tries to get device location (best-effort). If location is available, the client calls `POST /api/analyze` with { latitude, longitude, imageUri } (imageUri should be a public URL if you want Gemini to analyze the image).
3. Backend returns:
	 - `address`: { formatted, city, district } resolved via Google Maps Geocoding API.
	 - `ai`: object returned by `aiService.analyzeImage(...)` if `GEMINI_API_KEY` is configured.
4. The client displays AI description and the city/district to the user in the preview modal. The user can edit the suggestions.
5. When the user taps Save or Upload, the client uploads the image and metadata to `POST /api/upload` (multipart/form-data). The backend saves the image under `backend/uploads` and stores a `CardPost` document in MongoDB including location, aiDescription, and address data.

Notes & limitations / configuration you must do:

- Gemini image analysis requires the model to access the image. For simplicity, the current implementation expects an `imageUri` accessible by Gemini (public URL). If you want to send local images, you should:
	- Upload the image to a public storage (GCS, S3) first and pass the public URL to `/api/analyze`, or
	- Update `backend/services/aiService.js` to send image bytes using the Gemini Vision API (follow the official docs for binary upload), or
	- Use a third-party image-hosting service.

- On Android devices, Expo Go has restrictions for full media library write access; create a development build to test saving photos and metadata reliably.

- Backend environment & dependencies:
	- Create a `.env` file in `backend/` with:
		- MONGO_URI=your_mongo_connection_string
		- GOOGLE_MAPS_API_KEY=...
		- GEMINI_API_KEY=...
	- Install backend dependencies:
		cd backend
		npm install express mongoose multer axios @google/generative-ai

- Client configuration & dependencies:
	- `client/app.json` has been updated to include plugin/permissions for camera, media library and location.
	- Install client dependencies (in client/):
		npm install
		npx expo install expo-camera expo-media-library expo-image-picker expo-location @expo/vector-icons expo-font

Endpoints summary

- POST /api/analyze
	- Request body (JSON): { latitude: number, longitude: number, imageUri?: string }
	- Response: { address?: { formatted, city, district }, ai?: {...} }

- POST /api/upload
	- Request: multipart/form-data fields: `image` (file), `title`, `description`, `location` (JSON string), `aiDescription`
	- Response: saved post document

Where to edit API keys
- Backend `.env` in `backend/` (create if missing). Example:

	MONGO_URI=mongodb://localhost:27017/checkinphoto
	GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_KEY_HERE
	GEMINI_API_KEY=YOUR_GEMINI_KEY_HERE

After editing `.env`, restart the backend server:

	cd backend
	npm start

If you'd like, I can:
- Wire uploading to a cloud storage bucket (GCS) so AI can access images by URL automatically.
- Update `aiService.js` to accept base64/image bytes and call Gemini Vision properly.
- Add address fields into the saved `CardPost` document (right now `CardPost` stores location and aiDescription; we can extend it to store `address` explicitly).

If you want me to implement any of the above extra steps, tell me which one and I'll continue.
