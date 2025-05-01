/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

exports.deleteUser = functions.https
  .onCall(
    async (data, context) => {
      // Check if the request is authenticated
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "The function must be called while authenticated.",
        );
      }

      // Check if the user is a superadmin
      const callerUid = context.auth.uid;
      const callerDoc = await admin
        .firestore()
        .collection("users")
        .doc(callerUid)
        .get();

      if (!callerDoc.exists || callerDoc.data().role !== "superadmin") {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Only superadmins can delete users.",
        );
      }

      const {userId, email} = data;

      if (!userId || !email) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "The function requires userId and email.",
        );
      }

      try {
        // Delete the user from Firebase Auth
        await admin.auth().deleteUser(userId);
        return {success: true};
      } catch (error) {
        throw new functions.https.HttpsError(
          "internal",
          "Error deleting user from Firebase Authentication.",
          error,
        );
      }
    },
  );
