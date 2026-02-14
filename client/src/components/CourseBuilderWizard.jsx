import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { useToast } from '../ToastContext';
import axios from 'axios';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper for Tailwind classes
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const API_URL = '';

export default function CourseBuilderWizard({ course, onSave, onCancel, refreshCourses }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: course?.title || '',
    description: course?.description || '',
    category: course?.category || 'General',
    level: course?.level || 'Beginner',
    duration: course?.duration || '',
    image_url: course?.image_url || '',
  });

  const [lessons, setLessons] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const { addToast } = useToast();

  // Load lessons when mounting or when course changes
  useEffect(() => {
    if (course?.id) {
      fetchLessons();
    }
  }, [course]);

  const fetchLessons = async () => {
    try {
      setLoadingLessons(true);
      const res = await axios.get(`${API_URL}/api/course/${course.id}`);
      setLessons(res.data.lessons || []);
    } catch (err) {
      console.error(err);
      addToast('Failed to load lessons', 'error');
    } finally {
      setLoadingLessons(false);
    }
  };

  // --- ACTIONS ---
  const handleUpdateCourse = async () => {
    setIsSaving(true);
    // Shake effect on error could be added here
    try {
      await axios.put(`${API_URL}/api/courses/${course.id}`, formData);
      addToast('Course details autosaved', 'success', 1000);
      refreshCourses(); // Update parent list
    } catch (err) {
      addToast('Failed to save changes', 'error');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Debounced autosave for Step 1
  useEffect(() => {
      const timer = setTimeout(() => {
          if (step === 1 && (
            formData.title !== course.title || 
            formData.description !== course.description ||
            formData.category !== course.category ||
            formData.level !== course.level ||
            formData.duration !== course.duration ||
            formData.image_url !== course.image_url
          )) {
            handleUpdateCourse();
          }
      }, 2000);
      return () => clearTimeout(timer);
  }, [formData]);


  // --- STEP COMPONENTS ---
  
  const Stepper = ({ currentStep }) => (
    <div className="flex items-center justify-center space-x-4 mb-8">
      {[1, 2, 3].map((s) => (
        <React.Fragment key={s}>
            <div className="flex flex-col items-center relative z-10">
                <motion.div 
                    initial={false}
                    animate={{
                        scale: currentStep === s ? 1.2 : 1,
                        backgroundColor: currentStep >= s ? '#4f46e5' : '#e5e7eb',
                        borderColor: currentStep === s ? '#4f46e5' : 'transparent',
                    }}
                    className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center font-bold text-white transition-colors duration-300 border-4",
                        currentStep < s && "text-gray-500 bg-gray-200 dark:bg-gray-700 dark:text-gray-400"
                    )}
                >
                    {currentStep > s ? '✓' : s}
                </motion.div>
                <span className={cn(
                    "absolute -bottom-6 text-xs font-bold whitespace-nowrap", 
                    currentStep >= s ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400"
                )}>
                    {s === 1 ? 'Details' : s === 2 ? 'Curriculum' : 'Preview'}
                </span>
            </div>
            {s < 3 && (
                <div className="w-24 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: currentStep > s ? '100%' : '0%' }}
                        className="h-full bg-indigo-600"
                        transition={{ duration: 0.5 }}
                    />
                </div>
            )}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden min-h-[80vh] flex flex-col">
       {/* HEADER */}
       <div className="bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700 p-4 flex justify-between items-center px-8">
           <h2 className="font-bold text-xl text-gray-800 dark:text-white flex items-center gap-3">
               <span className="text-2xl">⚡</span> 
               Course Wizard
               <span className="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-full">{isSaving ? 'Saving...' : 'Draft'}</span>
           </h2>
           <button onClick={onCancel} className="text-gray-500 hover:text-red-500 font-bold transition">Exit Wizard</button>
       </div>

       {/* MAIN CONTENT AREA (SPLIT VIEW) */}
       <div className="flex-1 flex flex-col">
            <div className="p-6 pb-0">
                <Stepper currentStep={step} />
            </div>
            
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0 overflow-hidden">
                {/* LEFT PANEL: Builder / Form */}
                <div className="p-8 overflow-y-auto border-r dark:border-gray-700 h-full max-h-[calc(100vh-250px)]">
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <Step1Details 
                                key="step1" 
                                formData={formData} 
                                setFormData={setFormData}
                                addToast={addToast}
                            />
                        )}
                        {step === 2 && (
                            <Step2Curriculum 
                                key="step2"
                                courseId={course.id}
                                lessons={lessons}
                                fetchLessons={fetchLessons}
                                addToast={addToast}
                            />
                        )}
                        {step === 3 && (
                            <Step3Publish 
                                key="step3"
                                formData={formData}
                                lessons={lessons}
                            />
                        )}
                    </AnimatePresence>
                </div>

                {/* RIGHT PANEL: Live Preview */}
                <div className="bg-gray-100 dark:bg-gray-900/50 p-8 h-full overflow-y-auto max-h-[calc(100vh-250px)] hidden lg:block">
                     <div className="sticky top-0">
                        <div className="bg-gray-800 rounded-t-xl p-2 flex items-center justify-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-red-400"></div>
                             <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                             <div className="w-2 h-2 rounded-full bg-green-400"></div>
                             <span className="text-xs text-gray-400 font-mono ml-2">Live Preview</span>
                        </div>
                        <div className="bg-white dark:bg-gray-950 border-x border-b border-gray-200 dark:border-gray-800 rounded-b-xl shadow-lg min-h-[500px] overflow-hidden relative">
                             {/* MOCK PREVIEW COMPONENT */}
                             <LivePreview formData={formData} lessons={lessons} step={step} />
                        </div>
                     </div>
                </div>
            </div>
       </div>

       {/* FOOTER NAV */}
        <div className="bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-700 p-4 px-8 flex justify-between items-center">
            <button 
                onClick={() => setStep(s => Math.max(1, s - 1))}
                disabled={step === 1}
                className="px-6 py-2 rounded-lg font-bold text-gray-500 disabled:opacity-30 hover:bg-gray-200 dark:hover:bg-gray-800 transition"
            >
                Back
            </button>
            
            <div className="flex gap-4">
                {step < 3 ? (
                    <button 
                         onClick={() => setStep(s => Math.min(3, s + 1))}
                         className="px-8 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-lg shadow-indigo-200 dark:shadow-none hover:scale-105 transition-transform"
                    >
                        Next Step &rarr;
                    </button>
                ) : (
                    <button 
                        onClick={onCancel}
                        className="px-8 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-lg shadow-green-200 dark:shadow-none hover:scale-105 transition-transform"
                    >
                        Finish & Close
                    </button>
                )}
            </div>
        </div>
    </div>
  );
}

