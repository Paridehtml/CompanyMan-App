import React, { useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import { AuthContext } from './authContext.jsx'; // Standardized import

const NotificationPage = () => {
  const { token } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper to format date nicely
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Helper to determine card styling
  const getCardStyle = (type) => {
    switch (type) {
      case 'stock_alert':
        return { backgroundColor: '#fff0f0', borderColor: '#e74c3c' };
      case 'marketing_suggestion':
        return { backgroundColor: '#e6ffe6', borderColor: '#2ecc71' };
      default:
        return { backgroundColor: '#f4f4f4', borderColor: '#ccc' };
    }
  };

  // --- Fetch Notifications (wrapped in useCallback) ---
  const fetchNotifications = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await axios.get('/api/predict/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setNotifications(res.data.data || []);
      setError(null);
    } catch (err) {
      const errMsg = err.response?.data?.msg || 'Failed to fetch notifications. Check console.';
      setError(errMsg);
      console.error('Notification Fetch Error:', err.response || err);
    } finally {
      setLoading(false);
    }
  }, [token]); // Dependency is the token

  // Run fetchNotifications on component mount
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]); // Dependency is the fetch function


  // --- NEW: Handle Delete Notification ---
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this notification?')) {
      return;
    }
    
    try {
      // Call the new backend DELETE endpoint
      await axios.delete(`/api/predict/notifications/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Refresh the list after successful deletion
      fetchNotifications(); 
    } catch (err) {
      const errMsg = err.response?.data?.msg || 'Failed to delete notification.';
      setError(errMsg);
      console.error('Notification Delete Error:', err.response || err);
    }
  };


  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: 50 }}>Loading Predictions...</div>;
  }
  
  if (error && error.includes('Access Denied')) {
    return <div style={{ color: 'red', textAlign: 'center', marginTop: 50 }}>Access Denied: Admin or Manager role required.</div>;
  }

  return (
    <div style={{ maxWidth: 800, margin: '30px auto', padding: 20 }}>
      <h2 style={{ borderBottom: '2px solid #333', paddingBottom: 10, marginBottom: 20 }}>
        Predictive Dashboard ({notifications.length} alerts)
      </h2>

      {error && <div style={{ color: 'red', marginBottom: 20, border: '1px solid red', padding: 10 }}>Error: {error}</div>}

      {notifications.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#666' }}>No new alerts or suggestions at this time.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          {notifications.map((n) => (
            <div 
              key={n._id} 
              style={{
                padding: 15, 
                borderRadius: 8, 
                borderLeft: '5px solid',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                position: 'relative', // For absolute positioning of delete button
                ...getCardStyle(n.type)
              }}
            >
              {/* --- NEW: Delete Button --- */}
              <button 
                onClick={() => handleDelete(n._id)}
                style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  background: 'none',
                  border: 'none',
                  fontSize: '1.2em',
                  cursor: 'pointer',
                  color: '#aaa',
                  padding: 5
                }}
                title="Delete Notification"
              >
                &times; 
              </button>

              <div style={{ fontWeight: 'bold', fontSize: '1.1em', paddingRight: 20 }}>
                {n.title}
              </div>
              <div style={{ fontSize: '0.9em', color: '#555', marginTop: 5, paddingRight: 20 }}>
                {n.message}
              </div>
              <div style={{ fontSize: '0.75em', color: '#999', marginTop: 10, textAlign: 'right' }}>
                {formatDate(n.createdAt)}
                {n.targetId && <span> (SKU: {n.targetId})</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationPage;