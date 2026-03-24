import { useRouter } from "expo-router";
import {
  Image,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext"; 
import logo from "../assets/images/dinetimelogo.png";
import logo2 from "../assets/images/dinetimelogo2.png";
const entryImg = require("../assets/images/Frame.png");

export default function Index() {
  const router = useRouter();
  const { theme, isDark } = useTheme(); 

  return (
    
    <SafeAreaView style={{ backgroundColor: theme.bgPrimary, flex: 1 }}>
      <ScrollView contentContainerStyle={{ height: "100%" }}>
        <View className="m-2 flex justify-center items-center">
          <Image
            source={isDark ? logo2 : logo}
            style={{ width: 300, height: 300 }}
          />
          <View className="w-3/4">
            <TouchableOpacity
              onPress={() => router.push("/signup")} 
              style={{ backgroundColor: theme.accent }}
              className="p-2 py-2 my-2 rounded-lg"
            >
              <Text
                style={{ color: theme.textDark }}
                className="text-lg font-semibold text-center"
              >
                Sign Up
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/login_options")}
              style={{
                backgroundColor: theme.bgPrimary,
                borderColor: theme.accent,
              }}
              className="p-2 py-2 my-2 border rounded-lg"
            >
              <Text
                style={{ color: theme.accent }}
                className="text-lg font-semibold text-center"
              >
                Sign In
              </Text>
            </TouchableOpacity>

            <View className="flex-row items-center my-4">
              <View
                className="flex-1 h-px"
                style={{ backgroundColor: theme.accent }}
              />
              <Text
                style={{ color: theme.textPrimary }}
                className="mx-4 font-semibold"
              >
                or
              </Text>
              <View
                className="flex-1 h-px"
                style={{ backgroundColor: theme.accent }}
              />
            </View>

            <TouchableOpacity
              onPress={() => router.push("/(guest)/guest_dashboard")}
              style={{
                backgroundColor: theme.bgPrimary,
                borderColor: theme.accent,
              }}
              >
              <Text
                style={{ color: theme.accent }}
                className="text-lg font-semibold text-center underline"
              >
                Guest User
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <View className="flex-1">
          <Image
            source={entryImg}
            className="w-full h-full"
            resizeMode="contain"
          />
        </View>
        <StatusBar
          barStyle={isDark ? "light-content" : "dark-content"}
          backgroundColor={theme.bgPrimary}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
