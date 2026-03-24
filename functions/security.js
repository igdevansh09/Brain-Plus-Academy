const functions = require("firebase-functions");
const admin = require("firebase-admin");

exports.updateOwnSecurity = functions.https.onCall(async (data, context) => {
  const payload = data.data ? data.data : data;
  const authContext = context ? context.auth : data.auth;

  let uid;
  if (authContext && authContext.uid) {
    uid = authContext.uid;
  } else if (payload && payload.token) {
    try {
      const decoded = await admin.auth().verifyIdToken(payload.token);
      uid = decoded.uid;
    } catch (err) {
      throw new functions.https.HttpsError("unauthenticated", "Invalid token.");
    }
  } else {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be logged in to change security settings.",
    );
  }

  const { newEmail, newPassword } = payload;

  try {
    const authUpdates = {};
    if (newEmail) authUpdates.email = newEmail.trim();
    if (newPassword) authUpdates.password = newPassword;

    if (Object.keys(authUpdates).length > 0) {
      await admin.auth().updateUser(uid, authUpdates);
    }

    if (newEmail) {
      await admin.firestore().collection("users").doc(uid).update({
        email: newEmail.trim(),
      });
    }

    return {
      success: true,
      message: "Security settings updated successfully!",
    };
  } catch (error) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});

exports.requestAccountDeletion = functions.https.onCall(
  async (data, context) => {
    const payload = data.data ? data.data : data;
    const authContext = context ? context.auth : data.auth;

    let uid;
    if (authContext && authContext.uid) {
      uid = authContext.uid;
    } else if (payload && payload.token) {
      try {
        const decoded = await admin.auth().verifyIdToken(payload.token);
        uid = decoded.uid;
      } catch (err) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Invalid token: " + err.message,
        );
      }
    } else {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be logged in.",
      );
    }

    try {
      
      const userDoc = await admin
        .firestore()
        .collection("users")
        .doc(uid)
        .get();
      const userData = userDoc.exists
        ? userDoc.data()
        : { name: "A user", role: "unknown" };

      await admin
        .firestore()
        .collection("notifications")
        .add({
          title: "Account Deletion Request ⚠️",
          message: `${userData.name} (${userData.role}) has requested to permanently delete their account.`,
          type: "system",
          date: new Date().toLocaleDateString("en-GB"),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          requestedByUid: uid,
        });

      await admin.messaging().send({
        topic: "admins",
        notification: {
          title: "Account Deletion Request ⚠️",
          body: `${userData.name} (${userData.role}) has requested to permanently delete their account.`,
        },
        data: {
          type: "deletion_request",
          userId: uid,
          click_action: "FLUTTER_NOTIFICATION_CLICK",
        },
      });

      return { success: true };
    } catch (error) {
      throw new functions.https.HttpsError("internal", error.message);
    }
  },
);
