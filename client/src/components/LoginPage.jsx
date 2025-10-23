import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from './authContext';
import axios from 'axios';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await axios.post('http://localhost:5001/api/auth/login', { email, password });
      login(res.data.token);
      navigate('/shifts');
    } catch (err) {
      setError(err.response?.data?.msg || 'Login failed');
    }
  };

  return (
    <div style={{ maxWidth: 300, margin: '60px auto', padding: 20, border: '1px solid #ccc', borderRadius: 8 }}>
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <label>
          Email:
          <input type="email" value={email}
            onChange={e => setEmail(e.target.value)} required />
        </label>
        <br /><br />
        <label>
          Password:
          <input type="password" value={password}
            onChange={e => setPassword(e.target.value)} required />
        </label>
        <br /><br />
        {error && <div style={{ color: 'red', marginBottom: 10 }}>{error}</div>}
        <button type="submit" style={{ width: '100%' }}>Login</button>
      </form>
      <div style={{ marginTop: 16 }}>
        Don't have an account? <a href="/register">Register</a>
      </div>
    </div>
  );
};

export default LoginPage;
