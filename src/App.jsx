import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { Dashboard } from "./components/Dashboard";
import { Composer } from "./components/Composer";
import { FlashcardsView } from "./components/FlashcardsView";
import { QuizView } from "./components/QuizView";
import { RetestModal } from "./components/RetestModal";
import { HistoryDrawer } from "./components/HistoryDrawer";
import { FavoritesDrawer } from "./components/FavoritesDrawer";
import { ExportModal } from "./components/ExportModal";
import { Icon } from "./components/Icons";
import {
  getStudyHistory,
  saveSessionToHistory,
  updateSessionScoreInHistory,
  deleteSessionFromHistory,
  clearStudyHistory,
  getStudyStats,
  recordSessionActivity,
  recordCardReview,
  recordQuizCompletion,
  getBookmarks,
  toggleBookmarkItem,
  isItemBookmarked,
  getInitialTheme,
  saveTheme
} from "./utils/storage";

export default function App() {
  const [topic, setTopic] = useState("");
  const [mode, setMode] = useState("full");
  const [difficulty, setDifficulty] = useState("medium");
  const [session, setSession] = useState(null);
  const [phase, setPhase] = useState("idle"); // idle | loading | ready | error
  const [error, setError] = useState("");
  const [lastTopic, setLastTopic] = useState("");
  const [activeView, setActiveView] = useState("workspace"); // workspace | dashboard | history | bookmarks
  const [studyTab, setStudyTab] = useState("all"); // all | flashcards | quiz
  const [retestQuestions, setRetestQuestions] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [lastProvider, setLastProvider] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Persistent storage state
  const [stats, setStats] = useState(getStudyStats);
  const [history, setHistory] = useState(getStudyHistory);
  const [bookmarks, setBookmarks] = useState(getBookmarks);
  const [darkMode, setDarkMode] = useState(getInitialTheme() === "dark");

  const abortRef = useRef(null);

  // Sync theme with DOM
  useEffect(() => {
    const themeStr = darkMode ? "dark" : "light";
    document.documentElement.dataset.theme = themeStr;
    saveTheme(themeStr);
  }, [darkMode]);

  // Cold-start background ping to wake up the Render backend early before user clicks Generate
  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_URL || "";
    const pingController = new AbortController();
    const timer = setTimeout(() => pingController.abort(), 15000);

    fetch(`${apiBase}/api/health`, {
      method: "GET",
      signal: pingController.signal
    })
      .then(res => res.json())
      .then(data => {
        if (data?.ok) {
          console.log("[Cold-Start Ping] Render backend is hot & ready:", data.model);
        }
      })
      .catch(err => {
        console.log("[Cold-Start Ping] Backend spin-up initiated:", err.message);
      })
      .finally(() => {
        clearTimeout(timer);
      });

    return () => {
      clearTimeout(timer);
      pingController.abort();
    };
  }, []);

  // Global safety handler: prevent any AbortController or TIMEOUT_35S rejections from becoming uncaught errors
  useEffect(() => {
    const handleUnhandledRejection = event => {
      const reason = event.reason;
      if (
        reason === "TIMEOUT_35S" ||
        reason?.name === "AbortError" ||
        reason?.message?.includes("aborted") ||
        reason?.message?.includes("TIMEOUT_35S")
      ) {
        event.preventDefault(); // Suppress unhandled rejection in browser console
      }
    };
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => window.removeEventListener("unhandledrejection", handleUnhandledRejection);
  }, []);

  // AI Status calculation
  const aiStatus = useMemo(() => {
    if (phase === "loading") {
      return {
        label: "AI THINKING",
        className: "thinking",
        title: "Processing study material with structured reasoning"
      };
    }
    if (phase === "error") {
      return {
        label: "AI RETRY",
        className: "offline",
        title: "Click Retry to re-trigger generation"
      };
    }
    if (lastProvider === "cache") {
      return {
        label: "CACHED RESULT",
        className: "ready",
        title: "Instant response from in-memory cache"
      };
    }
    return {
      label: "AI READY",
      className: "ready",
      title: "MindForge AI engine operational"
    };
  }, [phase, lastProvider]);

  // Request cancellation handler
  const cancelRequest = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setPhase("idle");
    setError("");
  }, []);

  // Main Generation Handler with strict 35-second AbortController timeout
  const generateStudySession = useCallback(
    async (customTopic = topic) => {
      const cleanTopic = customTopic.trim();
      if (!cleanTopic) {
        setError("Please enter a topic or paste study notes first.");
        setPhase("error");
        return;
      }

      // Abort any existing in-flight request
      if (abortRef.current) {
        abortRef.current.abort();
      }

      const controller = new AbortController();
      abortRef.current = controller;

      let isTimeout = false;
      const timeoutTimer = setTimeout(() => {
        isTimeout = true;
        controller.abort("TIMEOUT_35S");
      }, 35000); // 35s strict frontend timeout

      setLastTopic(cleanTopic);
      setPhase("loading");
      setError("");
      setActiveView("workspace");

      const apiBase = import.meta.env.VITE_API_URL || "";

      try {
        const response = await fetch(`${apiBase}/api/study-session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: cleanTopic,
            mode,
            difficulty
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutTimer);

        const body = await response.json().catch(() => null);

        if (!response.ok) {
          if (response.status === 504 || body?.error?.includes("too long to respond")) {
            throw new Error(body?.error || "The server is waking up or taking longer than expected. Please click Retry.");
          }
          throw new Error(body?.error || "The server could not generate your study session.");
        }

        if (!body?.session || !Array.isArray(body.session.flashcards) || !Array.isArray(body.session.quiz)) {
          throw new Error("The AI returned an invalid or malformed data structure.");
        }

        const newSession = {
          ...body.session,
          mode,
          difficulty
        };

        setSession(newSession);
        setLastProvider(body.provider || "gemini");
        setPhase("ready");

        // Persist to storage & update streak analytics
        saveSessionToHistory(newSession);
        setHistory(getStudyHistory());

        const updatedStats = recordSessionActivity();
        setStats(updatedStats);
      } catch (err) {
        clearTimeout(timeoutTimer);

        const wasTimeout =
          isTimeout ||
          err === "TIMEOUT_35S" ||
          controller.signal.reason === "TIMEOUT_35S" ||
          err?.name === "TimeoutError";

        if (wasTimeout) {
          setError("The server is waking up or taking longer than expected. Please click Retry.");
          setPhase("error");
          return;
        }

        if ((err?.name === "AbortError" || err?.message?.includes("aborted") || controller.signal.aborted) && !wasTimeout) {
          // Silent ignore user-initiated abort
          return;
        }

        const msg =
          err?.message?.includes("Failed to fetch") ||
          err?.message?.includes("NetworkError") ||
          err?.message?.includes("too long to respond")
            ? "The server is waking up or taking longer than expected. Please click Retry."
            : (err?.message || "The server is waking up or taking longer than expected. Please click Retry.");

        setError(msg);
        setPhase("error");
      } finally {
        clearTimeout(timeoutTimer);
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    },
    [topic, mode, difficulty]
  );

  // Resume / open a past session from history
  const handleOpenSession = useCallback(pastSession => {
    if (!pastSession) return;
    setSession(pastSession);
    setTopic(pastSession.topic);
    setMode(pastSession.mode || "full");
    setDifficulty(pastSession.difficulty || "medium");
    setPhase("ready");
    setActiveView("workspace");
  }, []);

  // Delete session from history
  const handleDeleteSession = useCallback(id => {
    const updated = deleteSessionFromHistory(id);
    setHistory(updated);
  }, []);

  // Clear all history
  const handleClearHistory = useCallback(() => {
    clearStudyHistory();
    setHistory([]);
  }, []);

  // Bookmarks toggle
  const handleToggleBookmark = useCallback(item => {
    const updated = toggleBookmarkItem(item);
    setBookmarks(updated);
  }, []);

  const checkIsBookmarked = useCallback(
    id => {
      return isItemBookmarked(id);
    },
    [bookmarks]
  );

  // Flashcards reviewed tracking
  const handleRecordCardReview = useCallback(count => {
    const updated = recordCardReview(count);
    setStats(updated);
  }, []);

  // Quiz completion tracking
  const handleQuizCompleted = useCallback(
    (totalQuestions, correctCount) => {
      const updated = recordQuizCompletion(totalQuestions, correctCount);
      setStats(updated);

      if (session?.topic) {
        updateSessionScoreInHistory(session.topic, session.mode || "full", {
          correct: correctCount,
          total: totalQuestions
        });
        setHistory(getStudyHistory());
      }
    },
    [session]
  );

  // Retest mistakes finish
  const handleFinishRetest = useCallback(fixedIds => {
    // Retest finished
    setRetestQuestions(null);
  }, []);

  // Reset to start a new session
  const handleNewSession = useCallback(() => {
    cancelRequest();
    setSession(null);
    setPhase("idle");
    setError("");
    setTopic("");
    setActiveView("workspace");
  }, [cancelRequest]);

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <div className="app-layout">
        {/* Desktop Sidebar & Mobile Slide-over Drawer */}
        <Sidebar
          activeView={activeView}
          setActiveView={setActiveView}
          aiStatus={aiStatus}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          historyCount={history.length}
          bookmarksCount={bookmarks.length}
          streakDays={stats.streakDays}
          onNewSession={handleNewSession}
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />

        <div className="app-main-content">
          {/* Mobile Topbar & Mobile Bottom Navigation */}
          <Header
            activeView={activeView}
            setActiveView={setActiveView}
            aiStatus={aiStatus}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            historyCount={history.length}
            bookmarksCount={bookmarks.length}
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
          />

          <main className="container">
        {/* VIEW 1: DASHBOARD */}
        {activeView === "dashboard" && (
          <Dashboard
            stats={stats}
            history={history}
            bookmarks={bookmarks}
            onOpenSession={handleOpenSession}
            onNewSession={handleNewSession}
            onOpenBookmarks={() => setActiveView("bookmarks")}
          />
        )}

        {/* VIEW 2: STUDY WORKSPACE */}
        {activeView === "workspace" && (
          <>
            {/* Hero Section (shown when no active session) */}
            {!session && (
              <section className="hero">
                <div className="hero-badge">
                  <Icon name="spark" size={13} />
                  <span>Production AI Study Engine</span>
                </div>
                <h1>
                  Master any concept.<br />
                  <span>Retain with active recall.</span>
                </h1>
                <p>
                  MindForge structures topics into validated flashcards, scenario quizzes, and mistake-based revision drills.
                </p>
                <div className="hero-proof">
                  <span>✦</span> Structured Schema <i>·</i> Real-Time Validation <i>·</i> Resilient Multi-Provider Fallback
                </div>
              </section>
            )}

            {/* Composer Input Panel */}
            {!session && (
              <Composer
                topic={topic}
                setTopic={setTopic}
                mode={mode}
                setMode={setMode}
                difficulty={difficulty}
                setDifficulty={setDifficulty}
                onGenerate={generateStudySession}
                phase={phase}
                error={error}
                lastTopic={lastTopic}
                onCancelRequest={cancelRequest}
                onDismissError={() => setError("")}
              />
            )}

            {/* Active Study Session Workspace */}
            {session && phase === "ready" && (
              <div className="active-session-view">
                {/* Session Header */}
                <section className="session-header-card panel">
                  <div className="session-title-block">
                    <div className="session-tag-row">
                      <span className={`badge-mode ${session.mode || "full"}`}>
                        {session.mode === "interview"
                          ? "🎯 Interview Prep"
                          : session.mode === "exam"
                          ? "📝 Exam Mastery"
                          : session.mode === "quick"
                          ? "⚡ Quick Revision"
                          : "✦ Full Session"}
                      </span>
                      <span className="difficulty-badge">{session.difficulty}</span>
                      {lastProvider === "cache" && (
                        <span className="cache-indicator">⚡ Instant Cache</span>
                      )}
                    </div>
                    <h2>{session.topic}</h2>
                    <p className="session-summary-text">{session.summary}</p>
                  </div>

                  <div className="session-actions-block">
                    <button
                      className={`button secondary icon-only ${checkIsBookmarked(`session-${session.topic}-${session.mode || "full"}`) ? "active" : ""}`}
                      onClick={() =>
                        handleToggleBookmark({
                          id: `session-${session.topic}-${session.mode || "full"}`,
                          type: "session",
                          topic: session.topic,
                          summary: session.summary,
                          topicSource: session.topic,
                          sessionData: session
                        })
                      }
                      title={checkIsBookmarked(`session-${session.topic}-${session.mode || "full"}`) ? "Remove bookmark" : "Bookmark this session"}
                    >
                      <Icon
                        name={checkIsBookmarked(`session-${session.topic}-${session.mode || "full"}`) ? "bookmarkFilled" : "bookmark"}
                        size={16}
                      />
                      <span className="hide-mobile">Bookmark</span>
                    </button>

                    <button
                      className="button secondary icon-only"
                      onClick={() => setShowExportModal(true)}
                      title="Export study session"
                    >
                      <Icon name="download" size={16} />
                      <span className="hide-mobile">Export</span>
                    </button>

                    <button
                      className="button primary"
                      onClick={handleNewSession}
                    >
                      <Icon name="spark" size={15} />
                      <span>New Session</span>
                    </button>
                  </div>
                </section>

                {/* Sub-tab view selector (All, Flashcards, Quiz) */}
                <div className="workspace-tabs-bar">
                  <button
                    className={`tab-btn ${studyTab === "all" ? "active" : ""}`}
                    onClick={() => setStudyTab("all")}
                  >
                    <Icon name="layers" size={14} />
                    <span>All-in-One</span>
                  </button>
                  <button
                    className={`tab-btn ${studyTab === "flashcards" ? "active" : ""}`}
                    onClick={() => setStudyTab("flashcards")}
                  >
                    <Icon name="cards" size={14} />
                    <span>Flashcards ({session.flashcards?.length || 0})</span>
                  </button>
                  <button
                    className={`tab-btn ${studyTab === "quiz" ? "active" : ""}`}
                    onClick={() => setStudyTab("quiz")}
                  >
                    <Icon name="target" size={14} />
                    <span>Quiz ({session.quiz?.length || 0})</span>
                  </button>
                </div>

                {/* Learning Grid */}
                <section className={`learning-grid tab-${studyTab}`}>
                  {(studyTab === "all" || studyTab === "flashcards") && (
                    <FlashcardsView
                      flashcards={session.flashcards}
                      topicTitle={session.topic}
                      onRecordReview={handleRecordCardReview}
                      onToggleBookmark={handleToggleBookmark}
                      isBookmarked={checkIsBookmarked}
                    />
                  )}

                  {(studyTab === "all" || studyTab === "quiz") && (
                    <QuizView
                      quiz={session.quiz}
                      topicTitle={session.topic}
                      onQuizCompleted={handleQuizCompleted}
                      onOpenRetest={wrongItems => setRetestQuestions(wrongItems)}
                      onToggleBookmark={handleToggleBookmark}
                      isBookmarked={checkIsBookmarked}
                    />
                  )}
                </section>

                {/* Memory Tip Card */}
                {session.memoryTip && (
                  <section className="memory panel">
                    <div className="memory-glow" />
                    <div className="memory-icon">
                      <Icon name="spark" size={20} />
                    </div>
                    <div>
                      <div className="card-label">AI MNEMONIC & RETENTION RULE</div>
                      <p>{session.memoryTip}</p>
                    </div>
                  </section>
                )}
              </div>
            )}
          </>
        )}

        {/* VIEW 3: HISTORY DRAWER / MODAL */}
        {activeView === "history" && (
          <HistoryDrawer
            history={history}
            onOpenSession={handleOpenSession}
            onDeleteSession={handleDeleteSession}
            onClearHistory={handleClearHistory}
            onClose={() => setActiveView("workspace")}
          />
        )}

        {/* VIEW 4: FAVORITES DRAWER / MODAL */}
        {activeView === "bookmarks" && (
          <FavoritesDrawer
            bookmarks={bookmarks}
            onRemoveBookmark={id => handleToggleBookmark({ id })}
            onOpenSession={handleOpenSession}
            onClose={() => setActiveView("workspace")}
          />
        )}

        {/* Retest Modal */}
        {retestQuestions && retestQuestions.length > 0 && (
          <RetestModal
            questions={retestQuestions}
            onClose={() => setRetestQuestions(null)}
            onFinishRetest={handleFinishRetest}
          />
        )}

        {/* Export Modal */}
        {showExportModal && session && (
          <ExportModal
            session={session}
            onClose={() => setShowExportModal(false)}
          />
        )}

        <footer className="app-footer">
          <p>
            MindForge AI Study Workspace <span>·</span> SDE Internship Assignment <span>·</span>
            Structured AI <span>→</span> Runtime Schema Validation <span>→</span> Interactive UI
          </p>
        </footer>
      </main>
    </div>
  </div>
</div>
  );
}
