import React, { useState } from 'react';
import './App.css';
import UserForm from './components/UserForm';
import UserList from './components/UserList';

function App() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUserCreated = () => {
    setRefreshKey(oldKey => oldKey + 1);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>CompanyMan - User Management</h1>
      </header>
      <main>
        <UserForm onUserCreated={handleUserCreated} />
        <UserList key={refreshKey} />
      </main>
    </div>
  );
}

export default App;
