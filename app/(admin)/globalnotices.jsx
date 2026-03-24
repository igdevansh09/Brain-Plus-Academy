import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  Keyboard,
  PanResponder,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useVideoPlayer, VideoView } from "expo-video"; 

import { db, storage } from "../../config/firebaseConfig";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  deleteDoc,
  updateDoc,
} from "@react-native-firebase/firestore";
import {
  ref,
  putFile,
  getDownloadURL,
  deleteObject,
} from "@react-native-firebase/storage";

import CustomAlert from "../../components/CustomAlert";
import CustomToast from "../../components/CustomToast";
import CustomHeader from "../../components/CustomHeader";
import { useTheme } from "../../context/ThemeContext";

const { height } = Dimensions.get("window");


const NoticeVideoPlayer = ({ uri }) => {
  const videoRef = useRef(null);
  const player = useVideoPlayer(uri, (player) => {
    player.loop = true; 
    player.play();      
  });

  return (
    
    <View style={{ width: "100%", aspectRatio: 16 / 9, maxHeight: Dimensions.get('window').height * 0.5, borderRadius: 12, overflow: "hidden", position: "relative", backgroundColor: "#000" }}>
      <VideoView
        ref={videoRef}
        
        style={{ width: "100%", height: "100%" }} 
        player={player}
        nativeControls={false} 
        contentFit="contain"
      />
      
      <TouchableOpacity
        onPress={() => videoRef.current?.enterFullscreen()}
        style={{
          position: "absolute",
          bottom: 12,
          right: 12,
          backgroundColor: "rgba(0,0,0,0.6)",
          padding: 8,
          borderRadius: 20,
          zIndex: 10,
        }}
      >
        <Ionicons name="expand-outline" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const ManageNotices = () => {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  
  const [isAdding, setIsAdding] = useState(false);
  const [editId, setEditId] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");

  
  const [mediaUri, setMediaUri] = useState(null);
  const [existingMediaUrl, setExistingMediaUrl] = useState(null);
  const [originalMediaUrl, setOriginalMediaUrl] = useState(null);
  const [mediaType, setMediaType] = useState("image");
  const [posting, setPosting] = useState(false);

  
  const [alert, setAlert] = useState({
    visible: false,
    title: "",
    msg: "",
    onConfirm: null,
  });
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
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
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
    if (isAdding) pan.setValue(0);
  }, [isAdding]);

  
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "notices"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot) return;
      setNotices(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const resetModal = () => {
    setNewTitle("");
    setNewContent("");
    setMediaUri(null);
    setExistingMediaUrl(null);
    setOriginalMediaUrl(null);
    setMediaType("image");
    setEditId(null);
    setIsAdding(false);
    Keyboard.dismiss();
  };

  const openEditModal = (notice) => {
    setEditId(notice.id);
    setNewTitle(notice.title || "");
    setNewContent(notice.content || "");
    setExistingMediaUrl(notice.imageUrl || null);
    setOriginalMediaUrl(notice.imageUrl || null);
    setMediaType(notice.mediaType || "image");
    setMediaUri(null);
    setIsAdding(true);
  };

  
  const handlePickMedia = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        quality: 0.6,
      });

      if (!result.canceled && result.assets[0].uri) {
        setMediaUri(result.assets[0].uri);
        setMediaType(result.assets[0].type);
        setExistingMediaUrl(null);
      }
    } catch (error) {
      showToast("Error picking media", "error");
    }
  };

  const removeSelectedMedia = () => {
    setMediaUri(null);
    setExistingMediaUrl(null);
    setMediaType("image");
  };

  const deleteMediaFromStorage = async (url) => {
    if (!url) return;
    try {
      const pathStartIndex = url.indexOf("/o/") + 3;
      const pathEndIndex = url.indexOf("?");
      if (pathStartIndex > 2 && pathEndIndex > -1) {
        const decodedPath = decodeURIComponent(
          url.substring(pathStartIndex, pathEndIndex),
        );
        await deleteObject(ref(storage, decodedPath));
      }
    } catch (err) {
      console.warn("Failed to delete orphaned media from storage:", err);
    }
  };

  const confirmDelete = (notice) => {
    setAlert({
      visible: true,
      title: "Delete Notice",
      msg: "Are you sure you want to permanently delete this notice?",
      onConfirm: async () => {
        setAlert({ ...alert, visible: false });
        try {
          await deleteMediaFromStorage(notice.imageUrl);
          await deleteDoc(doc(db, "notices", notice.id));
          showToast("Notice deleted successfully", "success");
        } catch (e) {
          showToast("Failed to delete notice", "error");
        }
      },
    });
  };

  const handleSaveNotice = async () => {
    Keyboard.dismiss();
    if (!newTitle.trim()) return showToast("Main Title is required", "error");

    setPosting(true);
    try {
      let finalMediaUrl = existingMediaUrl;

      if (editId) {
        if ((mediaUri || existingMediaUrl === null) && originalMediaUrl) {
          await deleteMediaFromStorage(originalMediaUrl);
        }
      }

      if (mediaUri) {
        const extension = mediaType === "video" ? "mp4" : "jpg";
        const filename = `global_notices/${Date.now()}.${extension}`;
        const storageRef = ref(storage, filename);
        await putFile(storageRef, mediaUri);
        finalMediaUrl = await getDownloadURL(storageRef);
      }

      const noticeData = {
        title: newTitle.trim(),
        content: newContent.trim(),
        imageUrl: finalMediaUrl || null,
        mediaType: mediaType,
        date: new Date().toLocaleDateString("en-GB"),
      };

      if (editId) {
        await updateDoc(doc(db, "notices", editId), noticeData);
        showToast("Notice updated successfully!", "success");
      } else {
        noticeData.createdAt = serverTimestamp();
        await addDoc(collection(db, "notices"), noticeData);
        showToast("Notice posted successfully!", "success");
      }

      resetModal();
    } catch (error) {
      showToast(error.message || "Failed to post notice", "error");
    } finally {
      setPosting(false);
    }
  };

  const renderNotice = ({ item }) => {
    const isVideo = item.mediaType === "video";

    return (
      <View
        style={{
          backgroundColor: theme.bgSecondary,
          borderColor: theme.border,
          shadowColor: theme.shadow,
        }}
        className="p-5 rounded-2xl mb-4 border shadow-sm"
      >
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1 mr-3">
            <View className="flex-row items-center mb-1">
              <MaterialCommunityIcons
                name="bullhorn-variant"
                size={18}
                color={theme.accent}
                className="mr-2"
              />
              <Text
                style={{ color: theme.textPrimary }}
                className="font-bold text-lg flex-1"
              >
                {item.title}
              </Text>
            </View>
            <Text
              style={{ color: theme.textSecondary }}
              className="text-xs italic mt-1"
            >
              {item.date}
            </Text>
          </View>
          <View className="flex-row">
            <TouchableOpacity
              onPress={() => openEditModal(item)}
              className="mr-3"
            >
              <Ionicons name="pencil" size={20} color={theme.accent} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => confirmDelete(item)}>
              <Ionicons
                name="trash"
                size={20}
                color={theme.dueRed || "#ff4444"}
              />
            </TouchableOpacity>
          </View>
        </View>

        {item.imageUrl && (
          <View
            className="mb-3 rounded-xl overflow-hidden"
            style={{ borderColor: theme.borderSoft, borderWidth: 1 }}
          >
            {isVideo ? (
              <NoticeVideoPlayer uri={item.imageUrl} />
            ) : (
              <Image
                source={{ uri: item.imageUrl }}
                style={{
                  width: "100%",
                  height: 250,
                  backgroundColor: theme.bgTertiary,
                }}
                resizeMode="contain"
              />
            )}
          </View>
        )}

        {item.content ? (
          <View
            style={{
              backgroundColor: theme.bgTertiary || theme.bgPrimary,
              borderColor: theme.borderSoft || theme.border,
            }}
            className="p-3 rounded-xl border mt-1"
          >
            <Text
              style={{ color: theme.textSecondary }}
              className="text-sm leading-5"
            >
              {item.content}
            </Text>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bgPrimary }}>
      <StatusBar
        backgroundColor={theme.bgPrimary}
        barStyle={isDark ? "light-content" : "dark-content"}
      />
      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.msg}
        type="warning"
        onCancel={() => setAlert({ ...alert, visible: false })}
        onConfirm={alert.onConfirm}
        confirmText="Delete"
      />
      <CustomToast
        visible={toast.visible}
        message={toast.msg}
        type={toast.type}
        onHide={() => setToast({ ...toast, visible: false })}
      />

      <CustomHeader
        title="Global Notices"
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

      {loading ? (
        <ActivityIndicator
          size="large"
          color={theme.accent}
          className="mt-10"
        />
      ) : (
        <FlatList
          data={notices}
          keyExtractor={(item) => item.id}
          renderItem={renderNotice}
          contentContainerStyle={{ padding: 10, paddingBottom: 20 }}
          ListEmptyComponent={() => (
            <View className="mt-20 items-center opacity-30">
              <MaterialCommunityIcons
                name="bullhorn-outline"
                size={80}
                color={theme.textMuted}
              />
              <Text
                style={{ color: theme.textPrimary }}
                className="text-center mt-4 text-lg"
              >
                No notices posted yet.
              </Text>
            </View>
          )}
        />
      )}

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
                  {editId ? "Edit Notice" : "New Notice"}
                </Text>

                <Text
                  style={{ color: theme.textMuted }}
                  className="text-xs font-bold uppercase mb-2"
                >
                  Main Title{" "}
                  <Text style={{ color: theme.dueRed || "red" }}>*</Text>
                </Text>
                <TextInput
                  value={newTitle}
                  onChangeText={setNewTitle}
                  placeholder="e.g. Staff Meeting"
                  placeholderTextColor={theme.placeholder}
                  style={{
                    backgroundColor: theme.bgPrimary,
                    color: theme.textPrimary,
                    borderColor: theme.border,
                  }}
                  className="p-4 rounded-xl border mb-5 font-bold"
                />

                <Text
                  style={{ color: theme.textMuted }}
                  className="text-xs font-bold uppercase mb-2"
                >
                  Optional Message
                </Text>
                <TextInput
                  value={newContent}
                  onChangeText={setNewContent}
                  placeholder="Type additional details here..."
                  placeholderTextColor={theme.placeholder}
                  multiline
                  style={{
                    backgroundColor: theme.bgPrimary,
                    color: theme.textPrimary,
                    borderColor: theme.border,
                    textAlignVertical: "top",
                    minHeight: 100,
                  }}
                  className="p-4 rounded-xl border mb-5"
                />

                <Text
                  style={{ color: theme.textMuted }}
                  className="text-xs font-bold uppercase mb-2"
                >
                  Attach Media (Image / Video)
                </Text>
                {mediaUri || existingMediaUrl ? (
                  <View className="relative mb-6">
                    {mediaType === "video" ? (
                      <NoticeVideoPlayer uri={mediaUri || existingMediaUrl} />
                    ) : (
                      <Image
                        source={{ uri: mediaUri || existingMediaUrl }}
                        style={{
                          width: "100%",
                          height: 250,
                          borderRadius: 12,
                          borderColor: theme.borderSoft,
                          borderWidth: 1,
                        }}
                        resizeMode="contain"
                      />
                    )}
                    <TouchableOpacity
                      onPress={removeSelectedMedia}
                      style={{
                        backgroundColor: theme.error,
                        position: "absolute",
                        top: -10,
                        right: -10,
                        padding: 6,
                        borderRadius: 20,
                        zIndex: 10,
                      }}
                    >
                      <Ionicons name="close" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={handlePickMedia}
                    style={{
                      backgroundColor: theme.bgPrimary,
                      borderColor: theme.border,
                      borderStyle: "dashed",
                      borderWidth: 2,
                    }}
                    className="p-6 rounded-xl items-center justify-center mb-6"
                  >
                    <Ionicons
                      name="cloud-upload-outline"
                      size={32}
                      color={theme.textMuted}
                    />
                    <Text
                      style={{ color: theme.textSecondary }}
                      className="mt-2 text-sm font-semibold"
                    >
                      Tap to attach Image or Video
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={handleSaveNotice}
                  disabled={posting}
                  style={{
                    backgroundColor: posting ? theme.gray500 : theme.accent,
                    shadowColor: theme.shadow,
                  }}
                  className="p-4 rounded-xl items-center justify-center shadow-lg mb-10 mt-2 flex-row"
                >
                  {posting ? (
                    <>
                      <ActivityIndicator
                        color={theme.textDark}
                        className="mr-2"
                      />
                      <Text
                        style={{ color: theme.textDark }}
                        className="font-bold text-lg"
                      >
                        Uploading...
                      </Text>
                    </>
                  ) : (
                    <Text
                      style={{ color: theme.textDark }}
                      className="font-bold text-lg"
                    >
                      {editId ? "Update Notice" : "Post Notice"}
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

export default ManageNotices;
