import { Client, Storage } from "react-native-appwrite";

export class AppwriteClientFactory {
  static instance;
  storage;

  constructor() {
    const client = new Client()
      .setEndpoint(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT)
      .setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID);

    this.storage = new Storage(client);
  }

  static getInstance() {
    if (!AppwriteClientFactory.instance) {
      AppwriteClientFactory.instance = new AppwriteClientFactory();
    }
    return AppwriteClientFactory.instance;
  }
}
