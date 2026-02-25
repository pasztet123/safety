import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import './AdminPanel.css'

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('meetings')
  const [meetings, setMeetings] = useState([])
  const [incidents, setIncidents] = useState([])
  const [users, setUsers] = useState([])
  const [leaders, setLeaders] = useState([])
  const [involvedPersons, setInvolvedPersons] = useState([])
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Form states
  const [showUserForm, setShowUserForm] = useState(false)
  const [showLeaderForm, setShowLeaderForm] = useState(false)
  const [showInvolvedPersonForm, setShowInvolvedPersonForm] = useState(false)
  const [showCompanyForm, setShowCompanyForm] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [editingInvolvedPerson, setEditingInvolvedPerson] = useState(null)
  const [newUser, setNewUser] = useState({ email: '', password: '', name: '', is_admin: false })
  const [newLeader, setNewLeader] = useState({ name: '', email: '', phone: '' })
  const [newInvolvedPerson, setNewInvolvedPerson] = useState({ name: '', email: '', phone: '', company_id: '' })
  const [newCompany, setNewCompany] = useState({ name: '', address: '', city: '', state: '', zip: '', phone: '', email: '', website: '' })

  useEffect(() => {
    fetchData()
    if (activeTab === 'involved-persons') {
      fetchCompaniesForSelect()
    }
  }, [activeTab])

  const fetchCompaniesForSelect = async () => {
    const { data } = await supabase
      .from('companies')
      .select('id, name')
      .order('name')
    if (data) setCompanies(data)
  }

  const fetchData = async () => {
    setLoading(true)
    
    if (activeTab === 'meetings') {
      const { data } = await supabase
        .from('meetings')
        .select(`
          *,
          project:projects(name)
        `)
        .order('created_at', { ascending: false })
      if (data) setMeetings(data)
    } else if (activeTab === 'incidents') {
      const { data } = await supabase
        .from('incidents')
        .select(`
          *,
          project:projects(name)
        `)
        .order('created_at', { ascending: false })
      if (data) setIncidents(data)
    } else if (activeTab === 'users') {
      const { data } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
      if (data) setUsers(data)
    } else if (activeTab === 'leaders') {
      const { data } = await supabase
        .from('leaders')
        .select('*')
        .order('name')
      if (data) setLeaders(data)
    } else if (activeTab === 'involved-persons') {
      const { data } = await supabase
        .from('involved_persons')
        .select('*, company:companies(name)')
        .order('name')
      if (data) setInvolvedPersons(data)
    } else if (activeTab === 'companies') {
      const { data } = await supabase
        .from('companies')
        .select('*')
        .order('name')
      if (data) setCompanies(data)
    }
    
    setLoading(false)
  }

  const handleDeleteMeeting = async (id) => {
    if (!confirm('Are you sure you want to delete this meeting?')) return
    
    const { error } = await supabase
      .from('meetings')
      .delete()
      .eq('id', id)
    
    if (!error) {
      fetchData()
    }
  }

  const handleDeleteIncident = async (id) => {
    if (!confirm('Are you sure you want to delete this incident?')) return
    
    const { error } = await supabase
      .from('incidents')
      .delete()
      .eq('id', id)
    
    if (!error) {
      fetchData()
    }
  }

  const handleAddUser = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: newUser.email,
            password: newUser.password,
            name: newUser.name,
            is_admin: newUser.is_admin,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        console.error('Edge Function error:', data)
        alert(`Error creating user (${response.status}): ${data.error || JSON.stringify(data)}`)
      } else {
        alert('User created successfully!')
        setNewUser({ email: '', password: '', name: '', is_admin: false })
        setShowUserForm(false)
        fetchData()
      }
    } catch (error) {
      console.error('Request error:', error)
      alert(`Request failed: ${error.message}`)
    }
    
    setLoading(false)
  }

  const handleDeleteUser = async (id) => {
    if (!confirm('Are you sure you want to delete this user?')) return
    
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-delete-user`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: id }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        alert(`Error deleting user: ${data.error}`)
      } else {
        fetchData()
      }
    } catch (error) {
      alert(`Error: ${error.message}`)
    }

    setLoading(false)
  }

  const handleUpdateUser = async (e) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase
      .from('users')
      .update({
        name: editingUser.name,
        is_admin: editingUser.is_admin
      })
      .eq('id', editingUser.id)

    if (error) {
      alert(`Error updating user: ${error.message}`)
    } else {
      setEditingUser(null)
      fetchData()
    }
    
    setLoading(false)
  }

  const handleResetPassword = async (userId, userEmail) => {
    const newPassword = prompt(`Enter new password for ${userEmail}:`)
    
    if (!newPassword) return
    
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-reset-password`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId, newPassword }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        alert(`Error resetting password: ${data.error}`)
      } else {
        alert(`Password successfully reset for ${userEmail}`)
      }
    } catch (error) {
      alert(`Error: ${error.message}`)
    }

    setLoading(false)
  }

  const handleAddLeader = async (e) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase
      .from('leaders')
      .insert([newLeader])

    if (error) {
      alert(`Error adding leader: ${error.message}`)
    } else {
      setNewLeader({ name: '', email: '', phone: '' })
      setShowLeaderForm(false)
      fetchData()
    }
    
    setLoading(false)
  }

  const handleDeleteLeader = async (id) => {
    if (!confirm('Are you sure you want to delete this leader?')) return
    
    const { error } = await supabase
      .from('leaders')
      .delete()
      .eq('id', id)
    
    if (!error) {
      fetchData()
    }
  }

  const handleAddInvolvedPerson = async (e) => {
    e.preventDefault()
    setLoading(true)

    const dataToInsert = {
      name: newInvolvedPerson.name,
      email: newInvolvedPerson.email || null,
      phone: newInvolvedPerson.phone || null,
      company_id: newInvolvedPerson.company_id || null
    }

    const { error } = await supabase
      .from('involved_persons')
      .insert([dataToInsert])

    if (error) {
      alert(`Error adding involved person: ${error.message}`)
    } else {
      setNewInvolvedPerson({ name: '', email: '', phone: '', company_id: '' })
      setShowInvolvedPersonForm(false)
      fetchData()
    }
    
    setLoading(false)
  }

  const handleUpdateInvolvedPerson = async (e) => {
    e.preventDefault()
    setLoading(true)

    const dataToUpdate = {
      name: editingInvolvedPerson.name,
      email: editingInvolvedPerson.email || null,
      phone: editingInvolvedPerson.phone || null,
      company_id: editingInvolvedPerson.company_id || null
    }

    const { error } = await supabase
      .from('involved_persons')
      .update(dataToUpdate)
      .eq('id', editingInvolvedPerson.id)

    if (error) {
      alert(`Error updating involved person: ${error.message}`)
    } else {
      setEditingInvolvedPerson(null)
      fetchData()
    }
    
    setLoading(false)
  }

  const handleDeleteInvolvedPerson = async (id) => {
    if (!confirm('Are you sure you want to delete this involved person?')) return
    
    const { error } = await supabase
      .from('involved_persons')
      .delete()
      .eq('id', id)
    
    if (!error) {
      fetchData()
    }
  }

  const handleAddCompany = async (e) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase
      .from('companies')
      .insert([newCompany])

    if (error) {
      alert(`Error adding company: ${error.message}`)
    } else {
      setNewCompany({ name: '', address: '', city: '', state: '', zip: '', phone: '', email: '', website: '' })
      setShowCompanyForm(false)
      fetchData()
    }
    
    setLoading(false)
  }

  const handleDeleteCompany = async (id) => {
    if (!confirm('Are you sure you want to delete this company?')) return
    
    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('id', id)
    
    if (!error) {
      fetchData()
    }
  }

  return (
    <div className="admin-panel">
      <h2 className="page-title">Admin Panel</h2>

      <div className="admin-tabs">
        <button
          className={`admin-tab ${activeTab === 'meetings' ? 'active' : ''}`}
          onClick={() => setActiveTab('meetings')}
        >
          Meetings
        </button>
        <button
          className={`admin-tab ${activeTab === 'incidents' ? 'active' : ''}`}
          onClick={() => setActiveTab('incidents')}
        >
          Incidents
        </button>
        <button
          className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Users
        </button>
        <button
          className={`admin-tab ${activeTab === 'leaders' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaders')}
        >
          Leaders
        </button>
        <button
          className={`admin-tab ${activeTab === 'involved-persons' ? 'active' : ''}`}
          onClick={() => setActiveTab('involved-persons')}
        >
          Involved Persons
        </button>
        <button
          className={`admin-tab ${activeTab === 'companies' ? 'active' : ''}`}
          onClick={() => setActiveTab('companies')}
        >
          Companies
        </button>
      </div>

      {loading ? (
        <div className="spinner"></div>
      ) : (
        <div className="admin-content">
          {activeTab === 'meetings' && (
            <div className="data-table">
              <h3 className="section-title">All Meetings ({meetings.length})</h3>
              {meetings.length === 0 ? (
                <p>No meetings found.</p>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Topic</th>
                        <th>Leader</th>
                        <th>Project</th>
                        <th>Location</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {meetings.map((meeting) => (
                        <tr key={meeting.id}>
                          <td>{new Date(meeting.date).toLocaleDateString()}</td>
                          <td>{meeting.topic}</td>
                          <td>{meeting.leader_name}</td>
                          <td>{meeting.project?.name || '-'}</td>
                          <td>{meeting.location || '-'}</td>
                          <td>
                            <div className="table-actions">
                              <button
                                className="btn-icon btn-delete"
                                onClick={() => handleDeleteMeeting(meeting.id)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'incidents' && (
            <div className="data-table">
              <h3 className="section-title">All Incidents ({incidents.length})</h3>
              {incidents.length === 0 ? (
                <p>No incidents found.</p>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Employee</th>
                        <th>Reporter</th>
                        <th>Project</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {incidents.map((incident) => (
                        <tr key={incident.id}>
                          <td>{new Date(incident.date).toLocaleDateString()}</td>
                          <td>
                            <span className="type-badge">{incident.type_name}</span>
                          </td>
                          <td>{incident.employee_name}</td>
                          <td>{incident.reporter_name}</td>
                          <td>{incident.project?.name || '-'}</td>
                          <td>
                            <div className="table-actions">
                              <button
                                className="btn-icon btn-delete"
                                onClick={() => handleDeleteIncident(incident.id)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="data-table">
              <div className="section-header">
                <h3 className="section-title">Users ({users.length})</h3>
                <button className="btn btn-primary" onClick={() => setShowUserForm(!showUserForm)}>
                  {showUserForm ? 'Cancel' : '+ Add User'}
                </button>
              </div>

              {editingUser && (
                <form className="form-card" onSubmit={handleUpdateUser}>
                  <h4>Edit User</h4>
                  <div className="form-group">
                    <label>Email (read-only)</label>
                    <input
                      type="email"
                      value={editingUser.email}
                      disabled
                      style={{ backgroundColor: '#f5f5f5' }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Name *</label>
                    <input
                      type="text"
                      value={editingUser.name}
                      onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={editingUser.is_admin}
                        onChange={(e) => setEditingUser({...editingUser, is_admin: e.target.checked})}
                      />
                      Admin Access
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                      {loading ? 'Updating...' : 'Update User'}
                    </button>
                    <button type="button" className="btn" onClick={() => setEditingUser(null)}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {showUserForm && (
                <form className="form-card" onSubmit={handleAddUser}>
                  <h4>Add New User</h4>
                  <div className="form-group">
                    <label>Name *</label>
                    <input
                      type="text"
                      value={newUser.name}
                      onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email *</label>
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Password *</label>
                    <input
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={newUser.is_admin}
                        onChange={(e) => setNewUser({...newUser, is_admin: e.target.checked})}
                      />
                      Admin Access
                    </label>
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Adding...' : 'Add User'}
                  </button>
                </form>
              )}

              {users.length === 0 ? (
                <p>No users found.</p>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Admin</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td>{user.name}</td>
                          <td>{user.email}</td>
                          <td>{user.is_admin ? '✓' : '-'}</td>
                          <td>{new Date(user.created_at).toLocaleDateString()}</td>
                          <td>
                            <div className="table-actions">
                              <button
                                className="btn-icon"
                                onClick={() => setEditingUser(user)}
                              >
                                Edit
                              </button>
                              <button
                                className="btn-icon"
                                onClick={() => handleResetPassword(user.id, user.email)}
                              >
                                Reset Password
                              </button>
                              <button
                                className="btn-icon btn-delete"
                                onClick={() => handleDeleteUser(user.id)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'leaders' && (
            <div className="data-table">
              <div className="section-header">
                <h3 className="section-title">Leaders ({leaders.length})</h3>
                <button className="btn btn-primary" onClick={() => setShowLeaderForm(!showLeaderForm)}>
                  {showLeaderForm ? 'Cancel' : '+ Add Leader'}
                </button>
              </div>

              {showLeaderForm && (
                <form className="form-card" onSubmit={handleAddLeader}>
                  <h4>Add New Leader</h4>
                  <div className="form-group">
                    <label>Name *</label>
                    <input
                      type="text"
                      value={newLeader.name}
                      onChange={(e) => setNewLeader({...newLeader, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={newLeader.email}
                      onChange={(e) => setNewLeader({...newLeader, email: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      value={newLeader.phone}
                      onChange={(e) => setNewLeader({...newLeader, phone: e.target.value})}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Adding...' : 'Add Leader'}
                  </button>
                </form>
              )}

              {leaders.length === 0 ? (
                <p>No leaders found.</p>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaders.map((leader) => (
                        <tr key={leader.id}>
                          <td>{leader.name}</td>
                          <td>{leader.email || '-'}</td>
                          <td>{leader.phone || '-'}</td>
                          <td>
                            <div className="table-actions">
                              <button
                                className="btn-icon btn-delete"
                                onClick={() => handleDeleteLeader(leader.id)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'involved-persons' && (
            <div className="data-table">
              <div className="section-header">
                <h3 className="section-title">Involved Persons ({involvedPersons.length})</h3>
                <button className="btn btn-primary" onClick={() => {
                  setShowInvolvedPersonForm(!showInvolvedPersonForm)
                  setEditingInvolvedPerson(null)
                }}>
                  {showInvolvedPersonForm ? 'Cancel' : '+ Add Involved Person'}
                </button>
              </div>

              {showInvolvedPersonForm && (
                <form className="form-card" onSubmit={handleAddInvolvedPerson}>
                  <h4>Add New Involved Person</h4>
                  <div className="form-group">
                    <label>Name *</label>
                    <input
                      type="text"
                      value={newInvolvedPerson.name}
                      onChange={(e) => setNewInvolvedPerson({...newInvolvedPerson, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={newInvolvedPerson.email}
                      onChange={(e) => setNewInvolvedPerson({...newInvolvedPerson, email: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      value={newInvolvedPerson.phone}
                      onChange={(e) => setNewInvolvedPerson({...newInvolvedPerson, phone: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Company</label>
                    <select
                      value={newInvolvedPerson.company_id}
                      onChange={(e) => setNewInvolvedPerson({...newInvolvedPerson, company_id: e.target.value})}
                    >
                      <option value="">Select Company</option>
                      {companies.map(company => (
                        <option key={company.id} value={company.id}>{company.name}</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Adding...' : 'Add Involved Person'}
                  </button>
                </form>
              )}

              {editingInvolvedPerson && (
                <form className="form-card" onSubmit={handleUpdateInvolvedPerson}>
                  <h4>Edit Involved Person</h4>
                  <div className="form-group">
                    <label>Name *</label>
                    <input
                      type="text"
                      value={editingInvolvedPerson.name}
                      onChange={(e) => setEditingInvolvedPerson({...editingInvolvedPerson, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={editingInvolvedPerson.email || ''}
                      onChange={(e) => setEditingInvolvedPerson({...editingInvolvedPerson, email: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      value={editingInvolvedPerson.phone || ''}
                      onChange={(e) => setEditingInvolvedPerson({...editingInvolvedPerson, phone: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Company</label>
                    <select
                      value={editingInvolvedPerson.company_id || ''}
                      onChange={(e) => setEditingInvolvedPerson({...editingInvolvedPerson, company_id: e.target.value})}
                    >
                      <option value="">Select Company</option>
                      {companies.map(company => (
                        <option key={company.id} value={company.id}>{company.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-row">
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                      {loading ? 'Updating...' : 'Update Involved Person'}
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={() => setEditingInvolvedPerson(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {involvedPersons.length === 0 ? (
                <p>No involved persons found.</p>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Company</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {involvedPersons.map((person) => (
                        <tr key={person.id}>
                          <td>{person.name}</td>
                          <td>{person.email || '-'}</td>
                          <td>{person.phone || '-'}</td>
                          <td>{person.company?.name || '-'}</td>
                          <td>
                            <div className="table-actions">
                              <button
                                className="btn-icon"
                                onClick={() => {
                                  setEditingInvolvedPerson(person)
                                  setShowInvolvedPersonForm(false)
                                }}
                              >
                                Edit
                              </button>
                              <button
                                className="btn-icon btn-delete"
                                onClick={() => handleDeleteInvolvedPerson(person.id)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'companies' && (
            <div className="data-table">
              <div className="section-header">
                <h3 className="section-title">Companies ({companies.length})</h3>
                <button className="btn btn-primary" onClick={() => setShowCompanyForm(!showCompanyForm)}>
                  {showCompanyForm ? 'Cancel' : '+ Add Company'}
                </button>
              </div>

              {showCompanyForm && (
                <form className="form-card" onSubmit={handleAddCompany}>
                  <h4>Add New Company</h4>
                  <div className="form-group">
                    <label>Company Name *</label>
                    <input
                      type="text"
                      value={newCompany.name}
                      onChange={(e) => setNewCompany({...newCompany, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Address</label>
                    <input
                      type="text"
                      value={newCompany.address}
                      onChange={(e) => setNewCompany({...newCompany, address: e.target.value})}
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>City</label>
                      <input
                        type="text"
                        value={newCompany.city}
                        onChange={(e) => setNewCompany({...newCompany, city: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label>State</label>
                      <input
                        type="text"
                        value={newCompany.state}
                        onChange={(e) => setNewCompany({...newCompany, state: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label>ZIP</label>
                      <input
                        type="text"
                        value={newCompany.zip}
                        onChange={(e) => setNewCompany({...newCompany, zip: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      value={newCompany.phone}
                      onChange={(e) => setNewCompany({...newCompany, phone: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={newCompany.email}
                      onChange={(e) => setNewCompany({...newCompany, email: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Website</label>
                    <input
                      type="url"
                      value={newCompany.website}
                      onChange={(e) => setNewCompany({...newCompany, website: e.target.value})}
                      placeholder="https://"
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Adding...' : 'Add Company'}
                  </button>
                </form>
              )}

              {companies.length === 0 ? (
                <p>No companies found.</p>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Address</th>
                        <th>City</th>
                        <th>Phone</th>
                        <th>Email</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {companies.map((company) => (
                        <tr key={company.id}>
                          <td>{company.name}</td>
                          <td>{company.address || '-'}</td>
                          <td>{company.city || '-'}</td>
                          <td>{company.phone || '-'}</td>
                          <td>{company.email || '-'}</td>
                          <td>
                            <div className="table-actions">
                              <button
                                className="btn-icon btn-delete"
                                onClick={() => handleDeleteCompany(company.id)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
