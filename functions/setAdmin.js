const admin = require("firebase-admin");
const serviceAccount = require("./service-account.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const targetEmail = "brainplusacademy54@gmail.com";
const tempPassword = "AdminPassword123!"; 

async function forceCreateAndPromote() {
  console.log(`🔍 Checking for user: ${targetEmail}...`);

  let user;

  try {
    
    user = await admin.auth().getUserByEmail(targetEmail);
    console.log("✅ User found in Auth system.");
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      console.log("⚠️ User NOT found. Creating new Admin user...");
      
      try {
        user = await admin.auth().createUser({
          email: targetEmail,
          password: tempPassword,
          displayName: "Super Admin",
        });
        console.log(`🎉 Created new user with password: ${tempPassword}`);
      } catch (createError) {
        console.error("❌ FAILED to create user:", createError.message);
        return;
      }
    } else {
      console.error("❌ Unexpected Error:", error.message);
      return;
    }
  }

  try {
    await admin.auth().setCustomUserClaims(user.uid, { role: "admin" });

    await admin.firestore().collection("users").doc(user.uid).set(
      {
        email: targetEmail,
        role: "admin",
        name: "Super Admin",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    console.log("------------------------------------------------");
    console.log(`✅ SUCCESS! ${targetEmail} is now a Super Admin.`);
    console.log(`🔑 Login Password: ${tempPassword} (If you just created it)`);
    console.log("------------------------------------------------");
  } catch (error) {
    console.error("❌ Promotion Failed:", error.message);
  }
}

forceCreateAndPromote();
