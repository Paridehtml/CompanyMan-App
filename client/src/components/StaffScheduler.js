import React, { useState, useEffect, useCallback, useRef } from 'react';
import api, { userAPI } from '../services/api'; // usa api per shift e userAPI per utenti

// This form is used to add or edit a shift
function ShiftForm({ mode, initialData, staffList, onCancel, onSave, onDelete }) {
  const [staffId, setStaffId] = useState(initialData?.staffId || '');
  const [shiftType, setShiftType] = useState(initialData?.shiftType || 'morning');
  const [notes, setNotes] = useState(initialData?.notes || '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!staffId) {
      alert('Please select a staff member');
      return;
    }
    const payload = {
      staffId,
      date: initialData.date,
      shiftType,
      notes,
      startTime: '09:00',
      endTime: '17:00'
    };
    await onSave(payload, initialData.id);
  };

  return (
    <div className="shift-form" style={{ border: '1px solid black', marginBottom: 10 }}>
      <h3>{mode === 'edit' ? 'Edit Shift' : 'Add Shift'}</h3>
      <form onSubmit={handleSubmit}>
        <label>Staff:</label>
        <select value={staffId} onChange={e => setStaffId(e.target.value)} required>
          <option value="">Select...</option>
          {staffList.map(user => (
            <option key={user._id} value={user._id}>{user.name}</option>
          ))}
        </select><br />
        <label>Shift Type:</label>
        <select value={shiftType} onChange={e => setShiftType(e.target.value)}>
          <option value="morning">Morning</option>
          <option value="afternoon">Afternoon</option>
          <option value="evening">Evening</option>
        </select><br />
        <label>Notes:</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes" /><br />
        <button type="submit">{mode === 'edit' ? 'Save Changes' : 'Save Shift'}</button>
        <button type="button" onClick={onCancel} style={{ marginLeft: 10 }}>Cancel</button>
        {mode === 'edit' && (
          <button type="button" onClick={onDelete} style={{ marginLeft: 10, background: '#e74c3c', color: '#fff' }}>Delete</button>
        )}
      </form>
    </div>
  );
}

