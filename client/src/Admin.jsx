import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

export default function Admin() {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState('courses');
  const [courses, setCourses] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ totalUsers: 0, totalCourses: 0 });
  
  // Edit Mode State
  const [editingCourse, setEditingCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  
  // Uploading State
  const [isUploading, setIsUploading] = useState(false); 
  const [uploadProgress, setUploadProgress] = useState(0); // New: Tracks percentage

  // Forms
  const [courseForm, setCourseForm] = useState({ title: '', description: '', image_url: '', category: 'General' });
  const [lessonForm, setLessonForm] = useState({ title: '', content: '', files: null });

  // --- INITIAL LOAD ---
  useEffect(() => {
    fetchCourses();
    fetchUsers();
  }, []);

  // --- API FETCHING (With Timestamp Cache Busters) ---
  const fetchCourses = () => {
    axios.get(`http://localhost:5000/api/courses?t=${Date.now()}`)
        .then(res => {
            setCourses(res.data);
            setStats(prev => ({ ...prev, totalCourses: res.data.length }));
        })
        .catch(err => console.error(err));
  };

  const fetchUsers = () => {
    axios.get(`http://localhost:5000/api/users?t=${Date.now()}`)
        .then(res => {
            setUsers(res.data);
            setStats(prev => ({ ...prev, totalUsers: res.data.length }));
        })
        .catch(err => console.error(err));
  };

  const fetchLessons = async (courseId) => {
    try {
        const res = await axios.get(`http://localhost:5000/api/course/${courseId}?t=${Date.now()}`);
        setLessons(res.data.lessons);
    } catch (err) {
        console.error("Error fetching lessons:", err);
    }
  };

  // --- COURSE HANDLERS ---
  const startEditing = (course) => {
    setEditingCourse(course);
    setCourseForm({ 
        title: course.title, 
        description: course.description, 
        image_url: course.image_url, 
        category: course.category || 'General' 
    });
    fetchLessons(course.id);
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    await axios.post('http://localhost:5000/api/courses', courseForm);
    setCourseForm({ title: '', description: '', image_url: '', category: 'General' });
    fetchCourses();
    alert("Course Created!");
  };

  const handleUpdateCourse = async (e) => {
    e.preventDefault();
    try {
        await axios.put(`http://localhost:5000/api/courses/${editingCourse.id}`, courseForm);
        alert('Course updated successfully!');
        fetchCourses();
    } catch (err) { alert("Update failed"); }
  };

  const handleDeleteCourse = async (id) => {
    if (window.confirm("⚠️ Delete this ENTIRE course and all lessons?")) {
        await axios.delete(`http://localhost:5000/api/courses/${id}`);
        fetchCourses();
    }
  };

  // --- LESSON HANDLER (With Progress Bar & Double Refresh) ---
  const handleAddLesson = async (e) => {
    e.preventDefault();
    
    if (isUploading) return; 
    if (!lessonForm.title) return alert("Please add a title");
    
    setIsUploading(true);
    setUploadProgress(0); // Reset progress

    const data = new FormData();
    data.append('course_id', editingCourse.id);
    data.append('title', lessonForm.title);
    data.append('content', lessonForm.content);
    
    // Append all selected files
    if (lessonForm.files && lessonForm.files.length > 0) {
        for (let i = 0; i < lessonForm.files.length; i++) {
            data.append('files', lessonForm.files[i]);
        }
    }

    try {
        // 1. Send Upload Request with Progress Tracking
        await axios.post('http://localhost:5000/api/lessons', data, {
            onUploadProgress: (progressEvent) => {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                setUploadProgress(percentCompleted);
            }
        });
        
        // 2. Clear Form
        setLessonForm({ title: '', content: '', files: null });
        document.getElementById('fileInput').value = ''; 
        
        // 3. FIRST REFRESH (Immediate)
        await fetchLessons(editingCourse.id);
        
        // 4. SECOND REFRESH (Safety check after 1.5s to catch DB latency)
        setTimeout(() => {
            fetchLessons(editingCourse.id);
        }, 1500);

        alert("✅ Lesson Added Successfully!");
    } catch(err) {
        console.error(err);
        alert("Error adding lesson (Check server logs)");
    } finally {
        setIsUploading(false);
        setUploadProgress(0);
    }
  };

  const handleDeleteLesson = async (id) => {
      if(window.confirm("Delete this lesson?")) {
          await axios.delete(`http://localhost:5000/api/lessons/${id}`);
          fetchLessons(editingCourse.id);
      }
  };

  const handleDeleteFile = async (fileId) => {
    if(window.confirm("Permanently remove this file?")) {
        try {
            await axios.delete(`http://localhost:5000/api/files/${fileId}`);
            fetchLessons(editingCourse.id);
        } catch(err) {
            alert("Error deleting file");
        }
    }
  };

  const handleDeleteUser = async (userId) => {
    if(window.confirm("Permanently delete this user?")) {
        await axios.delete(`http://localhost:5000/api/users/${userId}`);
        fetchUsers();
    }
  };

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <nav className="bg-indigo-900 text-white p-4 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
            <h1 className="text-xl font-bold">ADMIN CONSOLE</h1>
            <Link to="/" className="text-xs bg-indigo-700 px-4 py-2 rounded">Exit</Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-8">
        {editingCourse ? (
            // --- EDIT MODE ---
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
                <div className="bg-gray-100 p-4 border-b flex justify-between items-center">
                    <h2 className="font-bold text-lg text-gray-700">Editing: {editingCourse.title}</h2>
                    <button onClick={() => setEditingCourse(null)} className="text-sm font-bold text-red-600 hover:underline">Close Editor</button>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-8">
                    {/* LEFT: Course Meta */}
                    <div className="space-y-6">
                        <form onSubmit={handleUpdateCourse} className="flex flex-col gap-4">
                            <label className="text-xs font-bold text-gray-400 uppercase">Title</label>
                            <input value={courseForm.title} onChange={e => setCourseForm({...courseForm, title: e.target.value})} className="border p-3 rounded bg-gray-50" />
                            
                            <label className="text-xs font-bold text-gray-400 uppercase">Description</label>
                            <textarea value={courseForm.description} onChange={e => setCourseForm({...courseForm, description: e.target.value})} className="border p-3 rounded bg-gray-50 h-32" />
                            
                            <label className="text-xs font-bold text-gray-400 uppercase">Category</label>
                            <select value={courseForm.category} onChange={e => setCourseForm({...courseForm, category: e.target.value})} className="border p-3 rounded bg-gray-50">
                                <option>General</option>
                                <option>Development</option>
                                <option>Design</option>
                                <option>Business</option>
                            </select>

                            <label className="text-xs font-bold text-gray-400 uppercase">Image URL</label>
                            <input value={courseForm.image_url} onChange={e => setCourseForm({...courseForm, image_url: e.target.value})} className="border p-3 rounded bg-gray-50" />
                            
                            <button className="bg-indigo-600 text-white py-3 rounded font-bold hover:bg-indigo-700">Save Changes</button>
                        </form>
                    </div>

                    {/* RIGHT: Lesson Manager */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* New Lesson Form */}
                        <div className="border-2 border-dashed border-indigo-100 p-6 rounded-xl bg-indigo-50/50">
                             <h3 className="font-bold text-indigo-900 mb-4">Add Content</h3>
                             <input placeholder="Lesson Title" value={lessonForm.title} onChange={e => setLessonForm({...lessonForm, title: e.target.value})} className="border p-3 rounded w-full mb-4" />
                             
                             <textarea 
                                placeholder="Type lesson content here... (HTML allowed)" 
                                value={lessonForm.content} 
                                onChange={e => setLessonForm({...lessonForm, content: e.target.value})} 
                                className="w-full h-32 border p-4 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-sm mb-4"
                             />

                             {/* UPLOAD CONTROLS & PROGRESS BAR */}
                             <div className="flex flex-col gap-3 mt-2">
                                <div className="flex gap-4 items-center">
                                    <input 
                                        id="fileInput"
                                        type="file" 
                                        multiple 
                                        onChange={e => setLessonForm({...lessonForm, files: e.target.files})} 
                                        className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200"
                                    />
                                    
                                    <button 
                                        onClick={handleAddLesson} 
                                        disabled={isUploading} 
                                        className={`ml-auto px-6 py-2 rounded font-bold text-white shadow-lg transition-all ${isUploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-green-200 hover:scale-105'}`}
                                    >
                                        {isUploading ? `Uploading... ${uploadProgress}%` : 'Add Lesson'}
                                    </button>
                                </div>
                                
                                {/* VISUAL PROGRESS BAR */}
                                {isUploading && (
                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                        <div 
                                            className="bg-green-600 h-2.5 rounded-full transition-all duration-300 ease-out" 
                                            style={{ width: `${uploadProgress}%` }}
                                        ></div>
                                        <p className="text-xs text-center text-gray-500 mt-1">{uploadProgress}% Uploaded</p>
                                    </div>
                                )}
                                
                                <p className="text-xs text-gray-400">Hold Ctrl (Cmd) to select multiple files.</p>
                             </div>
                        </div>

                        {/* Existing Lessons List */}
                        <div className="space-y-4">
                            {lessons.map((lesson, idx) => (
                                <div key={lesson.id} className="bg-white p-4 rounded border border-gray-100 shadow-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-3">
                                            <span className="w-6 h-6 rounded-full bg-gray-200 text-xs flex items-center justify-center font-bold text-gray-600">{idx+1}</span>
                                            <span className="font-medium text-gray-700">{lesson.title}</span>
                                        </div>
                                        <button onClick={() => handleDeleteLesson(lesson.id)} className="text-red-400 hover:text-red-600 font-bold px-3">Delete Lesson</button>
                                    </div>

                                    {lesson.files && lesson.files.length > 0 ? (
                                        <div className="mt-3 bg-gray-50 p-3 rounded text-sm border border-gray-100">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Attached Files ({lesson.files.length})</p>
                                            <ul className="space-y-2">
                                                {lesson.files.map(file => (
                                                    <li key={file.id} className="flex justify-between items-center bg-white border px-3 py-2 rounded shadow-sm">
                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                            <span className="text-lg">{file.file_type === 'video' ? '🎬' : file.file_type === 'pdf' ? '📄' : '📎'}</span>
                                                            <a href={file.file_path} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline truncate max-w-[200px] text-xs font-bold">
                                                                {file.original_name}
                                                            </a>
                                                        </div>
                                                        <button 
                                                            onClick={() => handleDeleteFile(file.id)} 
                                                            className="text-[10px] bg-red-50 text-red-600 px-2 py-1 rounded font-bold hover:bg-red-100"
                                                        >
                                                            Remove
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-300 italic ml-9">No files attached</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        ) : (
            // --- DASHBOARD MODE ---
            <div>
                <div className="flex gap-8 border-b mb-8">
                    <button onClick={() => setActiveTab('courses')} className={`pb-4 font-bold ${activeTab === 'courses' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400'}`}>Courses</button>
                    <button onClick={() => setActiveTab('users')} className={`pb-4 font-bold ${activeTab === 'users' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400'}`}>Users</button>
                </div>

                {activeTab === 'courses' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="bg-white p-6 rounded-xl shadow-sm border h-fit">
                            <h3 className="font-bold text-gray-800 mb-4">Create Course</h3>
                            <form onSubmit={handleCreateCourse} className="space-y-4">
                                <input placeholder="Title" value={courseForm.title} onChange={e => setCourseForm({...courseForm, title: e.target.value})} className="w-full border p-3 rounded" required />
                                <textarea placeholder="Description" value={courseForm.description} onChange={e => setCourseForm({...courseForm, description: e.target.value})} className="w-full border p-3 rounded h-24" required />
                                <input placeholder="Image URL" value={courseForm.image_url} onChange={e => setCourseForm({...courseForm, image_url: e.target.value})} className="w-full border p-3 rounded" />
                                <button className="w-full bg-indigo-600 text-white py-3 rounded font-bold">Create</button>
                            </form>
                        </div>
                        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {courses.map(course => (
                                <div key={course.id} className="bg-white p-5 rounded-xl shadow-sm border flex flex-col group relative">
                                    <h4 className="font-bold text-lg">{course.title}</h4>
                                    <p className="text-sm text-gray-500 mb-4 flex-1">{course.description}</p>
                                    <div className="flex gap-2">
                                        <button onClick={() => startEditing(course)} className="flex-1 bg-indigo-50 text-indigo-600 py-2 rounded font-bold text-sm hover:bg-indigo-100">Manage Content</button>
                                        <button onClick={() => handleDeleteCourse(course.id)} className="bg-red-50 text-red-500 px-3 rounded hover:bg-red-100">🗑</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow overflow-hidden border">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="p-4">Name</th>
                                    <th className="p-4">Email</th>
                                    <th className="p-4">Role</th>
                                    <th className="p-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.id} className="border-b last:border-0 hover:bg-gray-50">
                                        <td className="p-4 font-bold">{u.name}</td>
                                        <td className="p-4 text-sm">{u.email}</td>
                                        <td className="p-4"><span className="bg-gray-100 px-2 py-1 rounded text-xs uppercase font-bold">{u.role}</span></td>
                                        <td className="p-4 text-right">
                                            {u.role !== 'admin' && <button onClick={() => handleDeleteUser(u.id)} className="text-red-500 font-bold text-sm">Delete</button>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
}