import express from "express";
import dotenv from "dotenv";
import { studySchema, validateStudySession } from "./schema.js";

dotenv.config();

const app = express();
app.use(express.json({ limit: "32kb" }));

const PORT = Number(process.env.PORT || 3001);
const MODEL = process.env.GEMINI_MODEL || "gemini-3.7-flash";

const systemPrompt = `You are an expert study-content generator.
Return ONLY JSON that matches the provided schema.
Create concise, accurate content for the user's requested topic.
Make questions test understanding, not trivia.
Include 6 flashcards and 5 multiple-choice questions.
Each quiz question must have exactly 4 options.
correctAnswer is a zero-based integer.
Never include markdown fences or commentary.`;

app.post("/api/study-session", async (req, res) => {
  const topic = typeof req.body?.topic === "string" ? req.body.topic.trim() : "";

  if (!topic) {
    return res.status(400).json({ error: "Topic is required." });
  }

  if (topic.length > 3000) {
    return res.status(400).json({ error: "Topic is too long. Keep it under 3000 characters." });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({
      error: "GEMINI_API_KEY is missing. Add it to .env and restart the server."
    });
  }

  try {
    // Optional local demo switch to prove frontend failure handling.
    if (process.env.DEMO_FAULT_MODE === "malformed-json") {
      return res.json({ session: "{ broken json" });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `${systemPrompt}\n\nUser topic/notes:\n${topic}` }]
            }
          ],
          generationConfig: {
  responseMimeType: "application/json",
  responseSchema: studySchema,
  thinkingConfig: {
    thinkingLevel: "low"
  }
}
        })
      }
    );

    clearTimeout(timeout);

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const providerMessage =
        payload?.error?.message || `AI provider returned HTTP ${response.status}.`;
      return res.status(502).json({ error: providerMessage });
    }

    const text =
      payload?.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("")
        .trim();

    if (!text) {
      return res.status(502).json({ error: "The AI returned an empty response. Please retry." });
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return res.status(502).json({ error: "The AI returned malformed JSON. Please retry." });
    }

    const validation = validateStudySession(parsed);
    if (!validation.ok) {
      return res.status(502).json({
        error: `The AI returned an invalid study structure: ${validation.error}`
      });
    }

    return res.json({ session: parsed });
  } catch (error) {
    if (error.name === "AbortError") {
      return res.status(504).json({ error: "The AI request timed out. Please retry." });
    }

    console.error(error);
    return res.status(500).json({ error: "Unexpected server error. Please retry." });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, model: MODEL });
});

app.listen(PORT, () => {
  console.log(`MindForge API running on http://localhost:${PORT}`);
});