import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from './ToastContext';
import Navbar from './Navbar';
import CourseBuilderWizard from './components/CourseBuilderWizard';

const API_URL = '';

export default function Admin() {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState('courses');
  const [courses, setCourses] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  
  // Edit Mode State
  const [editingCourse, setEditingCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  
  // Uploading State
  const [isUploading, setIsUploading] = useState(false); 
  const [uploadProgress, setUploadProgress] = useState(0);

  // Forms
  const [courseForm, setCourseForm] = useState({ title: '', description: '', image_url: '', category: 'General', duration: '', level: 'Beginner' });
  const [lessonForm, setLessonForm] = useState({ title: '', content: '', files: null });
  const [courseImageUploading, setCourseImageUploading] = useState(false); // State for course image upload
  
  // Selection State (Bulk Actions)
  const [selectedLessons, setSelectedLessons] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [expandedLessons, setExpandedLessons] = useState([]);

  // Modal State
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmData, setConfirmData] = useState({ title: '', message: '', action: null, confirmText: 'Confirm Delete', confirmColor: 'bg-red-600' });

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  const { addToast } = useToast();
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem('user')) || {};

  const openConfirm = (title, message, action, confirmText = 'Confirm Delete', confirmColor = 'bg-red-600') => {
    setConfirmData({ title, message, action, confirmText, confirmColor });
    setShowConfirm(true);
  };

  const closeConfirm = () => {
    setShowConfirm(false);
    setConfirmData({ title: '', message: '', action: null, confirmText: 'Confirm Delete', confirmColor: 'bg-red-600' });
  };

  const handleConfirmAction = async () => {
    if (confirmData.action) {
        await confirmData.action();
    }
    closeConfirm();
  };

  // --- INITIAL LOAD ---
  useEffect(() => {
    window.scrollTo(0, 0);
    fetchCourses();
    fetchUsers();
  }, []);

  // --- API FETCHING (With Error Handling) ---
  const fetchCourses = async () => {
    try {
      setError(null);
      const res = await axios.get(`${API_URL}/api/courses`);
      setCourses(res.data);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to load courses';
      setError(errorMsg);
      addToast(errorMsg, 'error');
      console.error('Fetch courses error:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      setError(null);
      const res = await axios.get(`${API_URL}/api/users`);
      setUsers(res.data);
      
      // Self-healing: Update local storage if email is missing (handles stale sessions)
      if (currentUser && currentUser.id && !currentUser.email) {
          const me = res.data.find(u => u.id === currentUser.id);
          if (me) {
              const updatedUser = { ...currentUser, email: me.email };
              localStorage.setItem('user', JSON.stringify(updatedUser));
              // Force reload to apply changes
              window.location.reload(); 
          }
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to load users';
      setError(errorMsg);
      addToast(errorMsg, 'error');
      console.error('Fetch users error:', err);
    }
  };

  const fetchLessons = async (courseId) => {
    try {
      const res = await axios.get(`${API_URL}/api/course/${courseId}`);
      setLessons(res.data.lessons);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to load lessons';
      addToast(errorMsg, 'error');
      console.error('Fetch lessons error:', err);
    }
  };

  // --- COURSE HANDLERS ---
  const startEditing = (course) => {
    setEditingCourse(course);
    setCourseForm({ 
        title: course.title, 
        description: course.description, 
        image_url: course.image_url, 
        category: course.category || 'General',
        duration: course.duration || '',
        level: course.level || 'Beginner'
    });
    fetchLessons(course.id);
  };

  const handleCourseImageUpload = async (file) => {
    if (!file) return;
    
    // Validate
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        addToast('Invalid file type. Please upload an image.', 'error');
        return;
    }
    if (file.size > 5 * 1024 * 1024) { // 5MB
        addToast('Image too large. Max 5MB.', 'error');
        return;
    }

    setCourseImageUploading(true);
    const formData = new FormData();
    formData.append('files', file);

    try {
        const res = await axios.post(`${API_URL}/api/upload`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        setCourseForm(prev => ({ ...prev, image_url: res.data.url }));
        addToast('Image uploaded successfully', 'success');
    } catch (err) {
        addToast('Image upload failed', 'error');
        console.error(err);
    } finally {
        setCourseImageUploading(false);
    }
  };

  // --- SELECTION HANDLERS ---
  const toggleLessonSelection = (lessonId) => {
    setSelectedLessons(prev => 
      prev.includes(lessonId) 
        ? prev.filter(id => id !== lessonId) 
        : [...prev, lessonId]
    );
  };

  const toggleFileSelection = (fileId) => {
    setSelectedFiles(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId) 
        : [...prev, fileId]
    );
  };

  const toggleLessonExpansion = (lessonId) => {
    setExpandedLessons(prev => 
      prev.includes(lessonId) 
        ? prev.filter(id => id !== lessonId) 
        : [...prev, lessonId]
    );
  };

  const handleBulkDeleteLessons = () => {
    if (selectedLessons.length === 0) return;
    openConfirm(
      "Delete Selected Lessons?",
      `Are you sure you want to delete ${selectedLessons.length} lessons? This cannot be undone.`,
      async () => {
        try {
            await Promise.all(selectedLessons.map(id => axios.delete(`${API_URL}/api/lessons/${id}`)));
            setSelectedLessons([]);
            fetchLessons(editingCourse.id);
            addToast('Selected lessons deleted', 'success');
        } catch (err) {
            addToast('Error deleting some lessons', 'error');
        }
      }
    );
  };

  const handleBulkDeleteFiles = () => {
    if (selectedFiles.length === 0) return;
    openConfirm(
      "Delete Selected Files?",
      `Are you sure you want to delete ${selectedFiles.length} files?`,
      async () => {
        try {
            await Promise.all(selectedFiles.map(id => axios.delete(`${API_URL}/api/files/${id}`)));
            setSelectedFiles([]);
            fetchLessons(editingCourse.id);
            addToast('Selected files deleted', 'success');
        } catch (err) {
            addToast('Error deleting some files', 'error');
        }
      }
    );
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    if (!courseForm.title.trim()) {
      addToast('Please enter a course title', 'error');
      return;
    }
    try {
      await axios.post(`${API_URL}/api/courses`, courseForm);
      setCourseForm({ title: '', description: '', image_url: '', category: 'General' });
      fetchCourses();
      addToast('Course created successfully!', 'success', 2000);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to create course';
      addToast(errorMsg, 'error');
      console.error('Create course error:', err);
    }
  };

  const handleUpdateCourse = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_URL}/api/courses/${editingCourse.id}`, courseForm);
      addToast('Course updated successfully!', 'success', 2000);
      fetchCourses();
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to update course';
      addToast(errorMsg, 'error');
      console.error('Update course error:', err);
    }
  };

  const handleDeleteCourse = (id) => {
    openConfirm(
      "Delete Course?",
      "⚠️ Are you sure you want to delete this ENTIRE course? all lessons and files will be permanently removed.",
      async () => {
        try {
            await axios.delete(`${API_URL}/api/courses/${id}`);
            fetchCourses();
            addToast('Course deleted successfully', 'success', 2000);
          } catch (err) {
            const errorMsg = err.response?.data?.message || 'Failed to delete course';
            addToast(errorMsg, 'error');
            console.error('Delete course error:', err);
          }
      }
    );
  };

  // --- LESSON HANDLER (With Progress Bar & Error Handling) ---
  const handleAddLesson = async (e) => {
    e.preventDefault();
    
    if (isUploading) return;
    if (!lessonForm.title.trim()) {
      addToast('Please enter a lesson title', 'error');
      return;
    }

    // Validate files before upload
    if (lessonForm.files && lessonForm.files.length > 0) {
      const maxFileSize = 5 * 1024 * 1024 * 1024; // 5GB per file
      const allowedExts = ['.pdf', '.docx', '.doc', '.pptx', '.ppt', '.mp4', '.webm', '.mov', '.jpg', '.jpeg', '.png', '.gif'];
      
      for (let file of lessonForm.files) {
        const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        
        // Check file type
        if (!allowedExts.includes(ext)) {
          addToast(`❌ File type not allowed: ${file.name}. Allowed: PDF, DOCX, PPTX, MP4, WebM, MOV, Images`, 'error');
          setIsUploading(false);
          return;
        }
        
        // Check file size
        if (file.size > maxFileSize) {
          addToast(`❌ File too large: ${file.name}. Max 5GB per file.`, 'error');
          setIsUploading(false);
          return;
        }
      }
    }
    
    setIsUploading(true);
    setUploadProgress(0);

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
        await axios.post(`${API_URL}/api/lessons`, data, {
            timeout: 300000, 
            maxBodyLength: 50 * 1024 * 1024 * 1024,
            maxContentLength: 50 * 1024 * 1024 * 1024,
            headers: {},
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

        addToast('Lesson added successfully!', 'success', 2000);
    } catch(err) {
        let errorMsg = 'Failed to add lesson';
        
        if (err.code === 'ECONNABORTED') {
            errorMsg = 'Upload timeout. Try uploading smaller files or check your internet connection.';
        } else if (err.response?.status === 413) {
            errorMsg = err.response?.data?.message || 'File too large. Maximum 50GB per file.';
        } else if (err.response?.status === 400) {
            errorMsg = err.response?.data?.message || 'Invalid file type or request format.';
        } else if (err.response?.data?.message) {
            errorMsg = err.response.data.message;
        } else if (err.message === 'Network Error') {
            errorMsg = 'Network Error: Server unreachable or connection timed out. Check if server is running.';
        } else if (err.message) {
            errorMsg = err.message;
        }
        
        addToast(errorMsg, 'error');
        console.error('Add lesson error:', err);
    } finally {
        setIsUploading(false);
        setUploadProgress(0);
    }
  };

  const handleDeleteLesson = (id) => {
    openConfirm(
        "Delete Lesson?",
        "Are you sure you want to delete this lesson?",
        async () => {
          try {
              await axios.delete(`${API_URL}/api/lessons/${id}`);
              fetchLessons(editingCourse.id);
              addToast('Lesson deleted successfully', 'success', 2000);
          } catch (err) {
              const errorMsg = err.response?.data?.message || 'Failed to delete lesson';
              addToast(errorMsg, 'error');
              console.error('Delete lesson error:', err);
          }
      }
    );
  };

  const handleDeleteFile = (fileId) => {
    openConfirm(
        "Remove File?",
        "Are you sure you want to permanently remove this file?",
        async () => {
            try {
                await axios.delete(`${API_URL}/api/files/${fileId}`);
                fetchLessons(editingCourse.id);
                addToast('File deleted successfully', 'success', 2000);
            } catch(err) {
                const errorMsg = err.response?.data?.message || 'Failed to delete file';
                addToast(errorMsg, 'error');
                console.error('Delete file error:', err);
            }
        }
    );
  };

  const handleDeleteUser = (userId) => {
    openConfirm(
        "Delete User?",
        "Permanently delete this user? They will lose access to all courses.",
        async () => {
            try {
                await axios.delete(`${API_URL}/api/users/${userId}`);
                fetchUsers();
                addToast('User deleted successfully', 'success', 2000);
            } catch (err) {
                const errorMsg = err.response?.data?.message || 'Failed to delete user';
                addToast(errorMsg, 'error');
                console.error('Delete user error:', err);
            }
        }
    );
  };

  const handleMakeAdmin = (userId) => {
    openConfirm(
        "Grant Admin Access?",
        "Are you sure you want to make this user an Admin? They will have full access to the console.",
        async () => {
            try {
                await axios.put(`${API_URL}/api/users/${userId}/role`, { role: 'admin' });
                fetchUsers();
                addToast('User granted admin access', 'success');
            } catch (err) {
                const errorMsg = err.response?.data?.message || 'Failed to update user role';
                addToast(errorMsg, 'error');
                console.error('Update role error:', err);
            }
        },
        "Make Admin",
        "bg-indigo-600"
    );
  };

  const handleDemoteAdmin = (userId) => {
    openConfirm(
        "Remove Admin Access?",
        "Are you sure you want to demote this user to Student? They will lose access to the Admin Console.",
        async () => {
            try {
                await axios.put(`${API_URL}/api/users/${userId}/role`, { role: 'student' });
                fetchUsers();
                addToast('User demoted to student', 'success');
            } catch (err) {
                const errorMsg = err.response?.data?.message || 'Failed to update user role';
                addToast(errorMsg, 'error');
                console.error('Update role error:', err);
            }
        },
        "Demote",
        "bg-orange-500"
    );
  };

  const filteredCourses = courses.filter(course => 
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    course.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans transition-colors duration-300">
      <Navbar />

      <div className="max-w-7xl mx-auto p-8">
        {editingCourse ? (
            <CourseBuilderWizard 
                course={editingCourse} 
                onCancel={() => setEditingCourse(null)} 
                onSave={() => { setEditingCourse(null); fetchCourses(); }}
                refreshCourses={fetchCourses}
            />
        ) : (
            // --- DASHBOARD MODE ---
            <div>
                <div className="flex flex-col md:flex-row justify-between items-center border-b dark:border-gray-700 mb-8 gap-4">
                    <div className="flex gap-8 w-full md:w-auto">
                        <button onClick={() => { setActiveTab('courses'); setSearchQuery(''); }} className={`pb-4 font-bold ${activeTab === 'courses' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400' : 'text-gray-400 dark:text-gray-500'}`}>Courses</button>
                        <button onClick={() => { setActiveTab('users'); setSearchQuery(''); }} className={`pb-4 font-bold ${activeTab === 'users' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400' : 'text-gray-400 dark:text-gray-500'}`}>Users</button>
                    </div>

                    {/* Search Bar */}
                    <div className="relative w-full md:w-64 mb-2 md:mb-0">
                        <input 
                            type="text" 
                            placeholder={`Search ${activeTab}...`} 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm text-sm"
                        />
                        <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>

                {activeTab === 'courses' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border dark:border-gray-700 h-fit">
                            <h3 className="font-bold text-gray-800 dark:text-white mb-4">Create Course</h3>
                            <form onSubmit={handleCreateCourse} className="space-y-4">
                                <input placeholder="Title" value={courseForm.title} onChange={e => setCourseForm({...courseForm, title: e.target.value})} className="w-full border dark:border-gray-600 p-3 rounded dark:bg-gray-700 dark:text-white" required />
                                <textarea placeholder="Description" value={courseForm.description} onChange={e => setCourseForm({...courseForm, description: e.target.value})} className="w-full border dark:border-gray-600 p-3 rounded h-24 dark:bg-gray-700 dark:text-white" required />
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <select 
                                        value={courseForm.category} 
                                        onChange={e => setCourseForm({...courseForm, category: e.target.value})} 
                                        className="w-full border dark:border-gray-600 p-3 rounded text-gray-700 dark:text-white dark:bg-gray-700"
                                    >
                                        <option value="General">General</option>
                                        <option value="Development">Development</option>
                                        <option value="Design">Design</option>
                                        <option value="Business">Business</option>
                                    </select>
                                    <select 
                                        value={courseForm.level} 
                                        onChange={e => setCourseForm({...courseForm, level: e.target.value})} 
                                        className="w-full border dark:border-gray-600 p-3 rounded text-gray-700 dark:text-white dark:bg-gray-700"
                                    >
                                        <option value="Beginner">Beginner</option>
                                        <option value="Intermediate">Intermediate</option>
                                        <option value="Advanced">Advanced</option>
                                    </select>
                                </div>
                                
                                <input placeholder="Duration (e.g. 5h 30m)" value={courseForm.duration} onChange={e => setCourseForm({...courseForm, duration: e.target.value})} className="w-full border dark:border-gray-600 p-3 rounded dark:bg-gray-700 dark:text-white" />

                                <div 
                                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${courseImageUploading ? 'bg-gray-100 dark:bg-gray-700 animate-pulse' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border-gray-300 dark:border-gray-600'}`}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        handleCourseImageUpload(e.dataTransfer.files[0]);
                                    }}
                                    onClick={() => document.getElementById('createCourseImageInput').click()}
                                >
                                    <input 
                                        id="createCourseImageInput" 
                                        type="file" 
                                        className="hidden" 
                                        accept="image/*"
                                        onChange={(e) => handleCourseImageUpload(e.target.files[0])}
                                    />
                                    {courseImageUploading ? (
                                        <p className="text-sm font-bold text-indigo-600">Uploading...</p>
                                    ) : courseForm.image_url ? (
                                        <div className="relative group">
                                            <img src={courseForm.image_url} alt="Cover" className="h-32 mx-auto rounded shadow-sm object-cover" />
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded text-white font-bold text-xs">
                                                Change
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-gray-400">
                                            <span className="text-2xl block mb-1">🖼️</span>
                                            <span className="text-xs font-bold">Drag & Drop Cover Image</span>
                                        </div>
                                    )}
                                </div>

                                <button className="w-full bg-indigo-600 text-white py-3 rounded font-bold hover:bg-indigo-700 shadow-md">Create Course</button>
                            </form>
                        </div>
                        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredCourses.map(course => (
                                <div key={course.id} className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border dark:border-gray-700 flex flex-col group relative overflow-hidden">
                                     {course.image_url && (
                                        <div className="h-32 mb-4 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                                            <img 
                                                src={course.image_url} 
                                                alt={course.title} 
                                                className="w-full h-full object-cover"
                                                onError={(e) => {e.target.style.display = 'none'}} // Hide broken images
                                            />
                                        </div>
                                    )}
                                    <h4 className="font-bold text-lg dark:text-white">{course.title}</h4>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 flex-1">{course.description}</p>
                                    <div className="flex gap-2">
                                        <button onClick={() => startEditing(course)} className="flex-1 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 py-2 rounded font-bold text-sm hover:bg-indigo-100 dark:hover:bg-indigo-900/60">Manage Content</button>
                                        <button onClick={() => handleDeleteCourse(course.id)} className="bg-red-50 dark:bg-red-900/40 text-red-500 dark:text-red-300 px-3 rounded hover:bg-red-100 dark:hover:bg-red-900/60">🗑</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden border dark:border-gray-700">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
                                <tr>
                                    <th className="p-4 pl-6 dark:text-gray-200">User</th>
                                    <th className="p-4 dark:text-gray-200">Detailed Info</th>
                                    <th className="p-4 dark:text-gray-200">Role</th>
                                    <th className="p-4 text-right dark:text-gray-200">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map(u => (
                                    <tr key={u.id} className="border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="p-4 pl-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800">
                                                    {u.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-bold text-gray-800 dark:text-white">{u.name}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-500 dark:text-gray-300">
                                            <div className="flex flex-col">
                                                <span>{u.email}</span>
                                                <span className="text-xs text-gray-400">ID: #{u.id}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs uppercase font-bold ${u.role === 'admin' ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300' : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-200'}`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                {/* ACTIONS FOR MAIN ADMIN (admin@lms.com) */}
                                                {currentUser.email?.toLowerCase() === 'admin@lms.com' && (
                                                    <>
                                                        {u.role !== 'admin' && (
                                                            <button onClick={() => handleMakeAdmin(u.id)} className="text-indigo-600 dark:text-indigo-400 font-bold text-sm hover:underline">Make Admin</button>
                                                        )}
                                                        {u.role === 'admin' && u.email !== 'admin@lms.com' && (
                                                            <button onClick={() => handleDemoteAdmin(u.id)} className="text-orange-500 dark:text-orange-400 font-bold text-sm hover:underline">Demote</button>
                                                        )}
                                                        {u.email !== 'admin@lms.com' && (
                                                             <button onClick={() => handleDeleteUser(u.id)} className="text-red-500 dark:text-red-400 font-bold text-sm hover:underline">Delete</button>
                                                        )}
                                                    </>
                                                )}

                                                {/* ACTIONS FOR REGULAR ADMINS */}
                                                {currentUser.email?.toLowerCase() !== 'admin@lms.com' && (
                                                    <>
                                                        {u.role !== 'admin' && (
                                                            <button onClick={() => handleDeleteUser(u.id)} className="text-red-500 dark:text-red-400 font-bold text-sm hover:underline">Delete</button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        )}

        {/* --- CUSTOM CONFIRMATION MODAL --- */}
        {showConfirm && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100]">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl max-w-md w-full mx-4 animate-scaleIn">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">{confirmData.title}</h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">{confirmData.message}</p>
                    <div className="flex justify-end gap-3">
                        <button 
                            onClick={closeConfirm}
                            className="px-4 py-2 text-gray-500 dark:text-gray-400 font-bold hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleConfirmAction}
                            className={`px-4 py-2 text-white font-bold rounded shadow-lg dark:shadow-none ${confirmData.confirmColor} hover:opacity-90 transition`}
                        >
                            {confirmData.confirmText}
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}