const admin = require("firebase-admin");
const busboy = require("busboy");
const { Readable } = require("stream");

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

exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  return new Promise((resolve, reject) => {
    const bb = busboy({ headers: event.headers });
    let uploadData = null;

    bb.on("file", (fieldname, file, filename, encoding, mimetype) => {
      const buffer = [];
      file.on("data", data => buffer.push(data));
      file.on("end", () => {
        uploadData = {
          buffer: Buffer.concat(buffer),
          filename,
          mimetype,
        };
      });
    });

    bb.on("finish", async () => {
      if (!uploadData) {
        return resolve({ statusCode: 400, body: "No file uploaded" });
      }

      const file = bucket.file(`videos/${Date.now()}-${uploadData.filename}`);
      const stream = Readable.from(uploadData.buffer);

      stream.pipe(file.createWriteStream({
        metadata: { contentType: uploadData.mimetype }
      }))
      .on("error", (err) => {
        return resolve({ statusCode: 500, body: "Upload failed" });
      })
      .on("finish", async () => {
        await file.makePublic();
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;

        await db.collection("videos").add({
          url: publicUrl,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        return resolve({
          statusCode: 200,
          body: JSON.stringify({ url: publicUrl }),
        });
      });
    });

    bb.end(Buffer.from(event.body, "base64"));
  });
};