import { useEffect, useMemo, useRef, useState } from "react";

const DEMO_TOPIC = "Explain JavaScript closures for an interview";
const QUICK_TOPICS = [
  "React hooks for an interview",
  "JavaScript closures",
  "SQL joins with examples",
  "Operating systems: processes vs threads"
];

function Icon({ name, size = 18 }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  const paths = {
    spark: <><path d="m12 2 1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2Z"/><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z"/></>,
    moon: <><path d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5 8.5 8.5 0 1 0 20.5 15.5Z"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></>,
    arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
    rotate: <><path d="M3 12a9 9 0 0 1 15.2-6.5L20 7"/><path d="M20 3v4h-4"/><path d="M21 12a9 9 0 0 1-15.2 6.5L4 17"/><path d="M4 21v-4h4"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    target: <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v2M22 12h-2M12 22v-2M2 12h2"/></>,
    brain: <><path d="M9.5 4.5A3.5 3.5 0 0 0 6 8v.5A3.5 3.5 0 0 0 4 12a3.5 3.5 0 0 0 3.5 3.5A3.5 3.5 0 0 0 11 19V7a3.5 3.5 0 0 0-1.5-2.5Z"/><path d="M14.5 4.5A3.5 3.5 0 0 1 18 8v.5a3.5 3.5 0 0 1 2 3.5 3.5 3.5 0 0 1-3.5 3.5A3.5 3.5 0 0 1 13 19V7a3.5 3.5 0 0 1 1.5-2.5Z"/><path d="M8 9h1M15 9h1M8 13h1M15 13h1"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>
  };
  return <svg {...common} aria-hidden="true">{paths[name]}</svg>;
}

const initialSession = {
  topic: "",
  difficulty: "medium",
  summary: "",
  memoryTip: "",
  flashcards: [],
  quiz: []
};

function ErrorState({ message, onRetry }) {
  return (
    <div className="state-card error-card">
      <div className="state-icon">!</div>
      <div className="state-copy">
        <h3>We couldn't build this session</h3>
        <p>{message}</p>
        <button className="button primary small" onClick={onRetry}>
          <Icon name="rotate" size={15} /> Try again
        </button>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="state-card loading-card">
      <div className="spinner" />
      <div className="state-copy">
        <h3>Building your study session…</h3>
        <p>Generating structured cards, questions and memory cues.</p>
      </div>
    </div>
  );
}

function Flashcard({ card, index, total }) {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => setFlipped(false), [card.id]);

  return (
    <div className="flash-wrap">
      <button
        className={`flashcard ${flipped ? "flipped" : ""}`}
        onClick={() => setFlipped(v => !v)}
        aria-label={flipped ? "Show question" : "Show answer"}
      >
        <div className="flash-orb orb-one" />
        <div className="flash-orb orb-two" />
        <span className="flash-badge"><Icon name={flipped ? "check" : "brain"} size={14} /> {flipped ? "ANSWER" : "QUESTION"}</span>
        <strong>{flipped ? card.answer : card.question}</strong>
        <span className="tap-hint">{flipped ? "Tap to flip back" : "Tap to reveal answer"}</span>
      </button>
      <div className="progress-meta">
        <span>{index + 1} of {total}</span>
        <div className="mini-progress" aria-hidden="true"><span style={{ width: `${((index + 1) / total) * 100}%` }} /></div>
      </div>
    </div>
  );
}

function QuizCard({ question, onAnswered }) {
  const [selected, setSelected] = useState(null);
  useEffect(() => setSelected(null), [question.id]);

  const answered = selected !== null;
  const correct = selected === question.correctAnswer;

  function choose(index) {
    if (!answered) {
      setSelected(index);
      onAnswered(question, index);
    }
  }

  return (
    <div className="quiz-card">
      <div className="quiz-kicker"><span className="question-dot" /> Knowledge check</div>
      <h3>{question.question}</h3>
      <div className="options">
        {question.options.map((option, index) => {
          let className = "option";
          if (answered && index === question.correctAnswer) className += " correct";
          if (answered && index === selected && index !== question.correctAnswer) className += " wrong";
          return (
            <button key={option} className={className} onClick={() => choose(index)} disabled={answered}>
              <span className="option-letter">{String.fromCharCode(65 + index)}</span>
              <span className="option-text">{option}</span>
              {answered && index === question.correctAnswer && <span className="option-status"><Icon name="check" size={15} /></span>}
            </button>
          );
        })}
      </div>
      {answered && (
        <div className={`feedback ${correct ? "success" : "danger"}`}>
          <div className="feedback-title"><span>{correct ? "✓" : "×"}</span>{correct ? "Correct — nice recall" : "Not quite — this is a weak spot"}</div>
          <p>{question.explanation}</p>
          {question.memoryTip && <small><Icon name="spark" size={13} /> {question.memoryTip}</small>}
        </div>
      )}
    </div>
  );
}

