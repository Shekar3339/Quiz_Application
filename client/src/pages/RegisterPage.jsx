import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const name = form.name.trim();
    const email = form.email.trim();

    if (name.length < 2 || name.length > 80) {
      setError('Name must be between 2 and 80 characters.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address.');
      return;
    }

    if (form.password.length < 8 || new TextEncoder().encode(form.password).length > 72) {
      setError('Password must be at least 8 characters and no more than 72 bytes.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await register({ name, email, password: form.password });
      navigate('/login', { replace: true, state: { success: result.message } });
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
            <span className="eyebrow">GET STARTED</span>
            <h1 className="h2 fw-bold mt-2">Create your account</h1>
            <p className="text-secondary mb-4">Join in and make every quiz count.</p>

            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-3">
                <label className="form-label" htmlFor="register-name">
                  Full name
                </label>
                <input
                  autoComplete="name"
                  className="form-control form-control-lg"
                  id="register-name"
                  maxLength={80}
                  minLength={2}
                  name="name"
                  onChange={updateField}
                  required
                  value={form.name}
                />
              </div>
              <div className="mb-3">
                <label className="form-label" htmlFor="register-email">
                  Email address
                </label>
                <input
                  autoComplete="email"
                  className="form-control form-control-lg"
                  id="register-email"
                  maxLength={254}
                  name="email"
                  onChange={updateField}
                  required
                  type="email"
                  value={form.email}
                />
              </div>
              <div className="mb-3">
                <label className="form-label" htmlFor="register-password">
                  Password
                </label>
                <input
                  autoComplete="new-password"
                  className="form-control form-control-lg"
                  id="register-password"
                  minLength={8}
                  name="password"
                  onChange={updateField}
                  required
                  type="password"
                  value={form.password}
                />
                <div className="form-text">Use at least 8 characters.</div>
              </div>
              <div className="mb-4">
                <label className="form-label" htmlFor="register-confirm-password">
                  Confirm password
                </label>
                <input
                  autoComplete="new-password"
                  className="form-control form-control-lg"
                  id="register-confirm-password"
                  name="confirmPassword"
                  onChange={updateField}
                  required
                  type="password"
                  value={form.confirmPassword}
                />
              </div>
              <button className="btn btn-primary btn-lg w-100" disabled={isSubmitting} type="submit">
                {isSubmitting ? 'Creating account…' : 'Create account'}
              </button>
            </form>

            <p className="text-center text-secondary mt-4 mb-0">
              Already registered? <Link to="/login">Sign in</Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

export default RegisterPage;
