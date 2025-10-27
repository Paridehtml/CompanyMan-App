import React, { useContext } from 'react';
import { AuthContext } from './authContext';
import { Navigate } from 'react-router-dom';

// Usage: <PrivateRoute><ComponentToProtect /></PrivateRoute>
const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useContext(AuthContext);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export default PrivateRoute;
