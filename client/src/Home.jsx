import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import ChromaGrid from './ChromaGrid';
import SkeletonCard from './SkeletonCard'; // Import the skeleton

export default function Home() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true); // Loading state
  const [searchTerm, setSearchTerm] = useState(''); // Search state
  const user = JSON.parse(localStorage.getItem('user'));
  const navigate = useNavigate();

  useEffect(() => {
    // Simulate a slight delay so you can see the skeleton effect (remove setTimeout in production)
    setTimeout(() => {
      axios.get('http://localhost:5000/api/courses')
        .then(res => {
          setCourses(res.data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }, 800);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Filter Logic
  const filteredCourses = courses.filter(course => 
    course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Transform for ChromaGrid
  const gridItems = filteredCourses.map(course => ({
    title: course.title,
    subtitle: course.description,
    image: course.image_url || null,
    handle: "Start Learning →",
    url: user ? `/course/${course.id}` : '/login',
    borderColor: '#4F46E5',
    gradient: 'linear-gradient(135deg, #4F46E5 0%, #000 100%)'
  }));

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      
      {/* Navbar with Glassmorphism */}
      <nav className="bg-white/80 backdrop-blur-md shadow-sm border-b sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🚀</span>
            <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">SoCTeamUp</h1>
          </div>
          
          <div className="flex items-center gap-6">
            {user ? (
              <>
                <div className="hidden md:flex flex-col items-end">
                    <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">User</span>
                    <span className="text-sm font-bold text-gray-800">{user.name}</span>
                </div>
                
                {user.role === 'admin' && (
                  <Link to="/admin" className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded text-xs font-bold hover:bg-indigo-100 transition">
                    Admin
                  </Link>
                )}
                
                <button onClick={handleLogout} className="text-sm font-semibold text-gray-500 hover:text-red-600 transition">
                  Logout
                </button>
              </>
            ) : (
              <Link to="/login" className="px-5 py-2 bg-indigo-600 text-white text-sm font-bold rounded-full shadow-lg hover:bg-indigo-700 hover:shadow-indigo-500/30 transition transform hover:-translate-y-0.5">
                Login
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Animated Hero Section */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 animate-gradient text-white py-24 px-6 text-center relative overflow-hidden">
        {/* Decorative Circles */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-400 opacity-10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3"></div>

        <div className="relative z-10 max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight leading-tight">
            Master Your Craft.
          </h2>
          <p className="text-indigo-100 text-lg md:text-xl mb-8 max-w-2xl mx-auto leading-relaxed">
            Unlock access to premium courses, track your progress, and level up your career with our interactive platform.
          </p>
          
          {/* Search Bar */}
          <div className="max-w-md mx-auto relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
            <input 
                type="text" 
                placeholder="Search for courses (e.g., Python, Design)..." 
                className="w-full pl-12 pr-4 py-4 rounded-full text-gray-800 shadow-2xl focus:outline-none focus:ring-4 focus:ring-indigo-300/50 transition"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Course Grid Area */}
      <main className="container mx-auto px-6 py-16 flex-1">
        <div className="flex justify-between items-end mb-8">
            <div>
                <h3 className="text-2xl font-bold text-gray-900">Explore Courses</h3>
                <p className="text-gray-500 mt-1">
                    {loading ? "Loading library..." : `Showing ${filteredCourses.length} results`}
                </p>
            </div>
        </div>
        
        {loading ? (
            // SHOW SKELETONS WHILE LOADING
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1,2,3,4,5,6].map(n => <SkeletonCard key={n} />)}
            </div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
            <p className="text-gray-400 text-lg">No courses match your search.</p>
            <button onClick={() => setSearchTerm('')} className="mt-4 text-indigo-600 font-bold hover:underline">Clear Search</button>
          </div>
        ) : (
          // SHOW CHROMA GRID
          <ChromaGrid 
            items={gridItems} 
            columns={3} 
            radius={300} 
          />
        )}
      </main>

      {/* Simple Footer */}
      <footer className="bg-white border-t py-8 text-center text-gray-400 text-sm">
        <p>&copy; {new Date().getFullYear()} SkillUp LMS. All rights reserved.</p>
      </footer>
    </div>
  );
}