function EmptyFeatureStrip() {
  return (
    <div className="feature-strip">
      <div><span className="feature-icon"><Icon name="brain" size={17} /></span><span><b>Recall</b><small>AI flashcards</small></span></div>
      <div><span className="feature-icon"><Icon name="target" size={17} /></span><span><b>Test</b><small>Adaptive quiz</small></span></div>
      <div><span className="feature-icon"><Icon name="rotate" size={17} /></span><span><b>Improve</b><small>Retest mistakes</small></span></div>
    </div>
  );
}

export default function App() {
  const [topic, setTopic] = useState("");
  const [session, setSession] = useState(null);
  const [phase, setPhase] = useState("idle");
  const [error, setError] = useState("");
  const [lastTopic, setLastTopic] = useState("");
  const [flashIndex, setFlashIndex] = useState(0);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState([]);
  const [wrongIds, setWrongIds] = useState([]);
  const [showRetest, setShowRetest] = useState(false);
  const [dark, setDark] = useState(false);
  const abortRef = useRef(null);

  const aiStatus = useMemo(() => {
    if (phase === "loading") return { label: "AI THINKING", className: "thinking" };
    if (phase === "error") return { label: "AI UNAVAILABLE", className: "offline" };
    return { label: "AI READY", className: "ready" };
  }, [phase]);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);

  const score = useMemo(() => quizAnswers.filter(a => a.correct).length, [quizAnswers]);
  const accuracy = quizAnswers.length ? Math.round((score / quizAnswers.length) * 100) : 0;
  const wrongQuestions = useMemo(() => {
    if (!session) return [];
    return session.quiz.filter(q => wrongIds.includes(q.id));
  }, [session, wrongIds]);

  async function generateStudySession(customTopic = topic) {
    const clean = customTopic.trim();
    if (!clean) {
      setError("Enter a topic or paste some notes first.");
      setPhase("error");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLastTopic(clean);
    setPhase("loading");
    setError("");
    setQuizAnswers([]);
    setWrongIds([]);
    setFlashIndex(0);
    setQuizIndex(0);
    setShowRetest(false);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/study-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: clean }),
        signal: controller.signal
      });

      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || "The server could not generate a study session.");
      if (!body?.session || !Array.isArray(body.session.flashcards) || !Array.isArray(body.session.quiz)) {
        throw new Error("The AI returned an unexpected data shape.");
      }
      if (body.session.flashcards.length === 0 || body.session.quiz.length === 0) {
        throw new Error("The AI returned an empty study session.");
      }

      setSession(body.session);
      setPhase("ready");
    } catch (err) {
      if (err.name === "AbortError") return;
      setError(err.message || "Something went wrong. Please retry.");
      setPhase("error");
    }
  }

  function answerQuestion(question, selected) {
    const isCorrect = selected === question.correctAnswer;
    setQuizAnswers(prev => [...prev.filter(a => a.id !== question.id), { id: question.id, correct: isCorrect }]);
    if (!isCorrect) setWrongIds(prev => prev.includes(question.id) ? prev : [...prev, question.id]);
  }

  function reset() {
    abortRef.current?.abort();
    setSession(null);
    setPhase("idle");
    setError("");
    setTopic("");
    setQuizAnswers([]);
    setWrongIds([]);
    setShowRetest(false);
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="topbar">
        <button className="brand" onClick={reset} aria-label="Go to MindForge home">
          <span className="logo"><Icon name="spark" size={18} /></span>
          <span>MindForge</span>
        </button>
        <div className="top-actions">
          <span className={`pill ai-status ${aiStatus.className}`}>
            <span className="live-dot" /> {aiStatus.label}
          </span>
          <button className="icon-button" onClick={() => setDark(v => !v)} aria-label="Toggle theme">
            <Icon name={dark ? "sun" : "moon"} size={17} />
          </button>
        </div>
      </header>

      <main className="container">
        <section className="hero">
          <div className="hero-badge"><Icon name="spark" size={14} /> Adaptive learning workspace</div>
          <h1>Learn anything.<br /><span>Remember what matters.</span></h1>
          <p>Turn a topic or your notes into a focused study session with AI-generated flashcards, quizzes and mistake-based revision.</p>
          {!session && <div className="hero-proof"><span>✦</span> Structured AI <i>·</i> validated data <i>·</i> interactive learning</div>}
        </section>

        {!session && (
          <section className="composer panel">
            <div className="composer-top">
              <div>
                <div className="card-label">START A SESSION</div>
                <h2>What are you learning today?</h2>
                <p>Paste notes, ask a question, or describe what you want to master.</p>
              </div>
              <div className="composer-mark"><Icon name="brain" size={22} /></div>
            </div>

            <div className="textarea-shell">
              <textarea
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g. Explain React hooks for an interview…"
                rows={5}
                maxLength={3000}
              />
              <div className="textarea-meta"><span>{topic.length}/3000</span><span>AI will structure the session for you</span></div>
            </div>

            <div className="quick-topics">
              <span>Try:</span>
              {QUICK_TOPICS.map(item => <button key={item} onClick={() => setTopic(item)}>{item}</button>)}
            </div>

            <div className="composer-footer">
              <button className="text-button" onClick={() => setTopic(DEMO_TOPIC)}><Icon name="spark" size={14} /> Use example</button>
              <button className="button primary generate-button" onClick={() => generateStudySession()} disabled={phase === "loading"}>
                {phase === "loading" ? <>Generating… <span className="button-loader" /></> : <>Generate study session <Icon name="arrow" size={16} /></>}
              </button>
            </div>

            {phase === "loading" && <LoadingState />}
            {phase === "error" && <ErrorState message={error} onRetry={() => generateStudySession(lastTopic)} />}
          </section>
        )}

        {!session && phase === "idle" && <EmptyFeatureStrip />}

        {session && phase === "ready" && (
          <>
            <section className="session-header">
              <div className="session-copy">
                <div className="eyebrow"><span className="live-dot" /> Study session</div>
                <h2>{session.topic}</h2>
                <p>{session.summary}</p>
              </div>
              <button className="button secondary new-topic" onClick={reset}>+ New topic</button>
            </section>

            <section className="stats">
              <div className="stat-card"><span className="stat-icon"><Icon name="brain" size={17} /></span><strong>{session.flashcards.length}</strong><span>Flashcards</span></div>
              <div className="stat-card"><span className="stat-icon"><Icon name="target" size={17} /></span><strong>{session.quiz.length}</strong><span>Questions</span></div>
              <div className="stat-card"><span className="stat-icon"><Icon name="check" size={17} /></span><strong>{quizAnswers.length ? `${accuracy}%` : "—"}</strong><span>Accuracy</span></div>
              <div className={`stat-card ${wrongIds.length ? "attention" : ""}`}><span className="stat-icon"><Icon name="rotate" size={17} /></span><strong>{wrongIds.length}</strong><span>Weak spots</span></div>
            </section>

            <section className="session-progress panel">
              <div><span>SESSION PROGRESS</span><strong>{Math.round(((flashIndex + quizAnswers.length) / (session.flashcards.length + session.quiz.length)) * 100)}% explored</strong></div>
              <div className="progress-track"><span style={{ width: `${Math.min(100, ((flashIndex + 1 + quizAnswers.length) / (session.flashcards.length + session.quiz.length)) * 100)}%` }} /></div>
              <div className="progress-caption"><span>Recall → Test → Retest</span><span>{quizAnswers.length}/{session.quiz.length} answered</span></div>
            </section>

            <section className="learning-grid">
              <div className="panel learning-panel">
                <div className="section-heading">
                  <div><div className="card-label">01 · RECALL</div><h2>Flashcards</h2></div>
                  <span className="difficulty">{session.difficulty}</span>
                </div>
                <Flashcard card={session.flashcards[flashIndex]} index={flashIndex} total={session.flashcards.length} />
                <div className="nav-row">
                  <button className="button secondary" disabled={flashIndex === 0} onClick={() => setFlashIndex(i => i - 1)}>← Previous</button>
                  <button className="button primary" disabled={flashIndex === session.flashcards.length - 1} onClick={() => setFlashIndex(i => i + 1)}>Next <Icon name="arrow" size={15} /></button>
                </div>
              </div>

              <div className="panel learning-panel">
                <div className="section-heading">
                  <div><div className="card-label">02 · TEST</div><h2>Quiz</h2></div>
                  <div className="quiz-count"><strong>{quizIndex + 1}</strong><span>/{session.quiz.length}</span></div>
                </div>
                <div className="quiz-progress"><span style={{ width: `${((quizIndex + 1) / session.quiz.length) * 100}%` }} /></div>
                <QuizCard question={session.quiz[quizIndex]} onAnswered={answerQuestion} />
                <div className="nav-row">
                  <button className="button secondary" disabled={quizIndex === 0} onClick={() => setQuizIndex(i => i - 1)}>← Previous</button>
                  <button className="button primary" disabled={quizIndex === session.quiz.length - 1} onClick={() => setQuizIndex(i => i + 1)}>Next <Icon name="arrow" size={15} /></button>
                </div>
              </div>
            </section>

            <section className={`review panel ${wrongIds.length ? "review-active" : ""}`}>
              <div className="review-icon"><Icon name="rotate" size={20} /></div>
              <div className="review-copy">
                <div className="card-label">03 · REFLECTION</div>
                <h2>Turn mistakes into memory</h2>
                <p>{wrongIds.length ? `${wrongIds.length} question${wrongIds.length > 1 ? "s" : ""} need another pass.` : "Answer a question incorrectly and it will appear here for retesting."}</p>
              </div>
              <button className="button primary" disabled={!wrongIds.length} onClick={() => setShowRetest(true)}>Retest mistakes {wrongIds.length ? `(${wrongIds.length})` : ""} <Icon name="arrow" size={15} /></button>
            </section>

            <section className="memory panel">
              <div className="memory-glow" />
              <div className="memory-icon"><Icon name="spark" size={20} /></div>
              <div><div className="card-label">AI MEMORY TIP</div><p>{session.memoryTip}</p></div>
            </section>

            <footer>Built as an SDE internship assignment <span>·</span> Structured AI <span>→</span> validated data <span>→</span> interactive UI</footer>

            {showRetest && wrongQuestions.length > 0 && <RetestModal questions={wrongQuestions} onClose={() => setShowRetest(false)} />}
          </>
        )}

        {!session && <footer>Built as an SDE internship assignment <span>·</span> Structured AI <span>→</span> validated data <span>→</span> interactive UI</footer>}
      </main>
    </div>
  );
}

