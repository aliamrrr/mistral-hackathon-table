import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Library from './pages/Library';
import Players from './pages/Players';

function App() {
  return (
    <Router>
      <div className="flex w-full h-full bg-background-dark text-slate-100 overflow-hidden">
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/library" element={<Library />} />
          <Route path="/players" element={<Players />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
