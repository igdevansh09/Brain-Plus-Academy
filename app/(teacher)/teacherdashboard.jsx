import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Image,
  Dimensions,
  PanResponder,
  Animated,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import BannerCarousel from "../../components/BannerCarousel";
import { useTheme } from "../../context/ThemeContext";
import NoticeCard from "../../components/NoticeCard";
import { useAuth } from "../../context/AuthContext";

import { onAuthStateChanged } from "@react-native-firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
} from "@react-native-firebase/firestore";

import {
  ref,
  getDownloadURL,
  putFile,
  deleteObject,
} from "@react-native-firebase/storage";
import { auth, db, storage } from "../../config/firebaseConfig";


import CustomAlert from "../../components/CustomAlert";
import CustomAlert2 from "../../components/CustomAlert2";
import CustomToast from "../../components/CustomToast";
import SecuritySettingsModal from "../../components/SecuritySettingsModal"; 

const { width, height } = Dimensions.get("window");

const TeacherDashboard = () => {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { logout } = useAuth();

  
  const [teacherData, setTeacherData] = useState(null);
  const [notices, setNotices] = useState([]);
  const [pendingSalary, setPendingSalary] = useState(0);

  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [securityModalVisible, setSecurityModalVisible] = useState(false); 
  const [logoutAlertVisible, setLogoutAlertVisible] = useState(false);
  const [readOnlyVisible, setReadOnlyVisible] = useState(false);
  const [selectedContent, setSelectedContent] = useState({
    title: "",
    message: "",
    imageUrl: null,
    mediaType: "image", 
  });
  const [uploading, setUploading] = useState(false);

  
  const [toast, setToast] = useState({
    visible: false,
    msg: "",
    type: "success",
  });
  const showToast = (msg, type = "success") =>
    setToast({ visible: true, msg, type });

  
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
      onPanResponderRelease: (_, gestureState) => {
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

  const getClassIcon = (className) => {
    const lower = className ? className.toLowerCase() : "";
    if (lower.includes("cs") || lower.includes("comp")) return "laptop-outline";
    if (lower.includes("prep")) return "shapes-outline";
    if (lower.includes("11") || lower.includes("12")) return "school-outline";
    if (lower.includes("10") || lower.includes("9")) return "library-outline";
    return "book-outline";
  };

  
  const fetchData = async (uid) => {
    try {
      
      const teacherDocRef = doc(db, "users", uid);
      const userDoc = await getDoc(teacherDocRef);
      if (userDoc.exists()) {
        setTeacherData(userDoc.data());
      }

      
      const qSalary = query(
        collection(db, "salaries"),
        where("teacherId", "==", uid),
        where("status", "==", "Pending"),
      );
      const salarySnap = await getDocs(qSalary);

      let total = 0;
      salarySnap.forEach((doc) => {
        total += parseInt(doc.data().amount || 0);
      });
      setPendingSalary(total);

      
      const qNotices = query(
        collection(db, "notices"),
        orderBy("createdAt", "desc"),
      );
      const noticesSnap = await getDocs(qNotices);

      let noticesList = noticesSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        tag: "Global", 
      }));

      
      if (noticesList.length > 0) {
        const enriched = await Promise.all(
          noticesList.map(async (item) => {
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
              }
            } catch (e) {
              console.log("Failed to fetch admin image", e);
            }
            return { ...item, author: "Admin", authorImage: null };
          }),
        );
        noticesList = enriched;
      }

      setNotices(noticesList);
    } catch (error) {
      console.log("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const current = auth.currentUser;
    if (current) fetchData(current.uid);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchData(user.uid);
      }
    });

    return () => unsubscribe();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const user = auth.currentUser;
    if (user) await fetchData(user.uid);
    setRefreshing(false);
  }, []);

  
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
      
      if (teacherData?.profileImage) {
        try {
          const oldUrl = teacherData.profileImage;
          const pathStartIndex = oldUrl.indexOf("/o/") + 3;
          const pathEndIndex = oldUrl.indexOf("?");

          if (pathStartIndex > 2 && pathEndIndex > -1) {
            const rawPath = oldUrl.substring(pathStartIndex, pathEndIndex);
            const decodedPath = decodeURIComponent(rawPath);
            const oldFileRef = ref(storage, decodedPath);
            await deleteObject(oldFileRef);
            console.log("Previous profile photo purged.");
          }
        } catch (err) {
          console.warn("Old photo cleanup failed (maybe already gone).");
        }
      }

      
      const filename = `profile_pictures/${uid}/${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);
      await putFile(storageRef, newUri);
      const url = await getDownloadURL(storageRef);

      
      await updateDoc(doc(db, "users", uid), { profileImage: url });

      setTeacherData((prev) => ({ ...prev, profileImage: url }));
      showToast("Profile picture updated!", "success");
    } catch (error) {
      console.error(error);
      showToast("Upload failed", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !teacherData?.profileImage) return;

    setUploading(true);
    try {
      
      const oldUrl = teacherData.profileImage;
      const pathStartIndex = oldUrl.indexOf("/o/") + 3;
      const pathEndIndex = oldUrl.indexOf("?");

      if (pathStartIndex > 2 && pathEndIndex > -1) {
        const decodedPath = decodeURIComponent(
          oldUrl.substring(pathStartIndex, pathEndIndex),
        );
        await deleteObject(ref(storage, decodedPath));
      }

      
      await updateDoc(doc(db, "users", uid), { profileImage: null });

      setTeacherData((prev) => ({ ...prev, profileImage: null }));
      showToast("Profile photo removed", "success");
    } catch (error) {
      showToast("Failed to remove photo", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleLogoutPress = () => setLogoutAlertVisible(true);

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

  const getTotalClasses = () => {
    if (teacherData?.teachingProfile) return teacherData.teachingProfile.length;
    if (teacherData?.classesTaught) return teacherData.classesTaught.length;
    return 0;
  };

  const handlePressNotice = (item) => {
    setSelectedContent({
      title: item.title || "Notice",
      message: item.content || item.message || "",
      imageUrl: item.imageUrl || null,
      mediaType: item.mediaType || "image", 
    });
    setReadOnlyVisible(true);
  };

  const quickAccess = [
    {
      id: "1",
      name: "Attendance",
      icon: "checkmark-circle-outline",
      route: "/(teacher)/attendancescreen",
    },
    {
      id: "2",
      name: "Homework",
      icon: "book-outline",
      route: "/(teacher)/homeworkscreen",
    },
    {
      id: "3",
      name: "Notify Students",
      icon: "megaphone-outline",
      route: "/(teacher)/notifystudents",
    },
    {
      id: "4",
      name: "Submit Scores",
      icon: "ribbon-outline",
      route: "/(teacher)/testscores",
    },
    {
      id: "5",
      name: "Student Leaves",
      icon: "eye-outline",
      route: "/(teacher)/student_leaves",
    },
    {
      id: "6",
      name: "Upload Notes",
      icon: "document-attach-outline",
      route: "/(teacher)/classnotes",
    },
    {
      id: "7",
      name: "My Leave",
      icon: "calendar-outline",
      route: "/(teacher)/request_leave",
    },
    {
      id: "8",
      name: "My Students",
      icon: "people-outline",
      route: "/(teacher)/my_students",
    },
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
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={theme.bgPrimary}
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

      <SecuritySettingsModal
        visible={securityModalVisible}
        onClose={() => setSecurityModalVisible(false)}
        showToast={showToast}
      />

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
                  {teacherData?.profileImage ? (
                    <Image
                      source={{ uri: teacherData.profileImage }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <Text
                      style={{ color: theme.accent }}
                      className="font-bold text-5xl"
                    >
                      {teacherData?.name
                        ? teacherData.name.charAt(0).toUpperCase()
                        : "T"}
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

                      {teacherData?.profileImage && (
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

            <ScrollView className="flex-1 px-6 mt-4">
              <View className="mb-6">
                <Text
                  style={{ color: theme.textPrimary }}
                  className="text-3xl font-bold"
                >
                  {teacherData?.name}
                </Text>
                <Text style={{ color: theme.accent }} className="text-sm mt-1">
                  {teacherData?.phone || "No phone linked"}
                </Text>
              </View>

              <View className="flex-row justify-between mb-8">
                <View
                  style={{
                    backgroundColor: theme.bgSecondary,
                    borderColor: theme.border,
                  }}
                  className="p-4 rounded-2xl flex-1 mr-3 border items-center"
                >
                  <Text
                    style={{ color: theme.textSecondary }}
                    className="text-xs font-bold uppercase mb-1"
                  >
                    Assigned
                  </Text>
                  <Text
                    style={{ color: theme.textPrimary }}
                    className="text-xl font-bold"
                  >
                    {getTotalClasses()} Classes
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
                    style={{ color: theme.textSecondary }}
                    className="text-xs font-bold uppercase mb-1"
                  >
                    Salary Type
                  </Text>
                  <Text
                    style={{ color: theme.accent }}
                    className="text-xl font-bold"
                  >
                    {teacherData?.salaryType === "Commission"
                      ? "Commission"
                      : "Fixed"}
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
                Teaching Schedule
              </Text>

              <View className="mb-10">
                {teacherData?.teachingProfile
                  ? teacherData.teachingProfile.map((item, index) => (
                      <View
                        key={index}
                        style={{
                          backgroundColor: theme.bgSecondary,
                          borderColor: theme.border,
                        }}
                        className="flex-row items-center p-4 rounded-xl mb-3 border"
                      >
                        <View
                          style={{
                            backgroundColor: theme.accentSoft20,
                            borderColor: theme.accentSoft30,
                          }}
                          className="w-12 h-12 rounded-full items-center justify-center mr-4 border"
                        >
                          <Ionicons
                            name={getClassIcon(item.class)}
                            size={22}
                            color={theme.accent}
                          />
                        </View>
                        <View>
                          <Text
                            style={{ color: theme.textPrimary }}
                            className="font-bold text-lg"
                          >
                            {item.class}
                          </Text>
                          <Text
                            style={{ color: theme.textSecondary }}
                            className="text-sm"
                          >
                            {item.subject}
                          </Text>
                        </View>
                      </View>
                    ))
                  : teacherData?.classesTaught?.map((cls, index) => (
                      <View
                        key={index}
                        style={{
                          backgroundColor: theme.bgSecondary,
                          borderColor: theme.border,
                        }}
                        className="flex-row items-center p-4 rounded-xl mb-3 border"
                      >
                        <View
                          style={{
                            backgroundColor: theme.accentSoft20,
                            borderColor: theme.accentSoft30,
                          }}
                          className="w-12 h-12 rounded-full items-center justify-center mr-4 border"
                        >
                          <Ionicons
                            name={getClassIcon(cls)}
                            size={22}
                            color={theme.accent}
                          />
                        </View>
                        <View>
                          <Text
                            style={{ color: theme.textPrimary }}
                            className="font-bold text-lg"
                          >
                            {cls}
                          </Text>
                          <Text
                            style={{ color: theme.textSecondary }}
                            className="text-sm"
                          >
                            General Subject
                          </Text>
                        </View>
                      </View>
                    ))}
                {!teacherData?.teachingProfile &&
                  !teacherData?.classesTaught && (
                    <View className="items-center py-6">
                      <Text
                        style={{ color: theme.textMuted }}
                        className="italic"
                      >
                        No active classes assigned.
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
        <View className="flex-row items-center mb-6">
          <TouchableOpacity onPress={() => setProfileModalVisible(true)}>
            <View
              style={{
                borderColor: theme.accent,
                backgroundColor: theme.bgSecondary,
              }}
              className="w-14 h-14 rounded-full mr-3 items-center justify-center border-2 overflow-hidden"
            >
              {teacherData?.profileImage ? (
                <Image
                  source={{ uri: teacherData.profileImage }}
                  className="w-full h-full"
                />
              ) : (
                <Text
                  style={{ color: theme.textPrimary }}
                  className="text-xl font-bold"
                >
                  {teacherData?.name ? teacherData.name.charAt(0) : "T"}
                </Text>
              )}
            </View>
          </TouchableOpacity>

          <View className="flex-1">
            <Text
              style={{ color: theme.textPrimary }}
              className="text-2xl font-bold"
            >
              {teacherData?.name || "Teacher"}
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

            <TouchableOpacity onPress={handleLogoutPress}>
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

        <View className="mb-6">
          <Text
            style={{ color: theme.accent }}
            className="text-lg font-semibold mb-2"
          >
            Payment Status
          </Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/(teacher)/teachersalary")}
            style={{
              backgroundColor: theme.bgSecondary,
              borderColor: theme.accent,
            }}
            className="flex-row justify-between items-center rounded-xl p-4 border shadow-sm"
          >
            <View>
              <Text style={{ color: theme.textSecondary }}>Pending Payout</Text>
              <Text
                style={{ color: theme.textPrimary }}
                className="text-2xl font-bold mt-1"
              >
                ₹{pendingSalary}
              </Text>
            </View>
            <View
              style={{ backgroundColor: theme.accent }}
              className="rounded-lg px-4 py-2"
            >
              <Text style={{ color: theme.textDark }} className="font-bold">
                View History
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
                onPress={() => item.route && router.push(item.route)}
                activeOpacity={0.8}
                style={{
                  backgroundColor: theme.bgSecondary,
                  borderColor: theme.border,
                  shadowColor: theme.shadow,
                }}
                className="w-[48%] rounded-xl p-5 items-center mb-4 border shadow-sm"
              >
                <Ionicons name={item.icon} size={32} color={theme.accent} />
                <Text
                  style={{ color: theme.textPrimary }}
                  className="mt-3 text-sm font-semibold text-center"
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
            Global Notices
          </Text>
          {notices.length === 0 ? (
            <View className="p-6 items-center opacity-50">
              <Ionicons
                name="notifications-off-outline"
                size={30}
                color={theme.textMuted}
              />
              <Text style={{ color: theme.textMuted }} className="italic mt-2">
                No new notices.
              </Text>
            </View>
          ) : (
            notices.map((item) => (
              <NoticeCard
                key={item.id}
                item={item}
                onPress={handlePressNotice}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default TeacherDashboard;