import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function LoginPage() {
  const { login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const successMessage = location.state?.success;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }

    if (!password) {
      setError('Enter your password.');
      return;
    }

    setIsSubmitting(true);

    try {
      await login({ email: email.trim(), password });
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page row justify-content-center align-items-center">
      <div className="col-12 col-md-8 col-lg-5">
        <section className="auth-card card border-0 shadow-sm">
          <div className="card-body p-4 p-md-5">
            <span className="eyebrow">WELCOME BACK</span>
            <h1 className="h2 fw-bold mt-2">Sign in to your account</h1>
            <p className="text-secondary mb-4">Pick up where your learning left off.</p>

            {successMessage && (
              <div className="alert alert-success" role="status">
                {successMessage}
              </div>
            )}
            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-3">
                <label className="form-label" htmlFor="login-email">
                  Email address
                </label>
                <input
                  autoComplete="email"
                  className="form-control form-control-lg"
                  id="login-email"
                  name="email"
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  type="email"
                  value={email}
                />
              </div>
              <div className="mb-4">
                <label className="form-label" htmlFor="login-password">
                  Password
                </label>
                <input
                  autoComplete="current-password"
                  className="form-control form-control-lg"
                  id="login-password"
                  name="password"
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type="password"
                  value={password}
                />
              </div>
              <button className="btn btn-primary btn-lg w-100" disabled={isSubmitting} type="submit">
                {isSubmitting ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <p className="text-center text-secondary mt-4 mb-0">
              New to Quizly? <Link to="/register">Create an account</Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

export default LoginPage;
