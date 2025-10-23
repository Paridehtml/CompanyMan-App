import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from './authContext';

const InventoryPage = () => {
  const { token } = useContext(AuthContext);

  const [items, setItems] = useState([]);
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

  useEffect(() => {
    axios.get('/api/inventory', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => setItems(res.data));

  }, [token]);


  if (userRole !== "admin" && userRole !== "manager") {
    return (
      <div style={{ color: "red", textAlign: "center", marginTop: 80 }}>
        Access Denied: Only Admins and Managers can view or manage inventory.
      </div>
    );
  }

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
        await axios.put(`/api/inventory/${editId}`, payload, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });
      } else {
        await axios.post('/api/inventory', payload, {
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
      // Refetch items
      axios.get('/api/inventory', {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => setItems(res.data));
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.msg ||
        JSON.stringify(err.response?.data) ||
        'Error!'
      );
      console.error('Inventory add error:', err.response?.data);
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
    await axios.delete(`/api/inventory/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    axios.get('/api/inventory', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => setItems(res.data));
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
    <div>
      <h2>Company Inventory</h2>
      <form onSubmit={handleSubmit} style={{ marginBottom: 32 }}>
        <h3>{editId ? "Edit Item" : "Add New Item"}</h3>
        {error && <div style={{ color: "red" }}>{error}</div>}
        <input name="name" placeholder="Name" value={form.name} onChange={handleChange} required />
        <input name="sku" placeholder="SKU" value={form.sku} onChange={handleChange} required />
        <input name="description" placeholder="Description" value={form.description} onChange={handleChange} />
        <input name="quantity" type="number" placeholder="Quantity" value={form.quantity} onChange={handleChange} required />
        <input name="supplier.name" placeholder="Supplier Name" value={form.supplier.name} onChange={handleChange} />
        <input name="supplier.contact" placeholder="Supplier Contact" value={form.supplier.contact} onChange={handleChange} />
        <input name="supplier.email" placeholder="Supplier Email" value={form.supplier.email} onChange={handleChange} />
        <input name="supplier.address" placeholder="Supplier Address" value={form.supplier.address} onChange={handleChange} />
        <button type="submit">{editId ? "Update" : "Add"}</button>
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
          }}>Cancel</button>
        )}
      </form>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>SKU</th>
            <th>Quantity</th>
            <th>Supplier</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item =>
            <tr key={item._id}>
              <td>{item.name}</td>
              <td>{item.sku}</td>
              <td>{item.quantity}</td>
              <td>{item.supplier?.name}</td>
              <td>
                <button onClick={() => handleEdit(item)}>Edit</button>
                <button onClick={() => handleDelete(item._id)} style={{ color: "red" }}>Delete</button>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default InventoryPage;
