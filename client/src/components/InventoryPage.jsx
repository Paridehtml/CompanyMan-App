import React, { useEffect, useState, useContext, useCallback } from 'react'; // <-- ADDED useCallback
import axios from 'axios';
import { AuthContext } from './authContext.jsx'; // Corrected import path

const InventoryPage = () => {
  const { token } = useContext(AuthContext);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [suggestion, setSuggestion] = useState(null); // State for AI suggestion
  const [form, setForm] = useState({
    name: "",
    sku: "",
    description: "",
    quantity: "",
    supplier: {
      name: "",
      contact: "",
      email: "",
      address: ""
    }
  });
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState(null);

  // --- Extract user role ---
  let userRole = "";
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      userRole = payload.user?.role || (payload.user?.isAdmin ? "admin" : "employee");
    } catch (err) {}
  }

  // --- WRAPPED fetchItems in useCallback ---
  const fetchItems = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    try {
      // NOTE: Using full URL for reliability, but relative paths (/api/inventory) are cleaner in production
      const res = await axios.get('http://localhost:5001/api/inventory', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setItems(res.data.data || []); 
      setError(null);
    } catch (err) {
      console.error('Inventory fetch failed:', err.response || err);
      setError(err.response?.status === 401 ? "Session expired. Please log in again." : "Failed to load inventory.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [token]); // <-- Dependencies for useCallback are token

  
  useEffect(() => {
    fetchItems();
  }, [fetchItems]); // <-- Dependency now includes fetchItems, resolving the warning


  if (userRole !== "admin" && userRole !== "manager") {
    return (
      <div style={{ color: "red", textAlign: "center", marginTop: 80 }}>
        Access Denied: Only Admins and Managers can view or manage inventory.
      </div>
    );
  }
  
  if (loading) {
    return (
      <div style={{ textAlign: "center", marginTop: 80 }}>
        Loading Inventory Data...
      </div>
    );
  }

  // Handler for generating AI Marketing Suggestion
  const handleMarketingSuggestion = async (sku) => {
    setSuggestion("Generating suggestion...");
    try {
      const res = await axios.get(`http://localhost:5001/api/predict/marketing-suggestion/${sku}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuggestion(res.data.text);
    } catch (err) {
      setSuggestion("Failed to get suggestion. Check backend logs.");
      console.error("AI Suggestion Error:", err);
    }
  };


  const handleSubmit = async e => {
    e.preventDefault();
    setError(null);
    const payload = {
      ...form,
      quantity: Number(form.quantity),
      supplier: { ...form.supplier }
    };
    try {
      if (editId) {
        await axios.put(`http://localhost:5001/api/inventory/${editId}`, payload, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });
      } else {
        await axios.post('http://localhost:5001/api/inventory', payload, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });
      }
      setForm({
        name: "",
        sku: "",
        description: "",
        quantity: "",
        supplier: {
          name: "",
          contact: "",
          email: "",
          address: ""
        }
      });
      setEditId(null);

      fetchItems();
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.msg ||
        JSON.stringify(err.response?.data) ||
        'Error!'
      );
      console.error('Inventory mutation error:', err.response?.data);
    }
  };

  const handleEdit = item => {
    setEditId(item._id);
    setForm({
      name: item.name || "",
      sku: item.sku || "",
      description: item.description || "",
      quantity: item.quantity ? String(item.quantity) : "",
      supplier: { 
        name: item.supplier?.name || "",
        contact: item.supplier?.contact || "",
        email: item.supplier?.email || "",
        address: item.supplier?.address || ""
      }
    });
  };

  const handleDelete = async id => {
    try {
        await axios.delete(`http://localhost:5001/api/inventory/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchItems();
    } catch (e) {
        setError("Failed to delete item.");
    }
  };

  const handleChange = e => {
    const { name, value } = e.target;
    if (name.startsWith('supplier.')) {
      const key = name.split('.')[1];
      setForm(f => ({
        ...f,
        supplier: { ...f.supplier, [key]: value }
      }));
    } else {
      setForm(f => ({
        ...f,
        [name]: value
      }));
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 20 }}>
      <h2>Company Inventory</h2>
      
      {suggestion && (
        <div style={{ 
          marginBottom: 20, 
          padding: 15, 
          border: '1px solid #2ecc71', 
          backgroundColor: '#e9f7ef',
          borderRadius: 4
        }}>
          <strong>AI Suggestion:</strong> {suggestion}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ marginBottom: 32, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
        <h3 style={{ gridColumn: '1 / -1', marginBottom: 10 }}>{editId ? "Edit Item" : "Add New Item"}</h3>
        {error && <div style={{ color: "red", gridColumn: '1 / -1', padding: 10, border: '1px solid red', borderRadius: 4 }}>{error}</div>}
        
        <input name="name" placeholder="Name" value={form.name} onChange={handleChange} required className="input-field" />
        <input name="sku" placeholder="SKU" value={form.sku} onChange={handleChange} required className="input-field" />
        <input name="description" placeholder="Description" value={form.description} onChange={handleChange} className="input-field" />
        <input name="quantity" type="number" placeholder="Quantity" value={form.quantity} onChange={handleChange} required className="input-field" />
        
        <input name="supplier.name" placeholder="Supplier Name" value={form.supplier.name} onChange={handleChange} className="input-field" />
        <input name="supplier.contact" placeholder="Supplier Contact" value={form.supplier.contact} onChange={handleChange} className="input-field" />
        <input name="supplier.email" placeholder="Supplier Email" value={form.supplier.email} onChange={handleChange} className="input-field" />
        <input name="supplier.address" placeholder="Supplier Address" value={form.supplier.address} onChange={handleChange} className="input-field" />
        
        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, marginTop: 10 }}>
            <button type="submit" className="button-primary">{editId ? "Update Item" : "Add Item"}</button>
            {editId && (
              <button type="button" onClick={() => {
                setEditId(null);
                setForm({
                  name: "",
                  sku: "",
                  description: "",
                  quantity: "",
                  supplier: { name: "", contact: "", email: "", address: "" }
                });
              }} className="button-secondary">Cancel Edit</button>
            )}
        </div>
      </form>
      
      <h3 style={{ marginTop: 40 }}>Current Stock</h3>
      {items.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#666' }}>No inventory items found.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '12px 8px' }}>Name</th>
              <th style={{ textAlign: 'left', padding: '12px 8px' }}>SKU</th>
              <th style={{ textAlign: 'center', padding: '12px 8px' }}>Quantity</th>
              <th style={{ textAlign: 'left', padding: '12px 8px' }}>Supplier</th>
              <th style={{ textAlign: 'center', padding: '12px 8px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item =>
              <tr key={item._id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '12px 8px' }}>{item.name}</td>
                <td style={{ padding: '12px 8px' }}>{item.sku}</td>
                <td style={{ textAlign: 'center', padding: '12px 8px', fontWeight: 'bold', color: item.quantity < 5 ? 'red' : 'inherit' }}>{item.quantity}</td>
                <td style={{ padding: '12px 8px' }}>{item.supplier?.name || '-'}</td>
                <td style={{ padding: '12px 8px', display: 'flex', gap: 5, justifyContent: 'center' }}>
                  <button onClick={() => handleEdit(item)} className="button-action">Edit</button>
                  <button onClick={() => handleDelete(item._id)} className="button-delete">Delete</button>
                  {/* New Predictive Feature Button */}
                  <button 
                    onClick={() => handleMarketingSuggestion(item.sku)} 
                    className="button-ai"
                    disabled={suggestion && suggestion.startsWith("Generating")}
                  >
                    {suggestion && suggestion.startsWith("Generating") ? "Generating..." : "AI Suggestion"}
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
      
      <style jsx>{`
        .input-field {
          padding: 8px;
          border: 1px solid #ccc;
          border-radius: 4px;
        }
        .button-primary {
          background-color: #4CAF50;
          color: white;
          padding: 10px 15px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .button-secondary {
          background-color: #f4f4f4;
          color: #333;
          padding: 10px 15px;
          border: 1px solid #ccc;
          border-radius: 4px;
          cursor: pointer;
        }
        .button-action {
          background-color: #3498db;
          color: white;
          padding: 5px 10px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9em;
        }
        .button-delete {
          background-color: #e74c3c;
          color: white;
          padding: 5px 10px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9em;
        }
        .button-ai {
            background-color: #f39c12;
            color: white;
            padding: 5px 10px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.9em;
        }
        table th {
            background-color: #f0f0f0;
        }
      `}</style>
    </div>
  );
};

export default InventoryPage;
