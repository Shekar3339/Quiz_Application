import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusError, setStatusError] = useState('');

  useEffect(() => {
    let active = true;

    apiRequest('/auth/profile')
      .then(({ user: currentUser }) => {
        if (active) {
          setUser(currentUser);
        }
      })
      .catch((error) => {
        if (active && error.status !== 401) {
          setStatusError('Could not verify your session. Check that the API is available.');
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      statusError,
      login: async (credentials) => {
        const result = await apiRequest('/auth/login', {
          method: 'POST',
          body: JSON.stringify(credentials),
        });
        setUser(result.user);
        setStatusError('');
        return result.user;
      },
      register: (details) =>
        apiRequest('/auth/register', {
          method: 'POST',
          body: JSON.stringify(details),
        }),
      logout: async () => {
        await apiRequest('/auth/logout', { method: 'POST' });
        setUser(null);
        setStatusError('');
      },
    }),
    [user, isLoading, statusError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return context;
};
