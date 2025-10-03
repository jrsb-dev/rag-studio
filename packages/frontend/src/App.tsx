import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import ProjectsPage from './pages/ProjectsPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import DocumentsPage from './pages/DocumentsPage'
import ConfigsPage from './pages/ConfigsPage'
import QueriesPage from './pages/QueriesPage'
import ExperimentsPage from './pages/ExperimentsPage'
import ExperimentResultsPage from './pages/ExperimentResultsPage'
import SettingsPage from './pages/SettingsPage'
import { Toaster } from './components/ui/toaster'

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
          <Route path="/projects/:projectId/documents" element={<DocumentsPage />} />
          <Route path="/projects/:projectId/configs" element={<ConfigsPage />} />
          <Route path="/projects/:projectId/queries" element={<QueriesPage />} />
          <Route path="/projects/:projectId/experiments" element={<ExperimentsPage />} />
          <Route path="/experiments/:experimentId/results" element={<ExperimentResultsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Layout>
      <Toaster />
    </BrowserRouter>
  )
}

export default App
