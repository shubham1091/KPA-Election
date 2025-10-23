import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { VoterBallot } from './pages/VoterBallot'
import { ElectionResults } from './pages/ElectionResults'
import { VoterLanding } from './pages/VoterLanding'
import { VoterTokenEntry } from './pages/VoterTokenEntry'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<VoterLanding />} />
          <Route path="/vote/:electionId" element={<VoterTokenEntry />} />
          <Route path="/ballot/:electionId/:token" element={<VoterBallot />} />
          <Route path="/direct/:electionId/:token" element={<VoterBallot />} />
          <Route path="/results/:electionId" element={<ElectionResults />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App