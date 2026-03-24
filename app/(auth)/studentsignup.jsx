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

import { createUserWithEmailAndPassword, signOut } from "@react-native-firebase/auth";
import { doc, setDoc, serverTimestamp } from "@react-native-firebase/firestore";
import { auth, db } from "../../config/firebaseConfig";

import CustomToast from "../../components/CustomToast";
import { useTheme } from "../../context/ThemeContext";


const CLASSES = [
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
const STREAMS = ["Science", "Commerce", "Arts"];

const SUB_GENERAL = ["English", "Hindi", "Maths", "Science", "Social Science"];
const SUB_SCIENCE = [
  "Physics",
  "Chemistry",
  "Maths",
  "Biology",
  "English",
  "CS",
];
const SUB_COMMERCE = [
  "Accounts",
  "Business Studies",
  "Economics",
  "Maths",
  "English",
  "CS"
];
const SUB_ARTS = [
  "History",
  "Geography",
  "Political Science",
  "Economics",
  "English",
  "Hindi",
  "CS"
];

const StudentSignUp = () => {
  const router = useRouter();
  const { theme, isDark } = useTheme();

  const [loading, setLoading] = useState(false);

  
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedStream, setSelectedStream] = useState(null);
  const [selectedSubjects, setSelectedSubjects] = useState([]);

  
  const [modalType, setModalType] = useState(null); 
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [isSubjectLocked, setIsSubjectLocked] = useState(false);
  const [lockMessage, setLockMessage] = useState("");

  const [toast, setToast] = useState({
    visible: false,
    msg: "",
    type: "success",
  });
  const showToast = (msg, type) => setToast({ visible: true, msg, type });

  
  useEffect(() => {
    if (!selectedClass) {
      setAvailableSubjects([]);
      setIsSubjectLocked(false);
      setLockMessage("");
      return;
    }

    if (selectedClass === "CS") {
      setIsSubjectLocked(true);
      setLockMessage("Fix Subject CS.");
      setSelectedSubjects(["CS"]);
      setSelectedStream("N/A");
    } else if (["Prep", "1st", "2nd", "3rd"].includes(selectedClass)) {
      setIsSubjectLocked(true);
      setLockMessage("Course covers All Subjects.");
      setSelectedSubjects(["All Subjects"]);
      setSelectedStream("N/A");
    } else if (
      ["4th", "5th", "6th", "7th", "8th", "9th", "10th"].includes(selectedClass)
    ) {
      setIsSubjectLocked(false);
      setLockMessage("");
      setAvailableSubjects(SUB_GENERAL);
      setSelectedStream("N/A");
      setSelectedSubjects([]);
    } else if (["11th", "12th"].includes(selectedClass)) {
      setIsSubjectLocked(false);
      setLockMessage("");
      if (selectedStream === "Science") setAvailableSubjects(SUB_SCIENCE);
      else if (selectedStream === "Commerce") setAvailableSubjects(SUB_COMMERCE);
      else if (selectedStream === "Arts") setAvailableSubjects(SUB_ARTS);
      else setAvailableSubjects([]);
      setSelectedSubjects([]);
    }
  }, [selectedClass, selectedStream]);

  const toggleSubject = (subject) => {
    if (selectedSubjects.includes(subject)) {
      setSelectedSubjects((prev) => prev.filter((s) => s !== subject));
    } else {
      setSelectedSubjects((prev) => [...prev, subject]);
    }
  };

  const handleRegister = async () => {
    Keyboard.dismiss();

    
    if (!name.trim()) return showToast("Enter Full Name", "error");
    if (!phone || phone.length !== 10)
      return showToast("Enter valid 10-digit Phone", "error");
    if (!email.trim() || !email.includes("@"))
      return showToast("Enter a valid Email", "error");
    if (password.length < 6)
      return showToast("Password must be at least 6 characters", "error");
    if (!selectedClass) return showToast("Select your Class", "error");
    if (["11th", "12th"].includes(selectedClass) && !selectedStream) {
      return showToast("Select your Stream", "error");
    }
    if (!isSubjectLocked && selectedSubjects.length === 0) {
      return showToast("Select at least one subject", "error");
    }

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

      
      await setDoc(doc(db, "users", uid), {
        name: name.trim(),
        phone: `+91${phone}`, 
        email: email.trim().toLowerCase(),
        role: "student",
        standard: selectedClass,
        stream: selectedStream || "N/A",
        enrolledSubjects: selectedSubjects,
        verified: false,
        monthlyFeeAmount: "0",
        fcmTokens: tokenArray, 
        createdAt: serverTimestamp(),
      });

      showToast("Registration Success! Wait for Admin Approval.", "success");

      
      setTimeout(async () => {
        await signOut(auth);
        router.replace("/(auth)/studentsignin");
      }, 500);
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
      
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ padding: 24, flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          <View className="flex-row items-center mb-6">
            <TouchableOpacity onPress={() => router.back()} className="mr-4">
              <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
            </TouchableOpacity>
            <Text
              style={{ color: theme.textPrimary }}
              className="text-3xl font-bold"
            >
              Student Reg.
            </Text>
          </View>

          <Text style={{ color: theme.accent }} className="mb-1 ml-1 font-semibold">
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
            placeholder="Student Name"
            placeholderTextColor={theme.textMuted}
          />

          <Text style={{ color: theme.accent }} className="mb-1 ml-1 font-semibold">
            Email Address (For Login) <Text style={{ color: theme.error }}>*</Text>
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
            placeholder="student@example.com"
            placeholderTextColor={theme.textMuted}
          />

          <Text style={{ color: theme.accent }} className="mb-1 ml-1 font-semibold">
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

          <Text style={{ color: theme.accent }} className="mb-1 ml-1 font-semibold">
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

          <Text style={{ color: theme.accent }} className="mb-1 ml-1 font-semibold">
            Class <Text style={{ color: theme.error }}>*</Text>
          </Text>
          <TouchableOpacity
            onPress={() => setModalType("class")}
            style={{
              backgroundColor: theme.bgSecondary,
              borderColor: theme.border,
            }}
            className="p-4 rounded-xl border mb-4"
          >
            <Text
              style={{
                color: selectedClass ? theme.textPrimary : theme.textMuted,
                fontWeight: selectedClass ? "bold" : "normal",
              }}
            >
              {selectedClass || "Select Class"}
            </Text>
          </TouchableOpacity>

          {["11th", "12th"].includes(selectedClass) && (
            <>
              <Text style={{ color: theme.accent }} className="mb-1 ml-1 font-semibold">
                Stream <Text style={{ color: theme.error }}>*</Text>
              </Text>
              <View className="flex-row justify-between mb-4">
                {STREAMS.map((stm) => (
                  <TouchableOpacity
                    key={stm}
                    onPress={() => setSelectedStream(stm)}
                    style={{
                      backgroundColor:
                        selectedStream === stm
                          ? theme.accent
                          : theme.bgSecondary,
                      borderColor:
                        selectedStream === stm
                          ? theme.accent
                          : theme.border,
                    }}
                    className="flex-1 p-3 rounded-xl border mr-2 items-center"
                  >
                    <Text
                      style={{
                        color:
                          selectedStream === stm
                            ? theme.textDark
                            : theme.textPrimary,
                        fontWeight: "bold",
                      }}
                    >
                      {stm}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <Text style={{ color: theme.accent }} className="mb-2 ml-1 font-semibold">
            Subjects to Enroll <Text style={{ color: theme.error }}>*</Text>
          </Text>

          {isSubjectLocked ? (
            <View
              style={{
                backgroundColor: theme.bgSecondary,
                borderColor: theme.border,
              }}
              className="p-4 rounded-xl border mb-6 opacity-80"
            >
              <Text
                style={{ color: theme.textMuted }}
                className="italic text-center"
              >
                {lockMessage}
              </Text>
            </View>
          ) : (
            <View className="flex-row flex-wrap mb-6">
              {availableSubjects.length > 0 ? (
                availableSubjects.map((sub) => {
                  const isSelected = selectedSubjects.includes(sub);
                  return (
                    <TouchableOpacity
                      key={sub}
                      onPress={() => toggleSubject(sub)}
                      style={{
                        backgroundColor: isSelected
                          ? theme.accent
                          : theme.bgSecondary,
                        borderColor: isSelected
                          ? theme.accent
                          : theme.border,
                      }}
                      className="mr-2 mb-2 px-4 py-2 rounded-full border"
                    >
                      <Text
                        style={{
                          color: isSelected
                            ? theme.textDark
                            : theme.textPrimary,
                          fontWeight: "bold",
                        }}
                      >
                        {sub}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <Text
                  style={{ color: theme.textMuted }}
                  className="italic ml-2"
                >
                  Select Class{" "}
                  {["11th", "12th"].includes(selectedClass)
                    ? "& Stream"
                    : ""}{" "}
                  first.
                </Text>
              )}
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
              className="text-center font-bold text-lg p-4 border-b"
            >
              Select Class
            </Text>
            <FlatList
              data={CLASSES}
              keyExtractor={(i) => i}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedClass(item);
                    setModalType(null);
                  }}
                  style={{ borderColor: theme.border }}
                  className="p-4 border-b items-center"
                >
                  <Text
                    style={{
                      color:
                        selectedClass === item
                          ? theme.accent
                          : theme.textPrimary,
                      fontSize: 18,
                      fontWeight: selectedClass === item ? "bold" : "normal",
                    }}
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

export default StudentSignUp;