const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

exports.handler = async () => {
  const snapshot = await db.collection("videos").orderBy("timestamp", "desc").get();
  const videos = snapshot.docs.map(doc => doc.data());

  return {
    statusCode: 200,
    body: JSON.stringify(videos),
  };
};