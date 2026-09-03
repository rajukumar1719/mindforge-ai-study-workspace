import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { studyRateLimiter } from "./middleware/rateLimiter.js";
import { cacheService } from "./services/cache.js";
import { generateStudySession, getProviderInfo } from "./services/ai.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, "../dist");

const app = express();

// Safe, production-grade CORS configuration
const allowedOrigin = process.env.FRONTEND_URL || "*";
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigin === "*" || !origin) {
    res.header("Access-Control-Allow-Origin", "*");
  } else if (origin === allowedOrigin || origin.startsWith("http://localhost:")) {
    res.header("Access-Control-Allow-Origin", origin);
  } else {
    res.header("Access-Control-Allow-Origin", allowedOrigin);
  }

  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json({ limit: "32kb" }));

const PORT = Number(process.env.PORT || 3001);
const MODEL = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";

/**
 * POST /api/study-session
 * Generates an adaptive study session (flashcards + quiz + memory cues).
 */
app.post("/api/study-session", studyRateLimiter, async (req, res) => {
  const topic = typeof req.body?.topic === "string" ? req.body.topic.trim() : "";
  const rawMode = typeof req.body?.mode === "string" ? req.body.mode.toLowerCase().trim() : "full";
  const rawDiff = typeof req.body?.difficulty === "string" ? req.body.difficulty.toLowerCase().trim() : "medium";

  const mode = ["full", "interview", "exam", "quick"].includes(rawMode) ? rawMode : "full";
  const difficulty = ["easy", "medium", "hard"].includes(rawDiff) ? rawDiff : "medium";

  if (!topic) {
    return res.status(400).json({ error: "Topic is required. Please enter a topic or paste notes." });
  }

  if (topic.length > 3000) {
    return res.status(400).json({ error: "Topic is too long. Please keep it under 3000 characters." });
  }

  // Preserve demo fault mode for interview/assignment rubric testing
  if (process.env.DEMO_FAULT_MODE === "malformed-json") {
    return res.json({ session: "{ broken json" });
  }

  // Check in-memory cache
  const cacheKey = cacheService.generateKey(topic, mode, difficulty);
  const cachedSession = cacheService.get(cacheKey);
  if (cachedSession) {
    console.log(`[Cache Hit] Returning cached session for "${topic.slice(0, 30)}..." [${mode}]`);
    return res.json({
      session: cachedSession,
      provider: "cache",
      cached: true
    });
  }

  // Setup client disconnect cancellation (monitor response socket close before completion)
  const clientAbortController = new AbortController();
  res.on("close", () => {
    if (!res.writableEnded) {
      clientAbortController.abort();
    }
  });

  try {
    const result = await generateStudySession({
      topic,
      mode,
      difficulty,
      clientSignal: clientAbortController.signal
    });

    // Cache successful session
    cacheService.set(cacheKey, result.session);

    return res.json(result);
  } catch (err) {
    if (clientAbortController.signal.aborted) {
      return; // Request was cancelled by client
    }

    const statusCode =
      err.status ||
      (err.message?.includes("too long to respond") || err.name === "TimeoutError" ? 504 : 500);

    return res.status(statusCode).json({
      error: err.message || "An unexpected error occurred while creating your study session."
    });
  }
});

/**
 * GET /api/health
 * Safe health check endpoint exposing zero secrets.
 * Reports active primary provider and available backup providers count.
 */
app.get("/api/health", (_req, res) => {
  const providerInfo = getProviderInfo();
  res.json({
    ok: true,
    service: "MindForge API",
    primaryProvider: providerInfo.primaryProvider,
    primaryModel: providerInfo.primaryModel,
    availableBackupProviders: providerInfo.availableBackupProviders,
    configuredProviders: providerInfo.configuredProviders,
    provider: providerInfo.primaryProvider,
    model: providerInfo.primaryModel,
    fallbackConfigured: providerInfo.availableBackupProviders > 0,
    cachedSessions: cacheService.size(),
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Serve static frontend assets from dist folder if built
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  // SPA fallback for Express 5: return index.html for all non-API GET requests
  app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api")) {
      return res.sendFile(path.join(distPath, "index.html"));
    }
    next();
  });
} else {
  // If dist is not built yet, show a clean message rather than Express "Cannot GET /"
  app.get("/", (_req, res) => {
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head><title>MindForge API Server</title></head>
        <body style="font-family: system-ui, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; line-height: 1.6;">
          <h2>MindForge API Server is Running</h2>
          <p>The backend is healthy and running. To serve the frontend from this URL, set your Render Build Command to: <code>npm run build</code>.</p>
          <p>API Health Check: <a href="/api/health">/api/health</a></p>
        </body>
      </html>
    `);
  });
}

app.listen(PORT, () => {
  const providerInfo = getProviderInfo();
  console.log(`MindForge API running on http://localhost:${PORT}`);
  console.log(`Active Primary Provider: ${providerInfo.primaryProvider} (${providerInfo.primaryModel})`);
  console.log(`Configured Providers: [${providerInfo.configuredProviders.join(", ")}] | Backup count: ${providerInfo.availableBackupProviders}`);
});