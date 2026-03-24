import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
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

const TestScores = () => {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("All");

  
  const fetchScores = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      const studentClass = userDoc.data()?.standard;

      if (!studentClass) {
        setLoading(false);
        return;
      }

      const q = query(
        collection(db, "exam_results"),
        where("classId", "==", studentClass),
      );
      const snapshot = await getDocs(q);

      const data = snapshot.docs
        .map((docSnap) => {
          const exam = docSnap.data();
          const myScore = exam.results ? exam.results[user.uid] : null;

          if (myScore !== null && myScore !== undefined && myScore !== "") {
            return {
              id: docSnap.id,
              testName: exam.examTitle || "Untitled Test",
              subject: exam.subject || "General",
              totalMarks: exam.maxScore || 100,
              marksObtained: myScore,
              date: exam.date,
            };
          }
          return null;
        })
        .filter((item) => item !== null);

      data.sort((a, b) => {
        const parseDate = (str) => {
          if (!str) return new Date(0);
          if (str.toDate) return str.toDate();
          const parts = str.split("/");
          if (parts.length === 3)
            return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
          return new Date(0);
        };
        return parseDate(b.date) - parseDate(a.date);
      });

      setScores(data);
    } catch (error) {
      console.error("Error fetching scores:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScores();
  }, []);

  
  const filteredScores = useMemo(() => {
    if (selectedSubject === "All") return scores;
    return scores.filter((s) => s.subject === selectedSubject);
  }, [selectedSubject, scores]);

  const uniqueSubjects = useMemo(() => {
    const subjects = new Set(scores.map((s) => s.subject));
    return ["All", ...Array.from(subjects)];
  }, [scores]);

  const stats = useMemo(() => {
    if (scores.length === 0) return { bestSubject: "N/A", worstSubject: "N/A" };

    const subjectPerformance = {};

    
    scores.forEach((s) => {
      const obt = parseFloat(s.marksObtained) || 0;
      const tot = parseFloat(s.totalMarks) || 100;
      const pct = (obt / tot) * 100;

      if (!subjectPerformance[s.subject]) subjectPerformance[s.subject] = [];
      subjectPerformance[s.subject].push(pct);
    });

    let bestSub = "N/A";
    let worstSub = "N/A";
    let maxAvg = -1;
    let minAvg = 101; 

    Object.keys(subjectPerformance).forEach((sub) => {
      const avg =
        subjectPerformance[sub].reduce((a, b) => a + b, 0) /
        subjectPerformance[sub].length;

      if (avg > maxAvg) {
        maxAvg = avg;
        bestSub = sub;
      }
      if (avg < minAvg) {
        minAvg = avg;
        worstSub = sub;
      }
    });

    return {
      bestSubject: bestSub,
      worstSubject: worstSub,
    };
  }, [scores]);

  
  const getGradeColor = (percentage) => {
    if (percentage >= 85) return theme.success || "#10b981";
    if (percentage >= 50) return theme.warning || "#f59e0b";
    return theme.error || "#ef4444";
  };

  const renderItem = useCallback(
    ({ item }) => {
      const obt = parseFloat(item.marksObtained) || 0;
      const tot = parseFloat(item.totalMarks) || 100;
      const percentage = (obt / tot) * 100;
      const color = getGradeColor(percentage);

      return (
        <View
          style={{
            backgroundColor: theme.bgSecondary,
            borderColor: theme.border,
          }}
          className="rounded-2xl p-4 mb-4 border"
        >
          <View className="flex-row justify-between items-start mb-2">
            <View>
              <Text
                style={{ color: theme.textPrimary }}
                className="font-bold text-lg"
              >
                {item.testName}
              </Text>
              <Text
                style={{ color: theme.textSecondary }}
                className="text-xs mt-1"
              >
                {item.subject} • {item.date}
              </Text>
            </View>
            <View className="items-end">
              <Text
                style={{ color: theme.textPrimary }}
                className="font-bold text-xl"
              >
                {obt}
                <Text style={{ color: theme.textMuted }} className="text-sm">
                  /{tot}
                </Text>
              </Text>
              <Text style={{ color: color }} className="text-xs font-bold">
                {percentage.toFixed(0)}%
              </Text>
            </View>
          </View>

          <View
            style={{ backgroundColor: theme.bgTertiary }}
            className="h-2 rounded-full overflow-hidden mt-2"
          >
            <View
              style={{
                width: `${Math.min(percentage, 100)}%`,
                backgroundColor: color,
              }}
              className="h-full rounded-full"
            />
          </View>
        </View>
      );
    },
    [theme],
  );

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
          className="p-5 rounded-2xl border mb-6 shadow-lg"
        >
          <Text
            style={{ color: theme.textSecondary }}
            className="text-xs font-bold uppercase mb-4 tracking-widest text-center"
          >
            Performance Diagnostic
          </Text>
          <View className="flex-row justify-between items-center">
            <View
              style={{ borderColor: theme.border }}
              className="items-center flex-1 border-r px-2"
            >
              <Text
                style={{ color: theme.error || "#ef4444" }} 
                className="text-xl font-bold text-center"
                numberOfLines={1}
              >
                {stats.worstSubject}
              </Text>
              <Text
                style={{ color: theme.textSecondary }}
                className="text-xs mt-1 text-center font-semibold uppercase tracking-wider"
              >
                Needs Focus
              </Text>
            </View>

            <View className="items-center flex-1 px-2">
              <Text
                style={{ color: theme.success || "#10b981" }} 
                className="text-xl font-bold text-center"
                numberOfLines={1}
              >
                {stats.bestSubject}
              </Text>
              <Text
                style={{ color: theme.textSecondary }}
                className="text-xs mt-1 text-center font-semibold uppercase tracking-wider"
              >
                Strongest Area
              </Text>
            </View>
          </View>
        </View>

        <View className="mb-6">
          <FlatList
            horizontal
            data={uniqueSubjects}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => setSelectedSubject(item)}
                style={{
                  backgroundColor:
                    selectedSubject === item ? theme.accent : theme.bgSecondary,
                  borderColor:
                    selectedSubject === item ? theme.accent : theme.border,
                }}
                className="px-5 py-2 rounded-full mr-3 border"
              >
                <Text
                  style={{
                    color:
                      selectedSubject === item
                        ? theme.textDark
                        : theme.textSecondary,
                  }}
                  className="font-bold"
                >
                  {item}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        <View className="pb-10">
          {filteredScores.length > 0 ? (
            <FlatList
              data={filteredScores}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              scrollEnabled={false}
            />
          ) : (
            <View className="items-center py-10 opacity-50">
              <MaterialCommunityIcons
                name="clipboard-text-off-outline"
                size={60}
                color={theme.textMuted}
              />
              <Text
                style={{ color: theme.textMuted }}
                className="mt-3 font-medium"
              >
                No test records found.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
};

export default TestScores;
