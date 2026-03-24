const functions = require("firebase-functions");
const admin = require("firebase-admin");

exports.migrateLegacyUsers = functions.https.onCall(async (data, context) => {
  const authContext = context ? context.auth : data.auth;
  if (!authContext)
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Must be logged in.",
    );

  try {
    
    const usersSnapshot = await admin
      .firestore()
      .collection("users")
      .where("role", "in", ["student", "teacher"])
      .get();

    let migratedCount = 0;
    let errors = [];

    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      const uid = doc.id;

      if (userData.email && userData.email.includes("@")) continue;

      try {
        const cleanPhone = userData.phone
          ? userData.phone.replace(/[^0-9]/g, "")
          : uid.substring(0, 10);
        const generatedEmail = `${cleanPhone}@academy.com`;

        const last4 =
          cleanPhone.length >= 4
            ? cleanPhone.substring(cleanPhone.length - 4)
            : "1234";
        const defaultPassword = `Pass@${last4}`;

        await admin.auth().updateUser(uid, {
          email: generatedEmail,
          password: defaultPassword,
        });

        await admin.firestore().collection("users").doc(uid).update({
          email: generatedEmail,
        });

        migratedCount++;
      } catch (err) {
        errors.push(`Failed for ${userData.name || uid}: ${err.message}`);
      }
    }

    return { success: true, migratedCount: migratedCount, errors: errors };
  } catch (error) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});

exports.runMigration = functions.https.onRequest(async (req, res) => {
  
  if (req.query.key !== "admin123") {
    res.status(403).send("Unauthorized: Invalid secret key.");
    return;
  }

  try {
    
    const usersSnapshot = await admin
      .firestore()
      .collection("users")
      .where("role", "in", ["student", "teacher"])
      .get();

    let migratedCount = 0;
    let errors = [];

    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      const uid = doc.id;

      if (userData.email && userData.email.includes("@")) continue;

      try {
        const cleanPhone = userData.phone
          ? userData.phone.replace(/[^0-9]/g, "")
          : uid.substring(0, 10);
        const generatedEmail = `${cleanPhone}@academy.com`;

        const last4 =
          cleanPhone.length >= 4
            ? cleanPhone.substring(cleanPhone.length - 4)
            : "1234";
        const defaultPassword = `Pass@${last4}`;

        await admin.auth().updateUser(uid, {
          email: generatedEmail,
          password: defaultPassword,
        });

        await admin.firestore().collection("users").doc(uid).update({
          email: generatedEmail,
        });

        migratedCount++;
      } catch (err) {
        errors.push(`Failed for ${userData.name || uid}: ${err.message}`);
      }
    }

    res.status(200).send(`
      <div style="font-family: sans-serif; padding: 40px;">
        <h1 style="color: #4CAF50;">✅ Migration Complete!</h1>
        <h3>Successfully migrated: ${migratedCount} users (Students & Teachers)</h3>
        <p style="color: red;">Errors: ${errors.length > 0 ? errors.join("<br>") : "None!"}</p>
      </div>
    `);
  } catch (error) {
    res.status(500).send(`<h1>❌ Critical Error:</h1><p>${error.message}</p>`);
  }
});
