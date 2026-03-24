import React, { useEffect, useState } from "react";

import {
  getMessaging,
  onMessage,
  onNotificationOpenedApp,
  getInitialNotification,
  requestPermission,
  AuthorizationStatus,
} from "@react-native-firebase/messaging";
import { useRouter } from "expo-router";
import { useAuth } from "../context/AuthContext";
import CustomAlert from "./CustomAlert";

const NotificationManager = () => {
  const router = useRouter();
  const { userRole } = useAuth();

  
  const messaging = getMessaging();

  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: "",
    message: "",
    data: null,
  });

  
  const isNotificationForCurrentRole = (notificationType, currentRole) => {
    
    const roleNotificationMap = {
      admin: [
        "account", 
        "admin_notice", 
        "admin_leave", 
        "admin_fee_check", 
        "global_notice", 
      ],
      teacher: [
        "account", 
        "class_notice", 
        "attention", 
        "testscores", 
        "teacher_leave", 
        "student_leaves", 
        "courses", 
        "homework", 
        "materials", 
        "salary", 
        "global_notice", 
      ],
      student: [
        "account", 
        "class_notice", 
        "homework", 
        "materials", 
        "courses", 
        "fees", 
        "attendance", 
        "testscores", 
        "leave_status", 
        "global_notice", 
      ],
    };

    const allowedTypes = roleNotificationMap[currentRole] || [];

    
    if (!allowedTypes.includes(notificationType)) {
      console.log(
        `🚫 Filtered notification of type "${notificationType}" - not intended for ${currentRole} role`,
      );
      return false;
    }

    return true;
  };

  useEffect(() => {
    
    const checkPermission = async () => {
      
      const authStatus = await requestPermission(messaging);
      const enabled =
        authStatus === AuthorizationStatus.AUTHORIZED ||
        authStatus === AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log("Authorization status:", authStatus);
      }
    };

    checkPermission();

    
    const unsubscribe = onMessage(messaging, async (remoteMessage) => {
      const notificationType = remoteMessage.data?.type;

      
      if (
        userRole &&
        !isNotificationForCurrentRole(notificationType, userRole)
      ) {
        console.warn(
          `⚠️ Ignoring notification type "${notificationType}" as it's not for ${userRole} role`,
        );
        return; 
      }

      setAlertConfig({
        visible: true,
        title: remoteMessage.notification?.title || "New Notification",
        message: remoteMessage.notification?.body || "You have a new update.",
        data: remoteMessage.data,
      });
    });

    
    onNotificationOpenedApp(messaging, (remoteMessage) => {
      console.log("App opened from background:", remoteMessage);
      handleNotificationClick(remoteMessage.data);
    });

    
    getInitialNotification(messaging).then((remoteMessage) => {
      if (remoteMessage) {
        console.log("App opened from quit state:", remoteMessage);
        setTimeout(() => handleNotificationClick(remoteMessage.data), 1000);
      }
    });

    return unsubscribe;
  }, [userRole]); 

  const handleNotificationClick = (data) => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));

    if (!data) return;

    const notificationType = data.type;

    
    if (userRole && !isNotificationForCurrentRole(notificationType, userRole)) {
      console.warn(
        `⚠️ Ignoring click on notification type "${notificationType}" - not intended for ${userRole} role`,
      );
      return; 
    }

    
    console.log("Routing Notification Type:", data.type);

    switch (data.type) {
      
      case "global_notice":
        if (userRole === "teacher") router.push("/(teacher)/teacherdashboard");
        else if (userRole === "admin") router.push("/(admin)/admindashboard");
        else router.push("/(student)/studentdashboard");
        break;

      case "class_notice":
        router.push("/(student)/studentdashboard");
        break;

      
      case "homework":
        router.push("/(student)/homeworkscreen");
        break;

      case "materials":
        router.push("/(student)/classnotes");
        break;

      case "courses":
        router.push("/(student)/courses");
        break;

      
      case "fees":
        router.push("/(student)/studentfees");
        break;

      case "salary":
        router.push("/(teacher)/teachersalary");
        break;

      
      case "attendance":
        if (userRole === "teacher") router.push("/(teacher)/attendancescreen");
        else router.push("/(student)/attendancescreen");
        break;

      case "testscores":
        if (userRole === "teacher") router.push("/(teacher)/testscores");
        else router.push("/(student)/testscores");
        break;

      
      case "leave_status":
        
        router.push("/(student)/submitleaves");
        break;

      case "teacher_leave":
        
        router.push("/(teacher)/student_leaves");
        break;

      case "admin_leave":
        
        router.push("/(admin)/all_leaves");
        break;

      case "admin_fee_check":
        
        router.push("/(admin)/feereports");
        break;

      
      default:
        console.log("Unknown type, redirecting to dashboard:", data.type);
        if (userRole === "teacher") router.push("/(teacher)/teacherdashboard");
        else if (userRole === "admin") router.push("/(admin)/admindashboard");
        else router.push("/(student)/studentdashboard");
    }
  };

  return (
    <CustomAlert
      visible={alertConfig.visible}
      title={alertConfig.title}
      message={alertConfig.message}
      confirmText="View"
      type="info"
      onConfirm={() => handleNotificationClick(alertConfig.data)}
      onCancel={() => setAlertConfig((prev) => ({ ...prev, visible: false }))}
    />
  );
};

export default NotificationManager;
