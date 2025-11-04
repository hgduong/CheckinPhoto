import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyB_Hns9YCvf7CtXGF2tsLGD_1vO0sGZMmA",
  authDomain: "fir-c7f3b.firebaseapp.com",
  projectId: "fir-c7f3b",
  storageBucket: "fir-c7f3b.appspot.com",
  messagingSenderId: "582814311643",
  appId: "1:582814311643:android:c07743dc1b3eebbbc398fe",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
