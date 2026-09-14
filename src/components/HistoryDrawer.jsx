import React, { useState, useMemo } from "react";
import { Icon } from "./Icons";

export function HistoryDrawer({
  history = [],
  onOpenSession,
  onDeleteSession,
  onClearHistory,
  onClose
}) {
  const [search, setSearch] = useState("");
  const [selectedMode, setSelectedMode] = useState("all");
  const [selectedDiff, setSelectedDiff] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const filteredHistory = useMemo(() => {
    return history
      .filter(item => {
        const matchesSearch = item.topic?.toLowerCase().includes(search.toLowerCase());
        const matchesMode = selectedMode === "all" || item.mode === selectedMode;
        const matchesDiff = selectedDiff === "all" || item.difficulty === selectedDiff;
        return matchesSearch && matchesMode && matchesDiff;
      })
      .sort((a, b) => {
        if (sortBy === "oldest") {
          return new Date(a.savedAt) - new Date(b.savedAt);
        }
        return new Date(b.savedAt) - new Date(a.savedAt);
      });
  }, [history, search, selectedMode, selectedDiff, sortBy]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal panel drawer-panel" onClick={e => e.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <div className="card-label">STORAGE & SESSIONS</div>
            <h2>Study History</h2>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close history">
            <Icon name="cross" size={18} />
          </button>
        </div>

        {/* Filter Controls */}
        <div className="drawer-filters">
          <div className="search-input-shell">
            <Icon name="search" size={15} />
            <input
              type="text"
              placeholder="Search past topics..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="clear-search" onClick={() => setSearch("")}>
                <Icon name="cross" size={13} />
              </button>
            )}
          </div>

          <div className="filter-chips-row">
            <select
              value={selectedMode}
              onChange={e => setSelectedMode(e.target.value)}
              className="drawer-select"
            >
              <option value="all">All Modes</option>
              <option value="interview">🎯 Interview Prep</option>
              <option value="exam">📝 Exam Mastery</option>
              <option value="quick">⚡ Quick Revision</option>
              <option value="full">✦ Full Session</option>
            </select>

            <select
              value={selectedDiff}
              onChange={e => setSelectedDiff(e.target.value)}
              className="drawer-select"
            >
              <option value="all">All Depths</option>
              <option value="easy">Foundational</option>
              <option value="medium">Intermediate</option>
              <option value="hard">Advanced</option>
            </select>

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="drawer-select"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>

        {/* Items List */}
        <div className="drawer-content-scroll">
          {filteredHistory.length === 0 ? (
            <div className="empty-dash-box">
              <Icon name="search" size={28} />
              <p>{search ? "No matching study sessions found." : "No saved study sessions."}</p>
            </div>
          ) : (
            <div className="history-cards-stack">
              {filteredHistory.map(item => (
                <div key={item.id} className="history-card">
                  <div className="history-card-body" onClick={() => onOpenSession(item)}>
                    <div className="recent-meta">
                      <span className={`badge-mode ${item.mode || "full"}`}>
                        {item.mode === "interview" ? "🎯 Interview" : item.mode === "exam" ? "📝 Exam" : item.mode === "quick" ? "⚡ Quick" : "✦ Full"}
                      </span>
                      <span className="recent-date">
                        {new Date(item.savedAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric"
                        })}
                      </span>
                    </div>

                    <h3>{item.topic}</h3>

                    <div className="history-card-meta">
                      <span><Icon name="cards" size={12} /> {item.flashcards?.length || 6} cards</span>
                      <span><Icon name="target" size={12} /> {item.quiz?.length || 5} questions</span>
                      {item.quizScore && (
                        <span className="score-pill">
                          <Icon name="check" size={12} /> {Math.round((item.quizScore.correct / item.quizScore.total) * 100)}%
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="history-card-actions">
                    <button
                      className="history-open-btn"
                      onClick={() => onOpenSession(item)}
                      title="Open session"
                    >
                      <Icon name="arrow" size={15} />
                    </button>
                    <button
                      className="history-del-btn"
                      onClick={() => onDeleteSession(item.id)}
                      title="Delete session"
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {history.length > 0 && (
          <div className="drawer-footer">
            <span className="subtle-count">{filteredHistory.length} of {history.length} shown</span>
            <button
              className="text-button danger"
              onClick={() => {
                if (window.confirm("Are you sure you want to clear all study history?")) {
                  onClearHistory();
                }
              }}
            >
              <Icon name="trash" size={14} /> Clear all history
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
