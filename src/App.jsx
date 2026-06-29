import { HashRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './pages/Home.jsx';
import MomentsGenerator from './pages/MomentsGenerator.jsx';
import './styles/main.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/moments" element={<MomentsGenerator />} />
      </Routes>
    </Router>
  );
}

export default App;
