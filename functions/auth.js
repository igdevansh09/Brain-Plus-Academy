const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { sendNotifications } = require("./helpers");

exports.registerUser = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Login required.");

  const { role, name, ...otherData } = request.data;
  const uid = request.auth.uid;
  const phone = request.auth.token.phone_number || "";

  if (!["student", "teacher"].includes(role)) {
    throw new HttpsError(
      "invalid-argument",
      "Role must be student or teacher.",
    );
  }

  const userRecord = await admin.auth().getUser(uid);
  if (userRecord.customClaims && userRecord.customClaims.role) {
    throw new HttpsError("already-exists", "You are already registered.");
  }

  try {
    const { fcmToken, ...restOtherData } = otherData;

    await admin.auth().setCustomUserClaims(uid, { role, verified: false });

    const userData = {
      name,
      phone,
      role,
      verified: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      ...restOtherData,
    };

    if (
      fcmToken &&
      typeof fcmToken === "string" &&
      fcmToken.trim().length > 0
    ) {
      userData.fcmTokens = [fcmToken.trim()];
    } else {
      userData.fcmTokens = [];
    }

    await admin.firestore().collection("users").doc(uid).set(userData);
    return {
      success: true,
      message: "Registration successful. Pending approval.",
    };
  } catch (error) {
    throw new HttpsError("internal", error.message);
  }
});

exports.approveUser = onCall(async (request) => {
  if (request.auth?.token?.role !== "admin")
    throw new HttpsError("permission-denied", "Admin only.");

  const { targetUid } = request.data;

  try {
    const userDoc = await admin
      .firestore()
      .collection("users")
      .doc(targetUid)
      .get();
    if (!userDoc.exists) throw new HttpsError("not-found", "User not found.");

    const userData = userDoc.data();
    const userRole = userData.role || "User";

    await admin
      .auth()
      .setCustomUserClaims(targetUid, { role: userRole, verified: true });
    await admin
      .firestore()
      .collection("users")
      .doc(targetUid)
      .update({ verified: true });

    return { success: true, message: "User approved successfully." };
  } catch (error) {
    throw new HttpsError("internal", error.message);
  }
});

exports.deleteTargetUser = onCall(async (request) => {
  if (request.auth?.token?.role !== "admin")
    throw new HttpsError("permission-denied", "Admin only.");

  const { targetUid } = request.data;

  try {
    const userDoc = await admin
      .firestore()
      .collection("users")
      .doc(targetUid)
      .get();

    if (userDoc.exists) {
      const userData = userDoc.data();
      const tokens = userData.fcmTokens || [];
      const isPending = !userData.verified;

      if (tokens.length > 0) {
        if (isPending) {
          await sendNotifications(
            tokens,
            "Registration Rejected ❌",
            "Your registration request was declined by the administrator.",
            { type: "account", userId: targetUid },
          );
        } else {
          await sendNotifications(
            tokens,
            "Account Terminated ⚠️",
            "Your account has been permanently removed by the administrator.",
            { type: "account", userId: targetUid },
          );
        }
      }
    }

    await admin.auth().deleteUser(targetUid);
    await admin.firestore().collection("users").doc(targetUid).delete();

    return { success: true, message: "User processed successfully." };
  } catch (error) {
    try {
      await admin.firestore().collection("users").doc(targetUid).delete();
    } catch (e) {
      console.error(`Firestore cleanup failed:`, e.message);
    }
    throw new HttpsError("internal", error.message);
  }
});
