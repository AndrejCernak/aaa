import { initializeApp } from "firebase/app"
import { getMessaging, getToken, onMessage } from "firebase/messaging"

const firebaseConfig = {
  apiKey: "AIzaSyAQJj_0HpQsySQDfYFwlXNQqBph3B6yJ_4",
  authDomain: "tokeny-246df.firebaseapp.com",
  projectId: "tokeny-246df",
  storageBucket: "tokeny-246df.firebasestorage.app",
  messagingSenderId: "410206660442",
  appId: "1:410206660442:web:c6b530a5cf6ec5a9e77563",
  measurementId: "G-QB2EJ0JFZL"
};

const app = initializeApp(firebaseConfig)
const messaging = getMessaging(app)

export { messaging, getToken, onMessage }
