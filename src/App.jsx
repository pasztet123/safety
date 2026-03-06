import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Layout from './components/Layout'
import Login from './pages/Login'
import MainMenu from './pages/MainMenu'
import Meetings from './pages/Meetings'
import MeetingForm from './pages/MeetingForm'
import MeetingDetails from './pages/MeetingDetails'
import Incidents from './pages/Incidents'
import IncidentDetails from './pages/IncidentDetails'
import IncidentForm from './pages/IncidentForm'
import Checklists from './pages/Checklists'
import ChecklistForm from './pages/ChecklistForm'
import ChecklistCompletion from './pages/ChecklistCompletion'
import ChecklistHistory from './pages/ChecklistHistory'
import ChecklistHistoryView from './pages/ChecklistHistoryView'
import ChecklistHistoryEdit from './pages/ChecklistHistoryEdit'
import AdminPanel from './pages/AdminPanel'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import SafetyTopics from './pages/SafetyTopics'
import CorrectiveActions from './pages/CorrectiveActions'
import BulkImport from './pages/BulkImport'
import People from './pages/People'
import PersonDetail from './pages/PersonDetail'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return <div className="spinner"></div>
  }

  if (!session) {
    return <Login />
  }

  return (
    <BrowserRouter>
      <Layout session={session}>
        <Routes>
          <Route path="/" element={<MainMenu />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/meetings" element={<Meetings />} />
          <Route path="/meetings/new" element={<MeetingForm />} />
          <Route path="/meetings/:id" element={<MeetingDetails />} />
          <Route path="/meetings/:id/edit" element={<MeetingForm />} />
          <Route path="/safety-topics" element={<SafetyTopics />} />
          <Route path="/corrective-actions" element={<CorrectiveActions />} />
          <Route path="/incidents" element={<Incidents />} />
          <Route path="/incidents/new" element={<IncidentForm />} />
          <Route path="/incidents/:id" element={<IncidentDetails />} />
          <Route path="/incidents/:id/edit" element={<IncidentForm />} />
          <Route path="/checklists" element={<Checklists />} />
          <Route path="/checklists/new" element={<ChecklistForm />} />
          <Route path="/checklists/:id" element={<ChecklistForm />} />
          <Route path="/checklists/:id/complete" element={<ChecklistCompletion />} />
          <Route path="/checklist-history" element={<ChecklistHistory />} />
          <Route path="/checklist-history/:id" element={<ChecklistHistoryView />} />
          <Route path="/checklist-history/:id/edit" element={<ChecklistHistoryEdit />} />
          <Route path="/people" element={<People />} />
          <Route path="/people/:type/:id" element={<PersonDetail />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/bulk-import" element={<BulkImport />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
