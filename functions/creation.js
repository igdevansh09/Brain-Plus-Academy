const functions = require("firebase-functions");
const admin = require("firebase-admin");

exports.createStudent = functions.https.onCall(async (data, context) => {
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

  const {
    email,
    password,
    name,
    phone,
    standard,
    stream,
    enrolledSubjects,
    monthlyFeeAmount,
  } = payload;

  try {
    
    const adminDoc = await admin.firestore().collection("users").doc(uid).get();
    const adminName = adminDoc.exists ? adminDoc.data().name : "An Admin";

    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: name,
    });

    await admin
      .firestore()
      .collection("users")
      .doc(userRecord.uid)
      .set({
        name: name,
        email: email,
        phone: phone,
        role: "student",
        verified: true,
        standard: standard || "",
        stream: stream || "N/A",
        enrolledSubjects: enrolledSubjects || [],
        monthlyFeeAmount: monthlyFeeAmount || "0",
        createdByAdmin: adminName, 
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    await admin
      .firestore()
      .collection("notifications")
      .add({
        title: "New Student Added",
        message: `${adminName} has created a new student account for ${name} (${standard}).`,
        type: "system",
        date: new Date().toLocaleDateString("en-GB"),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    return { success: true, uid: userRecord.uid };
  } catch (error) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});

exports.createTeacher = functions.https.onCall(async (data, context) => {
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

  const { email, password, name, phone, salary, salaryType, teachingProfile } =
    payload;

  try {
    
    const adminDoc = await admin.firestore().collection("users").doc(uid).get();
    const adminName = adminDoc.exists ? adminDoc.data().name : "An Admin";

    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: name,
    });

    await admin
      .firestore()
      .collection("users")
      .doc(userRecord.uid)
      .set({
        name: name,
        email: email,
        phone: phone,
        role: "teacher",
        verified: true,
        salary: salary || "0",
        salaryType: salaryType || "Fixed",
        teachingProfile: teachingProfile || [],
        createdByAdmin: adminName, 
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    await admin
      .firestore()
      .collection("notifications")
      .add({
        title: "New Teacher Added",
        message: `${adminName} has created a new teacher account for ${name}.`,
        type: "system",
        date: new Date().toLocaleDateString("en-GB"),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    return { success: true, uid: userRecord.uid };
  } catch (error) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});
