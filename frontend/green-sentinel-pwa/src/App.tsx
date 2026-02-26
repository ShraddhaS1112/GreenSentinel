import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { ThreatHistory } from './pages/ThreatHistory';
import { CropHealth } from './pages/CropHealth';
import { FarmManagement } from './pages/FarmManagement';
import { Settings } from './pages/Settings';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/threats" element={<ThreatHistory />} />
          <Route path="/health" element={<CropHealth />} />
          <Route path="/farms" element={<FarmManagement />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
