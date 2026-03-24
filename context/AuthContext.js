import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  getIdTokenResult,
  signOut,
} from "@react-native-firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "@react-native-firebase/firestore";

import {
  getMessaging,
  subscribeToTopic,
  unsubscribeFromTopic,
} from "@react-native-firebase/messaging";

import { auth, db } from "../config/firebaseConfig";
import { getFCMToken } from "../utils/notificationService";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  
  const handleDeviceRegistration = async (uid, role, isVerified) => {
    try {
      const token = await getFCMToken();
      if (!token) return;

      const userRef = doc(db, "users", uid);

      
      await setDoc(
        userRef,
        {
          fcmTokens: arrayUnion(token),
        },
        { merge: true },
      );

      const messagingInstance = getMessaging();

      
      if (isVerified) {
        if (role === "admin") {
          await subscribeToTopic(messagingInstance, "admins").catch(() => {});
          await unsubscribeFromTopic(messagingInstance, "teachers").catch(
            () => {},
          );
          await unsubscribeFromTopic(messagingInstance, "students").catch(
            () => {},
          );
        } else if (role === "teacher") {
          await subscribeToTopic(messagingInstance, "teachers").catch(() => {});
          await unsubscribeFromTopic(messagingInstance, "admins").catch(
            () => {},
          );
          await unsubscribeFromTopic(messagingInstance, "students").catch(
            () => {},
          );
        } else if (role === "student") {
          await subscribeToTopic(messagingInstance, "students").catch(() => {});
          await unsubscribeFromTopic(messagingInstance, "admins").catch(
            () => {},
          );
          await unsubscribeFromTopic(messagingInstance, "teachers").catch(
            () => {},
          );
        }
        console.log(`✅ Device verified: Subscribed to ${role} topics.`);
      } else {
        
        
        await unsubscribeFromTopic(messagingInstance, "admins").catch(() => {});
        await unsubscribeFromTopic(messagingInstance, "teachers").catch(
          () => {},
        );
        await unsubscribeFromTopic(messagingInstance, "students").catch(
          () => {},
        );
        console.log(
          `⏳ Device pending: Token saved, but disconnected from all topics.`,
        );
      }
    } catch (e) {
      console.log("Device Registration Error:", e);
    }
  };

  
  
  const clearTokenFromDatabase = async (uid) => {
    try {
      console.log("🧹 Starting lightning logout cleanup...");
      const messagingInstance = getMessaging();

      
      const firestoreCleanup = getFCMToken()
        .then(async (token) => {
          if (token) {
            const userRef = doc(db, "users", uid);
            await updateDoc(userRef, { fcmTokens: arrayRemove(token) });
            console.log("✅ Token successfully removed from Firestore.");
          }
        })
        .catch((e) => console.log("Token cleanup failed:", e));

      
      await Promise.all([
        firestoreCleanup,
        unsubscribeFromTopic(messagingInstance, "admins").catch(() => {}),
        unsubscribeFromTopic(messagingInstance, "teachers").catch(() => {}),
        unsubscribeFromTopic(messagingInstance, "students").catch(() => {}),
      ]);

      console.log("✅ Device successfully isolated on logout.");
    } catch (e) {
      console.error("❌ Token Clear Error:", e);
    }
  };

  useEffect(() => {
    let isSubscribed = true;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (!currentUser) {
          if (isSubscribed) {
            setUser(null);
            setUserRole(null);
            setLoading(false);
          }
          return;
        }

        if (!isSubscribed) return;
        setUser(currentUser);

        
        const tokenResult = await getIdTokenResult(currentUser);
        if (tokenResult.claims.role === "admin") {
          if (isSubscribed) {
            setUserRole("admin");
            await handleDeviceRegistration(currentUser.uid, "admin", true);
            setLoading(false);
          }
          return;
        }

        
        const userRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userRef);

        if (!isSubscribed) return;

        if (userDoc.exists()) {
          const userData = userDoc.data();
          const isVerified = userData?.verified === true;
          const role = userData?.role || null;

          await handleDeviceRegistration(currentUser.uid, role, isVerified);

          if (isVerified) {
            setUserRole(role);
          } else {
            setUserRole(null);
          }
        } else {
          setUserRole(null);
        }
      } catch (error) {
        console.error("❌ Auth Context Error:", error);
        if (isSubscribed) setUserRole(null);
      } finally {
        if (isSubscribed) setLoading(false);
      }
    });

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, []);

  const logout = async () => {
    try {
      
      if (user?.uid) {
        await clearTokenFromDatabase(user.uid);
      }
      await signOut(auth);
      
      setUser(null);
      setUserRole(null);
    } catch (error) {
      console.error("❌ Logout failed:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, userRole, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};;

export const useAuth = () => useContext(AuthContext);
