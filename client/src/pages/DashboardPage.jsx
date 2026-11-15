import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ApiError, apiRequest } from '../services/api.js';

const emptyResource = { data: null, error: '', loading: true };

const getApiMessage = (error, resource) => {
  if (error instanceof ApiError && error.status === 404) {
    return `${resource} will appear here when that team API is connected.`;
  }

  return error.message || `Could not load ${resource.toLowerCase()}.`;
};

function DashboardPage() {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState(emptyResource);
  const [attempts, setAttempts] = useState(emptyResource);

  useEffect(() => {
    let active = true;

    apiRequest('/quizzes')
      .then((result) => {
        const quizList = Array.isArray(result) ? result : result?.quizzes;
        if (!Array.isArray(quizList)) {
          throw new Error('Quiz service returned an unexpected response.');
        }
        if (active) {
          setQuizzes({ data: quizList, error: '', loading: false });
        }
      })
      .catch((error) => {
        if (active) {
          setQuizzes({ data: null, error: getApiMessage(error, 'Available quizzes'), loading: false });
        }
      });

    apiRequest('/attempts/mine')
      .then((result) => {
        if (
          !Array.isArray(result?.attempts) ||
          !Number.isFinite(result.totalAttempts) ||
          !Number.isFinite(result.averageScore)
        ) {
          throw new Error('Results service returned an unexpected response.');
        }
        if (active) {
          setAttempts({ data: result, error: '', loading: false });
        }
      })
      .catch((error) => {
        if (active) {
          setAttempts({ data: null, error: getApiMessage(error, 'Quiz results'), loading: false });
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const recentAttempts = useMemo(() => {
    if (!attempts.data) {
      return [];
    }

    return [...attempts.data.attempts]
      .sort((left, right) => new Date(right.completedAt) - new Date(left.completedAt))
      .slice(0, 5);
  }, [attempts.data]);

  const displayScore = (attempt) => {
    if (Number.isFinite(attempt.percentage)) {
      return `${Math.round(attempt.percentage)}%`;
    }

    if (Number.isFinite(attempt.score) && Number.isFinite(attempt.maxScore) && attempt.maxScore > 0) {
      return `${Math.round((attempt.score / attempt.maxScore) * 100)}%`;
    }

    return '—';
  };

  return (
    <div className="page-section">
      <section className="dashboard-hero mb-4 mb-lg-5">
        <div>
          <span className="eyebrow">YOUR LEARNING SPACE</span>
          <h1 className="display-6 fw-bold mt-2 mb-2">Welcome back, {user.name}!</h1>
          <p className="text-secondary mb-0">A little progress each day adds up.</p>
        </div>
        <Link className="btn btn-primary px-4" to="/attempt-history">
          Attempt history
        </Link>
        <Link className="btn btn-primary px-4" to="/dashboard#available-quizzes">
          Explore quizzes
        </Link>
      </section>

      <section className="row g-3 g-lg-4 mb-4 mb-lg-5" aria-label="Quiz statistics">
        <div className="col-12 col-sm-6 col-xl-4">
          <StatCard
            label="Available quizzes"
            value={quizzes.loading ? '…' : quizzes.data ? quizzes.data.length : '—'}
            detail={quizzes.error ? 'Quiz list unavailable' : 'Ready when you are'}
            accent="blue"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-4">
          <StatCard
            label="Quizzes attempted"
            value={attempts.loading ? '…' : attempts.data?.totalAttempts ?? '—'}
            detail={attempts.error ? 'Attempt history unavailable' : 'Your completed quizzes'}
            accent="violet"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-4">
          <StatCard
            label="Average score"
            value={
              attempts.loading
                ? '…'
                : attempts.data
                  ? `${Math.round(attempts.data.averageScore)}%`
                  : '—'
            }
            detail={attempts.error ? 'Score summary unavailable' : 'Across your attempts'}
            accent="green"
          />
        </div>
      </section>

      <section className="dashboard-panel mb-4 mb-lg-5" id="available-quizzes">
        <div className="section-heading">
          <div>
            <span className="eyebrow">PICK YOUR NEXT CHALLENGE</span>
            <h2 className="h3 fw-bold mt-2 mb-0">Available quizzes</h2>
          </div>
        </div>
        {quizzes.loading ? (
          <LoadingMessage message="Loading available quizzes…" />
        ) : quizzes.error ? (
          <ResourceMessage message={quizzes.error} />
        ) : quizzes.data.length === 0 ? (
          <ResourceMessage message="No quizzes are available right now. Check back soon." />
        ) : (
          <div className="row g-3 mt-1">
            {quizzes.data.slice(0, 6).map((quiz) => (
              <div className="col-12 col-md-6 col-xl-4" key={quiz._id || quiz.id}>
                <article className="quiz-card h-100">
                  <span className="quiz-card-mark" aria-hidden="true">
                    Q
                  </span>
                  <h3 className="h5 fw-bold mt-3">{quiz.title}</h3>
                  <p className="text-secondary mb-0">
                    {quiz.description || 'Explore this quiz and put your knowledge to the test.'}
                  </p>
                  <div className="quiz-card-footer mt-3">
                    <span>{quiz.questionCount ?? quiz.questions?.length ?? 0} questions</span>
                    <Link className="btn btn-sm btn-primary" to={`/quizzes/${quiz.id || quiz._id}`}>Start quiz</Link>
                  </div>
                </article>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="dashboard-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">KEEP AN EYE ON YOUR PROGRESS</span>
            <h2 className="h3 fw-bold mt-2 mb-0">Recent results</h2>
          </div>
        </div>
        {attempts.loading ? (
          <LoadingMessage message="Loading your recent results…" />
        ) : attempts.error ? (
          <ResourceMessage message={attempts.error} />
        ) : recentAttempts.length === 0 ? (
          <ResourceMessage message="Your completed quiz results will show up here." />
        ) : (
          <div className="table-responsive mt-3">
            <table className="table align-middle mb-0 results-table">
              <thead>
                <tr>
                  <th scope="col">Quiz</th>
                  <th scope="col">Completed</th>
                  <th className="text-end" scope="col">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentAttempts.map((attempt) => (
                  <tr key={attempt._id || attempt.id}>
                    <td className="fw-semibold">{attempt.quizTitle || 'Quiz result'}</td>
                    <td className="text-secondary">
                      {attempt.completedAt && !Number.isNaN(Date.parse(attempt.completedAt))
                        ? new Date(attempt.completedAt).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="text-end fw-bold"><Link to={attempt.status === 'in_progress' ? `/quizzes/${attempt.quizId}` : `/results/${attempt.id || attempt._id}`}>{displayScore(attempt)}</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, detail, accent }) {
  return (
    <article className={`stat-card stat-card-${accent} h-100`}>
      <span className="stat-label">{label}</span>
      <div className="stat-value">{value}</div>
      <p className="stat-detail mb-0">{detail}</p>
    </article>
  );
}

function LoadingMessage({ message }) {
  return (
    <p className="resource-message text-secondary mb-0" role="status">
      <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
      {message}
    </p>
  );
}

function ResourceMessage({ message }) {
  return (
    <p className="resource-message text-secondary mb-0" role="status">
      {message}
    </p>
  );
}

export default DashboardPage;
