const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.deleteUser = functions.https.onCall(async (data, context) => {
  // Check if the request is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  // Check if the user is a superadmin
  const callerUid = context.auth.uid;
  const callerDoc = await admin.firestore().collection('users').doc(callerUid).get();
  
  if (!callerDoc.exists || callerDoc.data().role !== 'superadmin') {
    throw new functions.https.HttpsError('permission-denied', 'Only superadmins can delete users.');
  }

  const { userId, email } = data;
  
  if (!userId || !email) {
    throw new functions.https.HttpsError('invalid-argument', 'User ID and email are required.');
  }

  try {
    // Delete the user from Firebase Auth
    await admin.auth().deleteUser(userId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting user from Firebase Auth:', error);
    throw new functions.https.HttpsError('internal', 'Failed to delete user from Firebase Auth.');
  }
}); 