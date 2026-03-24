const {
  onDocumentCreated,
  onDocumentUpdated,
  onDocumentWritten,
} = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const {
  sendNotifications,
  cleanInvalidTokens,
  getStudentTokensByClass,
  getTeacherTokensForClass,
} = require("./helpers");

exports.onUserCreated = onDocumentCreated("users/{uid}", async (event) => {
  const newUser = event.data.data();

  if (newUser.role === "admin") return;

  try {
    let notifTitle = "";
    let notifBody = "";

    if (newUser.verified) {
      
      const adminName = newUser.createdByAdmin || "An Admin";

      notifTitle = `New ${newUser.role.charAt(0).toUpperCase() + newUser.role.slice(1)} Added ✅`;
      notifBody = `${adminName} has created a new account for ${newUser.name}.`;
    } else {
      
      notifTitle = "New Registration Request 📝";
      notifBody = `${newUser.name} has registered as a ${newUser.role} and is waiting for approval.`;
    }

    await admin.messaging().send({
      topic: "admins",
      notification: {
        title: notifTitle,
        body: notifBody,
      },
      data: {
        type: "admin_notice",
        userId: event.params.uid,
        userName: newUser.name || "",
        userRole: newUser.role || "",
        click_action: "FLUTTER_NOTIFICATION_CLICK",
      },
    });
  } catch (error) {
    console.error("Error in onUserCreated:", error);
  }
});

exports.onUserUpdated = onDocumentUpdated("users/{uid}", async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  const tokens = after.fcmTokens || [];

  if (tokens.length === 0) return;

  try {
    if (!before.verified && after.verified) {
      const result = await sendNotifications(
        tokens,
        "Account Approved ✅",
        "Welcome! Your account has been verified. You can now access the app.",
        { type: "account", userId: event.params.uid },
      );

      if (result.invalidTokens.length > 0) {
        await cleanInvalidTokens(event.params.uid, result.invalidTokens);
      }
      return;
    }

    if (before.verified && after.verified) {
      const changes = [];
      if (before.name !== after.name) changes.push("Name");
      if (before.phone !== after.phone) changes.push("Phone Number");

      if (after.role === "student") {
        if (before.standard !== after.standard) changes.push("Class");
        if (before.stream !== after.stream) changes.push("Stream");
        if (before.monthlyFeeAmount !== after.monthlyFeeAmount)
          changes.push("Fees");

        const beforeSub = JSON.stringify(
          [...(before.enrolledSubjects || [])].sort(),
        );
        const afterSub = JSON.stringify(
          [...(after.enrolledSubjects || [])].sort(),
        );
        if (beforeSub !== afterSub) changes.push("Subjects");
      }

      if (after.role === "teacher") {
        if (before.salary !== after.salary) changes.push("Salary");
        if (before.salaryType !== after.salaryType) changes.push("Salary Type");

        const beforeClasses = JSON.stringify(
          [...(before.classesTaught || [])].sort(),
        );
        const afterClasses = JSON.stringify(
          [...(after.classesTaught || [])].sort(),
        );
        if (beforeClasses !== afterClasses) changes.push("Classes Taught");

        const beforeTSub = JSON.stringify([...(before.subjects || [])].sort());
        const afterTSub = JSON.stringify([...(after.subjects || [])].sort());
        if (beforeTSub !== afterTSub) changes.push("Subjects");
      }

      if (changes.length > 0) {
        const result = await sendNotifications(
          tokens,
          "Profile Updated 🔄",
          `Admin has updated your: ${changes.join(", ")}.`,
          {
            type: "account",
            userId: event.params.uid,
            changes: changes.join(","),
          },
        );

        if (result.invalidTokens.length > 0) {
          await cleanInvalidTokens(event.params.uid, result.invalidTokens);
        }
      }
    }
  } catch (error) {
    console.error(`Error in onUserUpdated for ${event.params.uid}:`, error);
  }
});

