/**
 * Safe versioned storage utility for MindForge.
 * Guarantees zero crashes even if localStorage is disabled, full, or corrupt.
 */

const STORAGE_KEYS = {
  HISTORY: "mindforge_history_v2",
  STATS: "mindforge_stats_v2",
  BOOKMARKS: "mindforge_bookmarks_v2",
  THEME: "mindforge_theme_v2"
};

function safeGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[Storage] Failed to read ${key}:`, err);
    return fallback;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn(`[Storage] Failed to write ${key}:`, err);
    return false;
  }
}

// Format date string as YYYY-MM-DD
function getLocalDateString(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Calculate streak between today and last studied date
function updateStreak(lastDateStr, currentStreak = 0) {
  const todayStr = getLocalDateString();
  if (!lastDateStr) {
    return { streak: 1, lastDate: todayStr };
  }

  if (lastDateStr === todayStr) {
    return { streak: Math.max(1, currentStreak), lastDate: todayStr };
  }

  const lastDate = new Date(lastDateStr);
  const today = new Date(todayStr);
  const diffDays = Math.round((today - lastDate) / (1000 * 60 * 60 * 24));

  if (diffDays === 1) {
    return { streak: (currentStreak || 0) + 1, lastDate: todayStr };
  } else {
    // Streak broken
    return { streak: 1, lastDate: todayStr };
  }
}

// --- History Methods ---

export function getStudyHistory() {
  const history = safeGet(STORAGE_KEYS.HISTORY, []);
  return Array.isArray(history) ? history : [];
}

export function saveSessionToHistory(session) {
  if (!session || !session.topic) return;

  try {
    const history = getStudyHistory();
    // Exclude existing entry with exact same topic and mode to avoid duplicates
    const filtered = history.filter(
      item => !(item.topic?.toLowerCase() === session.topic?.toLowerCase() && item.mode === session.mode)
    );

    const historyItem = {
      id: `hist-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      topic: session.topic,
      difficulty: session.difficulty || "medium",
      mode: session.mode || "full",
      summary: session.summary || "",
      memoryTip: session.memoryTip || "",
      flashcards: session.flashcards || [],
      quiz: session.quiz || [],
      quizScore: session.quizScore ?? null,
      savedAt: new Date().toISOString()
    };

    // Cap at most recent 20 sessions to prevent storage quota exceed
    const updated = [historyItem, ...filtered].slice(0, 20);
    safeSet(STORAGE_KEYS.HISTORY, updated);
    return historyItem;
  } catch (err) {
    console.error("[Storage] Could not save session to history", err);
  }
}

export function updateSessionScoreInHistory(topic, mode, scoreData) {
  try {
    const history = getStudyHistory();
    const updated = history.map(item => {
      if (item.topic?.toLowerCase() === topic?.toLowerCase() && item.mode === mode) {
        return { ...item, quizScore: scoreData };
      }
      return item;
    });
    safeSet(STORAGE_KEYS.HISTORY, updated);
  } catch (err) {
    console.warn("[Storage] Failed to update quiz score in history", err);
  }
}

export function deleteSessionFromHistory(id) {
  const history = getStudyHistory();
  const updated = history.filter(item => item.id !== id);
  safeSet(STORAGE_KEYS.HISTORY, updated);
  return updated;
}

export function clearStudyHistory() {
  safeSet(STORAGE_KEYS.HISTORY, []);
}

// --- Analytics / Stats Methods ---

const DEFAULT_STATS = {
  totalSessions: 0,
  flashcardsReviewed: 0,
  quizAttempts: 0,
  totalQuestionsAnswered: 0,
  correctAnswers: 0,
  streakDays: 1,
  lastStudiedDate: ""
};

export function getStudyStats() {
  const stats = safeGet(STORAGE_KEYS.STATS, DEFAULT_STATS);
  return { ...DEFAULT_STATS, ...stats };
}

export function recordSessionActivity() {
  const stats = getStudyStats();
  const { streak, lastDate } = updateStreak(stats.lastStudiedDate, stats.streakDays);

  const updated = {
    ...stats,
    totalSessions: (stats.totalSessions || 0) + 1,
    streakDays: streak,
    lastStudiedDate: lastDate
  };

  safeSet(STORAGE_KEYS.STATS, updated);
  return updated;
}

export function recordCardReview(count = 1) {
  const stats = getStudyStats();
  const { streak, lastDate } = updateStreak(stats.lastStudiedDate, stats.streakDays);

  const updated = {
    ...stats,
    flashcardsReviewed: (stats.flashcardsReviewed || 0) + count,
    streakDays: streak,
    lastStudiedDate: lastDate
  };

  safeSet(STORAGE_KEYS.STATS, updated);
  return updated;
}

export function recordQuizCompletion(totalQuestions, correctCount) {
  const stats = getStudyStats();
  const { streak, lastDate } = updateStreak(stats.lastStudiedDate, stats.streakDays);

  const updated = {
    ...stats,
    quizAttempts: (stats.quizAttempts || 0) + 1,
    totalQuestionsAnswered: (stats.totalQuestionsAnswered || 0) + totalQuestions,
    correctAnswers: (stats.correctAnswers || 0) + correctCount,
    streakDays: streak,
    lastStudiedDate: lastDate
  };

  safeSet(STORAGE_KEYS.STATS, updated);
  return updated;
}

// --- Bookmarks Methods ---

export function getBookmarks() {
  const bookmarks = safeGet(STORAGE_KEYS.BOOKMARKS, []);
  return Array.isArray(bookmarks) ? bookmarks : [];
}

export function toggleBookmarkItem(item) {
  if (!item || !item.id) return [];

  const bookmarks = getBookmarks();
  const exists = bookmarks.some(b => b.id === item.id);

  let updated;
  if (exists) {
    updated = bookmarks.filter(b => b.id !== item.id);
  } else {
    updated = [
      {
        ...item,
        savedAt: new Date().toISOString()
      },
      ...bookmarks
    ].slice(0, 50); // Cap at 50 bookmarks
  }

  safeSet(STORAGE_KEYS.BOOKMARKS, updated);
  return updated;
}

export function isItemBookmarked(id) {
  if (!id) return false;
  const bookmarks = getBookmarks();
  return bookmarks.some(b => b.id === id);
}

// --- Theme Methods ---

export function getInitialTheme() {
  const saved = safeGet(STORAGE_KEYS.THEME, null);
  if (saved === "dark" || saved === "light") return saved;
  if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

export function saveTheme(theme) {
  safeSet(STORAGE_KEYS.THEME, theme);
}
