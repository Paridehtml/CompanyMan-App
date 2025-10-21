import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from './authContext';
import axios from 'axios';

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await axios.post('http://localhost:5001/api/auth/register', { name, email, password });
      login(res.data.token);
      navigate('/shifts');
    } catch (err) {
      setError(
        err.response?.data?.errors?.[0]?.msg ||
        err.response?.data?.msg ||
        'Registration failed'
      );
    }
  };

  return (
    <div style={{ maxWidth: 300, margin: '60px auto', padding: 20, border: '1px solid #ccc', borderRadius: 8 }}>
      <h2>Register</h2>
      <form onSubmit={handleRegister}>
        <label>
          Name:
          <input type="text" value={name}
            onChange={e => setName(e.target.value)} required />
        </label>
        <br /><br />
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
        <button type="submit" style={{ width: '100%' }}>Register</button>
      </form>
      <div style={{ marginTop: 16 }}>
        Already have an account? <a href="/login">Login</a>
      </div>
    </div>
  );
};

export default RegisterPage;
