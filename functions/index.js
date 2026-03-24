const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");

setGlobalOptions({
  region: "us-central1",
  maxInstances: 10,
  concurrency: 80,
  timeoutSeconds: 300,
});

if (!admin.apps.length) {
  admin.initializeApp();
}

exports.registerUser = require("./auth").registerUser;
exports.approveUser = require("./auth").approveUser;
exports.deleteTargetUser = require("./auth").deleteTargetUser;

exports.updateFcmToken = require("./fcm").updateFcmToken;
exports.removeFcmToken = require("./fcm").removeFcmToken;
exports.subscribeToTopics = require("./fcm").subscribeToTopics;
exports.unsubscribeFromTopics = require("./fcm").unsubscribeFromTopics;

exports.onUserCreated = require("./notifications").onUserCreated;
exports.onUserUpdated = require("./notifications").onUserUpdated;
exports.onGlobalNotice = require("./notifications").onGlobalNotice;
exports.onLeaveWrite = require("./notifications").onLeaveWrite;
exports.onTeacherLeaveWrite = require("./notifications").onTeacherLeaveWrite;
exports.onClassUpdate = require("./notifications").onClassUpdate;
exports.onCourseWrite = require("./notifications").onCourseWrite;
exports.onAttendance = require("./notifications").onAttendance;
exports.onTestResult = require("./notifications").onTestResult;
exports.onHomework = require("./notifications").onHomework;
exports.onMaterials = require("./notifications").onMaterials;

exports.onFeeWrite = require("./fees").onFeeWrite;
exports.generateMonthlyFees = require("./fees").generateMonthlyFees;

exports.onSalaryWrite = require("./salaries").onSalaryWrite;
exports.generateMonthlySalaries = require("./salaries").generateMonthlySalaries;

exports.updateOwnProfile = require("./profile").updateOwnProfile;
exports.updateUser = require("./profile").updateUser;
exports.checkUserExists = require("./profile").checkUserExists;

exports.cleanupHomework = require("./cleanup").cleanupHomework;
exports.cleanupMaterials = require("./cleanup").cleanupMaterials;
exports.cleanupUserData = require("./cleanup").cleanupUserData;

exports.createStudent = require("./creation").createStudent;
exports.createTeacher = require("./creation").createTeacher;

exports.migrateLegacyUsers = require("./migration").migrateLegacyUsers;
exports.runMigration = require("./migration").runMigration;

exports.updateOwnSecurity = require("./security").updateOwnSecurity;
exports.requestAccountDeletion = require("./security").requestAccountDeletion;
