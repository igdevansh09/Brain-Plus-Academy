import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTheme } from "../../context/ThemeContext";
import ScreenWrapper from "../../components/ScreenWrapper";

import {
  collection,
  doc,
  getDoc,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "@react-native-firebase/firestore";
import { auth, db } from "../../config/firebaseConfig";

import CustomToast from "../../components/CustomToast";
import CustomAlert from "../../components/CustomAlert";

const ApplyLeave = () => {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  
  const [studentProfile, setStudentProfile] = useState(null);
  const [history, setHistory] = useState([]);

  
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [reason, setReason] = useState("");

  
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  
  const [toast, setToast] = useState({
    visible: false,
    msg: "",
    type: "success",
  });
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: "",
    message: "",
    confirmText: "",
    type: "warning",
    onConfirm: null,
  });
  const showToast = (msg, type = "success") =>
    setToast({ visible: true, msg, type });

  
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const fetchProfile = async () => {
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setStudentProfile(docSnap.data());
      } catch (e) {
        console.log("Profile Error:", e);
      }
    };
    fetchProfile();

    const q = query(
      collection(db, "leaves"),
      where("studentId", "==", user.uid),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot) return;
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setHistory(list);
        setLoading(false);
      },
      (err) => {
        console.log("History Error:", err);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  
  const handleStartDateChange = (event, selectedDate) => {
    
    if (Platform.OS !== "ios") setShowStartPicker(false);

    
    if (event.type === "set" && selectedDate) {
      setStartDate(selectedDate);
      if (selectedDate > endDate) {
        setEndDate(selectedDate);
      }
    }
  };

  const handleEndDateChange = (event, selectedDate) => {
    if (Platform.OS !== "ios") setShowEndPicker(false);

    if (event.type === "set" && selectedDate) {
      
      const startClean = new Date(startDate).setHours(0, 0, 0, 0);
      const endClean = new Date(selectedDate).setHours(0, 0, 0, 0);

      if (endClean < startClean) {
        showToast("End date cannot be before start date", "error");
        setEndDate(startDate); 
      } else {
        setEndDate(selectedDate);
      }
    }
  };

  const formatDate = (date) => date.toLocaleDateString("en-GB");

  
  const getDuration = () => {
    
    const utcStart = Date.UTC(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate(),
    );
    const utcEnd = Date.UTC(
      endDate.getFullYear(),
      endDate.getMonth(),
      endDate.getDate(),
    );

    if (utcEnd < utcStart) return 1;

    
    const diffDays =
      Math.floor((utcEnd - utcStart) / (1000 * 60 * 60 * 24)) + 1;

    return diffDays;
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      showToast("Please provide a reason.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const user = auth.currentUser;

      
      const exactDays = getDuration();

      await addDoc(collection(db, "leaves"), {
        studentId: user.uid,
        studentName: studentProfile?.name || user.displayName || "Student",
        phone: studentProfile?.phone || "",
        standard: studentProfile?.standard || "", 
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        reason: reason.trim(),
        duration: exactDays, 
        status: "Pending",
        createdAt: serverTimestamp(),
      });

      showToast("Application submitted!", "success");
      setReason("");
      setStartDate(new Date());
      setEndDate(new Date());
    } catch (error) {
      console.error(error);
      showToast("Failed to submit request.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  
  const renderLeaveItem = ({ item }) => {
    const dateDisplay = item.createdAt?.toDate
      ? item.createdAt.toDate().toLocaleDateString("en-GB")
      : "Just Now";

    
    let statusColor = theme.infoBright;
    let statusBg = theme.infoSoft;
    let statusIcon = "time-outline";

    if (item.status === "Approved") {
      statusColor = theme.successBright;
      statusBg = theme.successSoft;
      statusIcon = "checkmark-circle-outline";
    } else if (item.status === "Rejected") {
      statusColor = theme.error;
      statusBg = theme.errorSoft;
      statusIcon = "close-circle-outline";
    }

    return (
      <View
        style={{
          backgroundColor: theme.bgSecondary,
          borderColor: theme.border,
          shadowColor: theme.shadow,
        }}
        className="p-4 rounded-2xl mb-4 border shadow-sm"
      >
        <View className="flex-row justify-between items-start mb-2">
          <View className="flex-row items-center">
            <View
              style={{ backgroundColor: statusBg }}
              className="p-2 rounded-full mr-3"
            >
              <Ionicons name={statusIcon} size={20} color={statusColor} />
            </View>
            <View>
              <Text
                style={{ color: theme.textPrimary }}
                className="font-bold text-base"
              >
                {item.status || "Pending"}
              </Text>
              <Text style={{ color: theme.textSecondary }} className="text-xs">
                Posted: {dateDisplay}
              </Text>
            </View>
          </View>
          <View className="flex-row items-center">
            <View
              style={{
                backgroundColor: theme.bgTertiary,
                borderColor: theme.border,
              }}
              className="px-3 py-1 rounded-lg border mr-2"
            >
              <Text
                style={{ color: theme.accent }}
                className="font-bold text-xs"
              >
                {item.duration || 1} Days
              </Text>
            </View>
          </View>
        </View>

        <View className="flex-row items-center my-2 pl-1">
          <Text style={{ color: theme.textPrimary }} className="font-bold">
            {item.startDate}
          </Text>
          <Ionicons
            name="arrow-forward"
            size={14}
            color={theme.textMuted}
            style={{ marginHorizontal: 8 }}
          />
          <Text style={{ color: theme.textPrimary }} className="font-bold">
            {item.endDate}
          </Text>
        </View>

        <Text
          style={{
            color: theme.textSecondary,
            borderLeftColor: theme.accent,
          }}
          className="text-sm italic mt-1 border-l-2 pl-2"
        >
          &quot;{item.reason}&quot;
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View
        style={{
          backgroundColor: theme.bgPrimary,
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <ScreenWrapper scrollable={false} edges={["left", "right", "bottom"]}>
      <CustomToast
        visible={toast.visible}
        message={toast.msg}
        type={toast.type}
        onHide={() => setToast({ ...toast, visible: false })}
      />
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        confirmText={alertConfig.confirmText}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm}
        onCancel={() => setAlertConfig((prev) => ({ ...prev, visible: false }))}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 px-5 pt-4"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              backgroundColor: theme.bgSecondary,
              borderColor: theme.border,
              shadowColor: theme.shadow,
            }}
            className="p-5 rounded-3xl border mb-8 shadow-lg"
          >
            <Text
              style={{ color: theme.accent }}
              className="text-xs font-bold uppercase mb-4 tracking-widest"
            >
              New Request
            </Text>

            <View className="flex-row justify-between mb-4">
              <View className="flex-1 mr-2">
                <Text
                  style={{ color: theme.textSecondary }}
                  className="text-xs mb-2 ml-1"
                >
                  From
                </Text>
                <TouchableOpacity
                  onPress={() => setShowStartPicker(true)}
                  style={{
                    backgroundColor: theme.bgTertiary,
                    borderColor: theme.border,
                  }}
                  className="p-3 rounded-xl border flex-row items-center"
                >
                  <Ionicons
                    name="calendar-outline"
                    size={18}
                    color={theme.accent}
                    className="mr-2"
                  />
                  <Text
                    style={{ color: theme.textPrimary }}
                    className="font-bold"
                  >
                    {formatDate(startDate)}
                  </Text>
                </TouchableOpacity>
              </View>

              <View className="flex-1 ml-2">
                <Text
                  style={{ color: theme.textSecondary }}
                  className="text-xs mb-2 ml-1"
                >
                  To
                </Text>
                <TouchableOpacity
                  onPress={() => setShowEndPicker(true)}
                  style={{
                    backgroundColor: theme.bgTertiary,
                    borderColor: theme.border,
                  }}
                  className="p-3 rounded-xl border flex-row items-center"
                >
                  <Ionicons
                    name="calendar-outline"
                    size={18}
                    color={theme.accent}
                    className="mr-2"
                  />
                  <Text
                    style={{ color: theme.textPrimary }}
                    className="font-bold"
                  >
                    {formatDate(endDate)}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text
              style={{ color: theme.textSecondary }}
              className="text-xs mb-2 ml-1"
            >
              Reason for Leave
            </Text>
            <TextInput
              placeholder="E.g. Medical emergency, Urgent work..."
              placeholderTextColor={theme.placeholder}
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={3}
              style={{
                textAlignVertical: "top",
                backgroundColor: theme.bgTertiary,
                borderColor: theme.border,
                color: theme.textPrimary,
              }}
              className="p-4 rounded-xl border mb-6 text-sm"
            />

            <View className="flex-row items-center justify-between">
              <View>
                <Text
                  style={{ color: theme.textSecondary }}
                  className="text-xs"
                >
                  Total Duration
                </Text>
                <Text
                  style={{ color: theme.textPrimary }}
                  className="font-bold text-lg"
                >
                  {getDuration()} Days
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={submitting}
                style={{
                  backgroundColor: theme.accent,
                  shadowColor: theme.shadow,
                }}
                className="py-3 px-6 rounded-xl flex-row items-center shadow-md"
              >
                {submitting ? (
                  <ActivityIndicator color={theme.textDark} size="small" />
                ) : (
                  <>
                    <Text
                      style={{ color: theme.textDark }}
                      className="font-bold mr-2"
                    >
                      Notify Teacher
                    </Text>
                    <Ionicons
                      name="paper-plane"
                      size={16}
                      color={theme.textDark}
                    />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View className="flex-row items-center mb-4">
            <MaterialCommunityIcons
              name="history"
              size={20}
              color={theme.accent}
              className="mr-2"
            />
            <Text
              style={{ color: theme.textPrimary }}
              className="font-bold text-lg"
            >
              My Applications
            </Text>
          </View>

          <FlatList
            data={history}
            keyExtractor={(item) => item.id}
            renderItem={renderLeaveItem}
            scrollEnabled={false}
            contentContainerStyle={{ paddingBottom: 100 }}
            ListEmptyComponent={() => (
              <View className="items-center py-10 opacity-30">
                <MaterialCommunityIcons
                  name="file-document-outline"
                  size={60}
                  color={theme.textMuted}
                />
                <Text style={{ color: theme.textMuted }} className="mt-2">
                  No leave applications yet.
                </Text>
              </View>
            )}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {showStartPicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display="default"
          onChange={handleStartDateChange}
          minimumDate={new Date()}
        />
      )}
      {showEndPicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display="default"
          onChange={handleEndDateChange}
          minimumDate={startDate}
        />
      )}
    </ScreenWrapper>
  );
};

export default ApplyLeave;
