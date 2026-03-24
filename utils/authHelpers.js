import { initializeApp, deleteApp } from "firebase/app";
import {
  initializeAuth,
  createUserWithEmailAndPassword,
  inMemoryPersistence,
} from "firebase/auth";
import app from "../config/firebaseConfig"; 

export const createUserWithoutLoggingOut = async (email, password) => {
  
  const config = app.options;

  
  const secondaryApp = initializeApp(config, `SecondaryApp-${Date.now()}`);

  const secondaryAuth = initializeAuth(secondaryApp, {
    persistence: inMemoryPersistence,
  });

  try {
    const userCredential = await createUserWithEmailAndPassword(
      secondaryAuth,
      email,
      password
    );
    return userCredential.user.uid;
  } catch (error) {
    throw error;
  } finally {
    await deleteApp(secondaryApp);
  }
};
export default createUserWithoutLoggingOut;
