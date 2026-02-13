import { useRef, useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import ChromaGrid from './ChromaGrid';
import SkeletonCard from './SkeletonCard';
import SplitText from './SplitText';
import ShinyText from './ShinyText';
import SpotlightCard from './SpotlightCard'; // Import SpotlightCard
import MeteorBackground from './MeteorBackground'; // Import MeteorBackground
import { useToast } from './ToastContext';
import ThemeToggle from './ThemeToggle';

const API_URL = '';

export default function Home() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All'); // Category State
  const [viewMode, setViewMode] = useState('grid'); // View Mode State (grid/list)
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const debounceTimer = useRef(null);
  const user = JSON.parse(localStorage.getItem('user'));
  const navigate = useNavigate();
  const { addToast } = useToast();

  // Debounce search input (reduce re-renders)
  useEffect(() => {
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(debounceTimer.current);
  }, [searchTerm]);

  // Fetch courses on component mount
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await axios.get(`${API_URL}/api/courses`);
        setCourses(res.data);
      } catch (err) {
        const errorMessage = err.response?.data?.message || 'Failed to load courses. Please try again.';
        setError(errorMessage);
        addToast(errorMessage, 'error');
        console.error('Courses fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [addToast]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    addToast('Logged out successfully', 'success', 1500);
    setTimeout(() => {
      navigate('/login');
    }, 500);
  };
  // Filter Logic (using debounced search term & category)
  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                          course.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || course.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 flex flex-col">
      
      {/* Navbar with Glassmorphism */}
      <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-sm border-b dark:border-gray-700 sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🚀</span>
            <h1 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">K-LMS</h1>
          </div>
          
          <div className="flex items-center gap-6">
            <ThemeToggle />
            {user ? (
              <>
                <div className="hidden md:flex flex-col items-end">
                    <span className="text-xs text-gray-400 dark:text-gray-400 font-semibold uppercase tracking-wider">User</span>
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{user.name}</span>
                </div>
                
                {user.role === 'admin' && (
                  <Link to="/admin" className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-200 rounded text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-800 transition" aria-label="Go to admin panel">
                    Admin
                  </Link>
                )}

                {user.role !== 'admin' && (
                  <Link to="/dashboard" className="px-3 py-1 bg-green-50 dark:bg-green-900 text-green-600 dark:text-green-200 rounded text-xs font-bold hover:bg-green-100 dark:hover:bg-green-800 transition">
                      Dashboard
                  </Link>
                )}
                
                <button onClick={handleLogout} className="text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition" aria-label="Logout">
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

        {/* Meteor Background */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          {/* Meteor effect needs to be absolute positioned within the hero container */}
          <MeteorBackground count={15} />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight leading-tight">
            <SplitText text="Master Your Craft." delay={40} />
          </h2>

          <div className="mb-8 max-w-2xl mx-auto leading-relaxed">
             <ShinyText 
                text="Unlock access to premium courses, track your progress, and level up your career with our interactive platform." 
                className="text-lg md:text-xl"
             />
          </div>
          
          {/* Search Bar */}
          <div className="max-w-md mx-auto relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
            <input 
                type="text" 
                placeholder="Search for courses (e.g., Python, Design)..."
                aria-label="Search courses"
                className="w-full pl-12 pr-4 py-4 rounded-full text-gray-800 dark:text-white bg-white dark:bg-gray-800 shadow-2xl focus:outline-none focus:ring-4 focus:ring-indigo-300/50 transition"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                role="searchbox"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            {['All', 'Development', 'Design', 'Business'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-all transform hover:-translate-y-0.5 ${
                  selectedCategory === cat 
                    ? 'bg-white text-indigo-600 shadow-lg' 
                    : 'bg-indigo-700/50 text-indigo-100 hover:bg-indigo-700 border border-indigo-500/30'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Course Grid Area */}
      <main className="container mx-auto px-6 py-16 flex-1">
        <div className="flex justify-between items-end mb-8">
            <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Explore Courses</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-1" role="status" aria-live="polite">
                    {loading ? "Loading library..." : error ? "Error loading courses" : `Showing ${filteredCourses.length} results`}
                </p>
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                <button 
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-300 hover:text-gray-600 dark:hover:text-white'}`}
                    aria-label="Grid View"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                </button>
                <button 
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-300 hover:text-gray-600 dark:hover:text-white'}`}
                    aria-label="List View"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
            </div>
        </div>
        
        {error && !loading && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center mb-8">
            <p className="text-red-800 dark:text-red-200 font-medium">⚠️ {error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition"
            >
              Try Again
            </button>
          </div>
        )}

        {loading ? (
            // SHOW SKELETONS WHILE LOADING
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1,2,3,4,5,6].map(n => <SkeletonCard key={n} />)}
            </div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
            <p className="text-gray-400 dark:text-gray-500 text-lg mb-4">📚 No courses match your search.</p>
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded px-2 py-1"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : viewMode === 'list' ? (
          // --- LIST VIEW ---
          <div className="flex flex-col gap-4">
             {filteredCourses.map((course) => (
               <div key={course.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow group">
                  {/* Thumbnail */}
                  <div className="w-full md:w-48 h-32 md:h-auto rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-700 relative">
                     {course.image_url ? (
                        <img 
                            src={course.image_url} 
                            alt={course.title} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl bg-indigo-50 dark:bg-indigo-900/50 text-indigo-200 dark:text-indigo-400">
                            🎓
                        </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 flex flex-col justify-center">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                             <span className="text-xs font-bold px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded-full uppercase tracking-wide mb-2 inline-block">
                                {course.category || 'General'}
                            </span>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{course.title}</h3>
                        </div>
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 line-clamp-2">{course.description}</p>
                  </div>

                  {/* Action */}
                  <div className="flex items-center">
                    <Link 
                        to={user ? `/course/${course.id}` : '/login'}
                        className="w-full md:w-auto px-6 py-3 bg-gray-900 dark:bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-600 dark:hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/0 hover:shadow-indigo-500/20 whitespace-nowrap"
                    >
                        {user ? 'Start Learning' : 'Login to Enroll'}
                    </Link>
                  </div>
               </div>
             ))}
          </div>
        ) : (
          // --- GRID VIEW (Spotlight Card) ---
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCourses.map((course) => (
              <SpotlightCard key={course.id} className="h-full flex flex-col bg-white dark:bg-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 border-gray-100 dark:border-slate-700" spotColor="rgba(79, 70, 229, 0.15)">
                <div className="relative h-48 overflow-hidden bg-gray-100 dark:bg-gray-900 group">
                    {course.image_url ? (
                        <img 
                            src={course.image_url} 
                            alt={course.title} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl bg-indigo-50 dark:bg-indigo-900/50 text-indigo-200 dark:text-indigo-400">
                            🎓
                        </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                </div>
                
                <div className="p-6 flex flex-col flex-1 relative z-20 bg-white dark:bg-slate-800">
                    <div className="mb-4">
                        <span className="text-xs font-bold px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded-full uppercase tracking-wide">
                            {course.category || 'General'}
                        </span>
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {course.title}
                    </h3>
                    
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 line-clamp-3 flex-1">
                        {course.description}
                    </p>
                    
                    <Link 
                        to={user ? `/course/${course.id}` : '/login'}
                        className="w-full block text-center bg-gray-900 dark:bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-600 dark:hover:bg-indigo-500 transition-colors transform active:scale-95 shadow-lg shadow-indigo-500/0 hover:shadow-indigo-500/20"
                    >
                        {user ? 'Start Learning' : 'Login to Enroll'}
                    </Link>
                </div>
              </SpotlightCard>
            ))}
          </div>
        )}
      </main>

      {/* Simple Footer */}
      <footer className="bg-white dark:bg-gray-900 border-t dark:border-gray-800 py-8 text-center text-gray-400 dark:text-gray-600 text-sm">
        <p>&copy; {new Date().getFullYear()} Kritarth Upadhyay. All rights reserved.</p>
      </footer>
    </div>
  );
}