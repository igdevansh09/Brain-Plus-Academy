import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
  Image,
  Animated,
  PanResponder,
  Dimensions,
  Linking,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import BannerCarousel from "../../components/BannerCarousel";
import NoticeCard from "../../components/NoticeCard";
import { useAuth } from "../../context/AuthContext";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  limit,
} from "@react-native-firebase/firestore";
import {
  ref,
  getDownloadURL,
  putFile,
  deleteObject,
} from "@react-native-firebase/storage";
import { auth, db, storage } from "../../config/firebaseConfig";

import * as ImagePicker from "expo-image-picker";

import CustomAlert from "../../components/CustomAlert";
import CustomAlert2 from "../../components/CustomAlert2";
import CustomToast from "../../components/CustomToast";
import SecuritySettingsModal from "../../components/SecuritySettingsModal"; 
import { useTheme } from "../../context/ThemeContext";

const { height } = Dimensions.get("window");

const StudentDashboard = () => {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { logout } = useAuth();

  const [studentData, setStudentData] = useState(null);
  const [myTeachers, setMyTeachers] = useState([]); 
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [totalDue, setTotalDue] = useState(0);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [securityModalVisible, setSecurityModalVisible] = useState(false); 

  const [logoutAlertVisible, setLogoutAlertVisible] = useState(false);
  const [toast, setToast] = useState({
    visible: false,
    msg: "",
    type: "success",
  });

  const [readOnlyVisible, setReadOnlyVisible] = useState(false);
  const [selectedContent, setSelectedContent] = useState({
    title: "",
    message: "",
    imageUrl: null,
    mediaType: "image", 
  });

  const showToast = (msg, type = "success") => {
    setToast({ visible: true, msg, type });
  };

  
  const pan = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 5;
      },
      onPanResponderMove: Animated.event([null, { dy: pan }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (e, gestureState) => {
        if (gestureState.dy > 150) {
          setProfileModalVisible(false);
        } else {
          Animated.spring(pan, {
            toValue: 0,
            useNativeDriver: false,
            bounciness: 10,
          }).start();
        }
      },
    }),
  ).current;

  useEffect(() => {
    if (profileModalVisible) {
      pan.setValue(0);
    }
  }, [profileModalVisible]);

  
  const fetchData = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        let currentStandard = "";
        let enrolledSubjects = [];

        if (userDoc.exists()) {
          const data = userDoc.data();
          setStudentData(data);
          currentStandard = data.standard;
          enrolledSubjects = data.enrolledSubjects || [];
        }

        
        if (currentStandard) {
          try {
            const qTeachers = query(
              collection(db, "users"),
              where("role", "==", "teacher"),
              where("verified", "==", true),
            );
            const teacherSnap = await getDocs(qTeachers);
            const relevantTeachers = [];

            teacherSnap.forEach((doc) => {
              const tData = doc.data();
              let tp = tData.teachingProfile || [];

              
              if (tp.length === 0 && tData.classesTaught) {
                const classes = tData.classesTaught || [];
                const subjects = tData.subjects || [];
                tp = classes.flatMap((c) =>
                  subjects.map((s) => ({ class: c, subject: s })),
                );
              }

              
              const matchedSubjects = tp
                .filter((p) => {
                  const matchClass = p.class === currentStandard;
                  const matchSub =
                    enrolledSubjects.includes(p.subject) ||
                    enrolledSubjects.includes("All Subjects") ||
                    p.subject === "All Subjects";
                  return matchClass && matchSub;
                })
                .map((p) => p.subject);

              if (matchedSubjects.length > 0) {
                relevantTeachers.push({
                  id: doc.id,
                  ...tData,
                  matchedSubjects: [...new Set(matchedSubjects)], 
                });
              }
            });

            setMyTeachers(relevantTeachers);
          } catch (e) {
            console.log("Failed to fetch teachers:", e);
          }
        }

        
        const globalSnap = await getDocs(collection(db, "notices"));
        const globalList = globalSnap.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
            tag: "Global",
            author: doc.data().author || "Admin",
          }))
          .filter((notice) => notice.audience !== "teachers");

        let classList = [];
        if (currentStandard) {
          const qClass = query(
            collection(db, "class_notices"),
            where("classId", "==", currentStandard),
          );
          const classSnap = await getDocs(qClass);

          classList = classSnap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            tag: "Class",
            author: doc.data().teacherName || "Teacher",
          }));
        }

        let combined = [...globalList, ...classList];

        if (combined.length > 0) {
          const enriched = await Promise.all(
            combined.map(async (item) => {
              try {
                if (item.tag === "Global" && !item.teacherId) {
                  const qAdmin = query(
                    collection(db, "users"),
                    where("role", "==", "admin"),
                    limit(1),
                  );
                  const adminSnap = await getDocs(qAdmin);
                  if (!adminSnap.empty) {
                    const adminData = adminSnap.docs[0].data();
                    return {
                      ...item,
                      author: adminData.name || "Admin",
                      authorImage: adminData.profileImage || null,
                    };
                  }
                  return { ...item, authorImage: null };
                }

                const authorId = item.teacherId || item.authorId || null;
                if (authorId) {
                  const authorDocRef = doc(db, "users", authorId);
                  const userDocSnap = await getDoc(authorDocRef);
                  if (userDocSnap.exists()) {
                    const u = userDocSnap.data();
                    return {
                      ...item,
                      author: u.name || item.author,
                      authorImage: u.profileImage || null,
                    };
                  }
                }
              } catch (e) {
                console.log("Failed to fetch author image", e);
              }
              return { ...item, authorImage: null };
            }),
          );
          combined = enriched;
        }

        combined.sort((a, b) => {
          const dateA = a.createdAt?.toDate
            ? a.createdAt.toDate()
            : new Date(a.createdAt || 0);
          const dateB = b.createdAt?.toDate
            ? b.createdAt.toDate()
            : new Date(b.createdAt || 0);
          return dateB - dateA;
        });
        setNotices(combined);

        
        const qFees = query(
          collection(db, "fees"),
          where("studentId", "==", user.uid),
        );
        const feesSnap = await getDocs(qFees);
        const pending = feesSnap.docs.filter(
          (d) => d.data().status === "Pending",
        );
        const total = pending.reduce(
          (sum, fee) => sum + Number(fee.data().amount),
          0,
        );
        setTotalDue(total);
      }
    } catch (error) {
      console.log("Error:", error);
    }
  };

  useEffect(() => {
    const load = async () => {
      await fetchData();
      setLoading(false);
    };
    load();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, []);

  const handleCall = (phone) => {
    if (phone) Linking.openURL(`tel:${phone}`);
    else showToast("Phone number unavailable", "error");
  };

  
  const handleUpdateAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets[0].uri) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      showToast("Error picking image", "error");
    }
  };

  const uploadImage = async (newUri) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    setUploading(true);
    try {
      if (studentData?.profileImage) {
        try {
          const oldUrl = studentData.profileImage;
          const pathStartIndex = oldUrl.indexOf("/o/") + 3;
          const pathEndIndex = oldUrl.indexOf("?");
          if (pathStartIndex > 2 && pathEndIndex > -1) {
            const decodedPath = decodeURIComponent(
              oldUrl.substring(pathStartIndex, pathEndIndex),
            );
            await deleteObject(ref(storage, decodedPath));
          }
        } catch (err) {
          console.warn("Old photo cleanup failed.");
        }
      }

      const filename = `profile_pictures/${uid}/${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);
      await putFile(storageRef, newUri);
      const url = await getDownloadURL(storageRef);

      await updateDoc(doc(db, "users", uid), { profileImage: url });
      setStudentData((prev) => ({ ...prev, profileImage: url }));
      showToast("Profile picture updated!", "success");
    } catch (error) {
      showToast("Upload failed", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !studentData?.profileImage) return;

    setUploading(true);
    try {
      const oldUrl = studentData.profileImage;
      const pathStartIndex = oldUrl.indexOf("/o/") + 3;
      const pathEndIndex = oldUrl.indexOf("?");
      if (pathStartIndex > 2 && pathEndIndex > -1) {
        const decodedPath = decodeURIComponent(
          oldUrl.substring(pathStartIndex, pathEndIndex),
        );
        await deleteObject(ref(storage, decodedPath));
      }

      await updateDoc(doc(db, "users", uid), { profileImage: null });
      setStudentData((prev) => ({ ...prev, profileImage: null }));
      showToast("Profile photo removed", "success");
    } catch (error) {
      showToast("Failed to remove photo", "error");
    } finally {
      setUploading(false);
    }
  };

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const confirmLogout = async () => {
    
    setIsLoggingOut(true);
    try {
      await logout();
      
    } catch (e) {
      setIsLoggingOut(false);
      setLogoutAlertVisible(false); 
      showToast(e.message, "error");
    }
  };

  const handlePress = (item) => {
    setSelectedContent({
      title: item.title || "Notice",
      message:
        item.content || item.message || "No additional details provided.",
      imageUrl: item.imageUrl || null,
      mediaType: item.mediaType || "image", 
    });
    setReadOnlyVisible(true);
  };

  const quickAccess = [
    {
      id: "1",
      name: "Attendance",
      icon: "calendar",
      route: "/attendancescreen",
    },
    { id: "2", name: "Homework", icon: "book", route: "/homeworkscreen" },
    { id: "3", name: "My Courses", icon: "library-outline", route: "/courses" },
    { id: "4", name: "Test Scores", icon: "bar-chart", route: "/testscores" },
    {
      id: "5",
      name: "Submit Leave",
      icon: "document-text",
      route: "/submitleaves",
    },
    { id: "6", name: "Class Notes", icon: "pencil", route: "/classnotes" },
  ];

  if (loading) {
    return (
      <SafeAreaView
        style={{ backgroundColor: theme.bgPrimary }}
        className="flex-1 justify-center items-center"
      >
        <ActivityIndicator size="large" color={theme.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgPrimary }}>
      <StatusBar
        backgroundColor={theme.bgPrimary}
        barStyle={isDark ? "light-content" : "dark-content"}
      />

      <CustomToast
        visible={toast.visible}
        message={toast.msg}
        type={toast.type}
        onHide={() => setToast({ ...toast, visible: false })}
      />
      <CustomAlert
        visible={logoutAlertVisible}
        title="Sign Out"
        message="Are you sure you want to sign out?"
        confirmText="Sign Out"
        cancelText="Cancel"
        isLoading={isLoggingOut} 
        onCancel={() => {
          if (!isLoggingOut) setLogoutAlertVisible(false); 
        }}
        onConfirm={confirmLogout}
      />
      <CustomAlert2
        visible={readOnlyVisible}
        title={selectedContent.title}
        message={selectedContent.message}
        imageUrl={selectedContent.imageUrl}
        mediaType={selectedContent.mediaType}
        onClose={() => setReadOnlyVisible(false)}
      />
      {}
      <SecuritySettingsModal
        visible={securityModalVisible}
        onClose={() => setSecurityModalVisible(false)}
        showToast={showToast}
      />

      {}
      <Modal
        visible={profileModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <View
          style={{ backgroundColor: theme.blackSoft60 }}
          className="flex-1 justify-end"
        >
          <TouchableOpacity
            className="flex-1"
            onPress={() => setProfileModalVisible(false)}
          />
          <Animated.View
            style={{
              transform: [
                {
                  translateY: pan.interpolate({
                    inputRange: [0, height],
                    outputRange: [0, height],
                    extrapolate: "clamp",
                  }),
                },
              ],
              backgroundColor: theme.bgPrimary,
            }}
            className="w-full h-[85%] rounded-t-3xl overflow-hidden shadow-2xl relative"
          >
            <View
              {...panResponder.panHandlers}
              style={{ backgroundColor: theme.accentSoft20 }}
              className="h-32 w-full relative"
            >
              <View className="absolute top-3 left-0 right-0 items-center z-30">
                <View
                  style={{ backgroundColor: theme.white }}
                  className="w-12 h-1.5 opacity-30 rounded-full"
                />
              </View>
            </View>

            <View className="px-6 -mt-16 mb-4 flex-row justify-between items-end">
              <View className="relative">
                <View
                  style={{
                    borderColor: theme.bgPrimary,
                    backgroundColor: theme.bgSecondary,
                  }}
                  className="w-32 h-32 rounded-full border-4 items-center justify-center overflow-hidden"
                >
                  {studentData?.profileImage ? (
                    <Image
                      source={{ uri: studentData.profileImage }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <Text
                      style={{ color: theme.accent }}
                      className="font-bold text-5xl"
                    >
                      {studentData?.name
                        ? studentData.name.charAt(0).toUpperCase()
                        : "S"}
                    </Text>
                  )}
                </View>

                <View className="flex-row mt-2 gap-2 justify-center w-32">
                  {uploading ? (
                    <ActivityIndicator size="small" color={theme.accent} />
                  ) : (
                    <>
                      <TouchableOpacity
                        onPress={handleUpdateAvatar}
                        style={{
                          backgroundColor: theme.bgSecondary,
                          borderColor: theme.border,
                        }}
                        className="p-2 rounded-full border shadow-sm"
                      >
                        <Ionicons
                          name="camera"
                          size={16}
                          color={theme.textPrimary}
                        />
                      </TouchableOpacity>
                      {studentData?.profileImage && (
                        <TouchableOpacity
                          onPress={handleRemoveAvatar}
                          style={{
                            backgroundColor: theme.errorSoft,
                            borderColor: theme.errorSoft,
                          }}
                          className="p-2 rounded-full border shadow-sm"
                        >
                          <Ionicons
                            name="trash"
                            size={16}
                            color={theme.error}
                          />
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setSecurityModalVisible(true)}
                style={{
                  backgroundColor: theme.bgSecondary,
                  borderColor: theme.border,
                }}
                className="px-4 py-2 rounded-full border mb-4 flex-row items-center"
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={14}
                  color={theme.accent}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={{ color: theme.textPrimary }}
                  className="font-bold text-xs uppercase tracking-wide"
                >
                  Security Settings
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              className="flex-1 px-6 mt-4"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              <View className="mb-6">
                <Text
                  style={{ color: theme.textPrimary }}
                  className="text-3xl font-bold"
                >
                  {studentData?.name || "Student Name"}
                </Text>
                <Text style={{ color: theme.accent }} className="text-sm mt-1">
                  {studentData?.phone || "No phone linked"}
                </Text>
              </View>

              <View className="flex-row justify-between mb-6">
                <View
                  style={{
                    backgroundColor: theme.bgSecondary,
                    borderColor: theme.border,
                  }}
                  className="p-4 rounded-2xl flex-1 mr-3 border items-center"
                >
                  <Text
                    style={{ color: theme.textMuted }}
                    className="text-xs font-bold uppercase mb-1"
                  >
                    Standard
                  </Text>
                  <Text
                    style={{ color: theme.textPrimary }}
                    className="text-xl font-bold"
                  >
                    {studentData?.standard || "N/A"}
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: theme.bgSecondary,
                    borderColor: theme.border,
                  }}
                  className="p-4 rounded-2xl flex-1 ml-3 border items-center"
                >
                  <Text
                    style={{ color: theme.textMuted }}
                    className="text-xs font-bold uppercase mb-1"
                  >
                    Stream
                  </Text>
                  <Text
                    style={{ color: theme.accent }}
                    className="text-xl font-bold"
                  >
                    {studentData?.stream || "N/A"}
                  </Text>
                </View>
              </View>

              <Text
                style={{
                  color: theme.textSecondary,
                  borderColor: theme.border,
                }}
                className="font-bold text-lg mb-4 border-b pb-2"
              >
                Enrolled Subjects
              </Text>
              <View className="mb-6 flex-row flex-wrap gap-2">
                {studentData?.enrolledSubjects &&
                studentData.enrolledSubjects.length > 0 ? (
                  studentData.enrolledSubjects.map((subject, index) => (
                    <View
                      key={index}
                      style={{
                        backgroundColor: theme.bgSecondary,
                        borderColor: theme.border,
                      }}
                      className="flex-row items-center px-3 py-2 rounded-lg border"
                    >
                      <Ionicons
                        name="book"
                        size={14}
                        color={theme.accent}
                        className="mr-2"
                      />
                      <Text
                        style={{ color: theme.textPrimary }}
                        className="font-semibold"
                      >
                        {subject}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={{ color: theme.textMuted }} className="italic">
                    No subjects enrolled yet.
                  </Text>
                )}
              </View>

              <Text
                style={{
                  color: theme.textSecondary,
                  borderColor: theme.border,
                }}
                className="font-bold text-lg mb-4 border-b pb-2"
              >
                My Teachers
              </Text>
              <View className="mb-4">
                {myTeachers.length > 0 ? (
                  myTeachers.map((teacher, idx) => (
                    <View
                      key={idx}
                      style={{
                        backgroundColor: theme.bgSecondary,
                        borderColor: theme.border,
                      }}
                      className="flex-row items-center p-3 rounded-xl mb-3 border shadow-sm"
                    >
                      <View className="mr-3">
                        {teacher.profileImage ? (
                          <Image
                            source={{ uri: teacher.profileImage }}
                            style={{ borderColor: theme.accent }}
                            className="w-12 h-12 rounded-full border"
                          />
                        ) : (
                          <View
                            style={{
                              backgroundColor: theme.accentSoft20,
                              borderColor: theme.accentSoft50,
                            }}
                            className="w-12 h-12 rounded-full items-center justify-center border"
                          >
                            <Text
                              style={{ color: theme.accent }}
                              className="font-bold text-lg"
                            >
                              {teacher.name?.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View className="flex-1">
                        <Text
                          style={{ color: theme.textPrimary }}
                          className="font-bold text-base"
                          numberOfLines={1}
                        >
                          {teacher.name}
                        </Text>
                        <Text
                          style={{ color: theme.textSecondary }}
                          className="text-xs"
                          numberOfLines={1}
                        >
                          {teacher.matchedSubjects.join(", ")}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleCall(teacher.phone)}
                        style={{ backgroundColor: theme.infoSoft }}
                        className="p-2 rounded-lg ml-2"
                      >
                        <Ionicons
                          name="call"
                          size={18}
                          color={theme.infoBright}
                        />
                      </TouchableOpacity>
                    </View>
                  ))
                ) : (
                  <View className="items-center py-4">
                    <MaterialCommunityIcons
                      name="account-cancel-outline"
                      size={40}
                      color={theme.textMuted}
                    />
                    <Text
                      style={{ color: theme.textMuted }}
                      className="italic mt-2"
                    >
                      No teachers assigned to your class yet.
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      <ScrollView
        className="flex-1 px-4 py-7"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.accent}
            colors={[theme.accent]}
          />
        }
      >
        <View className="flex-row items-center mb-5">
          <TouchableOpacity onPress={() => setProfileModalVisible(true)}>
            <View
              style={{
                borderColor: theme.accent,
                backgroundColor: theme.bgSecondary,
              }}
              className="w-14 h-14 rounded-full mr-3 items-center justify-center border-2 overflow-hidden"
            >
              {studentData?.profileImage ? (
                <Image
                  source={{ uri: studentData.profileImage }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <Text
                  style={{ color: theme.textPrimary }}
                  className="text-lg font-bold"
                >
                  {studentData?.name ? studentData.name.charAt(0) : "S"}
                </Text>
              )}
            </View>
          </TouchableOpacity>

          <View className="flex-1">
            <Text
              style={{ color: theme.textPrimary }}
              className="text-2xl font-bold"
            >
              {studentData?.name || "Student"}
            </Text>
          </View>

          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() =>
                Linking.openURL("https://youtube.com/@brainplusacademyy")
              }
              className="mr-4"
            >
              <Ionicons name="logo-youtube" size={28} color="#FF0000" />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setLogoutAlertVisible(true)}>
              <Ionicons name="log-out-outline" size={28} color={theme.accent} />
            </TouchableOpacity>
          </View>
        </View>

        <Text
          style={{ color: theme.accent }}
          className="text-2xl font-bold mb-5"
        >
          Welcome Back!
        </Text>
        <BannerCarousel />

        <View className="mb-5">
          <Text
            style={{ color: theme.accent }}
            className="text-lg font-semibold mb-2"
          >
            Total Pending Fee
          </Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/studentfees")}
            style={{
              backgroundColor: theme.bgSecondary,
              borderColor: theme.accent,
            }}
            className="flex-row justify-between items-center rounded-xl p-4 border"
          >
            <View>
              <Text style={{ color: theme.textSecondary }}>Due Amount</Text>
              <Text
                style={{ color: theme.textPrimary }}
                className="text-2xl font-bold mt-1"
              >
                ₹{totalDue}
              </Text>
            </View>
            <View
              style={{ backgroundColor: theme.accent }}
              className="rounded-lg px-4 py-2"
            >
              <Text style={{ color: theme.textDark }} className="font-bold">
                Fee History
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View className="mb-5">
          <Text
            style={{ color: theme.accent }}
            className="text-lg font-semibold mb-2"
          >
            Quick Access
          </Text>
          <View className="flex-row flex-wrap justify-between">
            {quickAccess.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => router.push(item.route)}
                activeOpacity={0.8}
                style={{
                  backgroundColor: theme.bgSecondary,
                  shadowColor: theme.shadow,
                }}
                className="w-[30%] rounded-xl py-5 items-center mb-3 shadow-sm"
              >
                <Ionicons name={item.icon} size={26} color={theme.accent} />
                <Text
                  style={{ color: theme.textPrimary }}
                  className="mt-2 text-xs text-center"
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View className="mb-8">
          <Text
            style={{ color: theme.accent }}
            className="text-lg font-semibold mb-2"
          >
            Coaching/Class Updates
          </Text>
          {notices.length === 0 ? (
            <Text style={{ color: theme.textMuted }} className="italic">
              No new notices.
            </Text>
          ) : (
            notices.map((item) => (
              <NoticeCard key={item.id} item={item} onPress={handlePress} />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default StudentDashboard;
