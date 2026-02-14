import { Link, useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import { useToast } from './ToastContext';

export default function Navbar() {
  const user = JSON.parse(localStorage.getItem('user'));
  const navigate = useNavigate();
  const { addToast } = useToast();

  const handleLogout = () => {
    localStorage.removeItem('user');
    addToast('Logged out successfully', 'success', 1500);
    setTimeout(() => {
      navigate('/login');
    }, 500);
  };

  return (
    <nav className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-sm border-b dark:border-gray-700 sticky top-0 z-50 transition-colors duration-300">
      <div className="container mx-auto px-6 h-16 flex justify-between items-center">
        {/* Left Side: Logo */}
        <Link to="/" className="flex items-center gap-2 no-underline group">
          <span className="text-2xl group-hover:-translate-y-1 transition-transform duration-300">🚀</span>
          <h1 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">K-LMS</h1>
        </Link>
        
        {/* Right Side: Actions */}
        <div className="flex items-center gap-6">
          <ThemeToggle />
          
          {user ? (
            <>
              {/* User Info Badge */}
              <div className="hidden md:flex items-center gap-3 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-800/50">
                  <div className="flex flex-col items-end">
                      <span className="text-[10px] text-gray-400 dark:text-gray-400 font-bold uppercase tracking-wider leading-none mb-0.5">User</span>
                      <span className="text-sm font-bold text-indigo-900 dark:text-indigo-100 leading-none">{user.name}</span>
                  </div>
                  <div className="h-8 w-8 bg-indigo-600 text-white rounded-md flex items-center justify-center font-bold text-sm shadow-sm">
                      {user.name.charAt(0)}
                  </div>
              </div>

              {/* Navigation Links based on Role */}
              <Link to="/" className="hidden sm:inline-block px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded text-xs font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                  Home
              </Link>

              {user.role === 'admin' && (
                <Link to="/admin" className="hidden sm:inline-block px-3 py-1 bg-indigo-100 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-200 rounded text-xs font-bold hover:bg-indigo-200 dark:hover:bg-indigo-700 transition">
                  Admin Console
                </Link>
              )}

              {user.role !== 'admin' && (
                <Link to="/dashboard" className="hidden sm:inline-block px-3 py-1 bg-green-50 dark:bg-green-900 text-green-600 dark:text-green-200 rounded text-xs font-bold hover:bg-green-100 dark:hover:bg-green-800 transition">
                    Dashboard
                </Link>
              )}
              
              <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-2 hidden sm:block"></div>

              <button 
                onClick={handleLogout} 
                className="text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition flex items-center gap-1"
                aria-label="Logout"
              >
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
  );
}
