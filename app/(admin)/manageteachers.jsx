import React, { useState, useEffect, useMemo, useCallback, memo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Linking,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";


import { getIdToken } from "@react-native-firebase/auth";

import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
} from "@react-native-firebase/firestore";
import { httpsCallable } from "@react-native-firebase/functions";
import { auth, db, functions } from "../../config/firebaseConfig";

import CustomAlert from "../../components/CustomAlert";
import CustomToast from "../../components/CustomToast";
import ScreenWrapper from "../../components/ScreenWrapper";
import CustomHeader from "../../components/CustomHeader";
import { useTheme } from "../../context/ThemeContext";

const CLASS_OPTIONS = [
  "CS",
  "Prep",
  "1st",
  "2nd",
  "3rd",
  "4th",
  "5th",
  "6th",
  "7th",
  "8th",
  "9th",
  "10th",
  "11th",
  "12th",
];
const SUBJECT_OPTIONS = [
  "All Subjects",
  "English",
  "Hindi",
  "Maths",
  "Science",
  "Social Science",
  "Physics",
  "Chemistry",
  "Biology",
  "CS",
  "Accounts",
  "Business Studies",
  "Economics",
  "History",
  "Geography",
  "Political Science",
];


const TeacherCard = memo(
  ({
    item,
    theme,
    viewMode,
    onSelect,
    onCall,
    onApprove,
    onEdit,
    onDelete,
  }) => (
    <TouchableOpacity
      style={{
        backgroundColor: theme.bgSecondary,
        borderColor: theme.border,
        shadowColor: theme.shadow,
      }}
      className="p-4 rounded-xl mb-3 flex-row items-center border shadow-sm"
      onPress={() => onSelect(item)}
    >
      <TouchableOpacity onPress={() => onSelect(item)} className="mr-4">
        {item.profileImage ? (
          <Image
            source={{ uri: item.profileImage }}
            style={{ borderColor: theme.accent }}
            className="w-12 h-12 rounded-full border"
          />
        ) : (
          <View
            style={{
              backgroundColor: theme.accentSoft20,
              borderColor: theme.accentSoft50,
            }}
            className="w-12 h-12 rounded-full items-center justify-center border"
          >
            <Text style={{ color: theme.accent }} className="font-bold text-lg">
              {item.name ? item.name.charAt(0).toUpperCase() : "?"}
            </Text>
          </View>
        )}
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text
          style={{ color: theme.textPrimary }}
          className="font-bold text-lg"
          numberOfLines={1}
        >
          {item.name}
        </Text>
      </View>
      <View className="flex-row gap-2 ml-2">
        <TouchableOpacity
          onPress={() => onCall(item.phone)}
          style={{ backgroundColor: theme.infoSoft }}
          className="p-2 rounded-lg"
        >
          <Ionicons name="call" size={18} color={theme.infoBright} />
        </TouchableOpacity>
        {viewMode === "pending" ? (
          <TouchableOpacity
            onPress={() => onApprove(item)}
            style={{ backgroundColor: theme.successSoft }}
            className="p-2 rounded-lg"
          >
            <Ionicons name="checkmark" size={18} color={theme.successBright} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => onEdit(item)}
            style={{ backgroundColor: theme.warningSoft }}
            className="p-2 rounded-lg"
          >
            <Ionicons name="pencil" size={18} color={theme.warningAlt} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => onDelete(item.id)}
          style={{ backgroundColor: theme.errorSoft }}
          className="p-2 rounded-lg"
        >
          <Ionicons name="trash-outline" size={18} color={theme.error} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  ),
);

TeacherCard.displayName = "TeacherCard";

