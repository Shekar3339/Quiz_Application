import { useEffect, useState } from 'react';

const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/quizzes`;
const EMPTY_QUESTION = { prompt: '', options: ['', '', '', ''], correctOptionIndex: '' };

const getOwnerId = () => {
  const key = 'quiz-application-owner-id';
  let ownerId = window.localStorage.getItem(key);
  if (!ownerId) {
    ownerId = window.crypto.randomUUID();
    window.localStorage.setItem(key, ownerId);
  }
  return ownerId;
};

async function request(path = '', options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${response.status}).`);
  }
  return response.status === 204 ? null : response.json();
}

function App() {
  const [quizzes, setQuizzes] = useState([]);
  const [quiz, setQuiz] = useState(null);
  const [page, setPage] = useState('list');
  const [quizDraft, setQuizDraft] = useState({ title: '', description: '' });
  const [questionDraft, setQuestionDraft] = useState(EMPTY_QUESTION);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadQuizzes = async () => {
    setLoading(true);
    try {
      setQuizzes(await request());
      setError('');
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuizzes();
  }, []);

  const openQuiz = async (id) => {
    setLoading(true);
    try {
      setQuiz(await request(`/${id}`));
      setPage('detail');
      setError('');
      setNotice('');
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  const startCreateQuiz = () => {
    setQuiz(null);
    setQuizDraft({ title: '', description: '' });
    setPage('quiz-form');
    setError('');
    setNotice('');
  };

  const startEditQuiz = () => {
    setQuizDraft({ title: quiz.title, description: quiz.description });
    setPage('quiz-form');
    setError('');
  };

  const saveQuiz = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const saved = quiz
        ? await request(`/${quiz.id}`, {
            method: 'PATCH',
            body: JSON.stringify(quizDraft),
          })
        : await request('', {
            method: 'POST',
            body: JSON.stringify({ ...quizDraft, ownerId: getOwnerId() }),
          });
      setQuiz(saved);
      setPage('detail');
      setNotice(quiz ? 'Quiz details saved.' : 'Quiz created. Add questions below.');
      setError('');
      await loadQuizzes();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteQuiz = async () => {
    if (!window.confirm(`Delete "${quiz.title}" and all its questions?`)) return;
    try {
      await request(`/${quiz.id}`, { method: 'DELETE' });
      setQuiz(null);
      setPage('list');
      setNotice('Quiz deleted.');
      await loadQuizzes();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  const startAddQuestion = () => {
    setQuestionDraft(EMPTY_QUESTION);
    setEditingQuestionId(null);
    setError('');
  };

  const startEditQuestion = (question) => {
    setQuestionDraft({
      prompt: question.prompt,
      options: [...question.options],
      correctOptionIndex: '',
    });
    setEditingQuestionId(question.id);
    setError('');
  };

  const saveQuestion = async (event) => {
    event.preventDefault();
    setSaving(true);
    const payload = {
      prompt: questionDraft.prompt,
      options: questionDraft.options,
    };
    if (questionDraft.correctOptionIndex !== '') {
      payload.correctOptionIndex = Number(questionDraft.correctOptionIndex);
    }

    try {
      const saved = editingQuestionId
        ? await request(`/${quiz.id}/questions/${editingQuestionId}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
          })
        : await request(`/${quiz.id}/questions`, {
            method: 'POST',
            body: JSON.stringify({
              ...payload,
              correctOptionIndex: Number(questionDraft.correctOptionIndex),
            }),
          });
      setQuiz((current) => {
        const questions = editingQuestionId
          ? current.questions.map((question) => (question.id === saved.id ? saved : question))
          : [...current.questions, saved];
        return { ...current, questions: questions.sort((a, b) => a.position - b.position) };
      });
      startAddQuestion();
      setNotice(editingQuestionId ? 'Question updated.' : 'Question added.');
      setError('');
      await loadQuizzes();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteQuestion = async (question) => {
    if (!window.confirm('Delete this question?')) return;
    try {
      await request(`/${quiz.id}/questions/${question.id}`, { method: 'DELETE' });
      await openQuiz(quiz.id);
      setNotice('Question deleted.');
      await loadQuizzes();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  const moveQuestion = async (index, direction) => {
    const questions = [...quiz.questions];
    const target = index + direction;
    if (target < 0 || target >= questions.length) return;
    [questions[index], questions[target]] = [questions[target], questions[index]];
    try {
      const updated = await request(`/${quiz.id}/questions/order`, {
        method: 'PUT',
        body: JSON.stringify({ questionIds: questions.map((question) => question.id) }),
      });
      setQuiz(updated);
      setError('');
    } catch (orderError) {
      setError(orderError.message);
    }
  };

  return (
    <main className="container py-4 py-lg-5">
      <header className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <button
          className="brand-button"
          onClick={() => {
            setPage('list');
            setQuiz(null);
            setError('');
          }}
        >
          <span className="brand-mark">Q</span>
          <span>Quiz Studio</span>
        </button>
        {page === 'list' && (
          <button className="btn btn-primary px-4" onClick={startCreateQuiz}>
            Create quiz
          </button>
        )}
      </header>

      {error && (
        <div className="alert alert-danger d-flex justify-content-between" role="alert">
          <span>{error}</span>
          <button className="btn-close" aria-label="Dismiss error" onClick={() => setError('')} />
        </div>
      )}
      {notice && <div className="alert alert-success">{notice}</div>}

      {page === 'list' && (
        <>
          <section className="page-heading mb-4">
            <p className="eyebrow mb-2">YOUR LIBRARY</p>
            <h1 className="display-6 fw-bold mb-2">Quizzes</h1>
            <p className="text-secondary mb-0">Create a quiz, shape its questions, and keep it ready to share.</p>
          </section>
          {loading ? (
            <div className="text-secondary py-5">Loading quizzes…</div>
          ) : quizzes.length ? (
            <div className="row g-3">
              {quizzes.map((item) => (
                <div className="col-md-6 col-xl-4" key={item.id}>
                  <button className="quiz-card card h-100 text-start w-100" onClick={() => openQuiz(item.id)}>
                    <div className="card-body p-4">
                      <span className="quiz-card-icon mb-4" aria-hidden="true">✦</span>
                      <h2 className="h5 fw-bold">{item.title}</h2>
                      <p className="text-secondary quiz-description">{item.description || 'No description yet.'}</p>
                      <div className="quiz-card-footer">
                        <span>{item.questionCount} {item.questionCount === 1 ? 'question' : 'questions'}</span>
                        <span className="text-primary fw-semibold">Open <span aria-hidden="true">→</span></span>
                      </div>
                    </div>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <section className="empty-state text-center py-5 px-3">
              <span className="empty-icon" aria-hidden="true">✦</span>
              <h2 className="h4 fw-bold mt-3">Start with your first quiz</h2>
              <p className="text-secondary mb-4">Add a title, then build your question list at your own pace.</p>
              <button className="btn btn-primary px-4" onClick={startCreateQuiz}>Create a quiz</button>
            </section>
          )}
        </>
      )}

      {page === 'quiz-form' && (
        <section className="content-card">
          <button className="btn btn-link px-0 mb-3" onClick={() => setPage(quiz ? 'detail' : 'list')}>
            ← Back
          </button>
          <p className="eyebrow mb-2">{quiz ? 'QUIZ SETTINGS' : 'NEW QUIZ'}</p>
          <h1 className="h2 fw-bold mb-4">{quiz ? 'Edit quiz details' : 'Create a quiz'}</h1>
          <form onSubmit={saveQuiz} className="form-content">
            <label className="form-label fw-semibold" htmlFor="quiz-title">Title</label>
            <input
              id="quiz-title"
              className="form-control mb-3"
              maxLength={120}
              required
              value={quizDraft.title}
              onChange={(event) => setQuizDraft({ ...quizDraft, title: event.target.value })}
            />
            <label className="form-label fw-semibold" htmlFor="quiz-description">Description</label>
            <textarea
              id="quiz-description"
              className="form-control mb-4"
              rows={4}
              maxLength={2000}
              value={quizDraft.description}
              onChange={(event) => setQuizDraft({ ...quizDraft, description: event.target.value })}
            />
            <button className="btn btn-primary px-4" disabled={saving}>
              {saving ? 'Saving…' : 'Save quiz'}
            </button>
          </form>
        </section>
      )}

      {page === 'detail' && quiz && (
        <>
          <button className="btn btn-link px-0 mb-3" onClick={() => { setPage('list'); setQuiz(null); }}>
            ← All quizzes
          </button>
          <section className="content-card mb-4">
            <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
              <div>
                <p className="eyebrow mb-2">QUIZ DETAILS</p>
                <h1 className="h2 fw-bold mb-2">{quiz.title}</h1>
                <p className="text-secondary mb-0">{quiz.description || 'No description yet.'}</p>
              </div>
              <div className="d-flex gap-2">
                <button className="btn btn-outline-primary" onClick={startEditQuiz}>Edit details</button>
                <button className="btn btn-outline-danger" onClick={deleteQuiz}>Delete quiz</button>
              </div>
            </div>
          </section>

          <section className="content-card">
            <div className="d-flex justify-content-between align-items-center gap-3 mb-4">
              <div>
                <p className="eyebrow mb-1">QUESTION BUILDER</p>
                <h2 className="h4 fw-bold mb-0">Questions <span className="text-secondary fs-6">({quiz.questions.length})</span></h2>
              </div>
              {editingQuestionId && (
                <button className="btn btn-outline-secondary btn-sm" onClick={startAddQuestion}>Cancel editing</button>
              )}
            </div>

            {quiz.questions.length ? (
              <ol className="question-list list-unstyled mb-4">
                {quiz.questions.map((question, index) => (
                  <li className="question-item" key={question.id}>
                    <div className="d-flex align-items-start gap-3">
                      <span className="question-number">{index + 1}</span>
                      <div className="flex-grow-1">
                        <h3 className="h6 fw-semibold mb-2">{question.prompt}</h3>
                        <ul className="option-preview">
                          {question.options.map((option, optionIndex) => <li key={`${question.id}-${optionIndex}`}>{option}</li>)}
                        </ul>
                      </div>
                      <div className="d-flex flex-wrap gap-1">
                        <button className="btn btn-sm btn-light" aria-label={`Move question ${index + 1} up`} disabled={index === 0} onClick={() => moveQuestion(index, -1)}>↑</button>
                        <button className="btn btn-sm btn-light" aria-label={`Move question ${index + 1} down`} disabled={index === quiz.questions.length - 1} onClick={() => moveQuestion(index, 1)}>↓</button>
                        <button className="btn btn-sm btn-outline-primary" onClick={() => startEditQuestion(question)}>Edit</button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => deleteQuestion(question)}>Delete</button>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="empty-questions mb-4">No questions yet. Add your first question below.</p>
            )}

            <form className="question-form" onSubmit={saveQuestion}>
              <h3 className="h6 fw-bold mb-3">{editingQuestionId ? 'Edit question' : 'Add a question'}</h3>
              <label className="form-label fw-semibold" htmlFor="question-prompt">Question</label>
              <textarea
                id="question-prompt"
                className="form-control mb-3"
                rows={2}
                maxLength={500}
                required
                value={questionDraft.prompt}
                onChange={(event) => setQuestionDraft({ ...questionDraft, prompt: event.target.value })}
              />
              <div className="row g-3 mb-3">
                {questionDraft.options.map((option, index) => (
                  <div className="col-md-6" key={index}>
                    <label className="form-label fw-semibold" htmlFor={`question-option-${index}`}>Option {index + 1}</label>
                    <input
                      id={`question-option-${index}`}
                      className="form-control"
                      maxLength={200}
                      required
                      value={option}
                      onChange={(event) => {
                        const options = [...questionDraft.options];
                        options[index] = event.target.value;
                        setQuestionDraft({ ...questionDraft, options });
                      }}
                    />
                  </div>
                ))}
              </div>
              <label className="form-label fw-semibold" htmlFor="correct-option">
                Correct answer
              </label>
              <select
                id="correct-option"
                className="form-select mb-3"
                required={!editingQuestionId}
                value={questionDraft.correctOptionIndex}
                onChange={(event) => setQuestionDraft({ ...questionDraft, correctOptionIndex: event.target.value })}
              >
                <option value="">{editingQuestionId ? 'Keep existing answer' : 'Choose the correct option'}</option>
                {questionDraft.options.map((option, index) => (
                  <option value={index} key={index} disabled={!option.trim()}>
                    Option {index + 1}{option.trim() ? ` — ${option}` : ''}
                  </option>
                ))}
              </select>
              <p className="form-text mb-3">Correct answers are stored on the server and are not included in quiz listing or detail responses.</p>
              <button className="btn btn-primary px-4" disabled={saving}>{saving ? 'Saving…' : editingQuestionId ? 'Save question' : 'Add question'}</button>
            </form>
          </section>
        </>
      )}
    </main>
  );
}

export default App;
