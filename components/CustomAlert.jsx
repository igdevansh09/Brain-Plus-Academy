import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "../context/ThemeContext"; 

const CustomAlert = ({
  visible,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "default",
  onConfirm,
  onCancel,
  isLoading = false, 
}) => {
  const { theme } = useTheme();

  

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <View
          style={{
            width: "80%",
            backgroundColor: theme.bgPrimary,
            borderRadius: 16,
            padding: 20,
          }}
        >
          <Text
            style={{
              fontSize: 20,
              fontWeight: "bold",
              color: theme.textPrimary,
              marginBottom: 10,
            }}
          >
            {title}
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: theme.textSecondary,
              marginBottom: 20,
            }}
          >
            {message}
          </Text>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              marginTop: 10,
            }}
          >
            <TouchableOpacity
              onPress={onCancel}
              disabled={isLoading} 
              style={{ padding: 10, marginRight: 10 }}
            >
              <Text
                style={{
                  color: isLoading ? theme.textMuted : theme.textSecondary,
                  fontWeight: "bold",
                }}
              >
                {cancelText}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onConfirm}
              disabled={isLoading} 
              style={{
                backgroundColor: theme.accent, 
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 8,
                justifyContent: "center",
                alignItems: "center",
                minWidth: 80, 
              }}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={theme.bgPrimary} />
              ) : (
                <Text style={{ color: theme.bgPrimary, fontWeight: "bold" }}>
                  {confirmText}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default CustomAlert;
