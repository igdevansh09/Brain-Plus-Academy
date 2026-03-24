const { onDocumentDeleted } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const { getStoragePathFromUrl, deleteAttachments } = require("./helpers");

exports.cleanupHomework = onDocumentDeleted("homework/{id}", async (event) => {
  try {
    const data = event.data.data();
    if (data) await deleteAttachments(data);
  } catch (error) {
    console.error(`Error in cleanupHomework for ${event.params.id}:`, error);
  }
});

exports.cleanupMaterials = onDocumentDeleted(
  "materials/{id}",
  async (event) => {
    try {
      const data = event.data.data();
      if (data) await deleteAttachments(data);
    } catch (error) {
      console.error(`Error in cleanupMaterials for ${event.params.id}:`, error);
    }
  },
);

exports.cleanupUserData = onDocumentDeleted("users/{uid}", async (event) => {
  const uid = event.params.uid;
  const userData = event.data.data();
  const db = admin.firestore();

  if (!userData) return;

  try {
    let batch = db.batch();
    let operationCount = 0;

    const commitIfFull = async () => {
      if (operationCount >= 450) {
        await batch.commit();
        batch = db.batch();
        operationCount = 0;
      }
    };

    if (userData.profileImage || userData.photoURL) {
      const url = userData.profileImage || userData.photoURL;
      const path = getStoragePathFromUrl(url);
      if (path) {
        try {
          await admin.storage().bucket().file(path).delete();
        } catch (error) {
          if (error.code !== 404)
            console.warn("Failed to delete profile image", error);
        }
      }
    }

    if (userData.role === "student") {
      const collections = ["fees", "leaves", "test_results"];
      for (const coll of collections) {
        const snap = await db
          .collection(coll)
          .where("studentId", "==", uid)
          .get();
        for (const doc of snap.docs) {
          batch.delete(doc.ref);
          operationCount++;
          await commitIfFull();
        }
      }

      if (userData.standard) {
        const examsSnap = await db
          .collection("exam_results")
          .where("classId", "==", userData.standard)
          .get();
        for (const doc of examsSnap.docs) {
          batch.update(doc.ref, {
            [`results.${uid}`]: admin.firestore.FieldValue.delete(),
          });
          operationCount++;
          await commitIfFull();
        }

        const attendanceSnap = await db
          .collection("attendance")
          .where("classId", "==", userData.standard)
          .get();
        for (const doc of attendanceSnap.docs) {
          if (doc.data().records && doc.data().records[uid]) {
            batch.update(doc.ref, {
              [`records.${uid}`]: admin.firestore.FieldValue.delete(),
            });
            operationCount++;
            await commitIfFull();
          }
        }
      }
    }

    if (userData.role === "teacher") {
      const collections = [
        "salaries",
        "teacher_leaves",
        "class_notices",
        "attendance",
        "homework",
        "materials",
      ];
      for (const coll of collections) {
        const snap = await db
          .collection(coll)
          .where("teacherId", "==", uid)
          .get();
        for (const doc of snap.docs) {
          batch.delete(doc.ref);
          operationCount++;
          await commitIfFull();
        }
      }
    }

    if (operationCount > 0) await batch.commit();
  } catch (error) {
    console.error("❌ Cleanup Error:", error);
  }
});