exports.onGlobalNotice = onDocumentCreated("notices/{id}", async (event) => {
  const notice = event.data.data();

  try {
    const message = {
      notification: {
        title: `📢 ${notice.title}`,
        body: notice.content || "New global announcement from Admin.",
      },
      data: {
        type: "global_notice",
        noticeId: event.params.id,
        noticeTitle: notice.title || "",
        audience: notice.audience || "all",
        click_action: "FLUTTER_NOTIFICATION_CLICK",
      },
    };

    if (notice.audience === "teachers") {
      await admin.messaging().send({ ...message, topic: "teachers" });
    } else {
      await Promise.all([
        admin.messaging().send({ ...message, topic: "students" }),
        admin.messaging().send({ ...message, topic: "teachers" }),
      ]);
    }
  } catch (error) {
    console.error("Error in onGlobalNotice:", error);
  }
});

exports.onLeaveWrite = onDocumentWritten("leaves/{id}", async (event) => {
  try {
    
    if (!event.data.before.exists && event.data.after.exists) {
      const leave = event.data.after.data();
      const userDoc = await admin
        .firestore()
        .collection("users")
        .doc(leave.studentId)
        .get();
      if (!userDoc.exists) return;

      const userData = userDoc.data();
      const days = leave.duration || leave.days || "1";

      const teacherTokens = await getTeacherTokensForClass(userData.standard);
      await sendNotifications(
        teacherTokens,
        "Student Leave 🤒",
        `${userData.name} (${userData.standard}) submitted a ${days} day leave.`,
        {
          type: "teacher_leave",
          leaveId: event.params.id,
          studentId: leave.studentId,
          studentName: userData.name || "",
          classId: userData.standard || "",
        },
      );
      return;
    }

    if (event.data.before.exists && event.data.after.exists) {
      const before = event.data.before.data();
      const after = event.data.after.data();

      if (before.status !== after.status) {
        const userDoc = await admin
          .firestore()
          .collection("users")
          .doc(after.studentId)
          .get();
        const tokens = userDoc.data()?.fcmTokens || [];
        const emoji = after.status === "Approved" ? "✅" : "❌";

        if (tokens.length > 0) {
          await sendNotifications(
            tokens,
            `Leave ${after.status} ${emoji}`,
            `Your leave request has been ${after.status.toLowerCase()}.`,
            {
              type: "leave_status",
              leaveId: event.params.id,
              status: after.status,
            },
          );
        }
      }
    }
  } catch (error) {
    console.error(`Error in onLeaveWrite for ${event.params.id}:`, error);
  }
});

exports.onTeacherLeaveWrite = onDocumentWritten(
  "teacher_leaves/{id}",
  async (event) => {
    try {
      
      if (!event.data.before.exists && event.data.after.exists) {
        const leave = event.data.after.data();
        const userDoc = await admin
          .firestore()
          .collection("users")
          .doc(leave.teacherId)
          .get();
        if (!userDoc.exists) return;

        const userData = userDoc.data();

        await admin.messaging().send({
          topic: "admins",
          notification: {
            title: "Teacher Leave Submitted 📅",
            body: `${userData.name} has submitted a ${leave.duration || 1} day leave request.`,
          },
          data: {
            type: "admin_leave",
            leaveId: event.params.id,
            teacherId: leave.teacherId,
            teacherName: userData.name || "",
            click_action: "FLUTTER_NOTIFICATION_CLICK",
          },
        });
        return;
      }

      if (event.data.before.exists && event.data.after.exists) {
        const before = event.data.before.data();
        const after = event.data.after.data();

        if (before.status !== after.status) {
          const userDoc = await admin
            .firestore()
            .collection("users")
            .doc(after.teacherId)
            .get();
          const tokens = userDoc.data()?.fcmTokens || [];
          const emoji = after.status === "Approved" ? "✅" : "❌";

          if (tokens.length > 0) {
            await sendNotifications(
              tokens,
              `Leave ${after.status} ${emoji}`,
              `Your leave request has been ${after.status.toLowerCase()}.`,
              {
                type: "leave_status",
                leaveId: event.params.id,
                status: after.status,
              },
            );
          }
        }
      }
    } catch (error) {
      console.error(
        `Error in onTeacherLeaveWrite for ${event.params.id}:`,
        error,
      );
    }
  },
);

