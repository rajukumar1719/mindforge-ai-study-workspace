import React, { useState, useEffect, useCallback } from "react";
import { Icon } from "./Icons";

export function FlashcardsView({
  flashcards = [],
  topicTitle = "",
  onRecordReview,
  onToggleBookmark,
  isBookmarked
}) {
  const [cards, setCards] = useState(flashcards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [knownIds, setKnownIds] = useState(new Set());
  const [reviewIds, setReviewIds] = useState(new Set());
  const [copied, setCopied] = useState(false);

  // Sync cards when incoming session updates
  useEffect(() => {
    setCards(flashcards);
    setCurrentIndex(0);
    setFlipped(false);
    setKnownIds(new Set());
    setReviewIds(new Set());
  }, [flashcards]);

  // Flip reset when index changes
  useEffect(() => {
    setFlipped(false);
  }, [currentIndex]);

  const currentCard = cards[currentIndex];
  const total = cards.length;

  const handleNext = useCallback(() => {
    if (currentIndex < total - 1) {
      setCurrentIndex(prev => prev + 1);
      onRecordReview?.(1);
    }
  }, [currentIndex, total, onRecordReview]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  const handleFlip = useCallback(() => {
    setFlipped(prev => !prev);
  }, []);

  const markKnown = useCallback(() => {
    if (!currentCard) return;
    setKnownIds(prev => new Set(prev).add(currentCard.id));
    setReviewIds(prev => {
      const next = new Set(prev);
      next.delete(currentCard.id);
      return next;
    });
    handleNext();
  }, [currentCard, handleNext]);

  const markNeedReview = useCallback(() => {
    if (!currentCard) return;
    setReviewIds(prev => new Set(prev).add(currentCard.id));
    setKnownIds(prev => {
      const next = new Set(prev);
      next.delete(currentCard.id);
      return next;
    });
    handleNext();
  }, [currentCard, handleNext]);

  const handleShuffle = useCallback(() => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
    setFlipped(false);
  }, [cards]);

  const handleRestart = useCallback(() => {
    setCurrentIndex(0);
    setFlipped(false);
    setKnownIds(new Set());
    setReviewIds(new Set());
  }, []);

  const handleCopyCard = useCallback(() => {
    if (!currentCard) return;
    const text = `Q: ${currentCard.question}\n\nA: ${currentCard.answer}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [currentCard]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e) {
      // Ignore if typing in an input/textarea
      if (["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;

      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        handleFlip();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key.toLowerCase() === "k") {
        e.preventDefault();
        markKnown();
      } else if (e.key.toLowerCase() === "r") {
        e.preventDefault();
        markNeedReview();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleFlip, handleNext, handlePrev, markKnown, markNeedReview]);

  if (!currentCard) {
    return (
      <div className="panel learning-panel">
        <p className="subtle-hint">No flashcards available in this session.</p>
      </div>
    );
  }

  const bookmarked = isBookmarked?.(currentCard.id);

  return (
    <div className="panel learning-panel flashcards-panel">
      {/* Header */}
      <div className="section-heading">
        <div>
          <div className="card-label">01 · ACTIVE RECALL</div>
          <h2>Flashcards</h2>
        </div>
        <div className="flash-tools">
          <button
            className="icon-text-btn"
            onClick={handleShuffle}
            title="Shuffle flashcards"
          >
            <Icon name="shuffle" size={14} />
            <span>Shuffle</span>
          </button>
          <button
            className="icon-text-btn"
            onClick={handleRestart}
            title="Restart from beginning"
          >
            <Icon name="rotate" size={14} />
            <span>Restart</span>
          </button>
        </div>
      </div>

      {/* Progress Meta */}
      <div className="flash-progress-bar">
        <div className="progress-meta">
          <span>Card {currentIndex + 1} of {total}</span>
          <div className="mastery-indicators">
            <span className="known-count">✓ {knownIds.size} mastered</span>
            <span className="review-count">● {reviewIds.size} to review</span>
          </div>
        </div>
        <div className="mini-progress" aria-hidden="true">
          <span style={{ width: `${((currentIndex + 1) / total) * 100}%` }} />
        </div>
      </div>

      {/* Card Stage */}
      <div className="flash-stage">
        <div
          className={`flashcard-3d ${flipped ? "is-flipped" : ""}`}
          onClick={handleFlip}
          tabIndex={0}
          role="button"
          aria-label={flipped ? "Showing answer. Tap to show question" : "Showing question. Tap to reveal answer"}
        >
          {/* Front Face: Question */}
          <div className="flash-face flash-front">
            <div className="face-header">
              <span className="flash-badge question">
                <Icon name="brain" size={13} /> QUESTION
              </span>
              <div className="face-actions" onClick={e => e.stopPropagation()}>
                <button
                  className={`card-tool-btn ${bookmarked ? "active" : ""}`}
                  onClick={() =>
                    onToggleBookmark?.({
                      id: currentCard.id,
                      type: "flashcard",
                      question: currentCard.question,
                      answer: currentCard.answer,
                      topicSource: topicTitle
                    })
                  }
                  title={bookmarked ? "Remove bookmark" : "Bookmark card"}
                >
                  <Icon name={bookmarked ? "bookmarkFilled" : "bookmark"} size={14} />
                </button>
                <button
                  className="card-tool-btn"
                  onClick={handleCopyCard}
                  title={copied ? "Copied!" : "Copy card"}
                >
                  <Icon name={copied ? "check" : "copy"} size={14} />
                </button>
              </div>
            </div>

            <div className="card-content">
              <strong>{currentCard.question}</strong>
            </div>

            <div className="card-footer-hint">
              <span>Space / Click to reveal answer</span>
            </div>
          </div>

          {/* Back Face: Answer */}
          <div className="flash-face flash-back">
            <div className="face-header">
              <span className="flash-badge answer">
                <Icon name="check" size={13} /> ANSWER
              </span>
              <div className="face-actions" onClick={e => e.stopPropagation()}>
                <button
                  className={`card-tool-btn ${bookmarked ? "active" : ""}`}
                  onClick={() =>
                    onToggleBookmark?.({
                      id: currentCard.id,
                      type: "flashcard",
                      question: currentCard.question,
                      answer: currentCard.answer,
                      topicSource: topicTitle
                    })
                  }
                  title={bookmarked ? "Remove bookmark" : "Bookmark card"}
                >
                  <Icon name={bookmarked ? "bookmarkFilled" : "bookmark"} size={14} />
                </button>
                <button
                  className="card-tool-btn"
                  onClick={handleCopyCard}
                  title={copied ? "Copied!" : "Copy card"}
                >
                  <Icon name={copied ? "check" : "copy"} size={14} />
                </button>
              </div>
            </div>

            <div className="card-content">
              <p>{currentCard.answer}</p>
            </div>

            <div className="card-footer-hint">
              <span>Click to flip back</span>
            </div>
          </div>
        </div>
      </div>

      {/* Self-grading Bar */}
      <div className="self-grade-bar">
        <button
          className={`grade-btn review ${reviewIds.has(currentCard.id) ? "selected" : ""}`}
          onClick={markNeedReview}
          title="Press R"
        >
          <span>Need review</span>
          <kbd>R</kbd>
        </button>

        <button
          className={`grade-btn knew ${knownIds.has(currentCard.id) ? "selected" : ""}`}
          onClick={markKnown}
          title="Press K"
        >
          <span>I knew this!</span>
          <kbd>K</kbd>
        </button>
      </div>

      {/* Navigation Controls */}
      <div className="nav-row">
        <button
          className="button secondary"
          disabled={currentIndex === 0}
          onClick={handlePrev}
        >
          <Icon name="arrowLeft" size={15} /> Prev
        </button>
        <span className="keyboard-shortcuts-hint">← / → to navigate</span>
        <button
          className="button primary"
          disabled={currentIndex === total - 1}
          onClick={handleNext}
        >
          Next <Icon name="arrow" size={15} />
        </button>
      </div>
    </div>
  );
}
