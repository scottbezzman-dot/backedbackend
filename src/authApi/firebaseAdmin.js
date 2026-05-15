const admin = require("firebase-admin");

function initFirebaseAdmin() {
  if (admin.apps.length) return admin;

  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

  if (json) {
    const serviceAccount = JSON.parse(json);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    return admin;
  }

  if (b64) {
    const serviceAccount = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    return admin;
  }

  // Fallback: uses GOOGLE_APPLICATION_CREDENTIALS if set.
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });

  return admin;
}

module.exports = { admin, initFirebaseAdmin };

