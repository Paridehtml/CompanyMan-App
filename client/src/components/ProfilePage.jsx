import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from './authContext';
import axios from 'axios';

const ProfilePage = () => {
  const { token } = useContext(AuthContext);
  const [user, setUser] = useState({});
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    position: '',
    avatar: '',
  });
  const [error, setError] = useState(null);

  // Fetch user profile from backend
  const fetchProfile = async () => {
    try {
      const response = await axios.get('/api/users/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
      setForm({
        name: response.data.name || '',
        phone: response.data.phone || '',
        position: response.data.position || '',
        avatar: response.data.avatar || '',
      });
    } catch (err) { /* handle error */ }
  };

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line
  }, []);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSave = async e => {
    e.preventDefault();
    setError(null);
    try {
      await axios.put('/api/users/profile', form, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEditing(false);
      fetchProfile(); // Get updated info after save
    } catch (err) {
      setError('Profile update failed: ' + (err.response?.data?.msg || 'Unknown error'));
    }
  };

  if (editing) {
    return (
      <form onSubmit={handleSave} style={{ maxWidth: 360, margin: '30px auto' }}>
        <h2>Edit Profile</h2>
        {error && <div style={{ color: 'red' }}>{error}</div>}
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
