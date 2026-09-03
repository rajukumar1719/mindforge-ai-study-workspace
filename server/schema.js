export const studySchema = {
  type: "object",
  properties: {
    topic: { type: "string", description: "A concise, clean title for the requested study topic." },
    difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
    mode: { type: "string", enum: ["full", "interview", "exam", "quick"] },
    summary: { type: "string", description: "A concise 2-4 sentence conceptual overview." },
    memoryTip: { type: "string", description: "One high-yield memorable analogy, rule of thumb, or mnemonic." },
    flashcards: {
      type: "array",
      description: "Exactly 6 high-yield active recall flashcards.",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          question: { type: "string" },
          answer: { type: "string" }
        },
        required: ["id", "question", "answer"]
      }
    },
    quiz: {
      type: "array",
      description: "Exactly 5 rigorous multiple-choice questions.",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          question: { type: "string" },
          options: {
            type: "array",
            items: { type: "string" }
          },
          correctAnswer: { type: "integer", description: "0-based index of the correct option (0, 1, 2, or 3)." },
          explanation: { type: "string", description: "Clear explanation of why this answer is correct and others are flawed." },
          memoryTip: { type: "string", description: "A quick tip to remember this specific concept." }
        },
        required: ["id", "question", "options", "correctAnswer", "explanation", "memoryTip"]
      }
    }
  },
  required: ["topic", "difficulty", "summary", "memoryTip", "flashcards", "quiz"]
};

function isString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Strict validator and sanitizer for study session data.
 * Guarantees consistent shape before delivering to frontend.
 */
export function validateStudySession(data, requestedMode = "full") {
  if (!data || typeof data !== "object") {
    return { ok: false, error: "Root response is not a valid JSON object." };
  }

  if (!isString(data.topic)) {
    return { ok: false, error: "Topic title is missing or empty." };
  }

  const difficulty = ["easy", "medium", "hard"].includes(data.difficulty) ? data.difficulty : "medium";
  const validModes = ["full", "interview", "exam", "quick"];
  const mode = validModes.includes(data.mode) ? data.mode : (validModes.includes(requestedMode) ? requestedMode : "full");

  if (!isString(data.summary)) {
    return { ok: false, error: "Summary overview is missing or empty." };
  }

  if (!isString(data.memoryTip)) {
    data.memoryTip = "Focus on the foundational patterns and underlying tradeoffs.";
  }

  if (!Array.isArray(data.flashcards) || data.flashcards.length === 0) {
    return { ok: false, error: "Flashcards array is missing or empty." };
  }

  if (!Array.isArray(data.quiz) || data.quiz.length === 0) {
    return { ok: false, error: "Quiz questions array is missing or empty." };
  }

  // Validate & sanitize flashcards
  const sanitizedFlashcards = [];
  for (let i = 0; i < data.flashcards.length; i++) {
    const card = data.flashcards[i];
    if (!card || typeof card !== "object") {
      return { ok: false, error: `Flashcard at index ${i} is not a valid object.` };
    }
    if (!isString(card.question) || !isString(card.answer)) {
      return { ok: false, error: `Flashcard ${i + 1} has an empty question or answer.` };
    }
    sanitizedFlashcards.push({
      id: isString(card.id) ? card.id.trim() : `fc-${i + 1}-${Date.now().toString(36)}`,
      question: card.question.trim(),
      answer: card.answer.trim()
    });
  }

  // Validate & sanitize quiz
  const sanitizedQuiz = [];
  for (let i = 0; i < data.quiz.length; i++) {
    const q = data.quiz[i];
    if (!q || typeof q !== "object") {
      return { ok: false, error: `Quiz question at index ${i} is not a valid object.` };
    }
    if (!isString(q.question)) {
      return { ok: false, error: `Quiz question ${i + 1} is missing text.` };
    }
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      return { ok: false, error: `Quiz question ${i + 1} must have exactly 4 answer options.` };
    }
    if (q.options.some(opt => !isString(opt))) {
      return { ok: false, error: `Quiz question ${i + 1} contains an empty option.` };
    }

    const answerIndex = Number(q.correctAnswer);
    if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex > 3) {
      return { ok: false, error: `Quiz question ${i + 1} has invalid correctAnswer index (${q.correctAnswer}). Must be 0, 1, 2, or 3.` };
    }

    sanitizedQuiz.push({
      id: isString(q.id) ? q.id.trim() : `quiz-${i + 1}-${Date.now().toString(36)}`,
      question: q.question.trim(),
      options: q.options.map(opt => opt.trim()),
      correctAnswer: answerIndex,
      explanation: isString(q.explanation) ? q.explanation.trim() : "Review the concept fundamentals for clarity.",
      memoryTip: isString(q.memoryTip) ? q.memoryTip.trim() : ""
    });
  }

  return {
    ok: true,
    data: {
      topic: data.topic.trim(),
      difficulty,
      mode,
      summary: data.summary.trim(),
      memoryTip: data.memoryTip.trim(),
      flashcards: sanitizedFlashcards,
      quiz: sanitizedQuiz,
      createdAt: new Date().toISOString()
    }
  };
}