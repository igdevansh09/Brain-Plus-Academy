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


import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
} from "@react-native-firebase/firestore";
import { httpsCallable } from "@react-native-firebase/functions";
import { getIdToken } from "@react-native-firebase/auth"; 
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
const STREAM_OPTIONS = ["Science", "Commerce", "Arts"];
const SUB_GENERAL = ["English", "Hindi", "Maths", "Science", "Social Science"];
const SUB_SCIENCE = [
  "Physics",
  "Chemistry",
  "Maths",
  "Biology",
  "English",
  "CS",
];
const SUB_COMMERCE = [
  "Accounts",
  "Business Studies",
  "Economics",
  "Maths",
  "English",
];
const SUB_ARTS = [
  "History",
  "Geography",
  "Political Science",
  "Economics",
  "English",
  "Hindi",
];


const StudentCard = memo(
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

StudentCard.displayName = "StudentCard";

const ManageStudents = () => {
  const router = useRouter();
  const { theme, isDark } = useTheme();

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("active");
  const [selectedFilterClass, setSelectedFilterClass] = useState("All");

  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [approvalFee, setApprovalFee] = useState("5000");

  const [formModalVisible, setFormModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [editingId, setEditingId] = useState(null);

  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formClass, setFormClass] = useState("");
  const [formStream, setFormStream] = useState("");
  const [formSubjects, setFormSubjects] = useState([]);
  const [formFee, setFormFee] = useState("");

  const [activeModalType, setActiveModalType] = useState(null);
  const [availableSubjects, setAvailableSubjects] = useState([]);

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
    const q = query(
      collection(db, "users"),
      where("role", "==", "student"),
      where("verified", "==", viewMode === "active"),
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setStudents(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        );
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsubscribe();
  }, [viewMode]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const queryStr = searchQuery.toLowerCase();
      const matchesSearch =
        (s.name || "").toLowerCase().includes(queryStr) ||
        (s.phone || "").includes(queryStr);
      const matchesClass =
        selectedFilterClass === "All" || s.standard === selectedFilterClass;
      return matchesSearch && matchesClass;
    });
  }, [students, searchQuery, selectedFilterClass]);

  const getSubjectsList = useCallback((cls, stream) => {
    if (cls === "CS" || ["Prep", "1st", "2nd", "3rd"].includes(cls)) return [];
    if (["4th", "5th", "6th", "7th", "8th", "9th", "10th"].includes(cls))
      return SUB_GENERAL;
    if (["11th", "12th"].includes(cls)) {
      if (stream === "Science") return SUB_SCIENCE;
      if (stream === "Commerce") return SUB_COMMERCE;
      if (stream === "Arts") return SUB_ARTS;
    }
    return [];
  }, []);

  const toggleSubject = useCallback((subject) => {
    setFormSubjects((prev) =>
      prev.includes(subject)
        ? prev.filter((s) => s !== subject)
        : [...prev, subject],
    );
  }, []);

  const handleCall = useCallback(
    (phoneNumber) => {
      if (phoneNumber) Linking.openURL(`tel:${phoneNumber}`);
      else showToast("No phone number registered.", "error");
    },
    [showToast],
  );

  const handleSelectStudent = useCallback((student) => {
    setSelectedStudent(student);
    setDetailModalVisible(true);
  }, []);

  const initiateApproval = useCallback((student) => {
    setSelectedStudent(student);
    setApproveModalVisible(true);
  }, []);

  const handleDelete = useCallback((id) => {
    setAlert((prev) => ({
      ...prev,
      visible: true,
      title: "Delete Student?",
      msg: "This action cannot be undone.",
      type: "warning",
      onConfirm: () => performDelete(id),
    }));
  }, []);

  const openEditModal = useCallback(
    (student) => {
      setModalMode("edit");
      setEditingId(student.id);
      setFormName(student.name || "");
      setFormEmail(student.email || "");
      setFormPhone(student.phone ? student.phone.replace("+91", "") : "");
      const cls = student.standard || student.studentClass || "";
      const strm = student.stream || "N/A";
      setFormClass(cls);
      setFormStream(strm);
      setFormSubjects(student.enrolledSubjects || []);
      setFormFee(student.monthlyFeeAmount || "");
      setAvailableSubjects(getSubjectsList(cls, strm));
      setFormModalVisible(true);
    },
    [getSubjectsList],
  );

  const renderItem = useCallback(
    ({ item }) => (
      <StudentCard
        item={item}
        theme={theme}
        viewMode={viewMode}
        onSelect={handleSelectStudent}
        onCall={handleCall}
        onApprove={initiateApproval}
        onEdit={openEditModal}
        onDelete={handleDelete}
      />
    ),
    [
      theme,
      viewMode,
      handleSelectStudent,
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
    setFormClass("");
    setFormStream("");
    setFormSubjects([]);
    setFormFee("");
    setAvailableSubjects([]);
    setFormModalVisible(true);
  };

  
  const handleSelection = (type, value) => {
    if (type === "class") {
      setFormClass(value);
      
      if (value === "CS") {
        setFormStream("N/A");
        setFormSubjects(["CS"]);
        setAvailableSubjects([]);
      } else if (["Prep", "1st", "2nd", "3rd"].includes(value)) {
        setFormStream("N/A");
        setFormSubjects(["All Subjects"]);
        setAvailableSubjects([]);
      } else if (
        ["4th", "5th", "6th", "7th", "8th", "9th", "10th"].includes(value)
      ) {
        setFormStream("N/A");
        setFormSubjects([]); 
        setAvailableSubjects(SUB_GENERAL);
      } else if (["11th", "12th"].includes(value)) {
        setFormStream(""); 
        setFormSubjects([]); 
        setAvailableSubjects([]); 
      }
      setActiveModalType(null); 
    } else if (type === "stream") {
      setFormStream(value);
      setFormSubjects([]); 
      setAvailableSubjects(getSubjectsList(formClass, value));
      setActiveModalType(null); 
    }
  };

  
  const handleSubmitForm = async () => {
    if (!formName.trim() || !formClass || !formFee.trim())
      return showToast("Name, Class, Fee required", "error");
    if (!formPhone || formPhone.length !== 10)
      return showToast("Valid 10-digit Phone required", "error");

    setIsSubmitting(true);
    try {
      if (modalMode === "create") {
        if (!formEmail.trim() || !formPassword.trim()) {
          setIsSubmitting(false);
          return showToast("Email and Password are required.", "error");
        }

        
        const currentUser = auth.currentUser;
        if (!currentUser) {
          setIsSubmitting(false);
          return showToast("Admin auth error. Restart app.", "error");
        }

        const token = await getIdToken(currentUser, true);

        const createStudentFn = httpsCallable(functions, "createStudent");
        await createStudentFn({
          token: token, 
          email: formEmail.trim(),
          password: formPassword,
          name: formName.trim(),
          phone: `+91${formPhone}`,
          standard: formClass,
          stream: formStream,
          enrolledSubjects: formSubjects,
          monthlyFeeAmount: formFee,
        });
        showToast("Student created successfully!", "success");
      } else {
        const updateUserFn = httpsCallable(functions, "updateUser");
        await updateUserFn({
          targetUid: editingId,
          updates: {
            name: formName.trim(),
            phone: `+91${formPhone}`,
            email: formEmail.trim(),
            standard: formClass,
            stream: formStream,
            enrolledSubjects: formSubjects,
            monthlyFeeAmount: formFee,
          },
        });
        showToast("Student updated successfully!", "success");
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
      showToast("Student deleted.", "success");
    } catch (error) {
      showToast("Delete failed: " + error.message, "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmApproval = async () => {
    setIsApproving(true);
    try {
      const studentRef = doc(db, "users", selectedStudent.id);
      await updateDoc(studentRef, { monthlyFeeAmount: approvalFee });
      const approveUser = httpsCallable(functions, "approveUser");
      await approveUser({ targetUid: selectedStudent.id });
      setApproveModalVisible(false);
      showToast("Student approved!", "success");
    } catch (e) {
      showToast("Approval failed.", "error");
    } finally {
      setIsApproving(false);
    }
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
              Deleting Student...
            </Text>
          </View>
        </View>
      </Modal>

      <CustomHeader
        title="Manage Students"
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
            Active Students
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
          data={filteredStudents}
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
                name="school-outline"
                size={64}
                color={theme.textMuted}
              />
              <Text style={{ color: theme.textMuted }} className="mt-4">
                No students found
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
                  {modalMode === "create" ? "Add New Student" : "Edit Student"}
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
                  placeholder="e.g. Avinash Tiwari"
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
                  placeholder="98765XXXXX"
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
                  placeholder="student@academy.com"
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

                <View className="flex-row gap-4 mb-4 mt-2">
                  <View className="flex-1">
                    <Text
                      style={{ color: theme.accent }}
                      className="mb-1 text-xs uppercase font-bold"
                    >
                      Class
                    </Text>
                    <TouchableOpacity
                      onPress={() => setActiveModalType("class")}
                      style={{
                        backgroundColor: theme.bgPrimary,
                        borderColor: theme.border,
                      }}
                      className="p-4 rounded-xl border"
                    >
                      <Text style={{ color: theme.textPrimary }}>
                        {formClass || "Select"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {["11th", "12th"].includes(formClass) && (
                    <View className="flex-1">
                      <Text
                        style={{ color: theme.accent }}
                        className="mb-1 text-xs uppercase font-bold"
                      >
                        Stream
                      </Text>
                      <TouchableOpacity
                        onPress={() => setActiveModalType("stream")}
                        style={{
                          backgroundColor: theme.bgPrimary,
                          borderColor: theme.border,
                        }}
                        className="p-4 rounded-xl border"
                      >
                        <Text style={{ color: theme.textPrimary }}>
                          {formStream || "Select"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {availableSubjects.length > 0 && (
                  <View className="mb-4">
                    <Text
                      style={{ color: theme.accent }}
                      className="mb-2 text-xs uppercase font-bold"
                    >
                      Subjects
                    </Text>
                    <TouchableOpacity
                      onPress={() => setActiveModalType("subject")}
                      style={{
                        backgroundColor: theme.bgPrimary,
                        borderColor: theme.border,
                      }}
                      className="p-4 rounded-xl border"
                    >
                      <Text
                        style={{ color: theme.textPrimary }}
                        numberOfLines={1}
                      >
                        {formSubjects.length
                          ? formSubjects.join(", ")
                          : "Select Subjects"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                <Text
                  style={{ color: theme.accent }}
                  className="mb-1 text-xs uppercase font-bold"
                >
                  Monthly Fee (₹)
                </Text>
                <TextInput
                  value={formFee}
                  onChangeText={setFormFee}
                  keyboardType="numeric"
                  placeholder="e.g. 5000"
                  placeholderTextColor={theme.placeholder}
                  style={{
                    backgroundColor: theme.bgPrimary,
                    color: theme.textPrimary,
                    borderColor: theme.border,
                  }}
                  className="p-4 rounded-xl mb-8 font-bold text-lg border"
                />

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
                        : "Save Changes"}
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
                activeModalType === "class"
                  ? CLASS_OPTIONS
                  : activeModalType === "stream"
                    ? STREAM_OPTIONS
                    : availableSubjects
              }
              keyExtractor={(i) => i}
              renderItem={({ item }) => {
                const isSelected =
                  activeModalType === "subject"
                    ? formSubjects.includes(item)
                    : false;
                return (
                  <TouchableOpacity
                    onPress={() =>
                      activeModalType === "class"
                        ? handleSelection("class", item)
                        : activeModalType === "stream"
                          ? handleSelection("stream", item)
                          : toggleSubject(item)
                    }
                    style={{
                      borderColor: theme.border,
                      backgroundColor: isSelected
                        ? theme.accentSoft20
                        : "transparent",
                    }}
                    className="p-4 border-b flex-row justify-between"
                  >
                    <Text
                      style={{
                        color: isSelected ? theme.accent : theme.textPrimary,
                      }}
                      className="font-medium"
                    >
                      {item}
                    </Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={theme.accent}
                      />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity
              onPress={() => setActiveModalType(null)}
              style={{ backgroundColor: theme.bgPrimary }}
              className="p-4 items-center"
            >
              <Text style={{ color: theme.accent }} className="font-bold">
                Done
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
              Approve Student
            </Text>
            <Text style={{ color: theme.textSecondary }} className="mb-6">
              Confirm verifying {selectedStudent?.name}.
            </Text>
            <Text
              style={{ color: theme.accent }}
              className="mb-1 text-xs uppercase font-bold"
            >
              Monthly Fee (₹)
            </Text>
            <TextInput
              value={approvalFee}
              onChangeText={setApprovalFee}
              keyboardType="numeric"
              style={{
                backgroundColor: theme.bgPrimary,
                color: theme.textPrimary,
                borderColor: theme.border,
              }}
              className="p-4 rounded-xl mb-6 font-bold text-lg border"
            />
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
              {selectedStudent?.profileImage ? (
                <Image
                  source={{ uri: selectedStudent.profileImage }}
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
                    {selectedStudent?.name?.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text
                style={{ color: theme.textPrimary }}
                className="text-2xl font-bold"
              >
                {selectedStudent?.name}
              </Text>
              <Text style={{ color: theme.textSecondary }}>
                {selectedStudent?.phone}
              </Text>
            </View>
            <View
              style={{
                backgroundColor: theme.bgPrimary,
                borderColor: theme.border,
              }}
              className="p-4 rounded-xl mb-4 border"
            >
              <Text
                style={{ color: theme.textSecondary }}
                className="text-xs uppercase mb-1"
              >
                Academic
              </Text>
              <View className="flex-row justify-between mb-2">
                <Text style={{ color: theme.textPrimary }}>Class</Text>
                <Text style={{ color: theme.accent }} className="font-bold">
                  {selectedStudent?.standard}
                </Text>
              </View>
              {selectedStudent?.stream !== "N/A" && (
                <View className="flex-row justify-between mb-2">
                  <Text style={{ color: theme.textPrimary }}>Stream</Text>
                  <Text
                    style={{ color: theme.textPrimary }}
                    className="font-bold"
                  >
                    {selectedStudent?.stream}
                  </Text>
                </View>
              )}
              <Text
                style={{ color: theme.textPrimary, borderColor: theme.border }}
                className="mt-2 pt-2 border-t text-sm"
              >
                {selectedStudent?.enrolledSubjects?.join(", ")}
              </Text>
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
                className="text-xs uppercase mb-1"
              >
                Fee Status
              </Text>
              <Text
                style={{ color: theme.successBright }}
                className="text-2xl font-bold"
              >
                ₹ {selectedStudent?.monthlyFeeAmount}
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
};

export default ManageStudents;
