import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { getIdToken } from "@react-native-firebase/auth";
import { auth } from "../config/firebaseConfig";

import { httpsCallable } from "@react-native-firebase/functions";
import { functions } from "../config/firebaseConfig";
import { useTheme } from "../context/ThemeContext";
import CustomAlert from "./CustomAlert";

const SecuritySettingsModal = ({ visible, onClose, showToast }) => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState("password");

  
  const [loading, setLoading] = useState(false); 
  const [isDeleting, setIsDeleting] = useState(false); 

  
  const [newPassword, setNewPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");

  
  const [successAlert, setSuccessAlert] = useState({
    visible: false,
    title: "",
    message: "",
  });
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

  const resetForm = () => {
    setNewPassword("");
    setNewEmail("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleUpdate = async () => {
    setLoading(true);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setLoading(false);
        return showToast("Auth error. Please restart the app.", "error");
      }
      const token = await getIdToken(currentUser, true);
      const updateSecurityFn = httpsCallable(functions, "updateOwnSecurity");

      if (activeTab === "password") {
        if (newPassword.length < 6) {
          setLoading(false);
          return showToast(
            "New password must be at least 6 characters.",
            "error",
          );
        }
        await updateSecurityFn({ token: token, newPassword: newPassword });
        setSuccessAlert({
          visible: true,
          title: "Security Updated",
          message: "Your password has been changed successfully.",
        });
      } else if (activeTab === "email") {
        if (!newEmail.includes("@")) {
          setLoading(false);
          return showToast("Please enter a valid email.", "error");
        }
        await updateSecurityFn({ token: token, newEmail: newEmail.trim() });
        setSuccessAlert({
          visible: true,
          title: "Security Updated",
          message: "Your login email has been changed successfully.",
        });
      }
    } catch (error) {
      let errorMsg = error.message;
      if (
        errorMsg.includes("email-already-in-use") ||
        errorMsg.includes("email address is already in use")
      ) {
        errorMsg = "This email is already taken by another account.";
      }
      showToast(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  
  const handleRequestDeletion = async () => {
    
    setIsDeleting(true);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setIsDeleting(false);
        setDeleteConfirmVisible(false);
        return showToast("Auth error. Please restart the app.", "error");
      }

      const token = await getIdToken(currentUser, true);
      const requestDeletionFn = httpsCallable(
        functions,
        "requestAccountDeletion",
      );

      await requestDeletionFn({ token: token });

      
      setDeleteConfirmVisible(false);
      setSuccessAlert({
        visible: true,
        title: "Request Sent",
        message:
          "Your account deletion request has been forwarded to the administration. We will process it shortly.",
      });
    } catch (error) {
      setDeleteConfirmVisible(false); 
      showToast(error.message, "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAlertConfirm = () => {
    setSuccessAlert({ visible: false, title: "", message: "" });
    handleClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {}
        <CustomAlert
          visible={successAlert.visible}
          title={successAlert.title}
          message={successAlert.message}
          confirmText="OK"
          onConfirm={handleAlertConfirm}
          onCancel={handleAlertConfirm}
        />

        {}
        <CustomAlert
          visible={deleteConfirmVisible}
          title="Delete Account?"
          message="Are you sure you want to request account deletion? This action cannot be undone once processed by the Admin."
          type="error"
          confirmText="Send Request"
          cancelText="Cancel"
          isLoading={isDeleting} 
          onConfirm={handleRequestDeletion}
          onCancel={() => {
            
            if (!isDeleting) setDeleteConfirmVisible(false);
          }}
        />

        <View
          style={{ backgroundColor: "rgba(0,0,0,0.8)" }}
          className="flex-1 justify-end"
        >
          <View
            style={{
              backgroundColor: theme.bgSecondary,
              borderColor: theme.border,
            }}
            className="rounded-t-3xl p-6 border-t"
          >
            <View className="flex-row justify-between items-center mb-6">
              <Text
                style={{ color: theme.textPrimary }}
                className="text-xl font-bold"
              >
                Security Settings
              </Text>
              <TouchableOpacity onPress={handleClose}>
                <Ionicons name="close" size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {}
            <View
              style={{
                backgroundColor: theme.bgPrimary,
                borderColor: theme.border,
              }}
              className="flex-row mb-6 rounded-lg p-1 border"
            >
              <TouchableOpacity
                onPress={() => {
                  setActiveTab("password");
                  resetForm();
                }}
                style={{
                  backgroundColor:
                    activeTab === "password" ? theme.accent : "transparent",
                }}
                className="flex-1 py-3 rounded-md items-center"
              >
                <Text
                  style={{
                    color:
                      activeTab === "password"
                        ? theme.textDark
                        : theme.textSecondary,
                    fontWeight: "bold",
                  }}
                >
                  Change Password
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setActiveTab("email");
                  resetForm();
                }}
                style={{
                  backgroundColor:
                    activeTab === "email" ? theme.accent : "transparent",
                }}
                className="flex-1 py-3 rounded-md items-center"
              >
                <Text
                  style={{
                    color:
                      activeTab === "email"
                        ? theme.textDark
                        : theme.textSecondary,
                    fontWeight: "bold",
                  }}
                >
                  Change Email
                </Text>
              </TouchableOpacity>
            </View>

            {activeTab === "password" ? (
              <>
                <Text
                  style={{ color: theme.accent }}
                  className="mb-1 text-xs uppercase font-bold"
                >
                  New Password
                </Text>
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                
                  placeholder="Minimum 6 characters"
                  placeholderTextColor={theme.placeholder}
                  style={{
                    backgroundColor: theme.bgPrimary,
                    color: theme.textPrimary,
                    borderColor: theme.border,
                  }}
                  className="p-4 rounded-xl mb-8 border"
                />
              </>
            ) : (
              <>
                <Text
                  style={{ color: theme.accent }}
                  className="mb-1 text-xs uppercase font-bold"
                >
                  New Login Email
                </Text>
                <TextInput
                  value={newEmail}
                  onChangeText={setNewEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="new.email@example.com"
                  placeholderTextColor={theme.placeholder}
                  style={{
                    backgroundColor: theme.bgPrimary,
                    color: theme.textPrimary,
                    borderColor: theme.border,
                  }}
                  className="p-4 rounded-xl mb-8 border"
                />
              </>
            )}

            <TouchableOpacity
              onPress={handleUpdate}
              disabled={loading}
              style={{ backgroundColor: theme.accent }}
              className="p-4 rounded-xl items-center mb-6"
            >
              {loading ? (
                <ActivityIndicator color={theme.textDark} />
              ) : (
                <Text
                  style={{ color: theme.textDark }}
                  className="font-bold text-lg"
                >
                  Update Security
                </Text>
              )}
            </TouchableOpacity>

            <View
              style={{ borderTopWidth: 1, borderColor: theme.border }}
              className="pt-4 mt-2 mb-10 items-center"
            >
              <TouchableOpacity
                onPress={() => setDeleteConfirmVisible(true)}
                disabled={loading}
                className="py-2 px-4 rounded-lg"
              >
                <Text
                  style={{ color: theme.error }}
                  className="font-bold text-sm"
                >
                  Request Account Deletion
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default SecuritySettingsModal;
