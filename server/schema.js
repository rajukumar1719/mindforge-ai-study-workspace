export const studySchema = {
  type: "object",
  properties: {
    topic: { type: "string", description: "A short title for the requested study topic." },
    difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
    summary: { type: "string", description: "A concise 2-4 sentence overview." },
    memoryTip: { type: "string", description: "One memorable analogy or mnemonic." },
    flashcards: {
      type: "array",
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
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          question: { type: "string" },
          options: {
            type: "array",
            items: { type: "string" }
          },
          correctAnswer: { type: "integer" },
          explanation: { type: "string" },
          memoryTip: { type: "string" }
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

export function validateStudySession(data) {
  if (!data || typeof data !== "object") return { ok: false, error: "root is not an object" };
  if (!isString(data.topic)) return { ok: false, error: "topic is missing" };
  if (!["easy", "medium", "hard"].includes(data.difficulty)) return { ok: false, error: "difficulty is invalid" };
  if (!isString(data.summary)) return { ok: false, error: "summary is missing" };
  if (!isString(data.memoryTip)) return { ok: false, error: "memoryTip is missing" };
  if (!Array.isArray(data.flashcards) || data.flashcards.length === 0) return { ok: false, error: "flashcards is empty or invalid" };
  if (!Array.isArray(data.quiz) || data.quiz.length === 0) return { ok: false, error: "quiz is empty or invalid" };

  for (const card of data.flashcards) {
    if (!card || !isString(card.id) || !isString(card.question) || !isString(card.answer)) {
      return { ok: false, error: "a flashcard has an invalid shape" };
    }
  }

  for (const q of data.quiz) {
    if (!q || !isString(q.id) || !isString(q.question) || !Array.isArray(q.options) ||
        q.options.length !== 4 || !Number.isInteger(q.correctAnswer) ||
        q.correctAnswer < 0 || q.correctAnswer > 3 ||
        !isString(q.explanation) || !isString(q.memoryTip)) {
      return { ok: false, error: "a quiz question has an invalid shape" };
    }
    if (q.options.some(option => !isString(option))) {
      return { ok: false, error: "a quiz option is invalid" };
    }
  }

  return { ok: true };
}