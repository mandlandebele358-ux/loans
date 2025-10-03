/*
Copyright (c) 2025 Avdesh Jadon (LoanManager)
All Rights Reserved.
Proprietary and Confidential – Unauthorized copying, modification, or distribution of this file,
via any medium, is strictly prohibited without prior written consent from Avdesh Jadon.
*/


const admin = require("firebase-admin");
require("dotenv").config();

const serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const uid = process.env.UID;

if (!uid) {
  console.error("❌ UID not found in environment variables.");
  process.exit(1);
}
admin
  .auth()
  .setCustomUserClaims(uid, { admin: true })
  .then(() => {
    console.log(`✅ Successfully set admin claim for user: ${uid}`);
    console.log("🚀 Ab aap admin panel mein login kar sakte hain.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error setting custom claims:", error);
    process.exit(1);
  });
