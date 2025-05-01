import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

const ProtectedRoute = ({ children }) => {
  const [checking, setChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
      setChecking(false);
    });

    return () => unsubscribe();
  }, []);

  if (checking) return null; // or show loading spinner
  return isAuthenticated ? children : <Navigate to="/login" />;
};

export default ProtectedRoute;
