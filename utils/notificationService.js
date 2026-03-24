import {
  getMessaging,
  getToken,
  requestPermission,
  AuthorizationStatus,
} from "@react-native-firebase/messaging";
import { PermissionsAndroid, Platform } from "react-native";


const messaging = getMessaging();


export const requestUserPermission = async () => {
  if (Platform.OS === "ios") {
    
    const authStatus = await requestPermission(messaging);
    const enabled =
      authStatus === AuthorizationStatus.AUTHORIZED ||
      authStatus === AuthorizationStatus.PROVISIONAL;
    return enabled;
  } else if (Platform.OS === "android" && Platform.Version >= 33) {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }
  return true; 
};


export const getFCMToken = async () => {
  try {
    
    
    
    const authStatus = await requestPermission(messaging);

    if (
      authStatus === AuthorizationStatus.AUTHORIZED ||
      authStatus === AuthorizationStatus.PROVISIONAL
    ) {
      
      const token = await getToken(messaging);
      console.log("FCM Token:", token);
      return token;
    }

    console.log("Notification permission denied");
    return null;
  } catch (error) {
    console.error("Error getting FCM token:", error);
    return null;
  }
};


export const NotificationListener = () => {
  return () => {};
};
