import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function AppNavbar() {
  const { user, logout } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    setLogoutError('');
    setIsLoggingOut(true);

    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      setLogoutError(error.message);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const closeMenu = () => setExpanded(false);

  return (
    <>
      <nav className="navbar navbar-expand-lg app-navbar">
        <div className="container">
          <Link className="navbar-brand fw-bold" to="/dashboard" onClick={closeMenu}>
            <span className="brand-mark me-2">Q</span>Quizly
          </Link>
          <button
            className="navbar-toggler"
            type="button"
            aria-controls="primary-navigation"
            aria-expanded={expanded}
            aria-label="Toggle navigation"
            onClick={() => setExpanded((current) => !current)}
          >
            <span className="navbar-toggler-icon" />
          </button>
          <div
            className={`collapse navbar-collapse${expanded ? ' show' : ''}`}
            id="primary-navigation"
          >
            <div className="navbar-nav me-auto">
              <NavLink
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                to="/dashboard"
                end
                onClick={closeMenu}
              >
                Dashboard
              </NavLink>
              <NavLink
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                to="/attempt-history"
                onClick={closeMenu}
              >
                My attempts
              </NavLink>
              <Link
                className="nav-link"
                to="/dashboard#available-quizzes"
                onClick={closeMenu}
              >
                Available quizzes
              </Link>
            </div>
            <div className="d-flex flex-column flex-lg-row align-items-lg-center gap-2 py-2 py-lg-0">
              <NavLink
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                to="/profile"
                onClick={closeMenu}
              >
                {user.name}
              </NavLink>
              <button
                className="btn btn-outline-primary btn-sm px-3"
                type="button"
                disabled={isLoggingOut}
                onClick={handleLogout}
              >
                {isLoggingOut ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="container py-4 py-lg-5">
        {logoutError && (
          <div className="alert alert-danger" role="alert">
            {logoutError}
          </div>
        )}
        <Outlet />
      </main>
    </>
  );
}
