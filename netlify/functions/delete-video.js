const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}

const bucket = admin.storage().bucket();
const db = admin.firestore();

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { secret, fileUrl } = JSON.parse(event.body);

  // Secret admin check
  if (secret !== process.env.ADMIN_SECRET) {
    return { statusCode: 401, body: "Unauthorized" };
  }

  try {
    const filePath = decodeURIComponent(fileUrl.split("/").slice(4).join("/"));
    await bucket.file(filePath).delete();

    const snapshot = await db.collection("videos").where("url", "==", fileUrl).get();
    snapshot.forEach(doc => doc.ref.delete());

    return { statusCode: 200, body: "Deleted" };
  } catch (e) {
    return { statusCode: 500, body: "Deletion failed" };
  }
};