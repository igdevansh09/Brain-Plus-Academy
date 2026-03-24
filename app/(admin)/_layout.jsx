import React from "react";
import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomHeader from "../../components/CustomHeader";
import { useTheme } from "../../context/ThemeContext";

export default function AdminLayout() {
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
      <Stack.Screen name="admindashboard" options={{ headerShown: false }} />
      <Stack.Screen name="feereports" options={{ headerShown: false }} />
      <Stack.Screen name="salaryreports" options={{ headerShown: false }} />
      <Stack.Screen name="globalnotices" options={{ headerShown: false }} />

      <Stack.Screen
        name="managestudents"
        options={{ headerShown: false }}
      />
      <Stack.Screen name="manageteachers" options={{ headerShown: false }} />
      <Stack.Screen
        name="manage_content"
        options={{ title: "Manage Content" }}
      />

      <Stack.Screen name="all_leaves" options={{ title: "Leave Requests" }} />
      <Stack.Screen
        name="view_notifications"
        options={{ title: "Notifications" }}
      />
    </Stack>
  );
}
