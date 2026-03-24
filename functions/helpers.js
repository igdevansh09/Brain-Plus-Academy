const admin = require("firebase-admin");

const sendNotifications = async (tokens, title, body, data = {}) => {
  if (!tokens || tokens.length === 0) {
    return { success: false, reason: "No tokens available", invalidTokens: [] };
  }

  const uniqueTokens = [
    ...new Set(
      tokens.filter((t) => t && typeof t === "string" && t.trim().length > 0),
    ),
  ];

  if (uniqueTokens.length === 0) {
    return {
      success: false,
      reason: "All tokens were invalid",
      invalidTokens: [],
    };
  }

  console.log(
    `📤 Attempting to send "${title}" to ${uniqueTokens.length} devices...`,
  );

  const chunks = [];
  const chunkSize = 500;
  for (let i = 0; i < uniqueTokens.length; i += chunkSize) {
    chunks.push(uniqueTokens.slice(i, i + chunkSize));
  }

  const invalidTokens = [];

  const promises = chunks.map(async (chunk) => {
    const payload = {
      notification: { title, body },
      data: { ...data, click_action: "FLUTTER_NOTIFICATION_CLICK" },
      tokens: chunk,
    };
    try {
      const response = await admin.messaging().sendEachForMulticast(payload);
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const token = chunk[idx];
            console.error(
              ` ❌ Token failed: ${token.substring(0, 20)}... - ${resp.error.code}: ${resp.error.message}`,
            );

            if (
              resp.error.code === "messaging/invalid-registration-token" ||
              resp.error.code === "messaging/registration-token-not-registered"
            ) {
              invalidTokens.push(token);
            }
          }
        });
      }
      return response;
    } catch (error) {
      console.error(
        `❌ Notification Chunk Error: ${error.code} - ${error.message}`,
      );
      return null;
    }
  });

  const results = await Promise.all(promises);
  const totalSuccess = results.reduce(
    (acc, curr) => acc + (curr ? curr.successCount : 0),
    0,
  );
  const totalFailure = results.reduce(
    (acc, curr) => acc + (curr ? curr.failureCount : 0),
    0,
  );

  console.log(
    `📣 Notification: "${title}" - ${totalSuccess} delivered, ${totalFailure} failed, ${invalidTokens.length} invalid tokens`,
  );
  return {
    success: totalSuccess > 0,
    sent: totalSuccess,
    failed: totalFailure,
    invalidTokens,
  };
};

const cleanInvalidTokens = async (userId, tokensToRemove) => {
  if (!tokensToRemove || tokensToRemove.length === 0) return;

  try {
    const userRef = admin.firestore().collection("users").doc(userId);
    await userRef.update({
      fcmTokens: admin.firestore.FieldValue.arrayRemove(...tokensToRemove),
    });
    console.log(
      `🧹 Cleaned ${tokensToRemove.length} invalid tokens for user ${userId}`,
    );
  } catch (error) {
    console.error(`Failed to clean tokens for ${userId}:`, error);
  }
};

const getStudentTokensByClass = async (standard) => {
  if (!standard) return [];
  const snap = await admin
    .firestore()
    .collection("users")
    .where("role", "==", "student")
    .where("standard", "==", standard)
    .where("verified", "==", true)
    .get();

  const tokens = snap.docs.flatMap((d) => d.data().fcmTokens || []);
  return [...new Set(tokens.filter((t) => t && typeof t === "string"))];
};

const getTeacherTokensForClass = async (targetClass) => {
  const snap = await admin
    .firestore()
    .collection("users")
    .where("role", "==", "teacher")
    .where("verified", "==", true)
    .get();

  let tokens = [];
  snap.forEach((doc) => {
    const data = doc.data();
    const classes =
      data.classesTaught || (data.teachingProfile || []).map((p) => p.class);
    if (classes && classes.includes(targetClass)) {
      tokens.push(...(data.fcmTokens || []));
    }
  });
  return [...new Set(tokens.filter((t) => t && typeof t === "string"))];
};

const getStoragePathFromUrl = (url) => {
  try {
    const baseUrl = "https://firebasestorage.googleapis.com/v0/b/";
    if (!url.startsWith(baseUrl)) return null;

    let path = url.replace(baseUrl, "");
    const bucketEndIndex = path.indexOf("/o/");
    if (bucketEndIndex === -1) return null;

    path = path.substring(bucketEndIndex + 3);
    const queryIndex = path.indexOf("?");
    if (queryIndex !== -1) path = path.substring(0, queryIndex);

    return decodeURIComponent(path);
  } catch (error) {
    console.warn("Failed to parse URL:", url, error);
    return null;
  }
};

const deleteAttachments = async (data) => {
  const bucket = admin.storage().bucket();
  const filesToDelete = [];

  if (data.attachments && Array.isArray(data.attachments)) {
    data.attachments.forEach((file) => {
      if (file.url) filesToDelete.push(file.url);
    });
  }
  if (data.link) filesToDelete.push(data.link);

  const deletePromises = filesToDelete.map(async (url) => {
    const path = getStoragePathFromUrl(url);
    if (path) {
      try {
        await bucket.file(path).delete();
      } catch (error) {
        if (error.code !== 404)
          console.error(`Failed to delete ${path}:`, error);
      }
    }
  });
  await Promise.all(deletePromises);
};

module.exports = {
  sendNotifications,
  cleanInvalidTokens,
  getStudentTokensByClass,
  getTeacherTokensForClass,
  getStoragePathFromUrl,
  deleteAttachments,
};
