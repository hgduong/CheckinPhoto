import { Client, Storage } from "react-native-appwrite";

// === KEY MỚI CỦA BẠN (Hard-code) ===
const APPWRITE_ENDPOINT = "https://sgp.cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID = "690a2ec20025978bb683";
const APPWRITE_BUCKET_ID = "690a2f03001de6dba700";
// === KẾT THÚC KEY ===

export class AppwriteClientFactory {
  static instance;
  storage;

  constructor() {
    const client = new Client()
      .setEndpoint(APPWRITE_ENDPOINT)
      .setProject(APPWRITE_PROJECT_ID);

    this.storage = new Storage(client);
  }

  static getInstance() {
    if (!AppwriteClientFactory.instance) {
      AppwriteClientFactory.instance = new AppwriteClientFactory();
    }
    return AppwriteClientFactory.instance;
  }
}

// Cấu hình API (giữ lại nếu cần)
const CONFIG = {
  API_BASE_URL: 'http://localhost:9999/api',
  TIMEOUT: 30000,
  OFFLINE_MODE: false,
};

export default CONFIG;
export const API_BASE_URL = CONFIG.API_BASE_URL;
export const TIMEOUT = CONFIG.TIMEOUT;
export const OFFLINE_MODE = CONFIG.OFFLINE_MODE;