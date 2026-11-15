import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { attemptService } from '../services/attemptService.js';
import { formatDate, formatDuration } from './ResultsPage.jsx';

export default function AttemptHistoryPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let mounted = true;
    attemptService.history().then((result) => mounted && setData(result)).catch((requestError) => mounted && setError(requestError.message));
    return () => { mounted = false; };
  }, []);
  return <section className="page-section"><header className="page-heading"><span className="eyebrow">YOUR PROGRESS</span><h1 className="display-6 fw-bold mt-2">Attempt history</h1><p className="text-secondary">Review results and continue quizzes you have already started.</p></header>
    {error && <div className="alert alert-danger" role="alert">{error}</div>}
    {!data && !error && <p role="status">Loading your attempts…</p>}
    {data && data.attempts.length === 0 && <div className="content-card text-center py-5"><h2 className="h4">No attempts yet</h2><p className="text-secondary">Choose a quiz from the dashboard to get started.</p><Link className="btn btn-primary" to="/dashboard">Explore quizzes</Link></div>}
    {data?.attempts.length > 0 && <div className="content-card"><div className="d-flex justify-content-between flex-wrap gap-2 mb-3"><span className="text-secondary">{data.totalAttempts} attempt{data.totalAttempts === 1 ? '' : 's'}</span><span className="fw-semibold">Average completed score: {data.averageScore}%</span></div><div className="table-responsive"><table className="table align-middle mb-0 results-table"><thead><tr><th>Quiz</th><th>Date</th><th>Score</th><th>Time</th><th>Status</th><th><span className="visually-hidden">Action</span></th></tr></thead><tbody>{data.attempts.map((item) => <tr key={item.id}><td className="fw-semibold">{item.quizTitle}</td><td>{formatDate(item.completedAt || item.startedAt)}</td><td>{item.status === 'in_progress' ? '—' : `${item.obtainedMarks}/${item.totalMarks} (${item.percentage}%)`}</td><td>{item.status === 'in_progress' ? '—' : formatDuration(item.timeTaken)}</td><td><span className={`badge ${item.status === 'in_progress' ? 'text-bg-primary' : item.status === 'expired' ? 'text-bg-warning' : 'text-bg-success'}`}>{item.status.replace('_', ' ')}</span></td><td className="text-end">{item.status === 'in_progress' ? <Link className="btn btn-sm btn-outline-primary" to={`/quizzes/${item.quizId}`}>Resume</Link> : <Link className="btn btn-sm btn-outline-primary" to={`/results/${item.id}`}>View result</Link>}</td></tr>)}</tbody></table></div></div>}
  </section>;
}
