const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { getAuth } = require('firebase-admin/auth')
const { getFirestore } = require('firebase-admin/firestore')

// Callable from the admin screens only. Assigns "cashier" or "admin"
// as a custom claim on the target user, and mirrors it into
// users/{uid}.role for easy querying/display in the admin UI.
exports.setUserRole = onCall(async (request) => {
  const callerRole = request.auth?.token?.role
  if (callerRole !== 'admin') {
    throw new HttpsError('permission-denied', 'Only an admin can assign roles.')
  }

  const { targetUid, role } = request.data
  if (!targetUid || !['cashier', 'admin'].includes(role)) {
    throw new HttpsError('invalid-argument', 'targetUid and a valid role are required.')
  }

  await getAuth().setCustomUserClaims(targetUid, { role })
  await getFirestore().collection('users').doc(targetUid).set(
    { role, updatedAt: new Date() },
    { merge: true }
  )

  return { success: true }
})
