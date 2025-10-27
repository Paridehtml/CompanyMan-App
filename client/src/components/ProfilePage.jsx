import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from './authContext';
import axios from 'axios';

const ProfilePage = () => {
  const { token } = useContext(AuthContext);
  const [user, setUser] = useState({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    position: '',
    avatar: '',
  });
  const [error, setError] = useState(null);


  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5001/api/users/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const userData = response.data.data;

      setUser(userData);
      setForm({
        name: userData.name || '',
        phone: userData.phone || '',
        position: userData.position || '',
        avatar: userData.avatar || '',
      });
      setError(null);
    } catch (err) { 
      console.error('Error fetching profile:', err);
      setError('Failed to load profile data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile();
    }
  }, [token]);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSave = async e => {
    e.preventDefault();
    setError(null);
    try {
      await axios.put('http://localhost:5001/api/users/profile', form, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEditing(false);
      fetchProfile();
    } catch (err) {
      setError('Profile update failed: ' + (err.response?.data?.msg || 'Unknown error'));
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', marginTop: 80 }}>
        Loading Profile...
      </div>
    );
  }
  
  if (error) {
     return (
      <div style={{ textAlign: 'center', marginTop: 80, color: 'red' }}>
        {error}
      </div>
    );
  }


  if (editing) {
    return (
      <form onSubmit={handleSave} style={{ maxWidth: 360, margin: '30px auto', padding: 20, border: '1px solid #ccc', borderRadius: 8 }}>
        <h2>Edit Profile</h2>
        {error && <div style={{ color: 'red', marginBottom: 10 }}>{error}</div>}
        <label>Name:<input name="name" value={form.name} onChange={handleChange} /></label>
        <label>Email:<input name="email" value={user.email} disabled /></label>
        <label>Phone:<input name="phone" value={form.phone} onChange={handleChange} /></label>
        <label>Position:<input name="position" value={form.position} onChange={handleChange} /></label>
        <label>Avatar URL:<input name="avatar" value={form.avatar} onChange={handleChange} /></label>
        <button type="submit">Save</button>
        <button type="button" onClick={() => setEditing(false)}>Cancel</button>
      </form>
    );
  }

  return (
    <div style={{ maxWidth: 360, margin: '30px auto', border: '1px solid #ccc', padding: 24, borderRadius: 8 }}>
      {user.avatar && (
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <img src={user.avatar} alt="avatar" style={{ width: 80, height: 80, borderRadius: 40 }} />
        </div>
      )}
      <h2>Your Profile</h2>
      <div><strong>Name:</strong> {user.name}</div>
      <div><strong>Email:</strong> {user.email}</div>
      <div><strong>Phone:</strong> {user.phone || '-'}</div>
      <div><strong>Position:</strong> {user.position || '-'}</div>
      <div><strong>Role:</strong> {user.isAdmin ? 'Admin' : 'Employee'}</div>
      <button onClick={() => setEditing(true)} style={{ marginTop: 20 }}>Edit Profile</button>
    </div>
  );
};

export default ProfilePage;
