import { studySchema, validateStudySession } from "../schema.js";

/**
 * Multi-Provider AI Fallback Waterfall.
 * Attempts providers sequentially:
 *   1. Groq (Fastest, low-latency, free/cheap: llama-3.3-70b-versatile)
 *   2. Gemini (Google: gemini-1.5-flash / gemini-3.6-flash)
 *   3. OpenRouter / Backup OpenAI-compatible (meta-llama/llama-3.1-8b-instruct:free)
 *
 * Each provider attempt has a strict 10-second timeout.
 * If a provider returns 429, 5xx, or times out, immediately fails over to the next provider.
 */

const PROVIDER_TIMEOUT_MS = 10000; // Strict 10-second timeout per provider attempt

function getSystemPrompt(mode = "full", difficulty = "medium") {
  const modeInstructions = {
    interview: `Focus on SDE internship & software engineering technical interview preparation:
- Flashcards: Focus on core conceptual tradeoffs, runtime/space complexity, common interview pitfalls, and practical implementation patterns.
- Quiz: Test practical scenarios, code behavior, edge cases, and architectural decisions commonly asked in engineering interviews.
- Explanations: Highlight why typical candidate assumptions fail and give the optimal engineering perspective.`,

    exam: `Focus on academic examination preparation:
- Flashcards: Focus on precise definitions, foundational theorems, formulas, and structural principles.
- Quiz: Test conceptual distinctions, tricky boundary conditions, and textbook problem scenarios.
- Explanations: Provide clear theoretical grounding and memory aids.`,

    quick: `Focus on rapid high-yield revision:
- Flashcards: Crisp, punchy prompt-and-answer pairs covering must-know facts.
- Quiz: Fast knowledge verification questions testing core recall.
- Explanations: Direct, no-fluff concept breakdowns.`,

    full: `Provide a balanced, thorough study session:
- Flashcards: Comprehensive active-recall cards covering fundamentals to practical applications.
- Quiz: Challenging questions testing deep understanding rather than shallow trivia.
- Explanations: Informative breakdowns with memorable mnemonics.`
  };

  const selectedMode = modeInstructions[mode] || modeInstructions.full;

  return `You are MindForge, an expert AI study architect generating high-yield learning sessions.
Generate output STRICTLY matching the JSON schema provided.
Topic Difficulty Level: ${difficulty.toUpperCase()}.
Target Study Mode: ${mode.toUpperCase()}.

${selectedMode}

Rules:
1. Return ONLY pure valid JSON matching the schema. Never wrap in markdown fences or commentary.
2. Provide exactly 6 active-recall flashcards.
3. Provide exactly 5 multiple-choice questions.
4. Each multiple-choice question must have exactly 4 plausible options.
5. "correctAnswer" must be an integer index (0, 1, 2, or 3) indicating the single best answer.
6. Provide a concise 2-4 sentence summary and one high-yield memoryTip/mnemonic.`;
}

/**
 * Provider 1: Groq API (Default/Fastest)
 * Uses Groq's high-speed Llama-3.3-70b-versatile or llama-3.1-8b-instant
 */
async function callGroq({ topic, mode, difficulty, signal, requestId }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  const url = "https://api.groq.com/openai/v1/chat/completions";
  const systemPrompt = getSystemPrompt(mode, difficulty);

  const payload = {
    model,
    messages: [
      {
        role: "system",
        content: `${systemPrompt}\n\nSchema Requirements:\nRespond with a single JSON object having: "topic" (string), "difficulty" (string), "summary" (string), "memoryTip" (string), "flashcards" (array of 6 objects with "id", "question", "answer"), and "quiz" (array of 5 objects with "id", "question", "options" [array of 4 strings], "correctAnswer" [integer 0-3], "explanation", "memoryTip").`
      },
      {
        role: "user",
        content: `Study Topic / Notes:\n${topic}`
      }
    ],
    response_format: { type: "json_object" },
    temperature: 0.3
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    signal,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => null);
    const err = new Error(errBody?.error?.message || `Groq API returned HTTP ${response.status}`);
    err.status = response.status;
    err.provider = "groq";
    throw err;
  }

  const data = await response.json().catch(() => null);
  const text = data?.choices?.[0]?.message?.content?.trim();

  if (!text) {
    const err = new Error("Groq returned an empty response content.");
    err.status = 502;
    err.provider = "groq";
    throw err;
  }

  return { rawText: text, provider: `groq (${model})` };
}

