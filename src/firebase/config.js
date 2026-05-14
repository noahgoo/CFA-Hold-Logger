import { initializeApp } from "firebase/app";
import {
  initializeFirestore,
  connectFirestoreEmulator,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

const useEmulator = process.env.REACT_APP_USE_EMULATOR === "true";

// Persistent local cache (IndexedDB) — serves cached data instantly on reload,
// syncs with Firestore in the background. Eliminates cold-start delay.
// Disabled for emulator: persistent cache conflicts with emulator reset between runs.
export const db = initializeFirestore(
  app,
  useEmulator
    ? {}
    : {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      }
);

if (useEmulator) {
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}

export default app;
