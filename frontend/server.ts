import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import admin from "firebase-admin";
import { fileURLToPath } from "url";
import { existsSync } from "fs";
// http-proxy-middleware no longer needed — Vite's built-in proxy handles /api forwarding

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin — use service account file if present, otherwise fall back to Application Default Credentials
if (!admin.apps.length) {
  const serviceAccountPath = path.resolve(__dirname, "../backend/firebase-service-account.json");
  if (existsSync(serviceAccountPath)) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath),
    });
  } else {
    // Fallback: Application Default Credentials (run `gcloud auth application-default login` first)
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: "gen-lang-client-0472422448",
    });
  }
}

const db = admin.firestore();
const auth = admin.auth();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Middleware to verify Admin role
  const verifyAdmin = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const idToken = authHeader.split("Bearer ")[1];
    try {
      const decodedToken = await auth.verifyIdToken(idToken);
      const userDoc = await db.collection("users").doc(decodedToken.uid).get();
      const userData = userDoc.data();

      if (userData?.role === "admin") {
        req.user = decodedToken;
        next();
      } else {
        res.status(403).json({ error: "Forbidden: Admin access required" });
      }
    } catch (error) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  // API Routes
  app.post("/api/admin/create-user", verifyAdmin, async (req, res) => {
    const { email, password, displayName, role } = req.body;
    try {
      const userRecord = await auth.createUser({
        email,
        password,
        displayName,
      });

      await db.collection("users").doc(userRecord.uid).set({
        email,
        display_name: displayName,
        role: role || "user",
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.json({ uid: userRecord.uid });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/admin/delete-user/:uid", verifyAdmin, async (req, res) => {
    const { uid } = req.params;
    try {
      await auth.deleteUser(uid);
      await db.collection("users").doc(uid).delete();
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/admin/reset-password", verifyAdmin, async (req, res) => {
    const { email } = req.body;
    try {
      // In Admin SDK, we can't directly "send" the reset email, 
      // but we can generate the link or use client SDK.
      // However, for admin management, we can generate a link and maybe log it,
      // but the request asked for "button that sends a password reset email".
      // Client-side sendPasswordResetEmail is actually easier if we have the email.
      // But let's provide a way to generate the link if needed.
      const link = await auth.generatePasswordResetLink(email);
      res.json({ link });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Proxy /api/* to FastAPI backend (except /api/admin/* handled above)
  app.all("/api/*", async (req, res) => {
    try {
      const backendUrl = `http://127.0.0.1:8000${req.originalUrl}`;
      const headers: Record<string, string> = {};
      if (req.headers.authorization) headers["Authorization"] = req.headers.authorization as string;
      if (req.headers["content-type"]) headers["Content-Type"] = req.headers["content-type"] as string;

      const fetchOptions: RequestInit = {
        method: req.method,
        headers,
      };
      if (req.method !== "GET" && req.method !== "HEAD") {
        fetchOptions.body = JSON.stringify(req.body);
      }

      const backendRes = await fetch(backendUrl, fetchOptions);
      res.status(backendRes.status);
      const data = await backendRes.text();
      res.set("Content-Type", backendRes.headers.get("content-type") || "application/json");
      res.send(data);
    } catch (err: any) {
      console.error("Proxy error:", err.message);
      res.status(502).json({ error: "Backend unreachable", detail: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      root: path.resolve(__dirname),
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