/**
 * Provider 2: Google Gemini API
 * Uses Gemini 1.5 Flash (or configured model) with structured responseSchema
 */
async function callGemini({ topic, mode, difficulty, signal, requestId }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const prompt = `${getSystemPrompt(mode, difficulty)}\n\nStudy Topic / Notes:\n${topic}`;

  const payload = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: studySchema,
      temperature: 0.3
    }
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => null);
    const err = new Error(errBody?.error?.message || `Gemini API returned HTTP ${response.status}`);
    err.status = response.status;
    err.provider = "gemini";
    throw err;
  }

  const rawJson = await response.json().catch(() => null);
  const text = rawJson?.candidates?.[0]?.content?.parts
    ?.map(p => p.text || "")
    .join("")
    .trim();

  if (!text) {
    const err = new Error("Gemini returned an empty candidate response.");
    err.status = 502;
    err.provider = "gemini";
    throw err;
  }

  return { rawText: text, provider: `gemini (${model})` };
}

/**
 * Provider 3 (Optional): OpenRouter / Backup OpenAI-compatible endpoint
 */
async function callOpenRouter({ topic, mode, difficulty, signal, requestId }) {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.FALLBACK_AI_API_KEY;
  if (!apiKey) return null;

  const baseUrl = (process.env.FALLBACK_AI_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/+$/, "");
  const url = `${baseUrl}/chat/completions`;
  const model = process.env.OPENROUTER_MODEL || process.env.FALLBACK_AI_MODEL || "meta-llama/llama-3.1-8b-instruct:free";
  const systemPrompt = getSystemPrompt(mode, difficulty);

  const payload = {
    model,
    messages: [
      {
        role: "system",
        content: `${systemPrompt}\n\nSchema Requirements:\nRespond with a single JSON object having: "topic" (string), "difficulty" (string), "summary" (string), "memoryTip" (string), "flashcards" (array of 6 objects with "id", "question", "answer"), and "quiz" (array of 5 objects with "id", "question", "options" [array of 4 strings], "correctAnswer" [integer 0-3], "explanation", "memoryTip").`
      },
      {
        role: "user",
        content: `Study Topic / Notes:\n${topic}`
      }
    ],
    response_format: { type: "json_object" },
    temperature: 0.3
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://mindforge-ai-study-workspace.vercel.app",
      "X-Title": "MindForge AI"
    },
    signal,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => null);
    const err = new Error(errBody?.error?.message || `OpenRouter API returned HTTP ${response.status}`);
    err.status = response.status;
    err.provider = "openrouter";
    throw err;
  }

  const data = await response.json().catch(() => null);
  const text = data?.choices?.[0]?.message?.content?.trim();

  if (!text) {
    const err = new Error("OpenRouter returned an empty response content.");
    err.status = 502;
    err.provider = "openrouter";
    throw err;
  }

  return { rawText: text, provider: `openrouter (${model})` };
}

/**
 * Returns available configured providers for health check reporting.
 */