// --- SUB-COMPONENTS for cleaner code ---

function Step1Details({ formData, setFormData, addToast }) {
    const [uploading, setUploading] = useState(false);

    const handleImageUpload = async (file) => {
        if (!file) return;
        setUploading(true);
        const data = new FormData();
        data.append('files', file);

        try {
            const res = await axios.post(`${API_URL}/api/upload`, data);
            setFormData(prev => ({ ...prev, image_url: res.data.url }));
            addToast('Cover image updated', 'success');
        } catch (err) {
            addToast('Image upload failed', 'error');
        } finally {
            setUploading(false);
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0, x: -20 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
        >
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white">Course Basics</h3>
            
            <div className="space-y-2">
                <label className="text-sm font-bold text-gray-500 uppercase">Course Title</label>
                <input 
                    value={formData.title} 
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    className="w-full text-2xl font-bold border-b-2 border-gray-200 dark:border-gray-700 focus:border-indigo-500 bg-transparent py-2 outline-none dark:text-white transition-colors"
                    placeholder="Enter course title..."
                />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-bold text-gray-500 uppercase">Overview</label>
                <textarea 
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full h-32 p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white resize-none"
                    placeholder="What is this course about?"
                />
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-500 uppercase">Category</label>
                    <select 
                        value={formData.category} 
                        onChange={e => setFormData({...formData, category: e.target.value})}
                        className="w-full p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 dark:text-white outline-none"
                    >
                         <option>General</option>
                         <option>Development</option>
                         <option>Design</option>
                         <option>Business</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-500 uppercase">Difficulty</label>
                    <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                        {['Beginner', 'Intermediate', 'Advanced'].map(lvl => (
                            <button
                                key={lvl}
                                onClick={() => setFormData({...formData, level: lvl})}
                                className={cn(
                                    "flex-1 py-2 rounded text-xs font-bold transition-all",
                                    formData.level === lvl 
                                        ? "bg-white dark:bg-gray-600 shadow-sm text-indigo-600 dark:text-white" 
                                        : "text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                                )}
                            >
                                {lvl}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                 <label className="text-sm font-bold text-gray-500 uppercase">Cover Artwork</label>
                 <div 
                    className={cn(
                        "border-2 border-dashed rounded-xl h-48 flex flex-col items-center justify-center relative overflow-hidden transition-all group",
                        uploading ? "bg-indigo-50 border-indigo-300" : "border-gray-300 hover:border-indigo-400 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
                    )}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                        e.preventDefault();
                        handleImageUpload(e.dataTransfer.files[0]);
                    }}
                    onClick={() => document.getElementById('step1-upload').click()}
                 >
                    {formData.image_url ? (
                        <>
                            <img src={formData.image_url} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <p className="text-white font-bold">Click to Change</p>
                            </div>
                        </>
                    ) : (
                        <div className="text-center text-gray-400">
                             <span className="text-4xl">🖼️</span>
                             <p className="font-bold mt-2">Drag & Drop Image</p>
                             <p className="text-xs">or click to browse</p>
                        </div>
                    )}
                    <input id="step1-upload" type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e.target.files[0])} />
                 </div>
            </div>
        </motion.div>
    );
}

const shakeVariant = {
  shake: {
    x: [0, -10, 10, -10, 10, 0],
    transition: { duration: 0.4 }
  }
};

function Step2Curriculum({ courseId, lessons, fetchLessons, addToast }) {
    const [isAdding, setIsAdding] = useState(false);
    const [newLessonTitle, setNewLessonTitle] = useState('');
    const [shake, setShake] = useState(false);
    
    // Local state for drag and drop to avoid flicker
    const [orderedLessons, setOrderedLessons] = useState(lessons);

    useEffect(() => {
        setOrderedLessons(lessons);
    }, [lessons]);

    const handleReorder = async (newOrder) => {
        setOrderedLessons(newOrder); // Optimistic update
        
        // Prepare payload: array of { id, order_index }
        // Although the API receives just the array of lessons, let's look at the implementation.
        // The server implementation:
        // app.post('/api/courses/:id/reorder-lessons', (req, res) => {
        //     const { order } = req.body; // Array of { id: lessonId, order_index: newIndex }
        //     ...
        //     order.forEach((item, index) => { stmt.run(index, item.id); });
        
        // So the server expects an array of objects but then uses the INDEX of the array as the order index.
        // So we just need to send the array of { id } in the correct order.
        // But wait, the server code `stmt.run(index, item.id)` iterates over `order` array.
        // So if we send `[{id: 5}, {id: 2}, {id: 8}]`, it will set:
        // lesson 5 -> order 0
        // lesson 2 -> order 1
        // lesson 8 -> order 2
        
        try {
            await axios.post(`${API_URL}/api/courses/${courseId}/reorder-lessons`, {
                order: newOrder.map(l => ({ id: l.id }))
            });
            // No need to fetchLessons() here if we trust the optimistic update, 
            // but fetching ensures consistency.
            // fetching might Cause a jump if server returns different data.
            // Let's rely on optimistic for now and maybe silent fetch later.
        } catch (err) {
            console.error("Reorder failed", err);
            addToast('Failed to save order', 'error');
            fetchLessons(); // Revert on error
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if(!newLessonTitle.trim()) {
            setShake(true);
            setTimeout(() => setShake(false), 500);
            return;
        }
        try {
            const formData = new FormData();
            formData.append('course_id', courseId);
            formData.append('title', newLessonTitle);
            formData.append('content', 'Draft content');
            
            await axios.post(`${API_URL}/api/lessons`, formData);
            setNewLessonTitle('');
            setIsAdding(false);
            fetchLessons();
            addToast('Module added', 'success');
        } catch(err) {
            addToast('Failed to add module', 'error');
        }
    };

    return (
        <motion.div
             initial={{ opacity: 0, x: -20 }} 
             animate={{ opacity: 1, x: 0 }} 
             exit={{ opacity: 0, x: 20 }}
             className="space-y-6"
        >
            <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-gray-800 dark:text-white">Curriculum</h3>
                <button 
                    onClick={() => setIsAdding(true)} 
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow hover:bg-indigo-700 flex items-center gap-2"
                >
                    <span>+</span> Add Module
                </button>
            </div>

            {/* Quick Add Form */}
            <AnimatePresence>
                {isAdding && (
                    <motion.form 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        onSubmit={handleAdd}
                        className="bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800"
                    >
                        <motion.div
                            variants={shakeVariant}
                            animate={shake ? "shake" : ""}
                        >
                            <input 
                                autoFocus
                                placeholder="e.g. Introduction to React"
                                value={newLessonTitle}
                                onChange={e => setNewLessonTitle(e.target.value)}
                                className={cn(
                                    "w-full p-2 rounded border mb-2 dark:bg-gray-800 dark:text-white transition-colors",
                                    shake ? "border-red-500 bg-red-50 dark:bg-red-900/20" : "dark:border-gray-600"
                                )}
                            />
                        </motion.div>
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setIsAdding(false)} className="text-sm font-bold text-gray-500">Cancel</button>
                            <button type="submit" className="text-sm font-bold text-indigo-600 dark:text-indigo-400">Save Module</button>
                        </div>
                    </motion.form>
                )}
            </AnimatePresence>

            {/* Reorderable Lesson List */}
            <Reorder.Group 
                axis="y" 
                values={orderedLessons} 
                onReorder={handleReorder} 
                className="space-y-3"
            >
                {orderedLessons.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 border-2 border-dashed rounded-xl">
                        <p>No lessons yet. Click "Add Module" to start.</p>
                    </div>
                ) : (
                    orderedLessons.map((lesson, idx) => (
                        <Reorder.Item key={lesson.id} value={lesson} id={lesson.id} style={{ listStyle: 'none' }}>
                             <LessonItem 
                                lesson={lesson} 
                                index={idx} 
                                onUpdate={fetchLessons}
                                addToast={addToast}
                            />
                        </Reorder.Item>
                    ))
                )}
            </Reorder.Group>
        </motion.div>
    );
}

function LessonItem({ lesson, index, onUpdate, addToast }) {
    const [expanded, setExpanded] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileUpload = async (e) => {
        const selectedFiles = e.target.files || e.dataTransfer.files;
        if (!selectedFiles || selectedFiles.length === 0) return;

        setUploading(true);
        const data = new FormData();
        Array.from(selectedFiles).forEach(file => {
            data.append('files', file);
        });

        try {
            await axios.post(`${API_URL}/api/lessons/${lesson.id}/files`, data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            addToast('Files added successfully', 'success');
            onUpdate(); // Refresh lessons to show new files
        } catch (err) {
            console.error(err);
            addToast('Failed to upload files', 'error');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDeleteFile = async (fileId) => {
        if(!confirm('Delete this file?')) return;
        try {
            await axios.delete(`${API_URL}/api/files/${fileId}`);
            onUpdate();
            addToast('File deleted', 'success');
        } catch (err) {
            addToast('Failed to delete file', 'error');
        }
    };

    const handleDelete = async () => {
         if(confirm('Delete this lesson?')) {
             try {
                 await axios.delete(`${API_URL}/api/lessons/${lesson.id}`);
                 onUpdate();
                 addToast('Lesson deleted', 'success');
             } catch(err) {
                 addToast('Failed to delete', 'error');
             }
         }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing">
            <div 
                className="p-4 flex items-center justify-between bg-gray-50 dark:bg-gray-700/30"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-4">
                    <span className="text-gray-400 cursor-grab dark:text-gray-500">
                         {/* Grip Icon */}
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" /></svg>
                    </span>
                    <span className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-sm">
                        {index + 1}
                    </span>
                    <span className="font-bold text-gray-700 dark:text-gray-200">{lesson.title}</span>
                </div>
                <div className="flex items-center gap-3">
                     <span className="text-xs text-gray-400">{lesson.files?.length || 0} files</span>
                     <button className="text-gray-400 hover:text-indigo-600 transition">
                        <svg className={`w-5 h-5 transform transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                     </button>
                </div>
            </div>

            <AnimatePresence>
                {expanded && (
                    <motion.div 
                        initial={{ height: 0 }} 
                        animate={{ height: 'auto' }} 
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 border-t dark:border-gray-700 bg-white dark:bg-gray-800">
                             {/* Media Drop Zone */}
                             <div 
                                className={`border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-6 flex flex-col items-center justify-center text-gray-400 mb-4 transition-colors cursor-pointer ${uploading ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    handleFileUpload(e);
                                }}
                                onClick={() => fileInputRef.current?.click()}
                             >
                                 <span className="text-2xl mb-2">{uploading ? '⏳' : '📂'}</span>
                                 <p className="text-xs font-bold uppercase">{uploading ? 'Uploading...' : 'Drag & Drop Media'}</p>
                                 <p className="text-[10px] text-gray-400 text-center mt-1">Videos, PDFs, Documents</p>
                                 <input 
                                    ref={fileInputRef}
                                    type="file" 
                                    className="hidden" 
                                    multiple
                                    onChange={handleFileUpload} 
                                />
                             </div>

                             {/* Files List */}
                             {lesson.files && lesson.files.map(file => (
                                 <div key={file.id} className="flex justify-between items-center py-2 border-b dark:border-gray-700 last:border-0">
                                     <div className="flex items-center gap-2 overflow-hidden">
                                         <span className="text-xs">
                                             {file.file_type === 'video' ? '🎬' : file.file_type === 'pdf' ? '📄' : '📎'}
                                         </span>
                                         <a href={file.file_path} className="text-sm truncate text-indigo-600 dark:text-indigo-400 max-w-[150px] hover:underline" target='_blank' rel='noreferrer'>{file.original_name}</a>
                                     </div>
                                     <button className="text-xs text-red-500 hover:underline" onClick={() => handleDeleteFile(file.id)}>Remove</button>
                                 </div>
                             ))}
                             
                             <div className="mt-4 flex justify-between">
                                 <div />
                                 <button onClick={handleDelete} className="text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 px-3 py-2 rounded">
                                     Delete Module
                                 </button>
                             </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function Step3Publish({ formData, lessons }) {
    return (
        <div className="space-y-6 text-center py-10">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">🚀</span>
            </div>
            <h3 className="text-3xl font-bold text-gray-800 dark:text-white">Ready to Launch?</h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                You've configured <strong>{formData.title}</strong> with <strong>{lessons.length} modules</strong>. 
                Use the preview on the right to verify everything looks perfect.
            </p>
            
            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-xl text-left max-w-sm mx-auto">
                <h4 className="font-bold text-indigo-900 dark:text-indigo-300 mb-2 text-sm uppercase">Summary</h4>
                <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    <li className="flex justify-between"><span>Duration:</span> <span className="font-bold">{formData.duration || 'Not set'}</span></li>
                    <li className="flex justify-between"><span>Level:</span> <span className="font-bold">{formData.level}</span></li>
                    <li className="flex justify-between"><span>Modules:</span> <span className="font-bold">{lessons.length}</span></li>
                </ul>
            </div>
        </div>
    );
}

// --- PREVIEW COMPONENTS ---
function LivePreview({ formData, lessons, step }) {
    return (
        <div className="h-full bg-white dark:bg-gray-900 flex flex-col">
            {/* Header Mock */}
            <div className="h-14 bg-white dark:bg-gray-900 border-b dark:border-gray-800 flex items-center px-4 justify-between shadow-sm">
                <div className="w-24 h-6 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
                <div className="flex gap-2">
                     <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800"></div>
                </div>
            </div>

            {/* Course Display */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="relative h-48 bg-gray-900">
                    {formData.image_url ? (
                        <img src={formData.image_url} className="w-full h-full object-cover opacity-80" alt="Preview"/>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600">No Cover Image</div>
                    )}
                    <div className="absolute bottom-0 left-0 p-6 bg-gradient-to-t from-black/80 to-transparent w-full">
                        <span className="text-xs font-bold bg-indigo-600 text-white px-2 py-1 rounded mb-2 inline-block">
                            {formData.category}
                        </span>
                        <h1 className="text-2xl font-bold text-white mb-1">{formData.title || 'Untitled Course'}</h1>
                        <p className="text-gray-300 text-sm line-clamp-2">{formData.description || 'No description yet.'}</p>
                    </div>
                </div>

                <div className="p-6">
                    {/* Tabs Mock */}
                    <div className="flex gap-6 border-b dark:border-gray-800 mb-6">
                        <div className="pb-2 border-b-2 border-indigo-600 font-bold text-sm">Curriculum</div>
                        <div className="pb-2 text-gray-400 font-bold text-sm">Review</div>
                        <div className="pb-2 text-gray-400 font-bold text-sm">Discussion</div>
                    </div>

                    {/* Lessons List Preview */}
                    <div className="space-y-2">
                        {lessons.length > 0 ? lessons.map((l, i) => (
                            <div key={i} className="flex p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                <div className="mr-3 mt-1">
                                    <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600"></div>
                                </div>
                                <div>
                                    <h5 className="font-bold text-sm text-gray-800 dark:text-gray-200">{l.title}</h5>
                                    <p className="text-xs text-gray-400">{l.files?.length || 0} resources</p>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-6 text-gray-400 text-sm">
                                <p>No curriculum content added yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

