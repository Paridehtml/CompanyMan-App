import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
// FIX: Using explicit .jsx extension for robust resolution
import { AuthContext } from './authContext.jsx';

const Navbar = () => {
  const { token } = useContext(AuthContext);
  let isAdminOrManager = false; // New flag for Admin/Manager
  let userEmail = '';
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userRole = payload.user?.role;
      // Check if user is Admin or Manager
      isAdminOrManager = userRole === 'admin' || userRole === 'manager'; 
      userEmail = payload.user?.email || '';
    } catch (err) {}
  }

  return (
    <nav style={{
      display: 'flex',
      gap: 20,
      padding: '15px 30px',
      background: '#f4f4f4',
      borderBottom: '1.5px solid #ccc',
      alignItems: 'center'
    }}>
      <Link to="/shifts" style={{ fontWeight: 600 }}>Staff Scheduler</Link>
      <Link to="/profile">Profile ({userEmail})</Link>
      
      {/* Show Alerts link for Admins/Managers */}
      {isAdminOrManager && (
          <Link to="/notifications">Alerts & AI</Link> 
      )}

      {/* Show Users link only for Admins/Managers (since it manages users) */}
      {isAdminOrManager && (
        <Link to="/users">Users</Link>
      )}
      
      <div style={{ flex: 1 }} />
      
      {/* Show Inventory link for Admins/Managers */}
      {isAdminOrManager && (
        <Link to="/inventory">Inventory</Link>
      )}
    </nav>
  );
};

export default Navbar;
