import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AdminDashboard } from './pages/AdminDashboard'
import { ElectionDetail } from './pages/ElectionDetail'
import { PositionDetail } from './pages/PositionDetail'
import { ElectionResults } from './pages/ElectionResults'
import { AdminLogin } from './pages/AdminLogin'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/elections/:electionId" element={<ElectionDetail />} />
          <Route path="/admin/elections/:electionId/positions/:positionId" element={<PositionDetail />} />
          <Route path="/admin/results/:electionId" element={<ElectionResults />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App

