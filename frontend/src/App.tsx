import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import StudentView from './pages/StudentView';
import RecruiterView from './pages/RecruiterView';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/student" replace />} />
        <Route path="/student" element={<StudentView />} />
        <Route path="/recruiter" element={<RecruiterView />} />
      </Routes>
    </Router>
  );
}

export default App;