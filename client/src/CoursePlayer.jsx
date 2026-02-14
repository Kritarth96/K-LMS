import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useToast } from './ToastContext';
import Navbar from './Navbar';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure the worker for Vite
// Using the CDN is the most reliable way to ensure the worker is loaded correctly in Vite
// without complex build configurations.
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const API_URL = '';

const PdfViewer = ({ file }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [fitMode, setFitMode] = useState('custom'); // 'custom', 'width', 'page'
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Update container size on resize
  useEffect(() => {
    const updateSize = () => {
        if (containerRef.current) {
            setContainerSize({
                width: containerRef.current.clientWidth,
                height: containerRef.current.clientHeight
            });
        }
    };
    
    updateSize(); // Initial
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Called when the PDF is successfully loaded
  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
    setLoading(false);
  }

  // Zoom Handlers
  const handleZoomIn = () => {
    setFitMode('custom');
    setScale(prev => Math.min(prev + 0.25, 3.0));
  };
  
  const handleZoomOut = () => {
    setFitMode('custom');
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };
  
  const handleFitWidth = () => setFitMode('width');
  const handleFitPage = () => setFitMode('page');

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm bg-gray-50 dark:bg-gray-900 h-[80vh] flex flex-col">
      {/* Header / Controls */}
      <div className="bg-white dark:bg-gray-800 px-4 py-3 border-b dark:border-gray-700 flex justify-between items-center z-10 shadow-sm relative w-full flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">📄</span>
          <span className="font-bold text-gray-700 dark:text-gray-200 text-sm truncate max-w-[150px] sm:max-w-[200px]">
             {file.original_name}
          </span>
        </div>

        <div className="flex gap-2 items-center flex-wrap">
            {/* Pagination Controls */}
            {numPages && (
              <div className="flex items-center text-sm mr-2 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button 
                  disabled={pageNumber <= 1}
                  onClick={() => setPageNumber(prev => prev - 1)}
                  className="px-2 hover:text-indigo-600 disabled:opacity-30"
                >
                   ◀
                </button>
                <span className="mx-2 text-xs font-mono">
                   {pageNumber}/{numPages}
                </span>
                <button 
                  disabled={pageNumber >= numPages}
                  onClick={() => setPageNumber(prev => prev + 1)}
                  className="px-2 hover:text-indigo-600 disabled:opacity-30"
                >
                   ▶
                </button>
              </div>
            )}

            {/* Fit Options */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1 gap-1">
                 <button 
                    onClick={handleFitWidth} 
                    className={`px-2 py-1 text-xs font-bold rounded ${fitMode === 'width' ? 'bg-white dark:bg-gray-600 text-indigo-600 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                    title="Fit to Width"
                 >
                    ↔ Width
                 </button>
                 <button 
                    onClick={handleFitPage} 
                    className={`px-2 py-1 text-xs font-bold rounded ${fitMode === 'page' ? 'bg-white dark:bg-gray-600 text-indigo-600 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                    title="Fit to Page"
                 >
                    ↕ Page
                 </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg">
                <button onClick={handleZoomOut} className="px-3 py-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-l-lg text-gray-600 dark:text-gray-300 font-bold" title="Zoom Out">－</button>
                <span className="text-xs px-2 text-gray-500 dark:text-gray-400 font-mono w-12 text-center">
                    {fitMode === 'custom' ? `${Math.round(scale * 100)}%` : 'Auto'}
                </span>
                <button onClick={handleZoomIn} className="px-3 py-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-r-lg text-gray-600 dark:text-gray-300 font-bold" title="Zoom In">＋</button>
            </div>
            
            <a href={file.file_path} download className="text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition" title="Download">
                 ⬇
            </a>
        </div>
      </div>

      {/* PDF Content Area */}
      <div ref={containerRef} className="flex-1 overflow-auto bg-gray-200 dark:bg-gray-900 flex justify-center p-4">
        <Document
          file={file.file_path}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={<div className="p-10 text-gray-500">Loading PDF...</div>}
          error={<div className="p-10 text-red-500">Failed to load PDF.</div>}
          className="shadow-lg"
        >
          {/* Page component renders the specific page with the current zoom scale */}
          <Page 
             pageNumber={pageNumber} 
             scale={fitMode === 'custom' ? scale : undefined}
             width={fitMode === 'width' ? containerSize.width - 40 : undefined} // Subtract padding
             height={fitMode === 'page' ? containerSize.height - 40 : undefined} // Subtract padding
             renderTextLayer={true}
             renderAnnotationLayer={true}
             className="bg-white"
          />
        </Document>
      </div>
    </div>
  );
};

export default function CoursePlayer() {
  const { id } = useParams();
  const [courseData, setCourseData] = useState(null);
  const [activeLessonIndex, setActiveLessonIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile sidebar toggle (default closed on mobile)
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true); // Desktop sidebar toggle
  const [completedLessons, setCompletedLessons] = useState([]); // Track completed lessons
  const [isEnrolled, setIsEnrolled] = useState(false); // Enrollment state
  const { addToast } = useToast();
  
  const user = JSON.parse(localStorage.getItem('user'));
  const scrollContainerRef = useRef(null); // Ref for scrollable content area

  useEffect(() => {
    const initCourse = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 1. Fetch Course Data
        const res = await axios.get(`${API_URL}/api/course/${id}`);
        setCourseData(res.data);
        
        // 2. Check Enrollment & Fetch Progress
        if (user) {
            // ADMIN OVERRIDE: Admins are always enrolled
            if (user.role === 'admin') {
                setIsEnrolled(true);
            }

            try {
                let enrolled = user.role === 'admin';

                // Check if enrolled (only for non-admins)
                if (!enrolled) {
                    const enrollRes = await axios.get(`${API_URL}/api/users/${user.id}/enrollment/${id}`);
                    enrolled = enrollRes.data.enrolled;
                    setIsEnrolled(enrolled);
                }

                // If enrolled (or admin), fetch progress
                if (enrolled) {
                    const progressRes = await axios.get(`${API_URL}/api/users/${user.id}/course/${id}/progress`);
                    setCompletedLessons(progressRes.data.completedLessonIds || []);
                }
            } catch (e) {
                console.error("Error checking enrollment:", e);
            }
        }

      } catch (err) {
        const errorMessage = err.response?.data?.message || 'Failed to load course. Please try again.';
        setError(errorMessage);
        addToast(errorMessage, 'error');
        console.error('Course fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    initCourse();
  }, [id, addToast, user?.id]); // Added user.id to dependency

  const handleEnroll = async () => {
    if (!user) {
        addToast('Please login to enroll', 'error');
        return;
    }
    
    try {
        await axios.post(`${API_URL}/api/enroll`, { userId: user.id, courseId: id });
        setIsEnrolled(true);
        addToast('Enrolled successfully! Let\'s start learning.', 'success');
        
        // Fetch progress (likely empty, but good practice)
        try {
            const progressRes = await axios.get(`${API_URL}/api/users/${user.id}/course/${id}/progress`);
            setCompletedLessons(progressRes.data.completedLessonIds || []);
        } catch (e) { console.error(e); }

    } catch (err) {
        addToast('Failed to enroll', 'error');
        console.error(err);
    }
  };

  const toggleLessonCompletion = async (lessonId) => {
    if (!user) return;
    
    const isCompleted = completedLessons.includes(lessonId);
    
    // Optimistic UI Update
    setCompletedLessons(prev => 
        isCompleted ? prev.filter(id => id !== lessonId) : [...prev, lessonId]
    );

    try {
        await axios.post(`${API_URL}/api/progress`, { 
            userId: user.id, 
            lessonId, 
            completed: !isCompleted 
        });
        if (!isCompleted) addToast('Lesson completed! 🎉', 'success', 1500);
    } catch (err) {
        // Revert on error
        setCompletedLessons(prev => 
            isCompleted ? [...prev, lessonId] : prev.filter(id => id !== lessonId)
        );
        addToast('Failed to update progress', 'error');
    }
  };

  // Auto-close sidebar on small screens when a lesson is selected
  useEffect(() => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, [activeLessonIndex]);

  // Scroll to top when lesson changes
  useEffect(() => {
    if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [activeLessonIndex]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Loading Class Materials...</p>
        </div>
      </div>
    );
  }

  if (error || !courseData) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Could Not Load Course</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error || 'Course not found.'}</p>
          <Link
            to="/"
            className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition"
          >
            Back to Courses
          </Link>
        </div>
      </div>
    );
  }

  const { course, lessons } = courseData;
  const currentLesson = lessons[activeLessonIndex];

  // Helper for text formatting
  const formatContent = (text) => text ? text.replace(/\n/g, '<br />') : '';

  // Icon Helper
  const getFileIcon = (type) => {
      switch(type) {
          case 'ppt': return '📊';
          case 'doc': return '📝';
          case 'image': return '🖼️';
          case 'pdf': return '📄';
          default: return '📂';
      }
  };

  // --- ENROLLMENT LANDING PAGE ---
  if (!isEnrolled) {
      return (
        <div className="min-h-screen bg-white dark:bg-gray-900 font-sans transition-colors duration-300">
            <Navbar />

            <div className="max-w-4xl mx-auto px-6 py-12">
                <div className="flex flex-col md:flex-row gap-12 items-start">
                    {/* Course Image */}
                    <div className="w-full md:w-1/2 aspect-video rounded-2xl overflow-hidden shadow-2xl bg-gray-100 dark:bg-gray-800">
                         {course.image_url ? (
                            <img src={course.image_url} alt={course.title} className="w-full h-full object-cover" />
                         ) : (
                            <div className="w-full h-full flex items-center justify-center text-6xl">🎓</div>
                         )}
                    </div>

                    {/* Course Details */}
                    <div className="flex-1 space-y-6">
                        <div>
                             <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                                {course.category || 'General'}
                             </span>
                             <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mt-4 mb-2 leading-tight">{course.title}</h1>
                        </div>
                        
                        <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
                            {course.description}
                        </p>

                        <div className="flex items-center gap-6 py-4 border-y border-gray-100 dark:border-gray-800">
                            <div className="flex flex-col">
                                <span className="text-2xl font-bold text-gray-900 dark:text-white">{lessons.length}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Lessons</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-2xl font-bold text-gray-900 dark:text-white">Self-Paced</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Format</span>
                            </div>
                             <div className="flex flex-col">
                                <span className="text-2xl font-bold text-gray-900 dark:text-white">Lifetime</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Access</span>
                            </div>
                        </div>

                        <button 
                            onClick={handleEnroll}
                            className="w-full bg-indigo-600 text-white text-lg font-bold py-4 rounded-xl shadow-xl shadow-indigo-500/30 hover:bg-indigo-700 hover:shadow-indigo-500/50 hover:-translate-y-1 transition-all transform"
                        >
                            Enroll Now
                        </button>
                        
                        <p className="text-xs text-center text-gray-400 dark:text-gray-500">
                            By enrolling, you agree to our Terms of Service and commit to completing the coursework.
                        </p>
                    </div>
                </div>

                {/* Course Syllabus Preview */}
                <div className="mt-16">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Course Syllabus</h3>
                    <div className="grid gap-4">
                        {lessons.length > 0 ? lessons.map((lesson, idx) => (
                            <div key={lesson.id} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700 flex items-center gap-4 opacity-70">
                                <span className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-400">{idx + 1}</span>
                                <span className="font-medium text-gray-700 dark:text-gray-300">{lesson.title}</span>
                                <span className="ml-auto text-xs text-gray-400">🔒 Locked</span>
                            </div>
                        )) : (
                            <p className="text-gray-500 italic">No lessons available yet.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden font-sans transition-colors duration-300">
      <Navbar />
      
      <div className="flex flex-1 overflow-hidden relative">
      
      {/* Sidebar Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* --- SIDEBAR --- */}
      <aside className={`md:relative z-20 h-full bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300 ease-in-out ${
        sidebarOpen ? 'absolute inset-y-0 left-0 w-80 shadow-2xl' : '-translate-x-full md:translate-x-0'
      } ${desktopSidebarOpen ? 'md:w-80' : 'md:w-0 md:opacity-0 md:overflow-hidden border-none'}`}>
        
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
           <h2 className="font-bold text-gray-800 dark:text-white truncate pr-2 max-w-[200px]" title={course.title}>{course.title}</h2>
           <div className="flex items-center gap-2">
             <Link to="/" className="text-xs font-bold text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-white transition">EXIT</Link>
             <button
               onClick={() => setSidebarOpen(false)}
               className="md:hidden text-gray-500 hover:text-gray-700"
               aria-label="Close sidebar"
             >
               ✕
             </button>
           </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {lessons.length === 0 ? (
            <div className="p-8 text-center">
                <p className="text-gray-400 mb-2">No lessons added yet.</p>
                <span className="text-2xl">📭</span>
            </div>
          ) : (
            <ul>
              {lessons.map((lesson, idx) => (
                <li key={lesson.id}>
                  <button 
                    onClick={() => {
                        setActiveLessonIndex(idx);
                        if (window.innerWidth < 768) setSidebarOpen(false);
                    }}
                    className={`w-full text-left p-4 border-b border-gray-100 dark:border-gray-800 hover:bg-white dark:hover:bg-gray-800 transition flex items-start gap-3 group relative ${
                        idx === activeLessonIndex 
                        ? 'bg-white dark:bg-gray-800 shadow-sm border-l-4 border-l-indigo-600 dark:border-l-indigo-500 z-10' 
                        : 'border-l-4 border-l-transparent bg-gray-50 dark:bg-gray-900/50'
                    }`}
                    aria-current={idx === activeLessonIndex ? 'page' : undefined}
                  >
                    <span className={`shrink-0 flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition shadow-sm ${
                        completedLessons.includes(lesson.id) 
                            ? 'bg-green-500 text-white' 
                            : idx === activeLessonIndex 
                                ? 'bg-indigo-600 text-white' 
                                : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-300 border border-gray-200 dark:border-gray-600'
                    }`}>
                      {completedLessons.includes(lesson.id) ? '✓' : idx + 1}
                    </span>
                    <div className="min-w-0">
                        <span className={`text-sm font-bold block truncate transition-colors ${idx === activeLessonIndex ? 'text-indigo-900 dark:text-white' : 'text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white'}`}>
                        {lesson.title}
                        </span>
                        {/* File count indicator */}
                        {lesson.files && lesson.files.length > 0 && (
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 block" aria-label={`${lesson.files.length} attachments`}>
                                📎 {lesson.files.length} attachment{lesson.files.length !== 1 ? 's' : ''}
                            </span>
                        )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-white dark:bg-gray-800 transition-colors">
        {/* Toolbar / Header */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between shrink-0 h-16">
           <div className="flex items-center gap-4">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold p-2 -ml-2 rounded-lg"
                aria-label="Open lessons menu"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>

              {/* Desktop Collapse Button (Theater Mode) */}
              <button
                onClick={() => setDesktopSidebarOpen(!desktopSidebarOpen)}
                className={`hidden md:flex items-center gap-2 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg transition-colors`}
                title={desktopSidebarOpen ? "Theater Mode (Collapse Sidebar)" : "Show Sidebar"}
              >
                {desktopSidebarOpen ? (
                    <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
                        <span>Theater Mode</span>
                    </>
                ) : (
                    <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                        <span>Expand</span>
                    </>
                )}
              </button>
           </div>

           <div className="flex items-center gap-4">
             {/* Progress Indicator */}
             <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Course Progress</span>
                <div className="w-32 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full mt-1 overflow-hidden">
                    <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${Math.round((completedLessons.length / lessons.length) * 100)}%` }}></div>
                </div>
             </div>
           </div>
        </div>

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 scroll-smooth">
          {currentLesson ? (
            <div className={`mx-auto transition-all duration-500 ${desktopSidebarOpen ? 'max-w-5xl' : 'max-w-6xl'}`}>
                
              {/* Header */}
              <div className="mb-8 pb-6 border-b border-gray-100 dark:border-gray-800">
                  <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-3 leading-tight tracking-tight">{currentLesson.title}</h1>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Lesson {activeLessonIndex + 1} of {lessons.length}</p>
              </div>
              
              {/* --- FILES DISPLAY --- */}
              <div className="space-y-10 mb-12">
                
                {/* 1. VIDEOS */}
                {currentLesson.files && currentLesson.files.filter(f => f.file_type === 'video').map(video => (
                    <div key={video.id} className="rounded-2xl overflow-hidden bg-black shadow-2xl ring-1 ring-gray-900/5 dark:ring-white/10 aspect-video relative group">
                        <video controls src={video.file_path} className="w-full h-full object-contain" title={video.original_name} />
                    </div>
                ))}

                {/* 2. PDFS (Improved Native-like Viewer) */}
                {currentLesson.files && currentLesson.files.filter(f => f.file_type === 'pdf').map(pdf => (
                    <PdfViewer key={pdf.id} file={pdf} />
                ))}

                {/* 3. IMAGES */}
                {currentLesson.files && currentLesson.files.filter(f => f.file_type === 'image').map(img => (
                    <div key={img.id} className="rounded-xl overflow-hidden shadow-lg border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                        <div className="bg-gray-50 dark:bg-gray-900 px-4 py-3 border-b dark:border-gray-700 flex justify-between items-center">
                            <span className="font-bold text-gray-700 dark:text-gray-200 text-sm">🖼️ {img.original_name}</span>
                            <a href={img.file_path} download className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-xs font-bold bg-white dark:bg-gray-800 border border-indigo-200 dark:border-gray-600 px-3 py-1 rounded-full hover:bg-indigo-50 dark:hover:bg-gray-700 transition">
                                Download
                            </a>
                        </div>
                        <img src={img.file_path} alt={img.original_name} className="w-full h-auto object-contain max-h-[600px] bg-gray-50 dark:bg-gray-900" />
                    </div>
                ))}

                {/* 4. DOWNLOADABLES (PPT, DOC etc) */}
                {currentLesson.files && currentLesson.files.filter(f => !['video', 'pdf', 'image'].includes(f.file_type)).length > 0 && (
                    <div className="bg-blue-50/50 dark:bg-blue-900/10 p-6 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                        <h3 className="text-sm font-bold text-blue-800 dark:text-blue-200 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <span>📥</span> Downloadable Materials
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {currentLesson.files.filter(f => !['video', 'pdf', 'image'].includes(f.file_type)).map(file => (
                                <a 
                                    key={file.id} 
                                    href={file.file_path} 
                                    download 
                                    className="flex items-center p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500 transition group"
                                    title={`Download ${file.original_name}`}
                                >
                                    <div className="text-3xl mr-4 bg-gray-50 dark:bg-gray-700 w-12 h-12 flex items-center justify-center rounded-lg group-hover:scale-110 transition">
                                        {getFileIcon(file.file_type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-800 dark:text-white truncate group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition">{file.original_name}</p>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5 block">Click to download</span>
                                    </div>
                                    <div className="text-gray-300 dark:text-gray-600 group-hover:text-indigo-500 dark:group-hover:text-indigo-400">
                                        ⬇
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                )}
              </div>

              {/* --- TEXT CONTENT --- */}
              <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 border-b dark:border-gray-700 pb-2">Lecture Notes</h3>
                <div 
                    className="prose prose-indigo dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: formatContent(currentLesson.content) }}
                />
              </div>

              {/* --- ACTION BAR --- */}
              <div className="mt-12 mb-20 flex justify-center">
                   <button 
                       onClick={() => toggleLessonCompletion(currentLesson.id)}
                       disabled={!user}
                       className={`px-8 py-3 rounded-full font-bold text-lg flex items-center gap-2 transform transition hover:scale-105 shadow-xl ${
                           completedLessons.includes(currentLesson.id) 
                           ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50 ring-2 ring-green-500 ring-offset-2 dark:ring-offset-gray-900' 
                           : 'bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600 shadow-indigo-200 dark:shadow-none'
                       } ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}
                   >
                       {completedLessons.includes(currentLesson.id) ? (
                           <>✅ Lesson Completed</>
                       ) : (
                           <>○ Mark as Complete</>
                       )}
                   </button>
              </div>

            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 space-y-4">
               <div className="text-6xl animate-bounce">👈</div>
               <div className="text-center">
                   <h3 className="text-2xl font-bold text-gray-700 dark:text-white mb-2">Welcome to {course.title}</h3>
                   <p className="text-lg">Select a lesson from the sidebar to begin learning.</p>
               </div>
            </div>
          )}
        </div>
      </main>
      </div> 
    </div>
  );
}