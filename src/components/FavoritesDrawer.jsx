import React, { useState, useMemo } from "react";
import { Icon } from "./Icons";

export function FavoritesDrawer({
  bookmarks = [],
  onRemoveBookmark,
  onOpenSession,
  onClose
}) {
  const [filterType, setFilterType] = useState("all");
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  const filteredBookmarks = useMemo(() => {
    return bookmarks.filter(b => {
      const matchesType = filterType === "all" || b.type === filterType;
      const text = `${b.question || ""} ${b.answer || ""} ${b.explanation || ""} ${b.topic || ""} ${b.topicSource || ""}`.toLowerCase();
      const matchesSearch = text.includes(search.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [bookmarks, filterType, search]);

  function handleCopy(item) {
    let text = "";
    if (item.type === "flashcard") {
      text = `Q: ${item.question}\n\nA: ${item.answer}`;
    } else if (item.type === "question") {
      text = `Q: ${item.question}\n\nExplanation: ${item.explanation}`;
    } else if (item.type === "session") {
      text = `Topic: ${item.topic}\nSummary: ${item.summary}\nCards: ${item.sessionData?.flashcards?.length || 0} | Questions: ${item.sessionData?.quiz?.length || 0}`;
    }
    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal panel drawer-panel" onClick={e => e.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <div className="card-label">SAVED HIGHLIGHTS</div>
            <h2>Bookmarks ({bookmarks.length})</h2>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close bookmarks">
            <Icon name="cross" size={18} />
          </button>
        </div>

        {/* Filters */}
        <div className="drawer-filters">
          <div className="search-input-shell">
            <Icon name="search" size={15} />
            <input
              type="text"
              placeholder="Search saved cards, questions, or sessions..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="tab-pill-group">
            <button
              className={`pill-btn ${filterType === "all" ? "active" : ""}`}
              onClick={() => setFilterType("all")}
            >
              All ({bookmarks.length})
            </button>
            <button
              className={`pill-btn ${filterType === "session" ? "active" : ""}`}
              onClick={() => setFilterType("session")}
            >
              Sessions ({bookmarks.filter(b => b.type === "session").length})
            </button>
            <button
              className={`pill-btn ${filterType === "flashcard" ? "active" : ""}`}
              onClick={() => setFilterType("flashcard")}
            >
              Cards ({bookmarks.filter(b => b.type === "flashcard").length})
            </button>
            <button
              className={`pill-btn ${filterType === "question" ? "active" : ""}`}
              onClick={() => setFilterType("question")}
            >
              Questions ({bookmarks.filter(b => b.type === "question").length})
            </button>
          </div>
        </div>

        {/* List */}
        <div className="drawer-content-scroll">
          {filteredBookmarks.length === 0 ? (
            <div className="empty-dash-box">
              <Icon name="bookmark" size={28} />
              <p>{search ? "No matching saved items." : "No bookmarked items yet."}</p>
              <small className="subtle-hint">
                Bookmark challenging flashcards and quiz questions during study sessions.
              </small>
            </div>
          ) : (
            <div className="bookmarks-stack">
              {filteredBookmarks.map(item => (
                <div key={item.id} className="bookmark-full-card">
                  <div className="bookmark-card-top">
                    <span className={`badge-mode ${item.type}`}>
                      <Icon name={item.type === "flashcard" ? "cards" : "target"} size={11} />
                      {item.type?.toUpperCase()}
                    </span>
                    <span className="source-label">{item.topicSource}</span>

                    <div className="bookmark-actions">
                      <button
                        className="card-tool-btn"
                        onClick={() => handleCopy(item)}
                        title={copiedId === item.id ? "Copied!" : "Copy content"}
                      >
                        <Icon name={copiedId === item.id ? "check" : "copy"} size={13} />
                      </button>
                      <button
                        className="card-tool-btn danger"
                        onClick={() => onRemoveBookmark(item.id)}
                        title="Remove bookmark"
                      >
                        <Icon name="trash" size={13} />
                      </button>
                    </div>
                  </div>

                  {item.type === "session" ? (
                    <>
                      <strong className="bookmark-q">{item.topic}</strong>
                      <div className="bookmark-answer-box">
                        <span className="ans-label">Summary:</span>
                        <p>{item.summary}</p>
                        <div style={{ marginTop: "10px" }}>
                          <button
                            className="button primary small"
                            onClick={() => {
                              onOpenSession?.(item.sessionData);
                              onClose();
                            }}
                          >
                            <Icon name="arrow" size={13} /> Open Session
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <strong className="bookmark-q">{item.question}</strong>

                      {item.type === "flashcard" && item.answer && (
                        <div className="bookmark-answer-box">
                          <span className="ans-label">Answer:</span>
                          <p>{item.answer}</p>
                        </div>
                      )}

                      {item.type === "question" && item.explanation && (
                        <div className="bookmark-answer-box">
                          <span className="ans-label">Key Takeaway:</span>
                          <p>{item.explanation}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
