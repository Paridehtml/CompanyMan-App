import React, { useState, useContext } from 'react';
import './App.css';
import UserForm from './components/UserForm';
import UserList from './components/UserList';
import StaffScheduler from './components/StaffScheduler';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import PrivateRoute from './components/PrivateRoute';
import { AuthProvider, AuthContext } from './components/authContext';
import Logout from './components/Logout';
import Navbar from './components/Navbar';
import ProfilePage from './components/ProfilePage';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import InventoryPage from './components/InventoryPage';


function App() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUserCreated = () => {
    setRefreshKey(key => key + 1);
  };

  const AdminRoutes = () => {
    const { token } = useContext(AuthContext);
    let isAdmin = false;
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        isAdmin = payload.user?.isAdmin;
      } catch (err) {}
    }
    if (!isAdmin) {
      return <Navigate to="/shifts" replace />;
    }
    return (
      <section>
        <h2>User Management</h2>
        <UserForm onUserCreated={handleUserCreated} />
        <UserList key={refreshKey} />
      </section>
    );
  };

  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <header className="App-header">
            <h1>CompanyMan - User & Staff Scheduler</h1>
            <Logout />
          </header>
          <Navbar />
          <main>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route
                path="/profile"
                element={
                  <PrivateRoute>
                    <ProfilePage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <PrivateRoute>
                    <AdminRoutes />
                  </PrivateRoute>
                }
              />
              <Route
                path="/shifts"
                element={
                  <PrivateRoute>
                    <section>
                      <h2>Staff Scheduler</h2>
                      <StaffScheduler />
                    </section>
                  </PrivateRoute>
                }
              />
              <Route
                path="/"
                element={
                  <PrivateRoute>
                    <section>
                      <h2>Staff Scheduler</h2>
                      <StaffScheduler />
                    </section>
                  </PrivateRoute>
                }
              />
              <Route
              path="/inventory"
              element={
                <PrivateRoute>
                  <InventoryPage />
                </PrivateRoute>
              }
              />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
