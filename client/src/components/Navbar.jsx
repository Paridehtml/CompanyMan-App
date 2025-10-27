import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from './authContext';

const Navbar = () => {
  const { token } = useContext(AuthContext);
  let isAdmin = false;
  let userEmail = '';
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      isAdmin = payload.user?.isAdmin;
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
      {isAdmin && (
        <Link to="/users">Users</Link>
      )}
      <div style={{ flex: 1 }} />
      {}
      {isAdmin && (
        <Link to="/inventory">Inventory</Link>
      )}
    </nav>
  );
};

export default Navbar;
