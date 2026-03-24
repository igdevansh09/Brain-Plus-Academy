import { useState } from "react";
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";


import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from "@react-native-firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  limit,
} from "@react-native-firebase/firestore";
import { auth, db } from "../../config/firebaseConfig";

import CustomToast from "../../components/CustomToast";
import { useTheme } from "../../context/ThemeContext";

const logo = require("../../assets/images/dinetimelogo.png");
const logo2 = require("../../assets/images/dinetimelogo2.png");
const entryImg = require("../../assets/images/Frame.png");

const AdminSignin = () => {
  const router = useRouter();
  const { theme, isDark } = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [toast, setToast] = useState({
    visible: false,
    msg: "",
    type: "success",
  });

  const showToast = (msg, type = "success") =>
    setToast({ visible: true, msg, type });

  const handleAdminLogin = async () => {
    Keyboard.dismiss();

    if (!email.trim() || !password.trim()) {
      return showToast("Please enter email and password", "error");
    }

    setLoading(true);
    try {
      
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );

      const user = userCredential.user;

      
      const idTokenResult = await user.getIdTokenResult(true);

      if (idTokenResult.claims.role === "admin") {
        console.log("✅ Verified Admin");
        showToast("Admin Access Granted", "success");
        
      } else {
        await signOut(auth);
        showToast("Access Denied: You are not an Admin.", "error");
      }
    } catch (error) {
      console.error("Login Error:", error);
      let msg = "Login failed.";

      if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password"
      ) {
        msg = "Invalid Email or Password.";
      } else if (error.code === "auth/invalid-email") {
        msg = "Invalid Email format.";
      } else if (error.code === "auth/too-many-requests") {
        msg = "Too many failed attempts. Try later.";
      }

      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    Keyboard.dismiss();

    const targetEmail = email.trim().toLowerCase();

    if (!targetEmail || !targetEmail.includes("@")) {
      return showToast("Please enter your admin email address first.", "error");
    }

    setLoading(true);
    try {
      
      await sendPasswordResetEmail(auth, targetEmail);

      showToast(
        "A reset link has been sent to your email. Please check your inbox (and spam folder).",
        "success",
      );
    } catch (error) {
      console.error("Reset Error:", error);
      if (error.code === "auth/user-not-found") {
        showToast("No account found with this email.", "error");
      } else {
        showToast("Failed to send reset email. Try again.", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ backgroundColor: theme.bgPrimary, flex: 1 }}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={theme.bgPrimary}
      />

      <CustomToast
        visible={toast.visible}
        message={toast.msg}
        type={toast.type}
        onHide={() => setToast({ ...toast, visible: false })}
      />

      <View className="px-4 py-2 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text
          style={{ color: theme.textPrimary }}
          className="text-lg font-semibold ml-4"
        >
          Back
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "center",
              paddingBottom: 20,
            }}
            keyboardShouldPersistTaps="handled"
          >
            <View className="px-6 flex justify-center items-center">
              <Image
                source={isDark ? logo2 : logo}
                style={{ width: 250, height: 200 }}
                resizeMode="contain"
              />
              <Text
                style={{ color: theme.textPrimary }}
                className="text-2xl text-center font-bold mb-8"
              >
                Admin Portal
              </Text>

              <View className="w-full">
                <View
                  style={{
                    backgroundColor: theme.bgSecondary,
                    borderColor: theme.border,
                  }}
                  className="flex-row items-center rounded-xl border mb-4 px-4"
                >
                  <Ionicons
                    name="mail"
                    size={20}
                    color={theme.textMuted}
                    className="mr-2"
                  />
                  <TextInput
                    placeholder="admin@brainplus.in"
                    placeholderTextColor={theme.placeholder}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                    style={{ color: theme.textPrimary }}
                    className="flex-1 py-4 text-base"
                  />
                </View>

                <View
                  style={{
                    backgroundColor: theme.bgSecondary,
                    borderColor: theme.border,
                  }}
                  className="flex-row items-center rounded-xl border mb-2 px-4"
                >
                  <Ionicons
                    name="lock-closed"
                    size={20}
                    color={theme.textMuted}
                    className="mr-2"
                  />
                  <TextInput
                    placeholder="Admin Password"
                    placeholderTextColor={theme.placeholder}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    style={{ color: theme.textPrimary }}
                    className="flex-1 py-4 text-base"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? "eye" : "eye-off"}
                      size={20}
                      color={theme.textMuted}
                    />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={handleForgotPassword}
                  className="self-end mb-6 py-2 px-1"
                  disabled={loading}
                >
                  <Text
                    style={{ color: theme.accent }}
                    className="font-semibold text-sm"
                  >
                    Forgot Password?
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleAdminLogin}
                  disabled={loading}
                  style={{
                    backgroundColor: loading ? theme.gray500 : theme.accent,
                  }}
                  className="p-4 rounded-xl items-center shadow-sm"
                >
                  {loading ? (
                    <ActivityIndicator color={theme.textDark} />
                  ) : (
                    <Text
                      style={{ color: theme.textDark }}
                      className="text-lg font-bold"
                    >
                      Login
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View className="flex-1 mt-10 opacity-80">
              <Image
                source={entryImg}
                className="w-full h-48"
                resizeMode="contain"
              />
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default AdminSignin;