function RetestModal({ questions, onClose }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const q = questions[index];
  const answered = selected !== null;

  function choose(i) { if (!answered) setSelected(i); }
  function next() {
    if (index < questions.length - 1) { setIndex(i => i + 1); setSelected(null); }
    else onClose();
  }

  return (
    <div className="modal-backdrop">
      <div className="modal panel">
        <button className="close" onClick={onClose} aria-label="Close retest"><Icon name="close" size={19} /></button>
        <div className="modal-icon"><Icon name="rotate" size={21} /></div>
        <div className="card-label">RETEST MODE</div>
        <h2>Let's fix the weak spot.</h2>
        <div className="modal-progress"><span style={{ width: `${((index + 1) / questions.length) * 100}%` }} /></div>
        <p className="muted">Question {index + 1} of {questions.length}</p>
        <h3>{q.question}</h3>
        <div className="options">
          {q.options.map((option, i) => (
            <button key={option} className={`option ${answered && i === q.correctAnswer ? "correct" : ""} ${answered && i === selected && i !== q.correctAnswer ? "wrong" : ""}`} disabled={answered} onClick={() => choose(i)}>
              <span className="option-letter">{String.fromCharCode(65 + i)}</span><span className="option-text">{option}</span>
            </button>
          ))}
        </div>
        {answered && <div className={`feedback ${selected === q.correctAnswer ? "success" : "danger"}`}><div className="feedback-title"><span>{selected === q.correctAnswer ? "✓" : "×"}</span>{selected === q.correctAnswer ? "Correct this time" : "Still needs work"}</div><p>{q.explanation}</p></div>}
        <button className="button primary full" disabled={!answered} onClick={next}>{index === questions.length - 1 ? "Finish retest" : "Next mistake →"}</button>
      </div>
    </div>
  );
}
