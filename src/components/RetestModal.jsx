import React, { useState } from "react";
import { Icon } from "./Icons";

export function RetestModal({ questions = [], onClose, onFinishRetest }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [fixedIds, setFixedIds] = useState(new Set());

  const currentQ = questions[index];
  const isAnswered = selected !== null;
  const isCorrect = isAnswered && selected === currentQ.correctAnswer;
  const total = questions.length;

  function handleChoose(i) {
    if (!isAnswered) {
      setSelected(i);
      if (i === currentQ.correctAnswer) {
        setFixedIds(prev => new Set(prev).add(currentQ.id));
      }
    }
  }

  function handleNext() {
    if (index < total - 1) {
      setIndex(prev => prev + 1);
      setSelected(null);
    } else {
      onFinishRetest?.(Array.from(fixedIds));
      onClose();
    }
  }

  if (!currentQ) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal panel retest-modal" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose} aria-label="Close retest">
          <Icon name="cross" size={18} />
        </button>

        <div className="modal-icon-badge">
          <Icon name="rotate" size={20} />
        </div>

        <div className="card-label">MISTAKE-BASED REVISION</div>
        <h2>Fixing Weak Spots</h2>
        <p className="modal-sub">
          Active recall is strongest when you correct recent errors immediately.
        </p>

        <div className="modal-progress-bar">
          <span style={{ width: `${((index + 1) / total) * 100}%` }} />
        </div>
        <div className="modal-progress-meta">
          <span>Question {index + 1} of {total}</span>
          <span>{fixedIds.size} fixed so far</span>
        </div>

        <h3 className="modal-question-title">{currentQ.question}</h3>

        <div className="options-grid">
          {currentQ.options.map((option, i) => {
            let className = "option-btn";
            if (isAnswered) {
              if (i === currentQ.correctAnswer) className += " correct";
              else if (i === selected) className += " wrong";
              else className += " dim";
            }

            return (
              <button
                key={option}
                className={className}
                disabled={isAnswered}
                onClick={() => handleChoose(i)}
              >
                <span className="option-letter">{String.fromCharCode(65 + i)}</span>
                <span className="option-text">{option}</span>
                {isAnswered && i === currentQ.correctAnswer && (
                  <span className="option-badge success">
                    <Icon name="check" size={14} />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {isAnswered && (
          <div className={`quiz-feedback-box ${isCorrect ? "success" : "danger"}`}>
            <div className="feedback-headline">
              <span>{isCorrect ? "✓" : "×"}</span>
              <strong>{isCorrect ? "Mistake resolved! Concept locked in." : "Still tricky — remember:"}</strong>
            </div>
            <p className="feedback-explanation">{currentQ.explanation}</p>
          </div>
        )}

        <button
          className="button primary full"
          disabled={!isAnswered}
          onClick={handleNext}
        >
          {index === total - 1 ? "Complete Retest Session" : "Next Weak Spot →"}
        </button>
      </div>
    </div>
  );
}
