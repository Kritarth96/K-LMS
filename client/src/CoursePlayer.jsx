import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

export default function CoursePlayer() {
  const { id } = useParams();
  const [courseData, setCourseData] = useState(null);
  const [activeLessonIndex, setActiveLessonIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Adding timestamp here too ensures students always see the latest files
    axios.get(`http://localhost:5000/api/course/${id}?t=${Date.now()}`)
      .then(res => {
        setCourseData(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="h-screen flex items-center justify-center text-gray-500 text-lg">Loading Class Materials...</div>;
  if (!courseData) return <div className="h-screen flex items-center justify-center text-red-500">Course not found.</div>;

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

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      
      {/* --- SIDEBAR --- */}
      <aside className="w-80 bg-white border-r border-gray-200 flex flex-col z-10 shadow-lg shrink-0">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white">
           <h2 className="font-bold text-gray-800 truncate pr-2 max-w-[200px]" title={course.title}>{course.title}</h2>
           <Link to="/" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 whitespace-nowrap px-2 py-1 rounded hover:bg-indigo-50 transition">EXIT</Link>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {lessons.length === 0 ? (
            <div className="p-8 text-center">
                <p className="text-gray-400 italic mb-2">No lessons added yet.</p>
                <span className="text-2xl">📭</span>
            </div>
          ) : (
            <ul>
              {lessons.map((lesson, idx) => (
                <li key={lesson.id}>
                  <button 
                    onClick={() => setActiveLessonIndex(idx)}
                    className={`w-full text-left p-4 border-b border-gray-50 hover:bg-gray-50 transition flex items-start gap-3 group ${idx === activeLessonIndex ? 'bg-indigo-50 border-l-4 border-indigo-600' : 'border-l-4 border-transparent'}`}
                  >
                    <span className={`shrink-0 flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition ${idx === activeLessonIndex ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600 group-hover:bg-gray-300'}`}>
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                        <span className={`text-sm font-medium block truncate ${idx === activeLessonIndex ? 'text-indigo-900' : 'text-gray-600'}`}>
                        {lesson.title}
                        </span>
                        {/* File count indicator */}
                        {lesson.files && lesson.files.length > 0 && (
                            <span className="text-[10px] text-gray-400 mt-1 block">
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

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="flex-1 overflow-y-auto p-6 md:p-12 scroll-smooth">
          {currentLesson ? (
            <div className="max-w-5xl mx-auto">
                
              {/* Header */}
              <div className="mb-8 pb-4 border-b border-gray-200">
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{currentLesson.title}</h1>
                  <p className="text-sm text-gray-500">Lesson {activeLessonIndex + 1} of {lessons.length}</p>
              </div>
              
              {/* --- FILES DISPLAY --- */}
              <div className="space-y-10 mb-12">
                
                {/* 1. VIDEOS */}
                {currentLesson.files && currentLesson.files.filter(f => f.file_type === 'video').map(video => (
                    <div key={video.id} className="rounded-xl overflow-hidden bg-black shadow-2xl ring-1 ring-gray-900/5">
                        <video controls src={video.file_path} className="w-full aspect-video" />
                        <div className="bg-gray-900 p-3 flex justify-between items-center">
                            <span className="text-gray-300 text-sm font-medium">🎬 {video.original_name}</span>
                            <a href={video.file_path} download className="text-xs font-bold text-indigo-400 hover:text-white transition">Download Video</a>
                        </div>
                    </div>
                ))}

                {/* 2. PDFS */}
                {currentLesson.files && currentLesson.files.filter(f => f.file_type === 'pdf').map(pdf => (
                    <div key={pdf.id} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm h-[700px] bg-gray-100">
                        <div className="bg-white px-4 py-2 border-b flex justify-between items-center">
                            <span className="font-bold text-gray-700 text-sm">📄 {pdf.original_name}</span>
                            <a href={pdf.file_path} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline text-xs font-bold">Open in New Tab ↗</a>
                        </div>
                        <iframe src={pdf.file_path} className="w-full h-full" title={pdf.original_name} />
                    </div>
                ))}

                {/* 3. DOWNLOADABLES (PPT, DOC, IMG) */}
                {currentLesson.files && currentLesson.files.filter(f => !['video', 'pdf'].includes(f.file_type)).length > 0 && (
                    <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                        <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <span>📥</span> Downloadable Materials
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {currentLesson.files.filter(f => !['video', 'pdf'].includes(f.file_type)).map(file => (
                                <a 
                                    key={file.id} 
                                    href={file.file_path} 
                                    download 
                                    className="flex items-center p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md hover:border-indigo-300 transition group"
                                >
                                    <div className="text-3xl mr-4 bg-gray-50 w-12 h-12 flex items-center justify-center rounded-lg group-hover:scale-110 transition">
                                        {getFileIcon(file.file_type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-800 truncate group-hover:text-indigo-700 transition">{file.original_name}</p>
                                        <span className="text-xs text-gray-500 font-medium mt-0.5 block">Click to download</span>
                                    </div>
                                    <div className="text-gray-300 group-hover:text-indigo-500">
                                        ⬇
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                )}
              </div>

              {/* --- TEXT CONTENT --- */}
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Lecture Notes</h3>
                <div 
                    className="prose prose-indigo max-w-none text-gray-600 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: formatContent(currentLesson.content) }}
                />
              </div>

            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
               <div className="text-6xl animate-bounce">👈</div>
               <div className="text-center">
                   <h3 className="text-2xl font-bold text-gray-700 mb-2">Welcome to {course.title}</h3>
                   <p className="text-lg">Select a lesson from the sidebar to begin learning.</p>
               </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}