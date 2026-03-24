import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Linking,
  Modal,
  Image,
  ScrollView,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../../context/ThemeContext";
import ScreenWrapper from "../../components/ScreenWrapper";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "@react-native-firebase/firestore";
import { auth, db } from "../../config/firebaseConfig";
import CustomToast from "../../components/CustomToast";

const TeacherMyStudents = () => {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const [loading, setLoading] = useState(true);

  
  const [allStudents, setAllStudents] = useState([]);
  const [assignedClasses, setAssignedClasses] = useState([]);

  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilterClass, setSelectedFilterClass] = useState("All");

  
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [toast, setToast] = useState({
    visible: false,
    msg: "",
    type: "success",
  });

  const showToast = (msg, type = "success") =>
    setToast({ visible: true, msg, type });

  
  useEffect(() => {
    const init = async () => {
      try {
        const uid = auth.currentUser?.uid;
        if (!uid) return;

        const teacherDocRef = doc(db, "users", uid);
        const teacherDoc = await getDoc(teacherDocRef);
        if (!teacherDoc.exists()) return;

        const data = teacherDoc.data();
        let currentTeachingProfile = data.teachingProfile || [];

        
        if (currentTeachingProfile.length === 0) {
          const classes = data.classesTaught || [];
          const subjects = data.subjects || [];
          currentTeachingProfile = classes.flatMap((c) =>
            subjects.map((s) => ({ class: c, subject: s })),
          );
        }

        const classesToFetch = [
          ...new Set(currentTeachingProfile.map((p) => p.class)),
        ];

        setAssignedClasses(classesToFetch.sort());

        if (classesToFetch.length > 0) {
          const q = query(
            collection(db, "users"),
            where("role", "==", "student"),
            where("standard", "in", classesToFetch),
            where("verified", "==", true),
          );

          const studentSnap = await getDocs(q);
          let list = studentSnap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          list = list.filter((student) => {
            const studentSubjects = student.enrolledSubjects || [];
            if (!Array.isArray(studentSubjects) || studentSubjects.length === 0)
              return false;

            return currentTeachingProfile.some((profile) => {
              const matchesClass = student.standard === profile.class;
              const matchesSubject =
                studentSubjects.includes(profile.subject) ||
                studentSubjects.includes("All Subjects");

              return matchesClass && matchesSubject;
            });
          });

          list.sort((a, b) => a.name.localeCompare(b.name));
          setAllStudents(list);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.log("Init Error:", error);
        showToast("Error loading students", "error");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  
  const filteredStudents = useMemo(() => {
    return allStudents.filter((s) => {
      const lowerQuery = searchQuery.toLowerCase();
      const matchesSearch =
        s.name?.toLowerCase().includes(lowerQuery) ||
        s.phone?.includes(lowerQuery);

      const matchesClass =
        selectedFilterClass === "All" || s.standard === selectedFilterClass;

      return matchesSearch && matchesClass;
    });
  }, [searchQuery, allStudents, selectedFilterClass]);

  const handleCall = (phone) => {
    if (phone) Linking.openURL(`tel:${phone}`);
    else showToast("No phone number available", "error");
  };

  const openProfile = (student) => {
    setSelectedStudent(student);
    setDetailModalVisible(true);
  };

  const renderStudent = ({ item }) => (
    <TouchableOpacity
      style={{
        backgroundColor: theme.bgSecondary,
        borderColor: theme.border,
      }}
      className="p-3 rounded-2xl mb-3 flex-row items-center border shadow-sm"
      onPress={() => openProfile(item)}
    >
      <View className="mr-3">
        {item.profileImage ? (
          <Image
            source={{ uri: item.profileImage }}
            style={{ borderColor: theme.accent }}
            className="w-14 h-14 rounded-full border-2"
          />
        ) : (
          <View
            style={{
              backgroundColor: theme.accentSoft20,
              borderColor: theme.accentSoft50,
            }}
            className="w-14 h-14 rounded-full items-center justify-center border"
          >
            <Text style={{ color: theme.accent }} className="font-bold text-xl">
              {item.name?.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      <View className="flex-1">
        <Text
          style={{ color: theme.textPrimary }}
          className="font-bold text-lg"
          numberOfLines={1}
        >
          {item.name}
        </Text>
        <Text style={{ color: theme.textSecondary }} className="text-xs">
          Class {item.standard}{" "}
          {item.stream !== "N/A" && item.stream ? `• ${item.stream}` : ""}
        </Text>
      </View>

      <TouchableOpacity
        onPress={() => handleCall(item.phone)}
        style={{ backgroundColor: theme.infoSoft }}
        className="p-3 rounded-xl"
      >
        <Ionicons name="call" size={20} color={theme.infoBright} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <ScreenWrapper scrollable={false} edges={["left", "right", "bottom"]}>
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

      <View className="px-4 pt-4 mb-3">
        <View
          style={{
            backgroundColor: theme.bgSecondary,
            borderColor: theme.border,
          }}
          className="flex-row items-center rounded-xl px-4 border h-12"
        >
          <Ionicons name="search" size={20} color={theme.textMuted} />
          <TextInput
            placeholder="Search roster..."
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{ color: theme.textPrimary }}
            className="flex-1 ml-3 font-medium"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View className="mb-4">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        >
          {["All", ...assignedClasses].map((cls) => (
            <TouchableOpacity
              key={cls}
              onPress={() => setSelectedFilterClass(cls)}
              style={{
                backgroundColor:
                  selectedFilterClass === cls
                    ? theme.accent
                    : theme.bgSecondary,
                borderColor:
                  selectedFilterClass === cls ? theme.accent : theme.border,
              }}
              className="px-5 py-2 rounded-full border mr-2"
            >
              <Text
                style={{
                  color:
                    selectedFilterClass === cls
                      ? theme.textDark
                      : theme.textSecondary,
                  fontWeight: "bold",
                  fontSize: 12,
                }}
              >
                {cls === "All" ? "All" : `${cls}`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={theme.accent}
          className="mt-10"
        />
      ) : (
        <FlatList
          data={filteredStudents}
          keyExtractor={(item) => item.id}
          renderItem={renderStudent}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 50 }}
          ListEmptyComponent={
            <View className="mt-20 items-center opacity-30">
              <MaterialCommunityIcons
                name="account-search"
                size={60}
                color={theme.textMuted}
              />
              <Text
                style={{ color: theme.textMuted }}
                className="mt-4 font-medium"
              >
                No students found.
              </Text>
            </View>
          }
        />
      )}

      <Modal
        visible={detailModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View
          style={{ backgroundColor: theme.blackSoft80 }}
          className="flex-1 justify-center p-6"
        >
          <View
            style={{
              backgroundColor: theme.bgSecondary,
              borderColor: theme.border,
            }}
            className="rounded-2xl p-6 relative border shadow-2xl"
          >
            <TouchableOpacity
              onPress={() => setDetailModalVisible(false)}
              className="absolute top-4 right-4 z-10"
            >
              <Ionicons name="close" size={24} color={theme.textMuted} />
            </TouchableOpacity>

            <View className="items-center mb-6">
              {selectedStudent?.profileImage ? (
                <Image
                  source={{ uri: selectedStudent.profileImage }}
                  style={{ borderColor: theme.accent }}
                  className="w-20 h-20 rounded-full border-2 mb-4"
                />
              ) : (
                <View
                  style={{ backgroundColor: theme.accent }}
                  className="w-20 h-20 rounded-full items-center justify-center mb-4"
                >
                  <Text
                    style={{ color: theme.textDark }}
                    className="text-3xl font-bold"
                  >
                    {selectedStudent?.name?.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text
                style={{ color: theme.textPrimary }}
                className="text-2xl font-bold text-center"
              >
                {selectedStudent?.name}
              </Text>
              <Text style={{ color: theme.textSecondary }}>
                {selectedStudent?.phone}
              </Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View
                style={{
                  backgroundColor: theme.bgPrimary,
                  borderColor: theme.border,
                }}
                className="p-4 rounded-xl mb-4 border"
              >
                <Text
                  style={{ color: theme.textSecondary }}
                  className="text-xs uppercase mb-2 font-bold tracking-widest"
                >
                  Academic Details
                </Text>
                <View className="flex-row justify-between mb-2">
                  <Text style={{ color: theme.textPrimary }}>Standard</Text>
                  <Text style={{ color: theme.accent }} className="font-bold">
                    {selectedStudent?.standard}
                  </Text>
                </View>
                {selectedStudent?.stream &&
                  selectedStudent?.stream !== "N/A" && (
                    <View className="flex-row justify-between mb-2">
                      <Text style={{ color: theme.textPrimary }}>Stream</Text>
                      <Text
                        style={{ color: theme.textPrimary }}
                        className="font-bold"
                      >
                        {selectedStudent?.stream}
                      </Text>
                    </View>
                  )}
                <View
                  style={{ borderTopColor: theme.border, borderTopWidth: 1 }}
                  className="mt-2 pt-2"
                >
                  <Text
                    style={{ color: theme.textPrimary }}
                    className="text-sm leading-5"
                  >
                    {selectedStudent?.enrolledSubjects?.join(", ")}
                  </Text>
                </View>
              </View>

              <View
                style={{
                  backgroundColor: theme.bgPrimary,
                  borderColor: theme.border,
                }}
                className="p-4 rounded-xl border"
              >
                <Text
                  style={{ color: theme.textSecondary }}
                  className="text-xs uppercase mb-1 font-bold tracking-widest"
                >
                  Fee Status
                </Text>
                <Text
                  style={{ color: theme.successBright }}
                  className="text-2xl font-bold"
                >
                  ₹ {selectedStudent?.monthlyFeeAmount || "0"}
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
};

export default TeacherMyStudents;