const ManageTeachers = () => {
  const router = useRouter();
  const { theme, isDark } = useTheme();

  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("active");
  const [selectedFilterClass, setSelectedFilterClass] = useState("All");

  
  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);

  
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState("create"); 
  const [editingId, setEditingId] = useState(null);

  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState(""); 
  const [formPassword, setFormPassword] = useState(""); 
  const [formSalary, setFormSalary] = useState("");
  const [formSalaryType, setFormSalaryType] = useState("Fixed");
  const [formProfile, setFormProfile] = useState([]);

  
  const [approvalSalary, setApprovalSalary] = useState("15000");
  const [approvalType, setApprovalType] = useState("Fixed");

  const [activeModalType, setActiveModalType] = useState(null);
  const [pendingEntry, setPendingEntry] = useState({ class: "", subject: "" });

  const [isApproving, setIsApproving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [toast, setToast] = useState({
    visible: false,
    msg: "",
    type: "success",
  });
  const [alert, setAlert] = useState({
    visible: false,
    title: "",
    msg: "",
    type: "default",
    onConfirm: null,
  });

  const showToast = useCallback(
    (msg, type = "success") => setToast({ visible: true, msg, type }),
    [],
  );

  
  useEffect(() => {
    setLoading(true);
    const isVerified = viewMode === "active";

    const q = query(
      collection(db, "users"),
      where("role", "==", "teacher"),
      where("verified", "==", isVerified),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setTeachers(list);
        setLoading(false);
      },
      (error) => {
        console.error("Firestore Error:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [viewMode]);

  
  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      const queryStr = searchQuery.toLowerCase();
      const matchesSearch =
        (t.name || "").toLowerCase().includes(queryStr) ||
        (t.phone || "").includes(queryStr);

      const matchesClass =
        selectedFilterClass === "All" ||
        t.teachingProfile?.some((p) => p.class === selectedFilterClass);

      return matchesSearch && matchesClass;
    });
  }, [teachers, searchQuery, selectedFilterClass]);

  
  
  
  
  const handleCall = useCallback(
    (phoneNumber) => {
      if (phoneNumber) Linking.openURL(`tel:${phoneNumber}`);
      else showToast("No phone number registered.", "error");
    },
    [showToast],
  );

  const handleSelectTeacher = useCallback((teacher) => {
    setSelectedTeacher(teacher);
    setDetailModalVisible(true);
  }, []);

  const initiateApproval = useCallback((teacher) => {
    setSelectedTeacher(teacher);
    setApproveModalVisible(true);
  }, []);

  const handleDelete = useCallback((id) => {
    setAlert((prev) => ({
      ...prev,
      visible: true,
      title: "Remove Teacher?",
      msg: "Permanent action.",
      type: "warning",
      onConfirm: () => performDelete(id),
    }));
  }, []);

  const openEditModal = useCallback((teacher) => {
    setModalMode("edit");
    setEditingId(teacher.id);
    setFormName(teacher.name || "");
    setFormEmail(teacher.email || "");
    const rawPhone = teacher.phone ? teacher.phone.replace("+91", "") : "";
    setFormPhone(rawPhone);
    setFormSalary(teacher.salary || "");
    setFormSalaryType(teacher.salaryType || "Fixed");
    setFormProfile(teacher.teachingProfile || []);
    setPendingEntry({ class: "", subject: "" });
    setFormModalVisible(true);
  }, []);

  
  const renderItem = useCallback(
    ({ item }) => (
      <TeacherCard
        item={item}
        theme={theme}
        viewMode={viewMode}
        onSelect={handleSelectTeacher}
        onCall={handleCall}
        onApprove={initiateApproval}
        onEdit={openEditModal}
        onDelete={handleDelete}
      />
    ),
    [
      theme,
      viewMode,
      handleSelectTeacher,
      handleCall,
      initiateApproval,
      openEditModal,
      handleDelete,
    ],
  );

  
  const openCreateModal = () => {
    setModalMode("create");
    setEditingId(null);
    setFormName("");
    setFormPhone("");
    setFormEmail("");
    setFormPassword("");
    setFormSalary("");
    setFormSalaryType("Fixed");
    setFormProfile([]);
    setPendingEntry({ class: "", subject: "" });
    setFormModalVisible(true);
  };

  const handleSubmitForm = async () => {
    if (!formName.trim()) return showToast("Name is required", "error");
    if (!formPhone || formPhone.length !== 10)
      return showToast("Valid 10-digit Phone required", "error");

    setIsSubmitting(true);
    try {
      if (modalMode === "create") {
        if (!formEmail.trim() || !formPassword.trim()) {
          setIsSubmitting(false);
          return showToast(
            "Email and Password are required to create a teacher.",
            "error",
          );
        }

        
        
        
        const currentUser = auth.currentUser;
        if (!currentUser) {
          setIsSubmitting(false);
          return showToast("Admin auth error. Restart app.", "error");
        }

        const token = await getIdToken(currentUser, true);

        const createTeacherFn = httpsCallable(functions, "createTeacher");
        await createTeacherFn({
          token: token,
          email: formEmail.trim(),
          password: formPassword,
          name: formName.trim(),
          phone: `+91${formPhone}`,
          salary: formSalary,
          salaryType: formSalaryType,
          teachingProfile: formProfile,
        });
        showToast("Teacher created successfully!", "success");
      } else {
        
        const updateUserFn = httpsCallable(functions, "updateUser");
        await updateUserFn({
          targetUid: editingId,
          updates: {
            name: formName.trim(),
            phone: `+91${formPhone}`,
            email: formEmail.trim(),
            salary: formSalary,
            salaryType: formSalaryType,
            teachingProfile: formProfile,
          },
        });
        showToast("Teacher updated successfully!", "success");
      }
      setFormModalVisible(false);
    } catch (error) {
      showToast(error.message || "Operation failed", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const performDelete = async (id) => {
    setAlert((prev) => ({ ...prev, visible: false }));
    setIsDeleting(true);
    try {
      const deleteUserFn = httpsCallable(functions, "deleteTargetUser");
      await deleteUserFn({ targetUid: id });
      showToast("Teacher deleted.", "success");
    } catch (error) {
      showToast("Delete failed: " + error.message, "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmApproval = async () => {
    setIsApproving(true);
    try {
      const teacherRef = doc(db, "users", selectedTeacher.id);
      await updateDoc(teacherRef, {
        salary: approvalType === "Fixed" ? approvalSalary : "0",
        salaryType: approvalType,
      });
      const approveUser = httpsCallable(functions, "approveUser");
      await approveUser({ targetUid: selectedTeacher.id });
      setApproveModalVisible(false);
      showToast("Teacher approved!", "success");
    } catch (e) {
      showToast("Approval failed.", "error");
    } finally {
      setIsApproving(false);
    }
  };

  const addToProfile = () => {
    if (!pendingEntry.class || !pendingEntry.subject)
      return showToast("Select Class & Subject", "error");
    if (
      formProfile.some(
        (p) =>
          p.class === pendingEntry.class && p.subject === pendingEntry.subject,
      )
    )
      return showToast("Already assigned", "error");
    setFormProfile([...formProfile, pendingEntry]);
    setPendingEntry({ class: "", subject: "" });
  };

  const removeFromProfile = (index) => {
    const updated = [...formProfile];
    updated.splice(index, 1);
    setFormProfile(updated);
  };

  return (
    <ScreenWrapper
      scrollable={false}
      edges={["top", "left", "right", "bottom"]}
      className="pt-1/4"
    >
      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.msg}
        type={alert.type}
        confirmText="Confirm"
        onCancel={() => setAlert({ ...alert, visible: false })}
        onConfirm={alert.onConfirm}
      />
      <CustomToast
        visible={toast.visible}
        message={toast.msg}
        type={toast.type}
        onHide={() => setToast({ ...toast, visible: false })}
      />

      <Modal visible={isDeleting} transparent animationType="fade">
        <View
          style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
          className="flex-1 justify-center items-center"
        >
          <View
            style={{ backgroundColor: theme.bgSecondary }}
            className="p-6 rounded-2xl items-center"
          >
            <ActivityIndicator size="large" color={theme.error} />
            <Text
              style={{ color: theme.textPrimary }}
              className="mt-4 font-bold"
            >
              Deleting Teacher...
            </Text>
          </View>
        </View>
      </Modal>

      <CustomHeader
        title="Manage Teachers"
        showBack={true}
        onBackPress={() => router.back()}
        rightComponent={
          <TouchableOpacity
            onPress={openCreateModal}
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

      <View className="px-4 mb-2 pt-4">
        <View
          style={{
            backgroundColor: theme.bgSecondary,
            borderColor: theme.border,
          }}
          className="flex-row items-center rounded-xl px-4 border"
        >
          <Ionicons name="search" size={20} color={theme.textMuted} />
          <TextInput
            placeholder="Search by name or phone..."
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{ color: theme.textPrimary }}
            className="flex-1 ml-3 font-medium py-3"
          />
        </View>
      </View>

      <View className="flex-row px-4 mb-2">
        <TouchableOpacity
          onPress={() => {
            setViewMode("active");
            setSelectedFilterClass("All");
          }}
          style={{
            borderColor: viewMode === "active" ? theme.accent : theme.border,
            borderBottomWidth: 2,
          }}
          className="flex-1 py-3 items-center"
        >
          <Text
            style={{
              color: viewMode === "active" ? theme.accent : theme.textSecondary,
              fontWeight: viewMode === "active" ? "bold" : "500",
            }}
          >
            Active Staff
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setViewMode("pending");
            setSelectedFilterClass("All");
          }}
          style={{
            borderColor: viewMode === "pending" ? theme.accent : theme.border,
            borderBottomWidth: 2,
          }}
          className="flex-1 py-3 items-center"
        >
          <Text
            style={{
              color:
                viewMode === "pending" ? theme.accent : theme.textSecondary,
              fontWeight: viewMode === "pending" ? "bold" : "500",
            }}
          >
            Requests
          </Text>
        </TouchableOpacity>
      </View>

      <View className="mb-2">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
        >
          {["All", ...CLASS_OPTIONS].map((cls) => (
            <TouchableOpacity
              key={cls}
              onPress={() => setSelectedFilterClass(cls)}
              style={{
                backgroundColor:
                  selectedFilterClass === cls
                    ? theme.accent
                    : theme.bgSecondary,
                borderColor:
                  selectedFilterClass === cls ? theme.accent : theme.border,
              }}
              className="px-4 py-2 rounded-full border mr-2"
            >
              <Text
                style={{
                  color:
                    selectedFilterClass === cls
                      ? theme.textDark
                      : theme.textSecondary,
                  fontWeight: "bold",
                  fontSize: 12,
                }}
              >
                {cls}
              </Text>
            </TouchableOpacity>
          ))}
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
          data={filteredTeachers}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          
          
          
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          ListEmptyComponent={() => (
            <View className="mt-20 items-center opacity-50">
              <Ionicons
                name="people-outline"
                size={64}
                color={theme.textMuted}
              />
              <Text style={{ color: theme.textMuted }} className="mt-4">
                No teachers match this filter
              </Text>
            </View>
          )}
        />
      )}

      <Modal
        visible={formModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => !isSubmitting && setFormModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View
            style={{ backgroundColor: theme.blackSoft80 }}
            className="flex-1 justify-end"
          >
            <View
              style={{
                backgroundColor: theme.bgSecondary,
                borderColor: theme.border,
              }}
              className="rounded-t-3xl p-6 h-[85%] border-t"
            >
              <View className="flex-row justify-between items-center mb-6">
                <Text
                  style={{ color: theme.textPrimary }}
                  className="text-xl font-bold"
                >
                  {modalMode === "create" ? "Add New Teacher" : "Edit Teacher"}
                </Text>
                <TouchableOpacity onPress={() => setFormModalVisible(false)}>
                  <Ionicons name="close" size={24} color={theme.textMuted} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text
                  style={{ color: theme.accent }}
                  className="mb-1 text-xs uppercase font-bold"
                >
                  Full Name
                </Text>
                <TextInput
                  value={formName}
                  onChangeText={setFormName}
                  placeholder="e.g. Rahul Sharma"
                  placeholderTextColor={theme.placeholder}
                  style={{
                    backgroundColor: theme.bgPrimary,
                    color: theme.textPrimary,
                    borderColor: theme.border,
                  }}
                  className="p-4 rounded-xl mb-4 border"
                />

                <Text
                  style={{ color: theme.accent }}
                  className="mb-1 text-xs uppercase font-bold"
                >
                  Phone (10 digits)
                </Text>
                <TextInput
                  value={formPhone}
                  onChangeText={setFormPhone}
                  keyboardType="phone-pad"
                  maxLength={10}
                  placeholder="9876543210"
                  placeholderTextColor={theme.placeholder}
                  style={{
                    backgroundColor: theme.bgPrimary,
                    color: theme.textPrimary,
                    borderColor: theme.border,
                  }}
                  className="p-4 rounded-xl mb-4 border"
                />

                <Text
                  style={{ color: theme.accent }}
                  className="mb-1 text-xs uppercase font-bold"
                >
                  Login Email
                </Text>
                <TextInput
                  value={formEmail}
                  onChangeText={setFormEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="teacher@academy.com"
                  placeholderTextColor={theme.placeholder}
                  style={{
                    backgroundColor: theme.bgPrimary,
                    color: theme.textPrimary,
                    borderColor: theme.border,
                  }}
                  className="p-4 rounded-xl mb-4 border"
                />

                {modalMode === "create" && (
                  <>
                    <Text
                      style={{ color: theme.accent }}
                      className="mb-1 text-xs uppercase font-bold"
                    >
                      Login Email
                    </Text>
                    <TextInput
                      value={formEmail}
                      onChangeText={setFormEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      placeholder="teacher@academy.com"
                      placeholderTextColor={theme.placeholder}
                      style={{
                        backgroundColor: theme.bgPrimary,
                        color: theme.textPrimary,
                        borderColor: theme.border,
                      }}
                      className="p-4 rounded-xl mb-4 border"
                    />

                    <Text
                      style={{ color: theme.accent }}
                      className="mb-1 text-xs uppercase font-bold"
                    >
                      Login Password
                    </Text>
                    <TextInput
                      value={formPassword}
                      onChangeText={setFormPassword}
                      
                      placeholder="Minimum 6 characters"
                      placeholderTextColor={theme.placeholder}
                      style={{
                        backgroundColor: theme.bgPrimary,
                        color: theme.textPrimary,
                        borderColor: theme.border,
                      }}
                      className="p-4 rounded-xl mb-4 border"
                    />
                  </>
                )}

                <View
                  style={{ borderColor: theme.border }}
                  className="mb-4 pt-2 border-t"
                >
                  <Text
                    style={{ color: theme.accent }}
                    className="mb-2 text-xs uppercase font-bold"
                  >
                    Teaching Profile
                  </Text>
                  {formProfile.map((p, idx) => (
                    <View
                      key={idx}
                      style={{
                        backgroundColor: theme.bgPrimary,
                        borderColor: theme.border,
                      }}
                      className="flex-row justify-between items-center p-3 rounded-lg mb-2 border"
                    >
                      <Text
                        style={{ color: theme.textPrimary, fontWeight: "bold" }}
                      >
                        {p.class} -{" "}
                        <Text style={{ color: theme.textSecondary }}>
                          {p.subject}
                        </Text>
                      </Text>
                      <TouchableOpacity onPress={() => removeFromProfile(idx)}>
                        <Ionicons name="trash" size={18} color={theme.error} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <View className="flex-row gap-2 mt-2">
                    <TouchableOpacity
                      onPress={() => setActiveModalType("class")}
                      style={{
                        backgroundColor: theme.bgPrimary,
                        borderColor: theme.border,
                      }}
                      className="flex-1 p-3 rounded-xl border"
                    >
                      <Text
                        style={{
                          color: pendingEntry.class
                            ? theme.textPrimary
                            : theme.textMuted,
                        }}
                      >
                        {pendingEntry.class || "Class"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setActiveModalType("subject")}
                      style={{
                        backgroundColor: theme.bgPrimary,
                        borderColor: theme.border,
                      }}
                      className="flex-1 p-3 rounded-xl border"
                    >
                      <Text
                        style={{
                          color: pendingEntry.subject
                            ? theme.textPrimary
                            : theme.textMuted,
                        }}
                      >
                        {pendingEntry.subject || "Subject"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={addToProfile}
                      style={{ backgroundColor: theme.accent }}
                      className="p-3 rounded-xl justify-center items-center"
                    >
                      <Ionicons name="add" size={24} color={theme.textDark} />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text
                  style={{ color: theme.accent }}
                  className="mb-1 text-xs uppercase font-bold"
                >
                  Salary Type
                </Text>
                <View
                  style={{
                    backgroundColor: theme.bgPrimary,
                    borderColor: theme.border,
                  }}
                  className="flex-row mb-4 rounded-lg p-1 border"
                >
                  {["Fixed", "Commission"].map((t) => (
                    <TouchableOpacity
                      key={t}
                      onPress={() => setFormSalaryType(t)}
                      style={{
                        backgroundColor:
                          formSalaryType === t ? theme.accent : "transparent",
                      }}
                      className="flex-1 py-2 rounded"
                    >
                      <Text
                        style={{
                          color:
                            formSalaryType === t
                              ? theme.textDark
                              : theme.textSecondary,
                          fontWeight: "bold",
                          textAlign: "center",
                        }}
                      >
                        {t}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {formSalaryType === "Fixed" && (
                  <TextInput
                    value={formSalary}
                    onChangeText={setFormSalary}
                    keyboardType="numeric"
                    placeholder="Monthly amount"
                    placeholderTextColor={theme.placeholder}
                    style={{
                      backgroundColor: theme.bgPrimary,
                      color: theme.textPrimary,
                      borderColor: theme.border,
                    }}
                    className="p-4 rounded-xl mb-8 border"
                  />
                )}

                <TouchableOpacity
                  onPress={handleSubmitForm}
                  disabled={isSubmitting}
                  style={{ backgroundColor: theme.accent }}
                  className="p-4 rounded-xl items-center mb-10"
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={theme.textDark} />
                  ) : (
                    <Text
                      style={{ color: theme.textDark }}
                      className="font-bold text-lg"
                    >
                      {modalMode === "create"
                        ? "Create Account"
                        : "Update Profile"}
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={!!activeModalType}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveModalType(null)}
      >
        <View
          style={{ backgroundColor: theme.blackSoft80 }}
          className="flex-1 justify-center p-6"
        >
          <View
            style={{
              backgroundColor: theme.bgSecondary,
              borderColor: theme.border,
            }}
            className="rounded-2xl max-h-[60%] overflow-hidden border"
          >
            <Text
              style={{
                color: theme.textPrimary,
                backgroundColor: theme.bgPrimary,
              }}
              className="text-center font-bold text-lg p-4"
            >
              Select {activeModalType}
            </Text>
            <FlatList
              data={
                activeModalType === "class" ? CLASS_OPTIONS : SUBJECT_OPTIONS
              }
              keyExtractor={(i) => i}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setPendingEntry((prev) => ({
                      ...prev,
                      [activeModalType]: item,
                    }));
                    setActiveModalType(null);
                  }}
                  style={{ borderColor: theme.border }}
                  className="p-4 border-b flex-row justify-between"
                >
                  <Text
                    style={{ color: theme.textPrimary }}
                    className="font-medium"
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              onPress={() => setActiveModalType(null)}
              style={{ backgroundColor: theme.bgPrimary }}
              className="p-4 items-center"
            >
              <Text style={{ color: theme.accent }} className="font-bold">
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={approveModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !isApproving && setApproveModalVisible(false)}
      >
        <View
          style={{ backgroundColor: theme.blackSoft80 }}
          className="flex-1 justify-center p-6"
        >
          <View
            style={{
              backgroundColor: theme.bgSecondary,
              borderColor: theme.border,
            }}
            className="rounded-2xl p-6 border"
          >
            <Text
              style={{ color: theme.textPrimary }}
              className="text-xl font-bold mb-2"
            >
              Approve Teacher
            </Text>
            <View
              style={{
                backgroundColor: theme.bgPrimary,
                borderColor: theme.border,
              }}
              className="flex-row mb-4 rounded-lg p-1 border mt-4"
            >
              {["Fixed", "Commission"].map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setApprovalType(t)}
                  style={{
                    backgroundColor:
                      approvalType === t ? theme.accent : "transparent",
                  }}
                  className="flex-1 py-2 rounded"
                >
                  <Text
                    style={{
                      color:
                        approvalType === t
                          ? theme.textDark
                          : theme.textSecondary,
                      fontWeight: "bold",
                      textAlign: "center",
                    }}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {approvalType === "Fixed" && (
              <TextInput
                value={approvalSalary}
                onChangeText={setApprovalSalary}
                keyboardType="numeric"
                style={{
                  backgroundColor: theme.bgPrimary,
                  color: theme.textPrimary,
                  borderColor: theme.border,
                }}
                className="p-4 rounded-xl mb-6 font-bold text-lg border"
              />
            )}
            <View className="flex-row gap-4">
              <TouchableOpacity
                onPress={() => setApproveModalVisible(false)}
                disabled={isApproving}
                style={{
                  backgroundColor: theme.bgPrimary,
                  opacity: isApproving ? 0.6 : 1,
                }}
                className="flex-1 p-4 rounded-xl items-center"
              >
                <Text
                  style={{ color: theme.textPrimary }}
                  className="font-bold"
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmApproval}
                disabled={isApproving}
                style={{ backgroundColor: theme.accent }}
                className="flex-1 p-4 rounded-xl items-center justify-center"
              >
                {isApproving ? (
                  <ActivityIndicator color={theme.textDark} />
                ) : (
                  <Text style={{ color: theme.textDark }} className="font-bold">
                    Approve
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={detailModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View
          style={{ backgroundColor: theme.blackSoft80 }}
          className="flex-1 justify-center p-6"
        >
          <View
            style={{
              backgroundColor: theme.bgSecondary,
              borderColor: theme.border,
            }}
            className="rounded-2xl p-6 relative border"
          >
            <TouchableOpacity
              onPress={() => setDetailModalVisible(false)}
              className="absolute top-4 right-4 z-10"
            >
              <Ionicons name="close" size={24} color={theme.textMuted} />
            </TouchableOpacity>
            <View className="items-center mb-6">
              {selectedTeacher?.profileImage ? (
                <Image
                  source={{ uri: selectedTeacher.profileImage }}
                  style={{ borderColor: theme.accent }}
                  className="w-20 h-20 rounded-full border-2 mb-4"
                />
              ) : (
                <View
                  style={{ backgroundColor: theme.accent }}
                  className="w-20 h-20 rounded-full items-center justify-center mb-4"
                >
                  <Text
                    style={{ color: theme.textDark }}
                    className="text-3xl font-bold"
                  >
                    {selectedTeacher?.name?.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text
                style={{ color: theme.textPrimary }}
                className="text-2xl font-bold"
              >
                {selectedTeacher?.name}
              </Text>
              <Text style={{ color: theme.textSecondary }}>
                {selectedTeacher?.phone}
              </Text>
            </View>
            <ScrollView style={{ maxHeight: 300 }}>
              <View
                style={{
                  backgroundColor: theme.bgPrimary,
                  borderColor: theme.border,
                }}
                className="p-4 rounded-xl mb-4 border"
              >
                <Text
                  style={{ color: theme.textSecondary }}
                  className="text-xs uppercase mb-2 font-bold"
                >
                  Teaching Profile
                </Text>
                {selectedTeacher?.teachingProfile?.map((item, idx) => (
                  <View
                    key={idx}
                    style={{ borderColor: theme.borderSoft }}
                    className="flex-row justify-between mb-2 pb-2 border-b"
                  >
                    <Text
                      style={{ color: theme.textPrimary }}
                      className="font-medium"
                    >
                      {item.class}
                    </Text>
                    <Text style={{ color: theme.accent }} className="font-bold">
                      {item.subject}
                    </Text>
                  </View>
                ))}
              </View>
              <View
                style={{
                  backgroundColor: theme.bgPrimary,
                  borderColor: theme.border,
                }}
                className="p-4 rounded-xl border"
              >
                <Text
                  style={{ color: theme.textSecondary }}
                  className="text-xs uppercase mb-1 font-bold"
                >
                  Salary Info
                </Text>
                <Text
                  style={{ color: theme.successBright }}
                  className="text-2xl font-bold"
                >
                  {selectedTeacher?.salaryType === "Commission"
                    ? "Commission Based"
                    : `₹ ${selectedTeacher?.salary}`}
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
};

export default ManageTeachers;
