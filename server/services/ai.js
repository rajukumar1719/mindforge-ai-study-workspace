import { studySchema, validateStudySession } from "../schema.js";

/**
 * AI Service Provider Abstraction.
 * Supports primary Gemini provider and optional OpenAI-compatible fallback (e.g. Groq, OpenRouter).
 * Implements exponential backoff, timeout handling, structured validation, and mode tuning.
 */

const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash";
const REQUEST_TIMEOUT_MS = 25000;
const MAX_RETRIES = 2;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
 * Primary Provider: Google Gemini API with strict 25s timeout
 */
async function callGemini({ topic, mode, difficulty, signal, requestId }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
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

  // Strict 25-second AbortSignal timeout
  const geminiAbortController = new AbortController();
  const geminiTimer = setTimeout(() => geminiAbortController.abort(), 25000);

  const onParentAbort = () => geminiAbortController.abort();
  if (signal) {
    signal.addEventListener("abort", onParentAbort, { once: true });
  }

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: geminiAbortController.signal,
      body: JSON.stringify(payload)
    });
  } catch (fetchErr) {
    if (geminiAbortController.signal.aborted && !signal?.aborted) {
      console.error(`[${requestId}] Gemini API call timed out after 25 seconds.`);
      const timeoutErr = new Error("The AI service took too long to respond. Please try again.");
      timeoutErr.status = 504;
      timeoutErr.name = "TimeoutError";
      throw timeoutErr;
    }
    throw fetchErr;
  } finally {
    clearTimeout(geminiTimer);
    if (signal) signal.removeEventListener("abort", onParentAbort);
  }

  const rawJson = await response.json().catch(() => null);

  if (!response.ok) {
    const errorObj = new Error(rawJson?.error?.message || `Gemini API returned HTTP ${response.status}`);
    errorObj.status = response.status;
    errorObj.provider = "gemini";
    throw errorObj;
  }

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
 * Fallback Provider: Compatible OpenAI-style REST endpoint (Groq / OpenRouter)
 * Documented choice: Groq Llama-3.3-70b provides free/low-cost sub-second structured JSON responses.
 */
async function callFallbackProvider({ topic, mode, difficulty, signal, requestId }) {
  const apiKey = process.env.FALLBACK_AI_API_KEY;
  if (!apiKey) {
    return null; // Fallback not configured
  }

  const baseUrl = (process.env.FALLBACK_AI_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/+$/, "");
  const model = process.env.FALLBACK_AI_MODEL || "llama-3.3-70b-versatile";

  const prompt = `${getSystemPrompt(mode, difficulty)}\n\nTopic / Study Material:\n${topic}`;

  const payload = {
    model,
    messages: [
      { role: "system", content: "You are a JSON-only study generator. Output valid JSON matching the requested structure." },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" },
    temperature: 0.3
  };

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    signal,
    body: JSON.stringify(payload)
  });

  const rawJson = await response.json().catch(() => null);

  if (!response.ok) {
    const errorObj = new Error(rawJson?.error?.message || `Fallback AI provider returned HTTP ${response.status}`);
    errorObj.status = response.status;
    errorObj.provider = "fallback";
    throw errorObj;
  }

  const text = rawJson?.choices?.[0]?.message?.content?.trim();
  if (!text) {
    const err = new Error("Fallback provider returned an empty completion.");
    err.status = 502;
    err.provider = "fallback";
    throw err;
  }

  return { rawText: text, provider: `fallback (${model})` };
}

/**
 * Main Study Session Generation Function.
 * Implements exponential backoff, circuit-breaking, and validation.
 */
