import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getFCMToken } from "../../utils/notificationService"; 

import {
  createUserWithEmailAndPassword,
  signOut,
} from "@react-native-firebase/auth";
import { doc, setDoc, serverTimestamp } from "@react-native-firebase/firestore";
import { auth, db } from "../../config/firebaseConfig";

import CustomToast from "../../components/CustomToast";
import { useTheme } from "../../context/ThemeContext";


const ALL_CLASSES = [
  "CS",
  "Prep",
  "1st",
  "2nd",
  "3rd",
  "4th",
  "5th",
  "6th",
  "7th",
  "8th",
  "9th",
  "10th",
  "11th",
  "12th",
];
const LOWER_CLASSES = ["Prep", "1st", "2nd", "3rd"];
const MIDDLE_CLASSES = ["4th", "5th", "6th", "7th", "8th", "9th", "10th"];
const HIGHER_CLASSES = ["11th", "12th"];

const SUB_MIDDLE = ["English", "Hindi", "Maths", "Science", "Social Science"];
const SUB_HIGHER_ALL = [
  "English",
  "Economics",
  "Physics",
  "Chemistry",
  "Maths",
  "Accounts",
  "Business Studies",
  "History",
  "Geography",
  "Political Science",
];

const TeacherSignUp = () => {
  const router = useRouter();
  const { theme, isDark } = useTheme();

  const [loading, setLoading] = useState(false);

  
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  
  const [entries, setEntries] = useState([]); 
  const [tempClass, setTempClass] = useState(null);
  const [tempSubject, setTempSubject] = useState(null);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [modalType, setModalType] = useState(null); 

  const [toast, setToast] = useState({
    visible: false,
    msg: "",
    type: "success",
  });
  const showToast = (msg, type) => setToast({ visible: true, msg, type });

  
  useEffect(() => {
    if (!tempClass) {
      setAvailableSubjects([]);
      setTempSubject(null);
      return;
    }

    if (tempClass === "CS") {
      setAvailableSubjects(["CS"]);
      setTempSubject("CS");
    } else if (LOWER_CLASSES.includes(tempClass)) {
      setAvailableSubjects(["All Subjects"]);
      setTempSubject("All Subjects");
    } else if (MIDDLE_CLASSES.includes(tempClass)) {
      setAvailableSubjects(SUB_MIDDLE);
      setTempSubject(null);
    } else if (HIGHER_CLASSES.includes(tempClass)) {
      setAvailableSubjects(SUB_HIGHER_ALL);
      setTempSubject(null);
    }
  }, [tempClass]);

  const handleAddEntry = () => {
    if (!tempClass) return showToast("Select a Class first", "error");
    if (!tempSubject) return showToast("Select a Subject", "error");

    const exists = entries.some(
      (e) => e.class === tempClass && e.subject === tempSubject,
    );
    if (exists) return showToast("This combination is already added", "error");

    setEntries([...entries, { class: tempClass, subject: tempSubject }]);
    setTempClass(null);
    setTempSubject(null);
  };

  const handleRemoveEntry = (index) => {
    const updated = [...entries];
    updated.splice(index, 1);
    setEntries(updated);
  };

  const handleRegister = async () => {
    Keyboard.dismiss();

    
    if (!name.trim()) return showToast("Enter Full Name", "error");
    if (!email.trim() || !email.includes("@"))
      return showToast("Enter a valid Email", "error");
    if (password.length < 6)
      return showToast("Password must be at least 6 characters", "error");
    if (!phone || phone.length !== 10)
      return showToast("Enter valid 10-digit Phone", "error");
    if (entries.length === 0)
      return showToast("Add at least one Class-Subject pair", "error");

    setLoading(true);

    try {
      
      const res = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );
      const uid = res.user.uid;

      
      let currentToken = "";
      try {
        currentToken = await getFCMToken();
      } catch (e) {
        console.log("Failed to get FCM token", e);
      }

      
      const tokenArray = currentToken ? [currentToken] : [];

      const distinctClasses = [...new Set(entries.map((e) => e.class))];

      
      await setDoc(doc(db, "users", uid), {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: `+91${phone}`, 
        role: "teacher",
        teachingProfile: entries,
        classesTaught: distinctClasses,
        verified: false,
        salary: "0",
        fcmTokens: tokenArray, 
        createdAt: serverTimestamp(),
      });

      showToast("Registration Success! Wait for Admin Approval.", "success");

      
      setTimeout(async () => {
        await signOut(auth);
        router.replace("/(auth)/teachersignin");
      }, 1500);
    } catch (error) {
      console.error(error);
      if (error.code === "auth/email-already-in-use") {
        showToast("This email is already registered.", "error");
      } else if (error.code === "auth/weak-password") {
        showToast("Password is too weak.", "error");
      } else {
        showToast("Registration Failed. Try again.", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgPrimary }}>
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

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ padding: 24, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-row items-center mb-6">
            <TouchableOpacity onPress={() => router.back()} className="mr-4">
              <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
            </TouchableOpacity>
            <Text
              style={{ color: theme.textPrimary }}
              className="text-3xl font-bold"
            >
              Teacher Reg.
            </Text>
          </View>

          <Text
            style={{ color: theme.accent }}
            className="mb-1 ml-1 font-semibold"
          >
            Full Name <Text style={{ color: theme.error }}>*</Text>
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={{
              backgroundColor: theme.bgSecondary,
              color: theme.textPrimary,
              borderColor: theme.border,
            }}
            className="p-4 rounded-xl mb-4 border"
            placeholder="Name"
            placeholderTextColor={theme.textMuted}
          />

          <Text
            style={{ color: theme.accent }}
            className="mb-1 ml-1 font-semibold"
          >
            Email Address (For Login){" "}
            <Text style={{ color: theme.error }}>*</Text>
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            style={{
              backgroundColor: theme.bgSecondary,
              color: theme.textPrimary,
              borderColor: theme.border,
            }}
            className="p-4 rounded-xl mb-4 border"
            placeholder="teacher@example.com"
            placeholderTextColor={theme.textMuted}
          />

          <Text
            style={{ color: theme.accent }}
            className="mb-1 ml-1 font-semibold"
          >
            Password <Text style={{ color: theme.error }}>*</Text>
          </Text>
          <View
            style={{
              backgroundColor: theme.bgSecondary,
              borderColor: theme.border,
            }}
            className="flex-row items-center rounded-xl border mb-4 px-4"
          >
            <TextInput
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              style={{ color: theme.textPrimary }}
              className="flex-1 py-4 text-base"
              placeholder="Minimum 6 characters"
              placeholderTextColor={theme.textMuted}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? "eye" : "eye-off"}
                size={20}
                color={theme.textMuted}
              />
            </TouchableOpacity>
          </View>

          <Text
            style={{ color: theme.accent }}
            className="mb-1 ml-1 font-semibold"
          >
            Contact Phone <Text style={{ color: theme.error }}>*</Text>
          </Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            maxLength={10}
            style={{
              backgroundColor: theme.bgSecondary,
              color: theme.textPrimary,
              borderColor: theme.border,
            }}
            className="p-4 rounded-xl mb-6 border"
            placeholder="9876543210"
            placeholderTextColor={theme.textMuted}
          />

          <Text
            style={{ color: theme.accent }}
            className="mb-2 ml-1 font-semibold"
          >
            Add Teaching Details <Text style={{ color: theme.error }}>*</Text>
          </Text>

          <View className="flex-row justify-between mb-4">
            <TouchableOpacity
              onPress={() => setModalType("class")}
              style={{
                backgroundColor: theme.bgSecondary,
                borderColor: theme.border,
              }}
              className="flex-1 p-4 rounded-xl border mr-2 justify-center"
            >
              <Text
                style={{
                  color: tempClass ? theme.textPrimary : theme.textMuted,
                  fontWeight: tempClass ? "bold" : "normal",
                }}
                className="text-center"
              >
                {tempClass || "Class"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (!tempClass) showToast("Select Class first", "error");
                else if (availableSubjects.length > 0) setModalType("subject");
              }}
              disabled={availableSubjects.length === 0}
              style={{
                backgroundColor: theme.bgSecondary,
                borderColor: theme.border,
                opacity: availableSubjects.length === 0 ? 0.5 : 1,
              }}
              className="flex-1 p-4 rounded-xl border ml-2 justify-center"
            >
              <Text
                style={{
                  color: tempSubject ? theme.textPrimary : theme.textMuted,
                  fontWeight: tempSubject ? "bold" : "normal",
                }}
                className="text-center"
              >
                {tempSubject || (tempClass === "CS" ? "CS" : "Subject")}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={handleAddEntry}
            style={{
              backgroundColor: theme.bgSecondary,
              borderColor: theme.accent,
            }}
            className="self-center p-3 rounded-full border mb-6"
          >
            <Ionicons name="add" size={28} color={theme.accent} />
          </TouchableOpacity>

          {entries.length > 0 && (
            <View className="mb-6">
              <Text
                style={{ color: theme.textMuted }}
                className="text-xs mb-2 uppercase tracking-widest"
              >
                Added Classes
              </Text>
              {entries.map((entry, index) => (
                <View
                  key={index}
                  style={{
                    backgroundColor: theme.bgSecondary,
                    borderColor: theme.border,
                  }}
                  className="flex-row items-center justify-between p-3 rounded-lg mb-2 border"
                >
                  <View className="flex-row items-center">
                    <View
                      style={{ backgroundColor: theme.accent }}
                      className="px-2 py-1 rounded mr-3"
                    >
                      <Text
                        style={{ color: theme.textDark }}
                        className="font-bold text-xs"
                      >
                        {entry.class}
                      </Text>
                    </View>
                    <Text
                      style={{ color: theme.textPrimary }}
                      className="font-semibold"
                    >
                      {entry.subject}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => handleRemoveEntry(index)}>
                    <Ionicons
                      name="trash-outline"
                      size={20}
                      color={theme.errorBright || "#ff4444"}
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            onPress={handleRegister}
            disabled={loading}
            style={{
              backgroundColor: loading ? theme.gray500 : theme.accent,
            }}
            className="p-4 rounded-xl items-center mt-auto shadow-lg mb-4"
          >
            {loading ? (
              <ActivityIndicator color={theme.textDark} />
            ) : (
              <Text
                style={{ color: theme.textDark }}
                className="font-bold text-lg"
              >
                Create Account
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={!!modalType}
        transparent
        animationType="fade"
        onRequestClose={() => setModalType(null)}
      >
        <View
          style={{ backgroundColor: theme.blackSoft80 }}
          className="flex-1 justify-center p-6"
        >
          <View
            style={{
              backgroundColor: theme.bgSecondary,
              borderColor: theme.accent,
            }}
            className="rounded-xl max-h-[70%] border"
          >
            <Text
              style={{
                color: theme.accent,
                borderColor: theme.border,
              }}
              className="text-center font-bold text-lg p-4 border-b capitalize"
            >
              Select {modalType}
            </Text>
            <FlatList
              data={modalType === "class" ? ALL_CLASSES : availableSubjects}
              keyExtractor={(i) => i}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    if (modalType === "class") {
                      setTempClass(item);
                    } else {
                      setTempSubject(item);
                    }
                    setModalType(null);
                  }}
                  style={{ borderColor: theme.border }}
                  className="p-4 border-b items-center"
                >
                  <Text
                    style={{ color: theme.textPrimary }}
                    className="font-bold text-lg"
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              onPress={() => setModalType(null)}
              style={{ backgroundColor: theme.bgPrimary }}
              className="p-4 items-center rounded-b-xl"
            >
              <Text style={{ color: theme.errorBright }} className="font-bold">
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default TeacherSignUp;
