import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { AppNavbar } from './components/AppNavbar.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';

function RouteLoading() {
  return (
    <main className="container min-vh-100 d-flex align-items-center justify-content-center">
      <div className="text-secondary" role="status">
        <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
        Loading your account…
      </div>
    </main>
  );
}

function ProtectedRoutes() {
  const { isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <RouteLoading />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

function GuestRoute({ children }) {
  const { isLoading, user } = useAuth();

  if (isLoading) {
    return <RouteLoading />;
  }

  return user ? <Navigate to="/dashboard" replace /> : children;
}

function AppRoutes() {
  const { statusError } = useAuth();

  return (
    <>
      {statusError && (
        <div className="container pt-3">
          <div className="alert alert-warning mb-0" role="alert">
            {statusError}
          </div>
        </div>
      )}
      <Routes>
        <Route
          path="/login"
          element={
            <GuestRoute>
              <LoginPage />
            </GuestRoute>
          }
        />
        <Route
          path="/register"
          element={
            <GuestRoute>
              <RegisterPage />
            </GuestRoute>
          }
        />
        <Route element={<ProtectedRoutes />}>
          <Route element={<AppNavbar />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Route>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
