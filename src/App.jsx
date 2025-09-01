import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage.jsx';
import VideosPage from './pages/VideosPage.jsx';

function Placeholder({ title }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <h1 style={{ margin: 0 }}>{title}</h1>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/blogs" element={<Placeholder title="Blogs" />} />
      <Route path="/videos" element={<VideosPage />} />
    </Routes>
  );
}
