import React, { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import axios from 'axios';

import { userAPI } from '../services/api';

const locales = { 'en-US': require('date-fns/locale/en-US') };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

function ShiftForm({ slotInfo, staffList, onClose, onShiftCreated }) {
  const [staffId, setStaffId] = useState('');
  const [shiftType, setShiftType] = useState('morning');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!staffId) {
      alert('Please select a staff member');
      return;
    }
    try {
      await axios.post('http://localhost:5001/api/shifts', {
        staffId,
        date: slotInfo.start,
        shiftType,
        notes,
        startTime: '09:00',
        endTime: '17:00',
      });
      onShiftCreated();
      onClose();
    } catch (err) {
      console.error('Error creating shift:', err);
      alert('Failed to create shift');
    }
  };

  return (
    <div className="shift-form" style={{ border: '1px solid black', padding: 10, marginTop: 10 }}>
      <h3>New Shift for {slotInfo.start.toLocaleDateString()}</h3>
      <form onSubmit={handleSubmit}>
        <label>Staff:</label>
        <select value={staffId} onChange={e => setStaffId(e.target.value)} required>
          <option value="">Select...</option>
          {staffList.map(user => (
            <option key={user._id} value={user._id}>{user.name}</option>
          ))}
        </select>

        <br />
        <label>Shift Type:</label>
        <select value={shiftType} onChange={e => setShiftType(e.target.value)}>
          <option value="morning">Morning</option>
          <option value="afternoon">Afternoon</option>
          <option value="evening">Evening</option>
        </select>

        <br />
        <label>Notes:</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes" />

        <br />
        <button type="submit">Save Shift</button>
        <button type="button" onClick={onClose} style={{ marginLeft: 10 }}>Cancel</button>
      </form>
    </div>
  );
}

function StaffScheduler() {
  const [events, setEvents] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [staffList, setStaffList] = useState([]);

  useEffect(() => {
    fetchShifts();
    fetchStaff();
  }, []);

  const fetchShifts = async () => {
    try {
      const res = await axios.get('http://localhost:5001/api/shifts?month=2025-10');
      const ev = res.data.data.map(shift => {
        const start = new Date(shift.date);
        const [sh, sm] = shift.startTime ? shift.startTime.split(':') : ['09', '00'];
        const [eh, em] = shift.endTime ? shift.endTime.split(':') : ['17', '00'];
        start.setHours(parseInt(sh), parseInt(sm));
        const end = new Date(shift.date);
        end.setHours(parseInt(eh), parseInt(em));
        return {
          id: shift._id,
          title: `${shift.staffId?.name || 'Staff'} - ${shift.shiftType}`,
          start,
          end,
        };
      });
      setEvents(ev);
    } catch (err) {
      console.error('Failed to load shifts', err);
    }
  };

  const fetchStaff = async () => {
    try {
      const res = await userAPI.getAllUsers();
      setStaffList(res.data.data);
    } catch (e) {
      console.error('Failed loading staff:', e);
    }
  };

  const handleSelectSlot = (slotInfo) => {
    setSelectedSlot(slotInfo);
  };

  const handleShiftCreated = () => {
    fetchShifts();
  };

  const handleCloseForm = () => {
    setSelectedSlot(null);
  };

  return (
    <div className="calendar-section" style={{ position: 'relative', paddingBottom: 20 }}>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 500 }}
        selectable
        onSelectSlot={handleSelectSlot}
      />
      {selectedSlot && (
        <div className="shift-form-wrapper">
          <ShiftForm
            slotInfo={selectedSlot}
            staffList={staffList}
            onClose={handleCloseForm}
            onShiftCreated={handleShiftCreated}
          />
        </div>
      )}
    </div>
  );
  
}

export default StaffScheduler;
  