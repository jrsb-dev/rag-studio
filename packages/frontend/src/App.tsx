import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ProjectLayout from './layouts/ProjectLayout'
import HomePage from './pages/HomePage'
import ProjectsPage from './pages/ProjectsPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import DocumentsPage from './pages/DocumentsPage'
import ConfigsPage from './pages/ConfigsPage'
import QueriesPage from './pages/QueriesPage'
import ExperimentsPage from './pages/ExperimentsPage'
import ExperimentsListPage from './pages/ExperimentsListPage'
import ExperimentResultsPage from './pages/ExperimentResultsPage'
import QueryTimeExperimenterPage from './pages/QueryTimeExperimenterPage'
import SettingsPage from './pages/SettingsPage'
import { Toaster } from './components/ui/toaster'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Routes without sidebar */}
        <Route path="/" element={<Layout><HomePage /></Layout>} />
        <Route path="/projects" element={<Layout><ProjectsPage /></Layout>} />
        <Route path="/settings" element={<Layout><SettingsPage /></Layout>} />

        {/* Project routes with sidebar */}
        <Route path="/projects/:projectId" element={<Layout><ProjectLayout><ProjectDetailPage /></ProjectLayout></Layout>} />
        <Route path="/projects/:projectId/documents" element={<Layout><ProjectLayout><DocumentsPage /></ProjectLayout></Layout>} />
        <Route path="/projects/:projectId/configs" element={<Layout><ProjectLayout><ConfigsPage /></ProjectLayout></Layout>} />
        <Route path="/projects/:projectId/configs/:configId/experiment" element={<Layout><ProjectLayout><QueryTimeExperimenterPage /></ProjectLayout></Layout>} />
        <Route path="/projects/:projectId/queries" element={<Layout><ProjectLayout><QueriesPage /></ProjectLayout></Layout>} />
        <Route path="/projects/:projectId/experiments" element={<Layout><ProjectLayout><ExperimentsPage /></ProjectLayout></Layout>} />
        <Route path="/projects/:projectId/experiments/list" element={<Layout><ProjectLayout><ExperimentsListPage /></ProjectLayout></Layout>} />
        <Route path="/projects/:projectId/experiments/:experimentId" element={<Layout><ProjectLayout><ExperimentResultsPage /></ProjectLayout></Layout>} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  )
}

export default App
