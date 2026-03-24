import React, { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { AuthProvider, useAuth } from "../context/AuthContext";
import "../global.css";
import { ToastProvider } from "../context/ToastContext";


import "../config/firebaseConfig"; 


import {
  getMessaging,
  setBackgroundMessageHandler,
} from "@react-native-firebase/messaging";


import {
  NotificationListener,
  requestUserPermission,
} from "../utils/notificationService";
import NotificationManager from "../components/NotificationManager";
import AnimatedSplashScreen from "../components/AnimatedSplashScreen";
import { ThemeProvider } from "../context/ThemeContext";


const messaging = getMessaging();


setBackgroundMessageHandler(messaging, async (remoteMessage) => {
  console.log("Message handled in the background!", remoteMessage);
});

const InitialLayout = () => {
  const { user, userRole, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [navigationComplete, setNavigationComplete] = useState(false);

  
  useEffect(() => {
    let unsubscribe;
    const setupNotifications = async () => {
      try {
        const hasPermission = await requestUserPermission();
        if (hasPermission) {
          unsubscribe = NotificationListener();
        }
      } catch (error) {
        console.error("❌ Notification setup error:", error);
      }
    };
    setupNotifications();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  
  useEffect(() => {
    
    if (loading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inAdminGroup = segments[0] === "(admin)";
    const inTeacherGroup = segments[0] === "(teacher)";
    const inStudentGroup = segments[0] === "(student)";

    try {
      if (user && userRole) {
        
        let targetRoute = null;

        if (userRole === "admin" && !inAdminGroup) {
          targetRoute = "/(admin)/admindashboard";
        } else if (userRole === "teacher" && !inTeacherGroup) {
          targetRoute = "/(teacher)/teacherdashboard";
        } else if (userRole === "student" && !inStudentGroup) {
          targetRoute = "/(student)/studentdashboard";
        }

        if (targetRoute) {
          router.replace(targetRoute);
          return;
        }
      } else if (user && !userRole) {
        
        
        if (inAdminGroup || inTeacherGroup || inStudentGroup) {
          console.log("🔒 Blocking unverified user from protected route");
          router.replace("/");
          return;
        }
      } else if (!user) {
        
        if (inAdminGroup || inTeacherGroup || inStudentGroup) {
          console.log("🔒 Redirecting unauthenticated user to home");
          router.replace("/");
          return;
        }
      }

      
      setNavigationComplete(true);
    } catch (error) {
      console.error("❌ Navigation error:", error);
      setNavigationComplete(true);
    }
  }, [user, userRole, loading, segments, router]);

  
  if (loading || !navigationComplete) {
    return <AnimatedSplashScreen />;
  }

  return (
    <ToastProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login_options" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(admin)" />
        <Stack.Screen name="(teacher)" />
        <Stack.Screen name="(student)" />
        <Stack.Screen name="(guest)" />
      </Stack>
      <NotificationManager />
    </ToastProvider>
  );
};;

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <InitialLayout />
      </ThemeProvider>
    </AuthProvider>
  );
}
