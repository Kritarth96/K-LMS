import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, Navigate } from 'react-router-dom';
import ShinyText from './ShinyText';

const API_URL = ''; // Relative path because of proxy

export default function Dashboard() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCourses: 0,
    lessonsCompleted: 0,
    averageProgress: 0
  });
  
  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/users/${user.id}/dashboard`);
      const data = res.data;
      setCourses(data);
      
      // Calculate Stats
      const totalCourses = data.length;
      const lessonsCompleted = data.reduce((acc, curr) => acc + curr.completedLessons, 0);
      const totalProgress = data.reduce((acc, curr) => acc + curr.progress, 0);
      const averageProgress = totalCourses > 0 ? Math.round(totalProgress / totalCourses) : 0;
      
      setStats({ totalCourses, lessonsCompleted, averageProgress });
    } catch (err) {
      console.error("Error fetching dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className="p-10 text-center dark:text-white">Please log in to view dashboard.</div>;
  
  // Admins should not see user dashboard
  if (user.role === 'admin') return <Navigate to="/admin" replace />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col font-sans transition-colors duration-300">
      {/* Navbar (Simplified) */}
      <nav className="bg-white dark:bg-gray-900 border-b dark:border-gray-800 sticky top-0 z-50 px-6 py-4 flex justify-between items-center shadow-sm">
         <div className="flex items-center gap-2">
            <Link to="/" className="text-2xl no-underline">🏠</Link>
            <h1 className="font-bold text-gray-800 dark:text-white text-xl">My Dashboard</h1>
         </div>
         <div className="flex items-center gap-4">
             <Link to="/" className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400">Back to Home</Link>
             <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-xs shadow-inner">
                 {user.name.charAt(0)}
             </div>
         </div>
      </nav>

      <div className="max-w-7xl mx-auto w-full p-6 md:p-10 flex-1">
        
        {/* Welcome Section */}
        <div className="mb-10">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Welcome back, {user.name}! 👋</h2>
            <ShinyText text="Keep pushing your limits. You're doing great!" className="text-indigo-600 dark:text-indigo-400 text-sm font-medium" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 transition-colors">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl text-2xl">📚</div>
                <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalCourses}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Courses Enrolled</p>
                </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 transition-colors">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl text-2xl">✅</div>
                <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stats.lessonsCompleted}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Lessons Completed</p>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 transition-colors">
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl text-2xl">🔥</div>
                <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stats.averageProgress}%</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Avg. Completion</p>
                </div>
            </div>
        </div>

        {/* Content Area */}
        <div className="mb-6 flex justify-between items-end">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">My Learning Path</h3>
        </div>

        {loading ? (
            <div className="grid md:grid-cols-2 gap-6">
                {[1,2].map(i => <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>)}
            </div>
        ) : courses.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                <p className="text-gray-400 dark:text-gray-500 text-lg mb-6">You haven't enrolled in any courses yet.</p>
                <Link to="/" className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition">
                    Browse Courses
                </Link>
            </div>
        ) : (
            <div className="flex flex-col gap-4">
                {courses.map(course => (
                    <div key={course.id} className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all flex flex-col md:flex-row gap-6 group">
                         {/* Image */}
                         <div className="w-full md:w-48 h-32 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-900 relative items-center justify-center flex flex-shrink-0">
                            {course.image_url ? (
                                <img src={course.image_url} alt={course.title} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-2xl">🎓</span>
                            )}
                         </div>

                         {/* Info & Progress */}
                         <div className="flex-1 flex flex-col justify-center py-2">
                             <div className="flex justify-between mb-2">
                                <h4 className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{course.title}</h4>
                                <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{course.progress}%</span>
                             </div>
                             
                             {/* Progress Bar */}
                             <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 mb-4 overflow-hidden">
                                <div 
                                    className={`h-full rounded-full ${course.progress === 100 ? 'bg-green-500' : 'bg-indigo-600 dark:bg-indigo-500'}`} 
                                    style={{ width: `${course.progress}%`, transition: 'width 1s ease-in-out' }}
                                ></div>
                             </div>
                             
                             <div className="flex justify-between items-center">
                                 <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                                    {course.completedLessons}/{course.totalLessons} Lessons
                                 </span>
                                 
                                 {course.progress === 100 ? (
                                     <span className="px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-bold rounded-full border border-green-200 dark:border-green-800">
                                        🏆 Course Completed!
                                     </span>
                                 ) : (
                                     <Link 
                                        to={`/course/${course.id}`} 
                                        className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                                     >
                                        Resume Learning →
                                     </Link>
                                 )}
                             </div>
                         </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}
