import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { attemptService } from '../services/attemptService.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function ResultsPage() {
  const { user } = useAuth();
  const { attemptId } = useParams();
  const [attempt, setAttempt] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let mounted = true;
    attemptService.get(attemptId).then((result) => mounted && setAttempt(result.attempt)).catch((requestError) => mounted && setError(requestError.message));
    return () => { mounted = false; };
  }, [attemptId]);
  if (error) return <div className="page-section"><div className="alert alert-danger">{error}</div><Link to="/attempt-history">Return to attempt history</Link></div>;
  if (!attempt) return <div className="page-section"><p role="status">Loading your result…</p></div>;
  if (attempt.status === 'in_progress') return <div className="page-section"><div className="alert alert-info">This quiz is still in progress.</div><Link className="btn btn-primary" to={`/quizzes/${attempt.quizId}`}>Resume quiz</Link></div>;
  return <section className="page-section">
    <header className="content-card result-hero mb-3"><span className="eyebrow">QUIZ RESULT</span><h1 className="display-6 fw-bold mt-2">{attempt.quizTitle}</h1><p className="text-secondary mb-0">Candidate: {user?.name} ({user?.email})</p><p className="text-secondary mb-0">Submitted {formatDate(attempt.submittedAt)} · {attempt.status === 'expired' ? 'Time expired' : 'Submitted'}</p><div className="result-score"><strong>{attempt.percentage}%</strong><span>{attempt.obtainedMarks} / {attempt.totalMarks} marks</span></div></header>
    <div className="row g-3 mb-3" aria-label="Score summary"><Metric label="Questions" value={attempt.totalQuestions} /><Metric label="Correct" value={attempt.correctAnswers} accent="success" /><Metric label="Incorrect" value={attempt.incorrectAnswers} accent="danger" /><Metric label="Unanswered" value={attempt.unansweredQuestions} accent="warning" /></div>
    <section className="content-card result-details"><h2 className="h5 fw-bold">Attempt details</h2><dl className="row mb-0"><dt className="col-sm-6">Time taken</dt><dd className="col-sm-6">{formatDuration(attempt.timeTaken)}</dd><dt className="col-sm-6">Submitted</dt><dd className="col-sm-6">{formatDate(attempt.submittedAt)}</dd><dt className="col-sm-6">Status</dt><dd className="col-sm-6 text-capitalize">{attempt.status.replace('_', ' ')}</dd></dl></section>
    <div className="d-flex flex-wrap gap-2 mt-3"><Link className="btn btn-primary" to="/attempt-history">View attempt history</Link><Link className="btn btn-outline-primary" to="/dashboard">Back to quizzes</Link></div>
  </section>;
}

function Metric({ label, value, accent = 'primary' }) { return <div className="col-6 col-lg-3"><article className={`result-metric metric-${accent}`}><span>{label}</span><strong>{value}</strong></article></div>; }
export const formatDate = (value) => value && !Number.isNaN(Date.parse(value)) ? new Date(value).toLocaleString() : '—';
export const formatDuration = (seconds = 0) => `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
