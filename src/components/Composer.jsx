import React, { useState, useEffect } from "react";
import { Icon } from "./Icons";

const QUICK_TOPICS = [
  { label: "React Hooks & Fiber", mode: "interview" },
  { label: "JavaScript Closures & Event Loop", mode: "interview" },
  { label: "SQL Joins & B-Tree Indexing", mode: "interview" },
  { label: "OS: Processes vs Threads", mode: "exam" },
  { label: "System Design: Microservices vs Monolith", mode: "interview" },
  { label: "REST vs GraphQL Architecture", mode: "quick" }
];

const LOADING_STEPS = [
  "Analyzing topic curriculum and requirements...",
  "Drafting active-recall flashcard prompts...",
  "Formulating multiple-choice challenges & distractors...",
  "Generating mnemonic cues and practical takeaways...",
  "Validating structured JSON against schema..."
];

export function Composer({
  topic,
  setTopic,
  mode,
  setMode,
  difficulty,
  setDifficulty,
  onGenerate,
  phase,
  error,
  lastTopic,
  onCancelRequest
}) {
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);

  // Cycle through contextual generation steps
  useEffect(() => {
    if (phase !== "loading") {
      setLoadingStepIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setLoadingStepIndex(prev => (prev + 1) % LOADING_STEPS.length);
    }, 2800);

    return () => clearInterval(interval);
  }, [phase]);

  const modes = [
    { id: "full", label: "Full Session", icon: "layers", desc: "Comprehensive flashcards + quiz" },
    { id: "interview", label: "Interview Prep", icon: "briefcase", desc: "Tradeoffs, pitfalls & scenarios" },
    { id: "exam", label: "Exam Mastery", icon: "book", desc: "Definitions & rigorous questions" },
    { id: "quick", label: "Quick Revision", icon: "zap", desc: "High-yield rapid review" }
  ];

  const difficulties = [
    { id: "easy", label: "Foundational" },
    { id: "medium", label: "Intermediate" },
    { id: "hard", label: "Advanced" }
  ];

  return (
    <section className="composer panel">
      <div className="composer-top">
        <div>
          <div className="card-label">STUDY GENERATOR</div>
          <h2>What are you preparing for today?</h2>
          <p>Enter any topic, paste lecture notes, or pick an interview concept.</p>
        </div>
        <div className="composer-mark">
          <Icon name="spark" size={24} />
        </div>
      </div>

      {/* Mode Selector */}
      <div className="mode-selector-group">
        <label className="input-label">Select Study Mode:</label>
        <div className="mode-chips">
          {modes.map(m => (
            <button
              key={m.id}
              type="button"
              className={`mode-chip ${mode === m.id ? "active" : ""}`}
              onClick={() => setMode(m.id)}
              disabled={phase === "loading"}
            >
              <Icon name={m.icon} size={15} />
              <div className="mode-chip-text">
                <strong>{m.label}</strong>
                <small>{m.desc}</small>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Difficulty & Options */}
      <div className="difficulty-row">
        <label className="input-label">Target Depth:</label>
        <div className="diff-pills">
          {difficulties.map(d => (
            <button
              key={d.id}
              type="button"
              className={`diff-pill ${difficulty === d.id ? "active" : ""}`}
              onClick={() => setDifficulty(d.id)}
              disabled={phase === "loading"}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Textarea */}
      <div className="textarea-shell">
        <textarea
          value={topic}
          onChange={e => setTopic(e.target.value)}
          placeholder={
            mode === "interview"
              ? "e.g. Explain React reconciliation and fiber architecture for an SDE intern interview..."
              : mode === "exam"
              ? "e.g. Deadlock conditions, prevention strategies, and Banker's algorithm..."
              : "e.g. Explain JavaScript closures, memory lifecycle, and practical use cases..."
          }
          rows={5}
          maxLength={3000}
          disabled={phase === "loading"}
        />
        <div className="textarea-meta">
          <span>{topic.length}/3000</span>
          <span>Adaptive AI engine validates structured JSON output</span>
        </div>
      </div>

      {/* Quick Topic Chips */}
      <div className="quick-topics">
        <span className="quick-title">Suggestions:</span>
        <div className="quick-chips-wrapper">
          {QUICK_TOPICS.map(item => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                setTopic(item.label);
                setMode(item.mode);
              }}
              disabled={phase === "loading"}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="composer-footer">
        <button
          type="button"
          className="text-button"
          onClick={() => {
            setTopic("Explain JavaScript closures, lexical scoping, and memory leaks for an interview");
            setMode("interview");
          }}
          disabled={phase === "loading"}
        >
          <Icon name="spark" size={14} /> Load sample prompt
        </button>

        <div className="footer-action-buttons">
          {phase === "loading" ? (
            <button
              type="button"
              className="button secondary cancel-button"
              onClick={onCancelRequest}
            >
              <Icon name="cross" size={14} /> Cancel
            </button>
          ) : null}

          <button
            type="button"
            className="button primary generate-button"
            onClick={() => onGenerate()}
            disabled={phase === "loading" || !topic.trim()}
          >
            {phase === "loading" ? (
              <>
                Generating...
                <span className="button-loader" />
              </>
            ) : (
              <>
                Generate Study Session
                <Icon name="arrow" size={16} />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Loading State with animated steps */}
      {phase === "loading" && (
        <div className="state-card loading-card">
          <div className="spinner" />
          <div className="state-copy">
            <h3>Building your custom study session...</h3>
            <p className="loading-step-text">{LOADING_STEPS[loadingStepIndex]}</p>
            <div className="skeleton-preview-row">
              <div className="skeleton-box" />
              <div className="skeleton-box" />
              <div className="skeleton-box" />
            </div>
          </div>
        </div>
      )}

      {/* Context-aware Error State */}
      {phase === "error" && (
        <div className="state-card error-card">
          <div className="state-icon">!</div>
          <div className="state-copy">
            <h3>We couldn't build this session</h3>
            <p>{error}</p>
            <button
              className="button primary small"
              onClick={() => onGenerate(lastTopic)}
            >
              <Icon name="rotate" size={14} /> Try again
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