export function getProviderInfo() {
  const providers = [];
  if (process.env.GROQ_API_KEY) {
    providers.push({ id: "groq", model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile" });
  }
  if (process.env.GEMINI_API_KEY) {
    providers.push({ id: "gemini", model: process.env.GEMINI_MODEL || "gemini-1.5-flash" });
  }
  if (process.env.OPENROUTER_API_KEY || process.env.FALLBACK_AI_API_KEY) {
    providers.push({ id: "openrouter", model: process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-8b-instruct:free" });
  }

  const primary = providers[0] || { id: "none", model: "none" };
  const backupCount = Math.max(0, providers.length - 1);

  return {
    primaryProvider: primary.id,
    primaryModel: primary.model,
    availableBackupProviders: backupCount,
    configuredProviders: providers.map(p => p.id)
  };
}

/**
 * Main AI Generation Entry Point with Multi-Provider Fallback Waterfall.
 */
export async function generateStudySession({ topic, mode = "full", difficulty = "medium", clientSignal }) {
  const requestId = `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  // Define sequential waterfall chain
  const waterfall = [
    { name: "Groq", fn: callGroq, isConfigured: () => Boolean(process.env.GROQ_API_KEY) },
    { name: "Gemini", fn: callGemini, isConfigured: () => Boolean(process.env.GEMINI_API_KEY) },
    { name: "OpenRouter", fn: callOpenRouter, isConfigured: () => Boolean(process.env.OPENROUTER_API_KEY || process.env.FALLBACK_AI_API_KEY) }
  ];

  // Filter to providers that have API keys present
  const availableChain = waterfall.filter(p => p.isConfigured());

  if (availableChain.length === 0) {
    console.error(`[${requestId}] No AI provider API keys configured on server.`);
    const err = new Error("No AI provider API key is configured on the server. Please check your environment variables.");
    err.status = 500;
    throw err;
  }

  const errors = [];

  for (let i = 0; i < availableChain.length; i++) {
    const currentProvider = availableChain[i];

    // Abort early if user cancelled request
    if (clientSignal?.aborted) {
      throw new Error("Generation cancelled by user.");
    }

    console.log(`[${requestId}] Attempting provider [${i + 1}/${availableChain.length}]: ${currentProvider.name}...`);

    // Wrap attempt in strict 10-second timeout
    const providerController = new AbortController();
    const timeoutId = setTimeout(() => providerController.abort(), PROVIDER_TIMEOUT_MS);

    // Forward client abort to provider controller
    const onClientAbort = () => providerController.abort();
    if (clientSignal) {
      clientSignal.addEventListener("abort", onClientAbort, { once: true });
    }

    try {
      const result = await currentProvider.fn({
        topic,
        mode,
        difficulty,
        signal: providerController.signal,
        requestId
      });

      clearTimeout(timeoutId);
      if (clientSignal) clientSignal.removeEventListener("abort", onClientAbort);

      if (result?.rawText) {
        // Parse and validate immediately against schema
        const parsed = JSON.parse(result.rawText);
        const validation = validateStudySession(parsed, mode);

        if (validation.ok) {
          console.log(`[${requestId}] Successfully generated session using ${result.provider}`);
          return {
            session: validation.data,
            provider: result.provider,
            cached: false
          };
        } else {
          console.warn(`[${requestId}] Schema validation failed for ${currentProvider.name}: ${validation.error}`);
          errors.push({ provider: currentProvider.name, error: `Schema validation failed: ${validation.error}` });
        }
      }
    } catch (err) {
      clearTimeout(timeoutId);
      if (clientSignal) clientSignal.removeEventListener("abort", onClientAbort);

      if (clientSignal?.aborted) {
        throw new Error("Generation cancelled by user.");
      }

      const isTimeout = providerController.signal.aborted;
      const isRateLimit = err.status === 429;
      const errorMsg = isTimeout
        ? "Timed out after 10 seconds"
        : (err.message || `HTTP error ${err.status}`);

      console.warn(`[${requestId}] ${currentProvider.name} failed (${errorMsg}). Switching to next provider in waterfall...`);
      errors.push({
        provider: currentProvider.name,
        status: isTimeout ? 504 : (err.status || 500),
        message: errorMsg
      });
    }
  }

  // If we reached here, ALL configured providers failed or exhausted quotas
  console.error(`[${requestId}] All ${availableChain.length} AI providers failed:`, errors);

  const hadTimeout = errors.some(e => e.status === 504 || e.message?.includes("Timed out"));
  const hadRateLimit = errors.some(e => e.status === 429);

  if (hadTimeout && !hadRateLimit) {
    const timeoutErr = new Error("The AI service took too long to respond. Please try again.");
    timeoutErr.status = 504;
    throw timeoutErr;
  }

  if (hadRateLimit) {
    const rateErr = new Error("AI provider rate limit reached across available services. Please wait a moment and click Retry.");
    rateErr.status = 429;
    throw rateErr;
  }

  const finalErr = new Error("Unable to generate study session right now. Please click Retry.");
  finalErr.status = 502;
  throw finalErr;
}