// This component renders the monthly grid of shifts
function ShiftGrid({
  events,
  month,
  setMonth,
  staffList,
  onEdit,
  onAddClick,
  editing,
  formData,
  onFormCancel,
  onFormSave,
  onFormDelete
}) {
  useEffect(() => {
    console.log('ShiftGrid received events:', events.map(ev => ev.start.toISOString()));
  }, [events]);

  const yearNum = month.getUTCFullYear();
  const monthNum = month.getUTCMonth();
  const monthName = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const daysOfMonth = Array.from(
    { length: new Date(yearNum, monthNum + 1, 0).getUTCDate() },
    (_, i) => (i + 1).toString().padStart(2, '0')
  );

  const filteredShifts = events.filter(ev => {
    const d = ev.start;
    const cond = d.getUTCFullYear() === yearNum && d.getUTCMonth() === monthNum;
    if (!cond) console.log('Filtered Out Shift:', ev.start.toISOString());
    return cond;
  });

  const sortedShifts = [...filteredShifts].sort((a, b) => a.start - b.start || a.shiftType.localeCompare(b.shiftType));
  const shiftsByDay = sortedShifts.reduce((acc, shift) => {
    const dayKey = shift.start.toISOString().slice(0, 10);
    if (!acc[dayKey]) acc[dayKey] = [];
    acc[dayKey].push(shift);
    return acc;
  }, {});

  const daysWithShifts = new Set(Object.keys(shiftsByDay).map(dateStr => dateStr.split('-')[2]));
  const orderedDays = daysOfMonth;
  const [activeDay, setActiveDay] = useState(orderedDays[0]);
  const gridRef = useRef();

  useEffect(() => {
    const onScroll = () => {
      if (gridRef.current) {
        const groups = Array.from(gridRef.current.querySelectorAll('.shift-day-group'));
        let idx = 0;
        let minDistance = Infinity;
        for (let i = 0; i < groups.length; i++) {
          const rect = groups[i].getBoundingClientRect();
          const containerRect = gridRef.current.getBoundingClientRect();
          const dist = Math.abs(rect.top - containerRect.top);
          if (dist < minDistance) {
            minDistance = dist;
            idx = i;
          }
        }
        if (orderedDays[idx]) {
          setActiveDay(orderedDays[idx]);
        }
      }
    };
    const refEl = gridRef.current;
    refEl && refEl.addEventListener('scroll', onScroll);
    return () => refEl && refEl.removeEventListener('scroll', onScroll);
  }, [orderedDays]);

  const prevMonth = () => {
    const newMonth = new Date(Date.UTC(yearNum, monthNum - 1, 1));
    console.log('Change to previous month (UTC):', newMonth.toISOString());
    setMonth(newMonth);
  };

  const nextMonth = () => {
    const newMonth = new Date(Date.UTC(yearNum, monthNum + 1, 1));
    console.log('Change to next month (UTC):', newMonth.toISOString());
    setMonth(newMonth);
  };

  return (
    <div className='master-grid-wrapper'>
      <div className="shift-grid-wrapper grouped">
        <div className="side-date-list">
          <div className="month-year-wrapper">
            <div className="month-nav">
              <button onClick={prevMonth}>&lt;</button>
              <div className="month-title">{monthName}</div>
              <button onClick={nextMonth}>&gt;</button>
            </div>
          </div>
          {orderedDays.map((day) => {
            const isActive = day === activeDay;
            const hasShift = daysWithShifts.has(day);
            return (
              <div
                key={day}
                className={`date-dot${isActive ? ' active' : ''}${hasShift ? ' with-shift' : ''}`}
                onClick={() => {
                  const el = gridRef.current.querySelector(`[data-day='${day}']`);
                  el && el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                style={{ cursor: 'pointer' }}
              >
                {day}
              </div>
            );
          })}
        </div>
        <div className="shift-card-list" ref={gridRef}>
          {orderedDays.map((day) => {
            const dayKey = `${yearNum}-${(monthNum + 1).toString().padStart(2, '0')}-${day}`;
            return (
              <div key={day} className="shift-day-group" data-day={day}>
                <div style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="shift-card-date">{day}/{(monthNum + 1).toString().padStart(2, '0')}/{yearNum}</span>
                  <button style={{
                    fontSize: 15,
                    borderRadius: 6,
                    padding: '0',
                    marginLeft: 2,
                    background: '#6cc44a',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer'
                  }} onClick={() =>
                    onAddClick(new Date(Date.UTC(yearNum, monthNum, +day)))
                  }>+ Shift</button>
                </div>
                {dayKey in shiftsByDay ? shiftsByDay[dayKey].map((ev) =>
                  editing && formData?.id === ev.id ? (
                    <ShiftForm
                      key={ev.id}
                      mode="edit"
                      initialData={ev}
                      staffList={staffList}
                      onCancel={onFormCancel}
                      onSave={onFormSave}
                      onDelete={onFormDelete}
                    />
                  ) : (
                    <div
                      key={ev.id}
                      className="shift-card"
                      onClick={() => onEdit(ev)}
                      style={{ cursor: 'pointer', background: "#fff" }}
                    >
                      <div className="shift-card-header">{ev.shiftType}</div>
                      <div>
                        <strong>Staff:</strong> {ev.staffName}
                      </div>
                      <div>
                        <strong>Time:</strong> {ev.start.getUTCHours()}:{ev.start.getUTCMinutes().toString().padStart(2, '0')}
                      </div>
                      {ev.notes && (
                        <div style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
                          <span className="note-indicator" title="This shift has notes" />
                          <span>{ev.notes}</span>
                        </div>
                      )}
                    </div>
                  )
                ) : null}
                {editing && formData?.mode === "add" && formData?.day === day
                  ? <ShiftForm
                      key={"add-"+day}
                      mode="add"
                      initialData={{ date: new Date(Date.UTC(yearNum, monthNum, +day)) }}
                      staffList={staffList}
                      onCancel={onFormCancel}
                      onSave={onFormSave}
                    />
                  : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// This is the main scheduler component which loads events and staff
function StaffScheduler() {
  const [events, setEvents] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [month, setMonth] = useState(new Date());
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState(null);

  // Fetch all shifts for the current month; force UTC for mapping
  const fetchShifts = useCallback(async (signal) => {
    const monthStr = month.toISOString().slice(0, 7);
    try {
      const res = await api.get(`/shifts?month=${monthStr}`, { signal });
      console.log("Shift data received (API):", res.data.data.map(s => s.date));
      const ev = res.data.data.map((shift) => {
        const start = new Date(shift.date);
        const [sh, sm] = shift.startTime ? shift.startTime.split(':') : ['09', '00'];
        const [eh, em] = shift.endTime ? shift.endTime.split(':') : ['17', '00'];
        start.setUTCHours(parseInt(sh), parseInt(sm)); // Always UTC
        const end = new Date(shift.date);
        end.setUTCHours(parseInt(eh), parseInt(em));
        return {
          id: shift._id,
          title: `${shift.staffId?.name || 'Staff'} - ${shift.shiftType}`,
          start,
          end,
          shiftType: shift.shiftType,
          notes: shift.notes,
          notification: shift.notification,
          staffName: shift.staffId?.name || 'Staff',
          staffId: shift.staffId?._id || '',
          date: start,
        };
      });
      setEvents(ev);
      setEditing(false);
      setFormData(null);
      console.log('Final mapped shift start dates (UTC):', ev.map(s => s.start.toISOString()));
    } catch (err) {
      if (err.name === 'CanceledError') {
        console.log('Request cancelled');
      } else {
        console.error('Failed to load shifts', err);
      }
    }
  }, [month]);

  // Fetch all staff members
  const fetchStaff = useCallback(async () => {
    try {
      const res = await userAPI.getAllUsers();
      setStaffList(res.data.data);
      console.log('Staff data received:', res.data);
    } catch (e) {
      console.error('Failed loading staff:', e);
    }
  }, []);

  // Fetch shifts and staff whenever month changes, using abort for race conditions
  useEffect(() => {
    const controller = new AbortController();
    fetchShifts(controller.signal);
    fetchStaff();
    return () => controller.abort();
  }, [month, fetchShifts, fetchStaff]);

  // Handler for adding a new shift
  const handleAddClick = (date) => {
    setEditing(true);
    setFormData({ mode: "add", day: date.getUTCDate().toString().padStart(2, '0'), date });
  };

  // Handler for editing an existing shift
  const handleEdit = (ev) => {
    setEditing(true);
    setFormData(ev);
  };

  // Handler for cancelling the shift form
  const handleFormCancel = () => {
    setEditing(false);
    setFormData(null);
  };

  // Handler for saving a shift (create or update)
  const handleFormSave = async (payload, id) => {
    try {
      if (id) {
        await api.put(`/shifts/${id}`, payload);
      } else {
        await api.post('/shifts', payload);
      }
      await fetchShifts();
      setEditing(false);
      setFormData(null);
    } catch (e) {
      alert("Error saving shift.");
    }
  };

  // Handler for deleting a shift
  const handleFormDelete = async () => {
    try {
      await api.delete(`/shifts/${formData.id}`);
      await fetchShifts();
      setEditing(false);
      setFormData(null);
    } catch (e) {
      alert("Error deleting shift.");
    }
  };

  return (
    <div className="calendar-section" style={{ position: 'relative', paddingBottom: 20 }}>
      <ShiftGrid
        events={events}
        month={month}
        setMonth={setMonth}
        staffList={staffList}
        onEdit={handleEdit}
        onAddClick={handleAddClick}
        editing={editing}
        formData={formData}
        onFormCancel={handleFormCancel}
        onFormSave={handleFormSave}
        onFormDelete={handleFormDelete}
      />
    </div>
  );
}

export default StaffScheduler;
