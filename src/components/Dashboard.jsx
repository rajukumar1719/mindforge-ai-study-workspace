import React from "react";
import { Icon } from "./Icons";

export function Dashboard({
  stats,
  history,
  bookmarks,
  onOpenSession,
  onNewSession,
  onOpenBookmarks
}) {
  const accuracy =
    stats.totalQuestionsAnswered > 0
      ? Math.round((stats.correctAnswers / stats.totalQuestionsAnswered) * 100)
      : 0;

  const recentSessions = history.slice(0, 4);

  return (
    <div className="dashboard-layout">
      {/* Welcome Banner */}
      <section className="dash-hero panel">
        <div className="dash-hero-content">
          <div className="eyebrow">
            <Icon name="spark" size={13} /> SDE INTERVIEW & STUDY ANALYTICS
          </div>
          <h1>Study Dashboard</h1>
          <p>
            Track your retention, maintain your daily study streak, and review high-yield concepts.
          </p>
          <div className="dash-hero-actions">
            <button className="button primary" onClick={onNewSession}>
              <Icon name="spark" size={15} /> Start New Study Session
            </button>
            {recentSessions.length > 0 && (
              <button
                className="button secondary"
                onClick={() => onOpenSession(recentSessions[0])}
              >
                <Icon name="rotate" size={15} /> Resume: {recentSessions[0].topic.slice(0, 24)}...
              </button>
            )}
          </div>
        </div>

        <div className="streak-badge-card">
          <div className="flame-ring">
            <Icon name="flame" size={32} />
          </div>
          <div className="streak-number">{stats.streakDays || 1}</div>
          <div className="streak-label">DAY STREAK</div>
          <small className="streak-tip">Active learning daily builds recall</small>
        </div>
      </section>

      {/* Metrics Row */}
      <section className="metrics-grid">
        <div className="metric-card panel">
          <div className="metric-header">
            <span className="metric-icon blue">
              <Icon name="layers" size={18} />
            </span>
            <span className="metric-trend">Total Sessions</span>
          </div>
          <div className="metric-value">{stats.totalSessions}</div>
          <div className="metric-caption">Generated study packs</div>
        </div>

        <div className="metric-card panel">
          <div className="metric-header">
            <span className="metric-icon purple">
              <Icon name="cards" size={18} />
            </span>
            <span className="metric-trend">Cards Flipped</span>
          </div>
          <div className="metric-value">{stats.flashcardsReviewed}</div>
          <div className="metric-caption">Active recall interactions</div>
        </div>

        <div className="metric-card panel">
          <div className="metric-header">
            <span className="metric-icon amber">
              <Icon name="target" size={18} />
            </span>
            <span className="metric-trend">Quiz Attempts</span>
          </div>
          <div className="metric-value">{stats.quizAttempts}</div>
          <div className="metric-caption">{stats.totalQuestionsAnswered} total questions answered</div>
        </div>

        <div className="metric-card panel">
          <div className="metric-header">
            <span className="metric-icon green">
              <Icon name="award" size={18} />
            </span>
            <span className="metric-trend">Quiz Accuracy</span>
          </div>
          <div className="metric-value">{stats.totalQuestionsAnswered > 0 ? `${accuracy}%` : "—"}</div>
          <div className="metric-caption">
            {stats.correctAnswers} of {stats.totalQuestionsAnswered} correct
          </div>
        </div>
      </section>

      {/* Dual Column: Recent Topics & Bookmarks */}
      <div className="dash-columns">
        <section className="panel dash-section">
          <div className="section-title-row">
            <div>
              <div className="card-label">CONTINUE LEARNING</div>
              <h2>Recent Study Sessions</h2>
            </div>
            {history.length > 4 && (
              <span className="subtle-count">{history.length} saved</span>
            )}
          </div>

          {recentSessions.length === 0 ? (
            <div className="empty-dash-box">
              <Icon name="clock" size={28} />
              <p>No study sessions recorded yet.</p>
              <button className="button primary small" onClick={onNewSession}>
                Create your first session
              </button>
            </div>
          ) : (
            <div className="recent-list">
              {recentSessions.map(item => (
                <div key={item.id} className="recent-item" onClick={() => onOpenSession(item)}>
                  <div className="recent-meta">
                    <span className={`badge-mode ${item.mode || "full"}`}>
                      {item.mode === "interview" ? "🎯 Interview" : item.mode === "exam" ? "📝 Exam" : item.mode === "quick" ? "⚡ Quick" : "✦ Full"}
                    </span>
                    <span className="recent-date">
                      {new Date(item.savedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>
                  </div>
                  <h3>{item.topic}</h3>
                  <div className="recent-stats">
                    <span><Icon name="cards" size={13} /> {item.flashcards?.length || 6} cards</span>
                    <span><Icon name="target" size={13} /> {item.quiz?.length || 5} questions</span>
                    {item.quizScore && (
                      <span className="recent-score">
                        <Icon name="check" size={13} /> {Math.round((item.quizScore.correct / item.quizScore.total) * 100)}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="panel dash-section">
          <div className="section-title-row">
            <div>
              <div className="card-label">SAVED ITEMS</div>
              <h2>Bookmarked Concepts</h2>
            </div>
            {bookmarks.length > 0 && (
              <button className="text-button" onClick={onOpenBookmarks}>
                View all ({bookmarks.length}) →
              </button>
            )}
          </div>

          {bookmarks.length === 0 ? (
            <div className="empty-dash-box">
              <Icon name="bookmark" size={28} />
              <p>No bookmarked flashcards or questions yet.</p>
              <span className="subtle-hint">
                Click the bookmark icon on any card or question while studying.
              </span>
            </div>
          ) : (
            <div className="bookmarks-list">
              {bookmarks.slice(0, 4).map(b => (
                <div key={b.id} className="bookmark-preview-card">
                  <div className="bookmark-badge">
                    <Icon name={b.type === "flashcard" ? "cards" : "target"} size={12} />
                    <span>{b.type?.toUpperCase()}</span>
                  </div>
                  <p className="bookmark-text">
                    {b.question || b.topic}
                  </p>
                  <small className="bookmark-source">{b.topicSource || b.topic}</small>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
