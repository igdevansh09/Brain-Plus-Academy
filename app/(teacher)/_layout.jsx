import React from "react";
import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomHeader from "../../components/CustomHeader";
import { useTheme } from "../../context/ThemeContext";

export default function TeacherLayout() {
  const { theme } = useTheme();

  return (
    <Stack
      screenOptions={{
        header: ({ options, route }) => {
          
          const title =
            options.title ||
            route.name
              .replace(/_/g, " ")
              .replace(/\b\w/g, (l) => l.toUpperCase());

          return (
            <SafeAreaView
              edges={["top"]}
              style={{ backgroundColor: theme.bgPrimary }}
            >
              <CustomHeader title={title} showBack={true} />
            </SafeAreaView>
          );
        },
      }}
    >
      <Stack.Screen name="teacherdashboard" options={{ headerShown: false }} />

      <Stack.Screen name="view_attachment" options={{ headerShown: false }} />
      <Stack.Screen name="notifystudents" options={{ headerShown: false }} />

      <Stack.Screen name="my_students" options={{ title: "My Students" }} />
      <Stack.Screen
        name="attendancescreen"
        options={{ title: "Mark Attendance" }}
      />
      <Stack.Screen
        name="homeworkscreen"
        options={{ title: "Homework Management" }}
      />
      <Stack.Screen name="classnotes" options={{ title: "Class Notes" }} />
      <Stack.Screen name="testscores" options={{ title: "Upload Marks" }} />

      <Stack.Screen name="teachersalary" options={{ title: "My Salary" }} />
      <Stack.Screen name="student_leaves" options={{ title: "Student Leaves" }} />
      <Stack.Screen name="request_leave" options={{ title: "Leave Request" }} />
    </Stack>
  );
}
