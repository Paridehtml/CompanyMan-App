import React, { useContext } from 'react';
import { AuthContext } from './authContext';
import { useNavigate } from 'react-router-dom';

const Logout = () => {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <button onClick={handleLogout} style={{
      position: 'absolute',
      top: 20,
      right: 20,
      padding: '8px 16px',
      borderRadius: 6,
      border: '1px solid #c00',
      background: '#fff',
      color: '#c00',
      cursor: 'pointer'
    }}>
      Logout
    </button>
  );
};

export default Logout;
