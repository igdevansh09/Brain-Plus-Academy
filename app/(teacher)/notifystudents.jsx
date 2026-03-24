import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Animated,
  PanResponder,
  Dimensions,
  Keyboard,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../../context/ThemeContext";
import ScreenWrapper from "../../components/ScreenWrapper";
import CustomHeader from "../../components/CustomHeader";


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
  updateDoc,
} from "@react-native-firebase/firestore";
import { auth, db } from "../../config/firebaseConfig";

import CustomToast from "../../components/CustomToast";

const { height } = Dimensions.get("window");

const TeacherClassUpdates = () => {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  
  const [isAdding, setIsAdding] = useState(false);
  const [editId, setEditId] = useState(null);

  
  const [teachingProfile, setTeachingProfile] = useState([]);
  const [uniqueClasses, setUniqueClasses] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [history, setHistory] = useState([]);

  
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedTag, setSelectedTag] = useState("General");

  
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [teacherName, setTeacherName] = useState("");

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
      onPanResponderRelease: (e, gestureState) => {
        if (gestureState.dy > 150) {
          resetModal();
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
    if (isAdding) {
      pan.setValue(0);
    }
  }, [isAdding]);

  
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const data = userDoc.data();
          setTeacherName(data.name || "Teacher");

          const profile = data.teachingProfile || [];
          if (profile.length > 0) {
            setTeachingProfile(profile);
            const classes = [...new Set(profile.map((item) => item.class))];
            setUniqueClasses(classes);
            if (classes.length > 0) handleClassChange(classes[0], profile);
          } else {
            const classes = data.classesTaught || [];
            const subjects = data.subjects || [];
            setUniqueClasses(classes);
            setTeachingProfile(
              classes.flatMap((c) =>
                subjects.map((s) => ({ class: c, subject: s })),
              ),
            );
            if (classes.length > 0) {
              setSelectedClass(classes[0]);
              setAvailableSubjects(subjects);
              if (subjects.length > 0) setSelectedSubject(subjects[0]);
            }
          }
        }
      } catch (error) {
        console.log("Profile Error:", error);
      }
    };

    fetchProfile();
  }, []);

  
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    setLoading(true);

    const q = query(
      collection(db, "class_notices"),
      where("teacherId", "==", user.uid),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setHistory(list);
        setLoading(false);
      },
      (error) => {
        console.error("History Listener Error:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  
  const handleClassChange = (cls, profileData = teachingProfile) => {
    setSelectedClass(cls);
    const relevant = profileData
      .filter((item) => item.class === cls)
      .map((item) => item.subject);
    setAvailableSubjects(relevant);

    if (relevant.length > 0) setSelectedSubject(relevant[0]);
    else setSelectedSubject(null);
  };

  const resetModal = () => {
    setTitle("");
    setMessage("");
    setEditId(null);
    setIsAdding(false);
    Keyboard.dismiss();
  };

  const openEditModal = (item) => {
    setEditId(item.id);
    setTitle(item.title || "");
    setMessage(item.message || item.content || "");
    if (item.classId) handleClassChange(item.classId);
    if (item.subject) setSelectedSubject(item.subject);
    setIsAdding(true);
  };

  
  const handleSave = async () => {
    Keyboard.dismiss();

    
    if (!title.trim() || !selectedClass || !selectedSubject) {
      return showToast("Main Title, Class, and Subject are required.", "error");
    }

    setSending(true);
    try {
      const noticeData = {
        title: title.trim(),
        subject: selectedSubject,
        tag: selectedTag,
        message: message.trim(), 
        content: message.trim(), 
        classId: selectedClass,
        teacherId: auth.currentUser.uid,
        teacherName: teacherName,
        date: new Date().toLocaleDateString("en-GB"),
        type: "Class Update",
      };

      if (editId) {
        await updateDoc(doc(db, "class_notices", editId), noticeData);
        showToast("Update modified successfully!", "success");
      } else {
        noticeData.createdAt = serverTimestamp();
        await addDoc(collection(db, "class_notices"), noticeData);
        showToast(`Sent to ${selectedClass}!`, "success");
      }

      resetModal();
    } catch (error) {
      showToast("Failed to save update.", "error");
    } finally {
      setSending(false);
    }
  };

  const renderHistoryItem = ({ item }) => {
    let icon = "notifications";
    if (item.tag === "Homework") icon = "book";
    if (item.tag === "Test") icon = "document-text";
    if (item.tag === "Urgent") icon = "alert-circle";
    if (item.tag === "Holiday") icon = "airplane";

    const hasMessage = item.message || item.content;

    return (
      <View
        style={{
          backgroundColor: theme.bgSecondary,
          borderColor: theme.border,
        }}
        className="p-4 rounded-2xl mb-4 border shadow-sm"
      >
        <View
          className={`flex-row justify-between items-start ${hasMessage ? "mb-2" : ""}`}
        >
          <View className="flex-row items-center flex-1">
            <View
              style={{ backgroundColor: theme.accentSoft20 }}
              className="p-2 rounded-full mr-3"
            >
              <Ionicons name={icon} size={16} color={theme.accent} />
            </View>
            <View className="flex-1">
              <Text
                style={{ color: theme.textPrimary }}
                className="font-bold text-base"
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <Text style={{ color: theme.textSecondary }} className="text-xs">
                {item.classId} • {item.subject}
              </Text>
            </View>
          </View>

          <View className="items-end">
            <TouchableOpacity
              onPress={() => openEditModal(item)}
              className="mb-1 p-1"
            >
              <Ionicons name="pencil" size={18} color={theme.accent} />
            </TouchableOpacity>
            <Text style={{ color: theme.textMuted }} className="text-[10px]">
              {item.date}
            </Text>
          </View>
        </View>

        {hasMessage ? (
          <View
            style={{
              backgroundColor: theme.bgTertiary,
              borderColor: theme.borderSoft,
            }}
            className="p-3 rounded-xl border mt-1"
          >
            <Text
              style={{ color: theme.textSecondary }}
              className="text-sm leading-5"
            >
              {hasMessage}
            </Text>
          </View>
        ) : null}
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
    <ScreenWrapper scrollable={false} edges={["left", "right", "bottom"]} className="pt-7">
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

      <CustomHeader
        title="Class Updates"
        showBack={true}
        onBackPress={() => router.back()}
        rightComponent={
          <TouchableOpacity
            onPress={() => {
              resetModal();
              setIsAdding(true);
            }}
            style={{
              backgroundColor: theme.bgSecondary,
              borderColor: theme.accent,
            }}
            className="p-2 rounded-full border"
          >
            <Ionicons name="add" size={22} color={theme.accent} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        className="flex-1 px-5 pt-4"
        showsVerticalScrollIndicator={false}
      >

        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          renderItem={renderHistoryItem}
          scrollEnabled={false}
          ListEmptyComponent={() => (
            <View className="items-center py-10 opacity-30">
              <MaterialCommunityIcons
                name="bell-sleep"
                size={50}
                color={theme.textMuted}
              />
              <Text style={{ color: theme.textMuted }} className="mt-2">
                No updates sent recently.
              </Text>
            </View>
          )}
        />
        <View className="h-10" />
      </ScrollView>

      <Modal visible={isAdding} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View
            style={{ backgroundColor: theme.blackSoft80 }}
            className="flex-1 justify-end"
          >
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
                backgroundColor: theme.bgSecondary,
                borderColor: theme.accent,
                maxHeight: height * 0.9,
                flexShrink: 1,
              }}
              className="rounded-t-3xl border-t"
            >
              <View
                {...panResponder.panHandlers}
                className="w-full items-center pt-4 pb-4"
              >
                <View
                  className="w-12 h-1.5 opacity-30 rounded-full"
                  style={{ backgroundColor: theme.textMuted }}
                />
              </View>

              <ScrollView
                contentContainerStyle={{
                  paddingHorizontal: 24,
                  paddingBottom: 40,
                }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <Text
                  style={{ color: theme.textPrimary }}
                  className="text-xl font-bold mb-6 text-center"
                >
                  {editId ? "Edit Class Update" : "New Class Update"}
                </Text>

                <Text
                  style={{ color: theme.textMuted }}
                  className="text-xs font-bold uppercase mb-2"
                >
                  Target Class
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mb-5"
                >
                  {uniqueClasses.map((cls) => (
                    <TouchableOpacity
                      key={cls}
                      onPress={() => handleClassChange(cls)}
                      style={{
                        backgroundColor:
                          selectedClass === cls
                            ? theme.accent
                            : theme.bgPrimary,
                        borderColor:
                          selectedClass === cls ? theme.accent : theme.border,
                      }}
                      className="mr-3 px-5 py-3 rounded-xl border"
                    >
                      <Text
                        style={{
                          color:
                            selectedClass === cls
                              ? theme.textDark
                              : theme.textPrimary,
                        }}
                        className="font-bold"
                      >
                        {cls}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {selectedClass && (
                  <>
                    <Text
                      style={{ color: theme.textMuted }}
                      className="text-xs font-bold uppercase mb-2"
                    >
                      Target Subject
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      className="mb-6"
                    >
                      {availableSubjects.map((sub) => (
                        <TouchableOpacity
                          key={sub}
                          onPress={() => setSelectedSubject(sub)}
                          style={{
                            backgroundColor:
                              selectedSubject === sub
                                ? theme.info
                                : theme.bgPrimary,
                            borderColor:
                              selectedSubject === sub
                                ? theme.info
                                : theme.border,
                          }}
                          className="mr-3 px-5 py-3 rounded-xl border"
                        >
                          <Text
                            style={{
                              color:
                                selectedSubject === sub
                                  ? theme.white
                                  : theme.textPrimary,
                            }}
                            className="font-bold"
                          >
                            {sub}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </>
                )}

                <Text
                  style={{ color: theme.textMuted }}
                  className="text-xs font-bold uppercase mb-2"
                >
                  Main Title{" "}
                  <Text style={{ color: theme.dueRed || "red" }}>*</Text>
                </Text>
                <TextInput
                  placeholder="e.g. Test Syllabus"
                  placeholderTextColor={theme.placeholder}
                  value={title}
                  onChangeText={setTitle}
                  style={{
                    backgroundColor: theme.bgPrimary,
                    borderColor: theme.border,
                    color: theme.textPrimary,
                  }}
                  className="p-4 rounded-xl border mb-5 font-bold text-base"
                />

                <Text
                  style={{ color: theme.textMuted }}
                  className="text-xs font-bold uppercase mb-2"
                >
                  Optional Message
                </Text>
                <TextInput
                  placeholder="Write your additional details here..."
                  placeholderTextColor={theme.placeholder}
                  multiline
                  value={message}
                  onChangeText={setMessage}
                  style={{
                    textAlignVertical: "top",
                    backgroundColor: theme.bgPrimary,
                    borderColor: theme.border,
                    color: theme.textPrimary,
                    minHeight: 120,
                  }}
                  className="p-4 rounded-xl border mb-8 text-base"
                />

                <TouchableOpacity
                  onPress={handleSave}
                  disabled={sending}
                  style={{
                    backgroundColor: sending ? theme.gray500 : theme.accent,
                    shadowColor: theme.shadow,
                  }}
                  className="py-4 rounded-xl flex-row justify-center items-center shadow-lg mb-10"
                >
                  {sending ? (
                    <ActivityIndicator color={theme.textDark} />
                  ) : (
                    <>
                      <Ionicons
                        name={editId ? "checkmark" : "send"}
                        size={20}
                        color={theme.textDark}
                        className="mr-2"
                      />
                      <Text
                        style={{ color: theme.textDark }}
                        className="font-bold text-lg"
                      >
                        {editId ? "Update Announcement" : "Post Announcement"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenWrapper>
  );
};

export default TeacherClassUpdates;
