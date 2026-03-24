import { getApp, getApps, initializeApp } from "@react-native-firebase/app";
import { getAuth } from "@react-native-firebase/auth";
import { getFirestore } from "@react-native-firebase/firestore";
import { getStorage } from "@react-native-firebase/storage";
import { getFunctions } from "@react-native-firebase/functions"; 


let app;
if (getApps().length === 0) {
  app = initializeApp();
} else {
  app = getApp();
}


const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);
const functions = getFunctions(app); 


export { db, auth, storage, functions, app };
export default app;
