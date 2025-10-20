import React, { useState } from 'react';
import './App.css';
import UserForm from './components/UserForm';
import UserList from './components/UserList';
import StaffScheduler from './components/StaffScheduler';


function App() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUserCreated = () => {
    setRefreshKey(key => key + 1);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>CompanyMan - User & Staff Scheduler</h1>
      </header>
      <main>
        <section>
          <h2>User Management</h2>
          <UserForm onUserCreated={handleUserCreated} />
          <UserList key={refreshKey} />
        </section>
        <section>
          <h2>Staff Scheduler</h2>
          <StaffScheduler />
        </section>
      </main>
    </div>
  );
}

export default App;
