import React, { useEffect, useRef } from "react";
import { View, Animated, Image, Text } from "react-native";
import { useTheme } from "../context/ThemeContext"; 

const AnimatedSplashScreen = () => {
  const { theme } = useTheme(); 
  const fadeAnim = useRef(new Animated.Value(0)).current; 
  const scaleAnim = useRef(new Animated.Value(0.3)).current; 
  const textAnim = useRef(new Animated.Value(0)).current; 

  useEffect(() => {
    
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(textAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View
      className="flex-1 justify-center items-center"
      style={{ backgroundColor: theme.bgPrimary }} 
    >
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
          alignItems: "center",
        }}
      >
        <Image
          source={require("../assets/images/icon.png")}
          style={{
            width: 120,
            height: 120,
            marginBottom: 20,
            borderRadius: 25,
          }}
          resizeMode="contain"
        />
      </Animated.View>

      <Animated.View style={{ opacity: textAnim, alignItems: "center" }}>
        <Text
          className="text-3xl font-bold tracking-wider"
          style={{ color: theme.accent }} 
        >
          Brain Plus
        </Text>
        <Text
          className="text-lg tracking-[5px] uppercase mt-2"
          style={{ color: theme.textSecondary }} 
        >
          Academy
        </Text>

        <View className="mt-10">
        </View>
      </Animated.View>
    </View>
  );
};

export default AnimatedSplashScreen;
