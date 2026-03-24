const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

exports.updateOwnProfile = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Login required.");

  const uid = request.auth.uid;
  const { name, phone } = request.data;

  if (!name && !phone)
    throw new HttpsError("invalid-argument", "Provide at least name or phone.");

  try {
    const authUpdates = {};
    if (name) authUpdates.displayName = name;
    if (phone) authUpdates.phoneNumber = phone;
    if (Object.keys(authUpdates).length > 0)
      await admin.auth().updateUser(uid, authUpdates);

    const updates = {};
    if (name) updates.name = name;
    if (phone) updates.phone = phone;

    await admin
      .firestore()
      .collection("users")
      .doc(uid)
      .set(updates, { merge: true });
    return { success: true, message: "Your profile updated successfully!" };
  } catch (error) {
    const code = error?.code || "internal";
    const message = error?.message || String(error);
    if (code.includes("not-found") || code.includes("NOT_FOUND"))
      throw new HttpsError("not-found", message);
    if (code.includes("invalid-argument") || code.includes("INVALID_ARGUMENT"))
      throw new HttpsError("invalid-argument", message);
    throw new HttpsError("internal", message);
  }
});

exports.updateUser = onCall(async (request) => {
  if (request.auth.token.role !== "admin")
    throw new HttpsError("permission-denied", "Only admins can update users.");

  const { targetUid, updates } = request.data;

  try {
    const authUpdates = {};
    if (updates.phone) authUpdates.phoneNumber = updates.phone;
    if (updates.name) authUpdates.displayName = updates.name;
    if (updates.email) authUpdates.email = updates.email;
    if (Object.keys(authUpdates).length > 0)
      await admin.auth().updateUser(targetUid, authUpdates);

    await admin.firestore().collection("users").doc(targetUid).update(updates);
    return { success: true, message: "User updated successfully" };
  } catch (error) {
    throw new HttpsError("internal", error.message);
  }
});

exports.checkUserExists = onCall(async (request) => {
  const { phone, role } = request.data;
  if (!phone || !role)
    throw new HttpsError("invalid-argument", "Phone and role are required.");

  try {
    const snap = await admin
      .firestore()
      .collection("users")
      .where("phone", "==", phone)
      .where("role", "==", role)
      .get();
    if (snap.empty) return { exists: false };
    const userData = snap.docs[0].data();
    return { exists: true, verified: userData.verified === true };
  } catch (error) {
    console.error("checkUserExists failed:", error);
    throw new HttpsError("internal", "Database verification failed.");
  }
});
