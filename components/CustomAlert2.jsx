import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableWithoutFeedback,
  ScrollView,
  Image,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useVideoPlayer, VideoView } from "expo-video";
import { useSafeAreaInsets } from "react-native-safe-area-context"; 


const AlertVideoPlayer = ({ uri }) => {
  const player = useVideoPlayer(uri, (player) => {
    player.loop = true;
    player.play();
  });

  return (
    <VideoView
      style={{ width: "100%", height: "100%" }}
      player={player}
      nativeControls={true}
      contentFit="contain"
    />
  );
};

const CustomAlert2 = ({
  visible,
  title,
  message,
  imageUrl,
  mediaType = "image",
  onClose,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets(); 

  
  
  
  if (imageUrl) {
    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={visible}
        onRequestClose={onClose}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.95)" }}>
          <View
            style={{
              position: "absolute",
              top: Math.max(insets.top, 16),
              right: 16,
              zIndex: 50,
            }}
          >
            <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
              <Ionicons
                name="close-circle"
                size={36}
                color="rgba(255,255,255,0.7)"
              />
            </TouchableOpacity>
          </View>

          <View
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            {mediaType === "video" ? (
              <AlertVideoPlayer uri={imageUrl} />
            ) : (
              <Image
                source={{ uri: imageUrl }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="contain"
              />
            )}
          </View>

          <View
            style={{
              position: "absolute",
              bottom: 0,
              width: "100%",
              backgroundColor: "rgba(0,0,0,0.8)",
              paddingHorizontal: 24,
              paddingTop: 24,
              paddingBottom: Math.max(insets.bottom, 24) + 16, 
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
            }}
          >
            <Text
              style={{
                color: "#fff",
                fontSize: 20,
                fontWeight: "bold",
                marginBottom: 8,
              }}
            >
              {title}
            </Text>
            {message ? (
              <ScrollView
                style={{ maxHeight: 150 }}
                showsVerticalScrollIndicator={false}
              >
                <Text
                  style={{
                    color: "rgba(255,255,255,0.7)",
                    fontSize: 15,
                    lineHeight: 22,
                  }}
                >
                  {message}
                </Text>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    );
  }

  
  
  
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View
          style={[
            styles.centeredView,
            { backgroundColor: theme.blackSoft80 || "rgba(0, 0, 0, 0.8)" },
          ]}
        >
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modalView,
                {
                  backgroundColor: theme.bgSecondary,
                  borderColor: theme.accent,
                  shadowColor: theme.shadow || "#000",
                },
              ]}
            >
              <Text style={[styles.title, { color: theme.textPrimary }]}>
                {title}
              </Text>

              {message ? (
                <ScrollView
                  style={{ maxHeight: 200, width: "100%" }}
                  showsVerticalScrollIndicator={false}
                >
                  <Text
                    style={[styles.message, { color: theme.textSecondary }]}
                  >
                    {message}
                  </Text>
                </ScrollView>
              ) : null}

              <Text style={[styles.hint, { color: theme.textMuted }]}>
                Tap outside to close
              </Text>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: { flex: 1, justifyContent: "center", alignItems: "center" },
  modalView: {
    width: "85%",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  message: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  hint: {
    marginTop: 20,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});

export default CustomAlert2;