exports.onClassUpdate = onDocumentCreated(
  "class_notices/{id}",
  async (event) => {
    try {
      const notice = event.data.data();
      const { classId, teacherName, title } = notice;

      const studentTokens = await getStudentTokensByClass(classId);
      if (studentTokens.length > 0) {
        await sendNotifications(
          studentTokens,
          `New Update: ${classId} 🔔`,
          `${teacherName}: ${title}`,
          {
            type: "class_notice",
            noticeId: event.params.id,
            classId: classId || "",
            teacherName: teacherName || "",
          },
        );
      }

      await admin.messaging().send({
        topic: "admins",
        notification: {
          title: `Class Update: ${classId} 🔔`,
          body: `${teacherName}: ${title}`,
        },
        data: {
          type: "class_notice",
          noticeId: event.params.id,
          classId: classId || "",
          click_action: "FLUTTER_NOTIFICATION_CLICK",
        },
      });
    } catch (error) {
      console.error(`Error in onClassUpdate for ${event.params.id}:`, error);
    }
  },
);

exports.onCourseWrite = onDocumentWritten("courses/{id}", async (event) => {
  try {
    if (!event.data.after.exists) return;

    const course = event.data.after.data();
    const before = event.data.before.exists ? event.data.before.data() : null;
    const standard = (course.target || "").split(" ")[0];

    const title = !before ? "New Course Added 📚" : "Course Updated 🔄";
    const body = !before
      ? `New course '${course.title}' is available.`
      : `'${course.title}' content has been updated.`;

    const tokens = await getStudentTokensByClass(standard);
    await sendNotifications(tokens, title, body, {
      type: "courses",
      courseId: event.params.id,
      courseTitle: course.title || "",
      targetClass: standard || "",
    });
  } catch (error) {
    console.error(`Error in onCourseWrite for ${event.params.id}:`, error);
  }
});

exports.onAttendance = onDocumentCreated("attendance/{id}", async (event) => {
  try {
    const data = event.data.data();
    const studentIds = Object.keys(data.records || {});

    for (const uid of studentIds) {
      const status = data.records[uid];
      const userDoc = await admin
        .firestore()
        .collection("users")
        .doc(uid)
        .get();
      const tokens = userDoc.data()?.fcmTokens || [];

      if (tokens.length > 0) {
        const emoji = status === "Present" ? "✅" : "❌";
        await sendNotifications(
          tokens,
          "Attendance Marked 📝",
          `You were marked ${status} for ${data.date} ${emoji}`,
          {
            type: "attendance",
            attendanceId: event.params.id,
            date: data.date || "",
            status: status,
          },
        );
      }
    }
  } catch (error) {
    console.error(`Error in onAttendance for ${event.params.id}:`, error);
  }
});

exports.onTestResult = onDocumentCreated("test_results/{id}", async (event) => {
  try {
    const result = event.data.data();
    const userDoc = await admin
      .firestore()
      .collection("users")
      .doc(result.studentId)
      .get();
    const tokens = userDoc.data()?.fcmTokens || [];

    if (tokens.length > 0) {
      await sendNotifications(
        tokens,
        "Test Score Released 📊",
        `You scored ${result.marksObtained}/${result.totalMarks} in ${result.testName}.`,
        {
          type: "testscores",
          resultId: event.params.id,
          testName: result.testName || "",
          marks: `${result.marksObtained}/${result.totalMarks}`,
        },
      );
    }
  } catch (error) {
    console.error(`Error in onTestResult for ${event.params.id}:`, error);
  }
});

exports.onHomework = onDocumentCreated("homework/{id}", async (event) => {
  try {
    const hw = event.data.data();
    const tokens = await getStudentTokensByClass(hw.classId);
    await sendNotifications(
      tokens,
      "New Homework 🏠",
      `${hw.subject}: ${hw.title}`,
      {
        type: "homework",
        homeworkId: event.params.id,
        classId: hw.classId || "",
        subject: hw.subject || "",
      },
    );
  } catch (error) {
    console.error(`Error in onHomework for ${event.params.id}:`, error);
  }
});

exports.onMaterials = onDocumentCreated("materials/{id}", async (event) => {
  try {
    const mat = event.data.data();
    const tokens = await getStudentTokensByClass(mat.classId);
    await sendNotifications(
      tokens,
      "New Class Note 📖",
      `${mat.subject}: ${mat.title}`,
      {
        type: "materials",
        materialId: event.params.id,
        classId: mat.classId || "",
        subject: mat.subject || "",
      },
    );
  } catch (error) {
    console.error(`Error in onMaterials for ${event.params.id}:`, error);
  }
});
