const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

exports.updateFcmToken = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Login required.");

  const { token } = request.data;
  const uid = request.auth.uid;

  if (!token || typeof token !== "string" || token.trim().length === 0) {
    throw new HttpsError("invalid-argument", "Valid FCM token required.");
  }

  try {
    await admin
      .firestore()
      .collection("users")
      .doc(uid)
      .update({
        fcmTokens: admin.firestore.FieldValue.arrayUnion(token.trim()),
      });

    return { success: true, message: "FCM token updated successfully." };
  } catch (error) {
    throw new HttpsError("internal", error.message);
  }
});

exports.removeFcmToken = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Login required.");

  const { token } = request.data;
  const uid = request.auth.uid;

  if (!token || typeof token !== "string" || token.trim().length === 0) {
    throw new HttpsError("invalid-argument", "Valid FCM token required.");
  }

  try {
    await admin
      .firestore()
      .collection("users")
      .doc(uid)
      .update({
        fcmTokens: admin.firestore.FieldValue.arrayRemove(token.trim()),
      });

    return { success: true, message: "FCM token removed successfully." };
  } catch (error) {
    throw new HttpsError("internal", error.message);
  }
});

exports.subscribeToTopics = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Login required.");

  const { token, role } = request.data;

  if (!token || !role) {
    throw new HttpsError("invalid-argument", "Token and role are required.");
  }

  try {
    const topics =
      role === "admin"
        ? ["admins"]
        : [role === "teacher" ? "teachers" : "students"];

    await Promise.all(
      topics.map((topic) => admin.messaging().subscribeToTopic([token], topic)),
    );

    return {
      success: true,
      message: `Subscribed to ${topics.join(", ")} topic(s).`,
    };
  } catch (error) {
    throw new HttpsError("internal", error.message);
  }
});

exports.unsubscribeFromTopics = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Login required.");

  const { token, role } = request.data;

  if (!token || !role) {
    throw new HttpsError("invalid-argument", "Token and role are required.");
  }

  try {
    const topics =
      role === "admin"
        ? ["admins"]
        : [role === "teacher" ? "teachers" : "students"];

    await Promise.all(
      topics.map((topic) =>
        admin.messaging().unsubscribeFromTopic([token], topic),
      ),
    );

    return {
      success: true,
      message: `Unsubscribed from ${topics.join(", ")} topic(s).`,
    };
  } catch (error) {
    throw new HttpsError("internal", error.message);
  }
});
