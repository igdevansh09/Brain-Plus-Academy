const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const { sendNotifications } = require("./helpers");

exports.onSalaryWrite = onDocumentWritten("salaries/{id}", async (event) => {
  try {
    if (!event.data.before.exists && event.data.after.exists) {
      const salary = event.data.after.data();
      const userDoc = await admin
        .firestore()
        .collection("users")
        .doc(salary.teacherId)
        .get();
      const tokens = userDoc.data()?.fcmTokens || [];
      if (tokens.length > 0) {
        await sendNotifications(
          tokens,
          "Salary Slip Generated 💵",
          `Payslip for ${salary.title} is now available.`,
          {
            type: "salary",
            salaryId: event.params.id,
            teacherId: salary.teacherId,
            title: salary.title || "",
          },
        );
      }
      return;
    }

    if (event.data.before.exists && event.data.after.exists) {
      const before = event.data.before.data();
      const after = event.data.after.data();

      if (before.status !== "Paid" && after.status === "Paid") {
        const userDoc = await admin
          .firestore()
          .collection("users")
          .doc(after.teacherId)
          .get();
        const tokens = userDoc.data()?.fcmTokens || [];
        if (tokens.length > 0) {
          await sendNotifications(
            tokens,
            "Salary Credited 🏦",
            `Your salary for ${after.title} has been marked as Paid.`,
            {
              type: "salary",
              salaryId: event.params.id,
              status: "Paid",
              title: after.title || "",
            },
          );
        }
      }
    }
  } catch (error) {
    console.error(`Error in onSalaryWrite for ${event.params.id}:`, error);
  }
});

exports.generateMonthlySalaries = onCall(async (request) => {
  if (request.auth?.token?.role !== "admin")
    throw new HttpsError("permission-denied", "Admin access required.");

  const db = admin.firestore();
  const date = new Date();
  const month = date.toLocaleString("default", { month: "long" });
  const year = date.getFullYear();
  const currentTitle = `Salary - ${month} ${year}`;
  const salaryDate = date.toLocaleDateString("en-GB");

  const writer = db.bulkWriter();
  writer.onWriteError((error) => {
    if (error.code === 6) return false;
    return true;
  });

  try {
    const teachersStream = db
      .collection("users")
      .where("role", "==", "teacher")
      .where("verified", "==", true)
      .where("salaryType", "==", "Fixed")
      .stream();
    let count = 0;

    for await (const doc of teachersStream) {
      const teacher = doc.data();
      const docId = `${doc.id}_${month}_${year}`;
      const salaryRef = db.collection("salaries").doc(docId);

      writer.create(salaryRef, {
        teacherId: doc.id,
        teacherName: teacher.name || "Unknown",
        teacherEmail: teacher.email || "",
        teacherPhone: teacher.phone || "",
        title: currentTitle,
        amount: teacher.salary || "0",
        status: "Pending",
        date: salaryDate,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      count++;
    }

    await writer.close();
    return {
      success: true,
      message: `Salary generation process started for ${count} teachers.`,
    };
  } catch (error) {
    throw new HttpsError("internal", error.message);
  }
});
