import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '../services/api.js';
import { attemptService } from '../services/attemptService.js';

export default function TakeQuizPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [showUnanswered, setShowUnanswered] = useState(false);
  const autoSubmitStarted = useRef(false);
  const saveQueue = useRef(Promise.resolve());

  useEffect(() => {
    let mounted = true;
    Promise.all([apiRequest(`/quizzes/${quizId}`), attemptService.active(quizId)])
      .then(([quizResult, activeResult]) => {
        if (!mounted) return;
        setQuiz(quizResult);
        if (activeResult.attempt) {
          const active = activeResult.attempt;
          if (active.status !== 'in_progress') {
            navigate(`/results/${active.id}`, { replace: true });
            return;
          }
          setAttempt(active);
          setAnswers(Object.fromEntries(active.answers.map((answer) => [answer.questionId, answer.selectedOptionIndex])));
          const firstUnanswered = active.questions.findIndex((question) => !active.answers.some((answer) => answer.questionId === question.id));
          setCurrent(Math.max(0, firstUnanswered));
        }
      })
      .catch((requestError) => mounted && setError(requestError.message))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [quizId, navigate]);

  const questions = attempt?.questions || [];
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = Math.max(questions.length - answeredCount, 0);
  const currentQuestion = questions[current];
  const deadline = attempt ? new Date(attempt.deadline).getTime() : 0;

  const submit = useCallback(async (automatic = false) => {
    if (!attempt || busy) return;
    setBusy(true);
    setError('');
    try {
      await saveQueue.current.catch(() => {});
      const answerList = Object.entries(answers).map(([questionId, selectedOptionIndex]) => ({ questionId, selectedOptionIndex }));
      const result = await attemptService.submit(attempt.id, answerList);
      navigate(`/results/${result.attempt.id}`, { replace: true, state: { automatic } });
    } catch (requestError) {
      setError(requestError.message);
      setBusy(false);
    }
  }, [attempt, answers, busy, navigate]);

  useEffect(() => {
    if (!attempt) return undefined;
    const update = () => setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [attempt, deadline]);

  useEffect(() => {
    if (attempt && remaining === 0 && !busy && !autoSubmitStarted.current) {
      autoSubmitStarted.current = true;
      submit(true);
    }
  }, [attempt, remaining, busy, submit]);

  const handleAnswer = async (optionIndex) => {
    const nextAnswers = { ...answers, [currentQuestion.id]: optionIndex };
    setAnswers(nextAnswers);
    const answerList = Object.entries(nextAnswers).map(([questionId, selectedOptionIndex]) => ({ questionId, selectedOptionIndex }));
    saveQueue.current = saveQueue.current.catch(() => {}).then(() => attemptService.saveAnswers(attempt.id, answerList));
    try { await saveQueue.current; }
    catch (requestError) { setError(`Your answer is shown here but could not be saved: ${requestError.message}`); }
  };

  const startAttempt = async () => {
    setBusy(true); setError('');
    try {
      const result = await attemptService.start(quizId);
      setAttempt(result.attempt);
      setAnswers(Object.fromEntries(result.attempt.answers.map((answer) => [answer.questionId, answer.selectedOptionIndex])));
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  };

  const timeLabel = useMemo(() => `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`, [remaining]);

  if (loading) return <div className="page-section"><p role="status">Loading quiz…</p></div>;
  if (error && !quiz) return <div className="page-section"><div className="alert alert-danger">{error}</div><Link to="/dashboard">Back to dashboard</Link></div>;
  if (!quiz) return <div className="page-section"><div className="alert alert-warning">Quiz not found.</div></div>;

  if (!attempt) return (
    <section className="page-section content-card attempt-instructions">
      <Link to="/dashboard" className="text-decoration-none">← Back to quizzes</Link>
      <span className="eyebrow d-block mt-4">QUIZ INSTRUCTIONS</span>
      <h1 className="display-6 fw-bold mt-2">{quiz.title}</h1>
      <p className="text-secondary">{quiz.description || 'Answer each question to the best of your ability.'}</p>
      <div className="row g-3 my-3">
        <InfoTile label="Questions" value={quiz.questions?.length ?? quiz.questionCount ?? 0} />
        <InfoTile label="Time limit" value="30 minutes" />
        <InfoTile label="Total marks" value={quiz.questions?.length ?? quiz.questionCount ?? 0} />
      </div>
      <div className="alert alert-primary">The timer begins when you start. Your progress is saved as you answer. Each question is worth one mark.</div>
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      <button className="btn btn-primary btn-lg" type="button" disabled={busy || !quiz.questions?.length} onClick={startAttempt}>{busy ? 'Starting…' : 'Start quiz'}</button>
      {!quiz.questions?.length && <p className="text-secondary mt-3">This quiz has no questions available yet.</p>}
    </section>
  );

  if (!questions.length) return <div className="page-section"><div className="alert alert-warning">This quiz attempt has no available questions.</div></div>;

  return (
    <section className="page-section">
      <header className="quiz-attempt-header content-card mb-3">
        <div><span className="eyebrow">QUIZ IN PROGRESS</span><h1 className="h3 fw-bold mt-2 mb-1">{attempt.quizTitle}</h1><span className="text-secondary">{questions.length} questions · {answeredCount} answered</span></div>
        <div className={`quiz-timer${remaining <= 300 ? ' timer-warning' : ''}`} role="timer" aria-live="off"><span className="small">TIME LEFT</span><strong>{timeLabel}</strong></div>
      </header>
      {error && <div className="alert alert-warning" role="alert">{error}</div>}
      <div className="row g-3">
        <div className="col-12 col-lg-8">
          <article className="content-card question-panel">
            <div className="d-flex justify-content-between align-items-center mb-4"><span className="eyebrow">QUESTION {current + 1} OF {questions.length}</span><span className="badge text-bg-light">1 mark</span></div>
            <h2 className="h4 fw-semibold mb-4">{currentQuestion?.prompt}</h2>
            <div className="d-grid gap-2">{currentQuestion?.options.map((option, index) => <label className={`answer-option${answers[currentQuestion.id] === index ? ' selected' : ''}`} key={`${currentQuestion.id}-${index}`}><input className="form-check-input mt-0" type="radio" name={`answer-${currentQuestion.id}`} checked={answers[currentQuestion.id] === index} onChange={() => handleAnswer(index)} /><span>{option}</span></label>)}</div>
            <div className="d-flex justify-content-between gap-2 mt-4"><button className="btn btn-outline-secondary" disabled={current === 0} onClick={() => setCurrent((value) => value - 1)}>Previous</button><button className="btn btn-primary" disabled={current === questions.length - 1} onClick={() => setCurrent((value) => value + 1)}>Next</button></div>
          </article>
          <div className="d-flex justify-content-between align-items-center gap-3 mt-3"><span className="text-secondary small">Answers save automatically</span><button className="btn btn-success px-4" disabled={busy} onClick={() => { setShowUnanswered(false); setShowConfirm(true); }}>Submit quiz</button></div>
        </div>
        <aside className="col-12 col-lg-4"><div className="content-card question-nav-card"><h2 className="h6 fw-bold">Question map</h2><p className="text-secondary small">Select a number to move between questions.</p><div className="question-number-grid">{questions.map((question, index) => <button type="button" key={question.id} aria-label={`Question ${index + 1}${answers[question.id] !== undefined ? ', answered' : ', unanswered'}`} aria-current={current === index ? 'step' : undefined} className={`question-map-button${current === index ? ' current' : ''}${answers[question.id] !== undefined ? ' answered' : ''}`} onClick={() => setCurrent(index)}>{index + 1}</button>)}</div><div className="question-map-legend"><span><i className="legend-dot answered-dot" />Answered</span><span><i className="legend-dot" />Unanswered</span></div></div></aside>
      </div>
      {showConfirm && <div className="modal-backdrop-custom" role="presentation"><section className="submit-dialog" role="dialog" aria-modal="true" aria-labelledby="submit-title"><h2 className="h4 fw-bold" id="submit-title">Submit your quiz?</h2><p>You answered {answeredCount} of {questions.length} questions. {unansweredCount ? `${unansweredCount} question${unansweredCount === 1 ? ' is' : 's are'} unanswered.` : 'All questions have an answer.'}</p>{showUnanswered && <div className="alert alert-warning">Unanswered: {questions.map((q, i) => answers[q.id] === undefined ? i + 1 : null).filter(Boolean).join(', ') || 'None'}</div>}<div className="d-flex flex-wrap justify-content-end gap-2"><button className="btn btn-outline-secondary" onClick={() => setShowConfirm(false)}>Keep working</button>{unansweredCount > 0 && !showUnanswered && <button className="btn btn-outline-primary" onClick={() => { setShowConfirm(false); const first = questions.findIndex((q) => answers[q.id] === undefined); setCurrent(first); }}>Review unanswered</button>}{unansweredCount > 0 && !showUnanswered && <button className="btn btn-link" onClick={() => setShowUnanswered(true)}>Show unanswered</button>}<button className="btn btn-success" disabled={busy} onClick={() => submit(false)}>{busy ? 'Submitting…' : 'Confirm submission'}</button></div></section></div>}
    </section>
  );
}

function InfoTile({ label, value }) { return <div className="col-6 col-md-4"><div className="attempt-info-tile"><span className="small text-secondary">{label}</span><strong>{value}</strong></div></div>; }