export async function generateStudySession({ topic, mode = "full", difficulty = "medium", clientSignal }) {
  const requestId = `mf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  console.log(`[${requestId}] Generating study session | topic="${topic.slice(0, 40)}..." | mode=${mode} | diff=${difficulty}`);

  let lastError = null;

  // Primary Provider Execution with transient retry
  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    // Check if client disconnected before making call
    if (clientSignal?.aborted) {
      throw new Error("Client aborted generation request.");
    }

    const timeoutController = new AbortController();
    const timer = setTimeout(() => timeoutController.abort(), REQUEST_TIMEOUT_MS);

    // Merge client cancellation with internal timeout
    const combinedAbortHandler = () => timeoutController.abort();
    if (clientSignal) {
      clientSignal.addEventListener("abort", combinedAbortHandler, { once: true });
    }

    try {
      const result = await callGemini({
        topic,
        mode,
        difficulty,
        signal: timeoutController.signal,
        requestId
      });

      clearTimeout(timer);
      if (clientSignal) clientSignal.removeEventListener("abort", combinedAbortHandler);

      // Parse JSON
      let parsed;
      try {
        parsed = JSON.parse(result.rawText);
      } catch (jsonErr) {
        throw new Error("AI returned malformed JSON content.");
      }

      // Validate against strict schema
      const validation = validateStudySession(parsed, mode);
      if (!validation.ok) {
        throw new Error(`AI generated invalid study structure: ${validation.error}`);
      }

      console.log(`[${requestId}] Session generated successfully via ${result.provider} on attempt ${attempt}`);
      return {
        session: validation.data,
        provider: result.provider,
        cached: false
      };
    } catch (err) {
      clearTimeout(timer);
      if (clientSignal) clientSignal.removeEventListener("abort", combinedAbortHandler);

      lastError = err;

      // Do not retry on client abort, timeout, or fatal configuration error
      if (clientSignal?.aborted) {
        throw new Error("Generation cancelled by user.");
      }
      if (err.status === 504 || err.name === "TimeoutError") {
        lastError = err;
        break; // Do not retry if 25s timeout exceeded
      }
      if (err.message?.includes("GEMINI_API_KEY is not configured")) {
        throw err;
      }

      const isTransient =
        err.status === 429 ||
        (err.status >= 500 && err.status <= 599) ||
        err.message?.includes("fetch failed");

      if (isTransient && attempt <= MAX_RETRIES) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 4000);
        console.warn(`[${requestId}] Transient error (${err.message}) on attempt ${attempt}. Retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }

      break;
    }
  }

  // If primary provider failed and fallback is configured, attempt fallback
  if (process.env.FALLBACK_AI_API_KEY && lastError?.status !== 504) {
    console.warn(`[${requestId}] Primary provider failed. Attempting configured fallback AI provider...`);

    const timeoutController = new AbortController();
    const timer = setTimeout(() => timeoutController.abort(), REQUEST_TIMEOUT_MS);

    try {
      const fallbackResult = await callFallbackProvider({
        topic,
        mode,
        difficulty,
        signal: timeoutController.signal,
        requestId
      });

      clearTimeout(timer);

      if (fallbackResult) {
        const parsed = JSON.parse(fallbackResult.rawText);
        const validation = validateStudySession(parsed, mode);
        if (validation.ok) {
          console.log(`[${requestId}] Successfully recovered using fallback provider: ${fallbackResult.provider}`);
          return {
            session: validation.data,
            provider: fallbackResult.provider,
            cached: false
          };
        }
      }
    } catch (fallbackErr) {
      clearTimeout(timer);
      console.error(`[${requestId}] Fallback AI provider also failed:`, fallbackErr.message);
    }
  }

  // Format user-friendly error
  if (lastError?.status === 504 || lastError?.name === "TimeoutError" || lastError?.name === "AbortError") {
    console.error(`[${requestId}] Responding with HTTP 504 timeout.`);
    const timeoutErr = new Error("The AI service took too long to respond. Please try again.");
    timeoutErr.status = 504;
    throw timeoutErr;
  }

  if (lastError?.status === 429) {
    const quotaErr = new Error("AI provider rate limit reached. Please wait a moment and try again.");
    quotaErr.status = 429;
    throw quotaErr;
  }

  if (lastError?.status >= 500) {
    const serverErr = new Error("The AI study engine encountered a temporary upstream issue. Please retry.");
    serverErr.status = 502;
    throw serverErr;
  }

  const genericErr = new Error(lastError?.message || "Unable to generate study session right now. Please retry.");
  genericErr.status = lastError?.status || 500;
  throw genericErr;
}
