import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StatusBar,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import {
  collection,
  query,
  orderBy,
  onSnapshot,
  getDoc,
  doc,
} from "@react-native-firebase/firestore";
import { db } from "../../config/firebaseConfig";

import { useTheme } from "../../context/ThemeContext";
import ScreenWrapper from "../../components/ScreenWrapper";
import NoticeCard from "../../components/NoticeCard"; 
import CustomAlert2 from "../../components/CustomAlert2"; 

const AdminViewNotifications = () => {
  const { theme, isDark } = useTheme();

  const [classNotices, setClassNotices] = useState([]);
  const [filteredNotices, setFilteredNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  
  const [availableClasses, setAvailableClasses] = useState(["All"]);
  const [selectedClass, setSelectedClass] = useState("All");

  
  const [readOnlyVisible, setReadOnlyVisible] = useState(false);
  const [selectedContent, setSelectedContent] = useState({
    title: "",
    message: "",
  });

  
  useEffect(() => {
    setLoading(true);

    const qClass = query(
      collection(db, "class_notices"),
      orderBy("createdAt", "desc"),
    );

    const unsubClass = onSnapshot(qClass, async (snap) => {
      const list = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        tag: "Class", 
        author: doc.data().teacherName || "Teacher",
      }));

      
      const enriched = await Promise.all(
        list.map(async (item) => {
          try {
            const authorId = item.teacherId || item.authorId || null;
            if (authorId) {
              const userDocRef = doc(db, "users", authorId);
              const userDoc = await getDoc(userDocRef);
              if (userDoc.exists()) {
                const u = userDoc.data();
                return {
                  ...item,
                  author: u.name || item.author,
                  authorImage: u.profileImage || null,
                };
              }
            }
          } catch (e) {
            console.log("Failed to enrich notice with author image", e);
          }
          return { ...item, authorImage: null };
        }),
      );

      setClassNotices(enriched);

      
      const uniqueClasses = [
        "All",
        ...new Set(enriched.map((n) => n.classId).filter(Boolean)),
      ];
      setAvailableClasses(uniqueClasses);

      setLoading(false);
    });

    return () => unsubClass();
  }, []);

  
  useEffect(() => {
    if (selectedClass === "All") {
      setFilteredNotices(classNotices);
    } else {
      setFilteredNotices(
        classNotices.filter((n) => n.classId === selectedClass),
      );
    }
  }, [selectedClass, classNotices]);

  
  const handlePress = (item) => {
    setSelectedContent({
      title: item.title || "Notice",
      message:
        item.content || item.message || "No additional details provided.",
    });
    setReadOnlyVisible(true);
  };

  return (
    <ScreenWrapper scrollable={false} edges={["left", "right", "bottom"]}>
      <StatusBar
        backgroundColor={theme.bgPrimary}
        barStyle={isDark ? "light-content" : "dark-content"}
      />

      <CustomAlert2
        visible={readOnlyVisible}
        title={selectedContent.title}
        message={selectedContent.message}
        onClose={() => setReadOnlyVisible(false)}
      />

      <View className="mb-2">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10 }}
        >
          {availableClasses.map((cls) => {
            const isSelected = selectedClass === cls;
            return (
              <TouchableOpacity
                key={cls}
                onPress={() => setSelectedClass(cls)}
                style={{
                  backgroundColor: isSelected
                    ? theme.accent
                    : theme.bgSecondary,
                  borderColor: isSelected ? theme.accent : theme.border,
                }}
                className="px-5 py-2 rounded-full mr-3 border shadow-sm"
              >
                <Text
                  style={{
                    color: isSelected ? theme.textDark : theme.textPrimary,
                    fontWeight: isSelected ? "bold" : "600",
                  }}
                  className="text-sm"
                >
                  {cls === "All" ? "All" : cls}
                </Text>
              </TouchableOpacity>
            );
          })}
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
          data={filteredNotices}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NoticeCard item={item} onPress={handlePress} />
          )}
          contentContainerStyle={{
            paddingHorizontal: 10,
            paddingBottom: 40,
          }}
          ListEmptyComponent={
            <View className="mt-20 items-center opacity-50">
              <MaterialCommunityIcons
                name="bell-sleep-outline"
                size={60}
                color={theme.textMuted}
              />
              <Text style={{ color: theme.textMuted }} className="mt-4">
                No class updates found.
              </Text>
            </View>
          }
        />
      )}
    </ScreenWrapper>
  );
};

export default AdminViewNotifications;
