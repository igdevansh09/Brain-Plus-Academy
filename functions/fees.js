const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const { sendNotifications } = require("./helpers");

exports.onFeeWrite = onDocumentWritten("fees/{id}", async (event) => {
  try {
    if (!event.data.before.exists && event.data.after.exists) {
      const fee = event.data.after.data();
      const userDoc = await admin
        .firestore()
        .collection("users")
        .doc(fee.studentId)
        .get();
      const tokens = userDoc.data()?.fcmTokens || [];

      if (tokens.length > 0) {
        await sendNotifications(
          tokens,
          "Fee Generated 💰",
          `Invoice: ${fee.title}. Amount: ₹${fee.amount}`,
          {
            type: "fees",
            feeId: event.params.id,
            studentId: fee.studentId,
            amount: fee.amount || "",
            title: fee.title || "",
          },
        );
      }
      return;
    }

    if (event.data.before.exists && event.data.after.exists) {
      const before = event.data.before.data();
      const after = event.data.after.data();
      const userDoc = await admin
        .firestore()
        .collection("users")
        .doc(after.studentId)
        .get();
      const studentTokens = userDoc.data()?.fcmTokens || [];

      const proofUploaded = !before.paymentProof && after.paymentProof;
      const statusChangedToReview =
        before.status !== "Verifying" && after.status === "Verifying";

      if (proofUploaded || statusChangedToReview) {
        await admin.messaging().send({
          topic: "admins",
          notification: {
            title: "Fee Payment Submitted 🧾",
            body: `${after.studentName} has submitted payment proof. Verify now.`,
          },
          data: {
            type: "fees",
            feeId: event.params.id,
            studentId: after.studentId,
            studentName: after.studentName || "",
            click_action: "FLUTTER_NOTIFICATION_CLICK",
          },
        });
      }

      if (studentTokens.length > 0) {
        if (before.status !== "Paid" && after.status === "Paid") {
          await sendNotifications(
            studentTokens,
            "Payment Received ✅",
            `Your payment for ${after.title} has been confirmed.`,
            {
              type: "fees",
              feeId: event.params.id,
              status: "Paid",
              title: after.title || "",
            },
          );
        }
        if (before.status !== "Rejected" && after.status === "Rejected") {
          await sendNotifications(
            studentTokens,
            "Payment Rejected ❌",
            "Your fee submission was rejected. Please check comments or contact admin.",
            {
              type: "fees",
              feeId: event.params.id,
              status: "Rejected",
            },
          );
        }
      }
    }
  } catch (error) {
    console.error(`Error in onFeeWrite for ${event.params.id}:`, error);
  }
});

exports.generateMonthlyFees = onCall(async (request) => {
  if (request.auth?.token?.role !== "admin")
    throw new HttpsError("permission-denied", "Admin access required.");

  const db = admin.firestore();
  const date = new Date();
  const month = date.toLocaleString("default", { month: "long" });
  const year = date.getFullYear();
  const currentTitle = `Tuition Fee - ${month} ${year}`;
  const feeDate = date.toLocaleDateString("en-GB");

  const writer = db.bulkWriter();
  writer.onWriteError((error) => {
    if (error.code === 6) return false;
    return true;
  });

  try {
    const studentsStream = db
      .collection("users")
      .where("role", "==", "student")
      .where("verified", "==", true)
      .stream();
    let count = 0;

    for await (const doc of studentsStream) {
      const student = doc.data();
      const docId = `${doc.id}_${month}_${year}`;
      const feeRef = db.collection("fees").doc(docId);

      writer.create(feeRef, {
        studentId: doc.id,
        studentName: student.name || "Unknown",
        studentClass: student.standard || "N/A",
        studentPhone: student.phone || "",
        title: currentTitle,
        amount: student.monthlyFeeAmount || "5000",
        status: "Pending",
        date: feeDate,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      count++;
    }

    await writer.close();
    return {
      success: true,
      message: `Fee generation process started for ${count} students.`,
    };
  } catch (error) {
    throw new HttpsError("internal", error.message);
  }
});
