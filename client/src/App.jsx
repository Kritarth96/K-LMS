import { Routes, Route } from 'react-router-dom';
import Home from './Home';
import CoursePlayer from './CoursePlayer';
import Admin from './Admin';
import Register from './Register'; // IMPORT
import Login from './Login';       // IMPORT

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/course/:id" element={<CoursePlayer />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/register" element={<Register />} />  {/* NEW */}
      <Route path="/login" element={<Login />} />        {/* NEW */}
    </Routes>
  );
}

export default App;