import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, Navigate } from 'react-router-dom';
import ShinyText from './ShinyText';
import Navbar from './Navbar';

const API_URL = ''; // Relative path because of proxy

export default function Dashboard() {
  const [courses, setCourses] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
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
      const [dashboardRes, coursesRes] = await Promise.all([
        axios.get(`${API_URL}/api/users/${user.id}/dashboard`),
        axios.get(`${API_URL}/api/courses`)
      ]);

      const data = dashboardRes.data;
      setCourses(data);
      
      // Calculate Stats
      const totalCourses = data.length;
      const lessonsCompleted = data.reduce((acc, curr) => acc + curr.completedLessons, 0);
      const totalProgress = data.reduce((acc, curr) => acc + curr.progress, 0);
      const averageProgress = totalCourses > 0 ? Math.round(totalProgress / totalCourses) : 0;
      
      setStats({ totalCourses, lessonsCompleted, averageProgress });

      // Recommendations Logic: Show up to 3 courses not yet enrolled in
      const enrolledIds = new Set(data.map(c => c.id));
      const notEnrolled = coursesRes.data.filter(c => !enrolledIds.has(c.id));
      setRecommendations(notEnrolled.slice(0, 3));

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
      <Navbar />

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

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between transition-colors relative overflow-hidden">
                <div>
                     <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider mb-1">Avg. Completion</p>
                     <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stats.averageProgress}%</h3>
                </div>
                {/* Visual Progress Ring */}
                <div className="relative w-16 h-16">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <path className="text-gray-100 dark:text-gray-700" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentcolor" strokeWidth="4" />
                        <path className="text-indigo-600 dark:text-indigo-500 transition-all duration-1000 ease-out" strokeDasharray={`${stats.averageProgress}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentcolor" strokeWidth="4" strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                        {stats.averageProgress}%
                    </div>
                </div>
            </div>
        </div>

        {/* Content Area - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Active Courses */}
            <div className="lg:col-span-2">
                <div className="mb-6 flex justify-between items-end">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">Active Courses</h3>
                </div>

                {loading ? (
                    <div className="flex flex-col gap-6">
                        {[1,2].map(i => <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>)}
                    </div>
                ) : courses.length === 0 ? (
                    <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                        <div className="text-6xl mb-4">🚀</div>
                        <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Start Your Journey!</h4>
                        <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">You haven't enrolled in any courses yet. Browse our catalog to find your next skill.</p>
                        <Link to="/" className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition shadow-lg hover:shadow-indigo-500/30">
                            Browse Courses
                        </Link>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {courses.map(course => (
                            <div key={course.id} className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all flex flex-col sm:flex-row gap-6 group">
                                {/* Image */}
                                <div className="w-full sm:w-40 h-24 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-900 relative items-center justify-center flex flex-shrink-0">
                                    {course.image_url ? (
                                        <img src={course.image_url} alt={course.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-2xl">🎓</span>
                                    )}
                                </div>

                                {/* Info & Progress */}
                                <div className="flex-1 flex flex-col justify-center py-1">
                                    <div className="flex justify-between mb-2">
                                        <h4 className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">{course.title}</h4>
                                        <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{course.progress}%</span>
                                    </div>
                                    
                                    {/* Progress Bar */}
                                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 mb-3 overflow-hidden">
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
                                            <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-bold rounded-full border border-green-200 dark:border-green-800">
                                                Completed
                                            </span>
                                        ) : (
                                            <Link 
                                                to={`/course/${course.id}`} 
                                                className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                                            >
                                                Resume →
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Right Column: Daily Goal / Recommendations */}
            <div className="flex flex-col gap-6">
                {/* Daily Goal Widget */}
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                    <h3 className="text-lg font-bold mb-2 relative z-10">🎯 Daily Goal</h3>
                    <p className="text-indigo-100 text-sm mb-4 relative z-10">Complete 1 lesson today to keep your streak alive!</p>
                    
                    <div className="flex items-center gap-3 mb-2 relative z-10">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold">0/1</div>
                        <div className="h-2 flex-1 bg-black/20 rounded-full overflow-hidden">
                            <div className="h-full bg-white w-[10%] rounded-full"></div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions / New Courses */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                     <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Recommended for You</h3>
                     {recommendations.length > 0 ? (
                         <div className="space-y-4">
                            {recommendations.map(rec => (
                                <Link to={`/course/${rec.id}`} key={rec.id} className="flex gap-3 items-center group cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 rounded-lg transition-colors -mx-2">
                                    <div className="w-12 h-12 rounded-lg bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center text-xl overflow-hidden shrink-0">
                                        {rec.image_url ? (
                                            <img src={rec.image_url} alt={rec.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <span>💡</span>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="font-bold text-gray-800 dark:text-gray-200 text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">{rec.title}</h4>
                                        <span className="text-xs text-gray-500 font-medium">{rec.level || 'General'} • {rec.category || 'All'}</span>
                                    </div>
                                </Link>
                            ))}
                         </div>
                     ) : (
                        <p className="text-gray-500 text-sm text-center py-4">You're enrolled in all available courses!</p>
                     )}
                     <Link to="/" className="mt-4 block text-center text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline">View All Recommendations</Link>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}
