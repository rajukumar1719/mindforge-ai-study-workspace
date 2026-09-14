import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Icon } from "./Icons";
import { fireConfetti } from "../utils/confetti";

export function QuizView({
  quiz = [],
  topicTitle = "",
  onQuizCompleted,
  onOpenRetest,
  onToggleBookmark,
  isBookmarked
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({}); // { [qId]: selectedIndex }
  const [showResultScreen, setShowResultScreen] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const total = quiz.length;

  // Reset when new quiz loaded
  useEffect(() => {
    setCurrentIndex(0);
    setSelectedAnswers({});
    setShowResultScreen(false);
    setReviewMode(false);
  }, [quiz]);

  const currentQuestion = quiz[currentIndex];

  // Calculate score
  const scoreResults = useMemo(() => {
    let correct = 0;
    const wrongList = [];

    quiz.forEach(q => {
      const selected = selectedAnswers[q.id];
      if (selected !== undefined) {
        if (selected === q.correctAnswer) {
          correct++;
        } else {
          wrongList.push(q);
        }
      }
    });

    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
    return { correct, incorrect: wrongList.length, percentage, wrongList };
  }, [quiz, selectedAnswers, total]);

  const answeredCount = Object.keys(selectedAnswers).length;
  const isCurrentAnswered = currentQuestion && selectedAnswers[currentQuestion.id] !== undefined;

  const handleSelectOption = useCallback(
    index => {
      if (!currentQuestion || isCurrentAnswered) return;

      const newAnswers = {
        ...selectedAnswers,
        [currentQuestion.id]: index
      };
      setSelectedAnswers(newAnswers);

      // Check if all questions are answered
      if (Object.keys(newAnswers).length === total) {
        let correctCount = 0;
        quiz.forEach(q => {
          if (newAnswers[q.id] === q.correctAnswer) correctCount++;
        });

        onQuizCompleted?.(total, correctCount);

        // If >= 80%, celebrate!
        if (correctCount / total >= 0.8) {
          setTimeout(fireConfetti, 400);
        }
      }
    },
    [currentQuestion, isCurrentAnswered, selectedAnswers, total, quiz, onQuizCompleted]
  );

  const handleNext = useCallback(() => {
    if (currentIndex < total - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setShowResultScreen(true);
    }
  }, [currentIndex, total]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  const handleRetry = useCallback(() => {
    setSelectedAnswers({});
    setCurrentIndex(0);
    setShowResultScreen(false);
    setReviewMode(false);
  }, []);

  const handleCopyQuestion = useCallback((q) => {
    if (!q) return;
    const text = `Question: ${q.question}\nOptions:\n${q.options.map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}`).join("\n")}\nAnswer: ${String.fromCharCode(65 + q.correctAnswer)}\nExplanation: ${q.explanation}`;
    navigator.clipboard.writeText(text);
    setCopiedId(q.id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  // Keyboard navigation for options A, B, C, D and arrows
  useEffect(() => {
    function handleKeyDown(e) {
      if (["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
      if (showResultScreen) return;

      const key = e.key.toUpperCase();
      if (key === "A") handleSelectOption(0);
      else if (key === "B") handleSelectOption(1);
      else if (key === "C") handleSelectOption(2);
      else if (key === "D") handleSelectOption(3);
      else if (e.key === "ArrowRight" && isCurrentAnswered) handleNext();
      else if (e.key === "ArrowLeft") handlePrev();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSelectOption, handleNext, handlePrev, isCurrentAnswered, showResultScreen]);

  if (!currentQuestion) {
    return (
      <div className="panel learning-panel">
        <p className="subtle-hint">No quiz available in this session.</p>
      </div>
    );
  }

  // --- Final Score Screen ---
  if (showResultScreen) {
    const { correct, incorrect, percentage, wrongList } = scoreResults;
    let badgeText = "Knowledge Mastered! 🏆";
    let badgeClass = "gold";
    if (percentage < 60) {
      badgeText = "Needs Reinforcement 📚";
      badgeClass = "red";
    } else if (percentage < 80) {
      badgeText = "Good Progress! 👍";
      badgeClass = "blue";
    }

    return (
      <div className="panel learning-panel quiz-result-panel">
        <div className="result-header">
          <div className={`score-badge ${badgeClass}`}>{badgeText}</div>
          <h2>Quiz Performance Overview</h2>
          <p className="result-topic">{topicTitle}</p>
        </div>

        <div className="score-summary-grid">
          <div className="score-stat-box highlight">
            <span className="stat-big">{percentage}%</span>
            <span className="stat-label">Overall Accuracy</span>
          </div>
          <div className="score-stat-box green">
            <span className="stat-big">{correct}</span>
            <span className="stat-label">Correct Answers</span>
          </div>
          <div className="score-stat-box red">
            <span className="stat-big">{incorrect}</span>
            <span className="stat-label">Weak Spots</span>
          </div>
        </div>

        {wrongList.length > 0 && (
          <div className="retest-alert-banner">
            <div>
              <strong>{wrongList.length} concept{wrongList.length > 1 ? "s" : ""} need another pass</strong>
              <p>Turn mistakes into memory with targeted retesting.</p>
            </div>
            <button
              className="button primary small"
              onClick={() => onOpenRetest(wrongList)}
            >
              <Icon name="rotate" size={14} /> Retest Mistakes Now
            </button>
          </div>
        )}

        <div className="result-actions">
          <button className="button secondary" onClick={handleRetry}>
            <Icon name="rotate" size={15} /> Retry Quiz
          </button>
          <button
            className="button secondary"
            onClick={() => {
              setShowResultScreen(false);
              setReviewMode(true);
            }}
          >
            Review Answers
          </button>
        </div>
      </div>
    );
  }

  const selectedIndex = selectedAnswers[currentQuestion.id];
  const isAnswered = selectedIndex !== undefined;
  const isCorrect = isAnswered && selectedIndex === currentQuestion.correctAnswer;
  const bookmarked = isBookmarked?.(currentQuestion.id);

  return (
    <div className="panel learning-panel quiz-panel">
      {/* Quiz Top Heading */}
      <div className="section-heading">
        <div>
          <div className="card-label">02 · ACTIVE VERIFICATION</div>
          <h2>Interactive Quiz</h2>
        </div>
        <div className="quiz-counter">
          <strong>{currentIndex + 1}</strong>
          <span>/{total}</span>
        </div>
      </div>

      {/* Progress Track */}
      <div className="quiz-progress-track">
        <div className="quiz-progress-bar">
          <span style={{ width: `${((currentIndex + 1) / total) * 100}%` }} />
        </div>
        <div className="quiz-progress-meta">
          <span>{answeredCount} of {total} answered</span>
          {scoreResults.wrongList.length > 0 && (
            <span className="wrong-indicator">{scoreResults.wrongList.length} weak spots</span>
          )}
        </div>
      </div>

      {/* Question Card */}
      <div className="quiz-question-container">
        <div className="question-header">
          <span className="quiz-kicker">
            <span className="kicker-dot" /> Multiple Choice Challenge
          </span>

          <div className="question-tools">
            <button
              className={`card-tool-btn ${bookmarked ? "active" : ""}`}
              onClick={() =>
                onToggleBookmark?.({
                  id: currentQuestion.id,
                  type: "question",
                  question: currentQuestion.question,
                  options: currentQuestion.options,
                  correctAnswer: currentQuestion.correctAnswer,
                  explanation: currentQuestion.explanation,
                  topicSource: topicTitle
                })
              }
              title={bookmarked ? "Remove bookmark" : "Bookmark question"}
            >
              <Icon name={bookmarked ? "bookmarkFilled" : "bookmark"} size={14} />
            </button>
            <button
              className="card-tool-btn"
              onClick={() => handleCopyQuestion(currentQuestion)}
              title={copiedId === currentQuestion.id ? "Copied!" : "Copy question"}
            >
              <Icon name={copiedId === currentQuestion.id ? "check" : "copy"} size={14} />
            </button>
          </div>
        </div>

        <h3 className="question-text">{currentQuestion.question}</h3>

        {/* Options */}
        <div className="options-grid">
          {currentQuestion.options.map((option, index) => {
            let className = "option-btn";
            const isThisOptionSelected = isAnswered && selectedIndex === index;
            const isThisOptionCorrect = isAnswered && index === currentQuestion.correctAnswer;

            if (isAnswered) {
              if (isThisOptionCorrect) className += " correct";
              else if (isThisOptionSelected) className += " wrong";
              else className += " dim";
            }

            return (
              <button
                key={option}
                className={className}
                onClick={() => handleSelectOption(index)}
                disabled={isAnswered}
              >
                <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                <span className="option-text">{option}</span>
                {isAnswered && isThisOptionCorrect && (
                  <span className="option-badge success">
                    <Icon name="check" size={15} />
                  </span>
                )}
                {isAnswered && isThisOptionSelected && !isThisOptionCorrect && (
                  <span className="option-badge failure">
                    <Icon name="cross" size={14} />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Feedback Section */}
        {isAnswered && (
          <div className={`quiz-feedback-box ${isCorrect ? "success" : "danger"}`}>
            <div className="feedback-headline">
              <span className="feedback-icon">{isCorrect ? "✓" : "×"}</span>
              <strong>{isCorrect ? "Spot on! Great understanding." : "Not quite — key concept review:"}</strong>
            </div>
            <p className="feedback-explanation">{currentQuestion.explanation}</p>
            {currentQuestion.memoryTip && (
              <div className="feedback-memory-tip">
                <Icon name="spark" size={13} />
                <span>Memory Rule: {currentQuestion.memoryTip}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="nav-row">
        <button
          className="button secondary"
          disabled={currentIndex === 0}
          onClick={handlePrev}
        >
          <Icon name="arrowLeft" size={15} /> Prev
        </button>

        <button
          className="button primary"
          disabled={!isAnswered}
          onClick={handleNext}
        >
          {currentIndex === total - 1 ? "Complete Quiz →" : "Next Question →"}
        </button>
      </div>
    </div>
  );
}
