const express = require('express');
const path = require('path');
// Load env vars explicitly from the server directory
require('dotenv').config({ path: path.join(__dirname, '.env') });
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const fs = require('fs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const app = express();
const PORT = 5000;

console.log("--- Email Configuration Check ---");
console.log("Email User:", process.env.EMAIL_USER ? process.env.EMAIL_USER : "MISSING");
console.log("Email Pass:", process.env.EMAIL_PASS ? "LOADED (Hidden)" : "MISSING");
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("WARNING: Email credentials are missing. Check .env file path and content.");
}
console.log("---------------------------------");

// Email Transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// --- 1. SETUP STORAGE ---
const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// --- 2. MIDDLEWARE ---
// Enhanced CORS configuration for file uploads
app.use(cors()); // Allow ALL origins and headers by default (simplest fix)
app.use((req, res, next) => {
    // Log request start
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Started`);
    next();
});

app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
// Increased limits for large file uploads (no practical limit)
app.use(express.json({ limit: '10gb' }));
app.use(express.urlencoded({ limit: '10gb', extended: true }));

// --- 3. DATABASE INIT ---
const db = new sqlite3.Database('school.db');
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT, email TEXT UNIQUE, password TEXT, role TEXT DEFAULT 'student')`);
    db.run(`CREATE TABLE IF NOT EXISTS courses (id INTEGER PRIMARY KEY, title TEXT, description TEXT, image_url TEXT, category TEXT, duration TEXT, level TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS lessons (id INTEGER PRIMARY KEY, course_id INTEGER, title TEXT, content TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS lesson_files (id INTEGER PRIMARY KEY, lesson_id INTEGER, file_path TEXT, file_type TEXT, original_name TEXT)`);
    
    // --- NEW: PROGRESS TRACKING ---
    db.run(`CREATE TABLE IF NOT EXISTS enrollments (id INTEGER PRIMARY KEY, user_id INTEGER, course_id INTEGER, enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id, course_id))`);
    db.run(`CREATE TABLE IF NOT EXISTS user_progress (id INTEGER PRIMARY KEY, user_id INTEGER, lesson_id INTEGER, completed_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id, lesson_id))`);

    const hash = bcrypt.hashSync('admin123', 10);
    db.run(`INSERT OR IGNORE INTO users (name, email, password, role) VALUES ('Admin', 'admin@lms.com', ?, 'admin')`, [hash]);

    // --- MIGRATION: ADD VERIFICATION COLUMNS ---
    db.run("ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 0", (err) => {
        if (err && !err.message.includes("duplicate column name")) console.error(err);
    });
    db.run("ALTER TABLE users ADD COLUMN verification_token TEXT", (err) => {
        if (err && !err.message.includes("duplicate column name")) console.error(err);
    });

    // --- MIGRATION: ADD COURSE METADATA ---
    db.run("ALTER TABLE courses ADD COLUMN duration TEXT", (err) => {
        if (err && !err.message.includes("duplicate column name")) console.error(err);
    });
    db.run("ALTER TABLE courses ADD COLUMN level TEXT", (err) => {
        if (err && !err.message.includes("duplicate column name")) console.error(err);
    });

    // --- MIGRATION: ADD LESSON ORDER ---
    db.run("ALTER TABLE lessons ADD COLUMN order_index INTEGER DEFAULT 0", (err) => {
        if (err && !err.message.includes("duplicate column name")) console.error(err);
    });
});


// --- 4. MULTER CONFIG ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads/'),
    filename: (req, file, cb) => {
        const cleanName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
        cb(null, Date.now() + '-' + cleanName);
    }
});

// Allowed file extensions
const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.pptx', '.ppt', '.mp4', '.webm', '.mov', '.jpg', '.jpeg', '.png', '.gif'];

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error(`File type not allowed. Supported types: ${ALLOWED_EXTENSIONS.join(', ')}`));
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { 
        fileSize: 50 * 1024 * 1024 * 1024  // 50GB per file - no practical limit
    }
}).array('files', 20);  

const uploadHandler = (req, res, next) => {
    upload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({ message: 'File too large. Maximum 50GB per file.' });
            }
            if (err.code === 'LIMIT_FILE_COUNT') {
                return res.status(413).json({ message: 'Too many files. Maximum 20 files per upload.' });
            }
            return res.status(400).json({ message: err.message });
        } else if (err) {
            return res.status(400).json({ message: err.message });
        }
        next();
    });
};

// --- 5. HELPER: DELETE PHYSICAL FILE ---
const deleteFileFromDisk = (fileUrl) => {
    if (!fileUrl) return;
    try {
        // Extract filename from URL (http://localhost:5000/uploads/file.mp4 -> file.mp4)
        const fileName = path.basename(fileUrl);
        const fullPath = path.join(__dirname, 'public/uploads', fileName);
        
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath); // Physically delete file
            console.log(`🗑️ Deleted file from disk: ${fileName}`);
        }
    } catch (err) {
        console.error("Error deleting file from disk:", err);
    }
};

// --- 6. ROUTES ---

// Health Check
app.get('/', (req, res) => res.send('API Running'));

// GENERIC UPLOAD (For Course Images, etc.)
app.post('/api/upload', uploadHandler, (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: "No file uploaded" });
    }
    // Return the URL of the first file
    const file = req.files[0];
    const fileUrl = `/uploads/${file.filename}`;
    res.json({ url: fileUrl });
});

// UPLOAD LESSON
app.post('/api/lessons', uploadHandler, (req, res) => {
    const { course_id, title, content } = req.body;
    if (!course_id || !title) return res.status(400).json({ error: "Missing fields" });

    db.run("INSERT INTO lessons (course_id, title, content) VALUES (?,?,?)", 
        [course_id, title, content], 
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            const lessonId = this.lastID;

            if (!req.files || req.files.length === 0) return res.json({ success: true });

            const promises = req.files.map(file => {
                return new Promise((resolve, reject) => {
                    // Use relative path so it works across different domains/devices
                    const filePath = `/uploads/${file.filename}`;
                     const ext = path.extname(file.filename).toLowerCase();
                    let type = 'doc';
                    
                    // Determine file type based on extension
                    if (['.mp4', '.webm', '.mov'].includes(ext)) type = 'video';
                    else if (['.pdf'].includes(ext)) type = 'pdf';
                    else if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) type = 'image';
                    else if (['.ppt', '.pptx'].includes(ext)) type = 'ppt';
                    else if (['.doc', '.docx'].includes(ext)) type = 'doc';

                    db.run("INSERT INTO lesson_files (lesson_id, file_path, file_type, original_name) VALUES (?,?,?,?)",
                        [lessonId, filePath, type, file.originalname], (err) => err ? reject(err) : resolve()
                    );
                });
            });

            Promise.all(promises)
                .then(() => res.json({ success: true }))
                .catch(err => res.status(500).json({ error: err.message }));
        }
    );
});

// ADD FILES TO EXISTING LESSON
app.post('/api/lessons/:id/files', uploadHandler, (req, res) => {
    const lessonId = req.params.id;
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
    }

    const promises = req.files.map(file => {
        return new Promise((resolve, reject) => {
            const filePath = `/uploads/${file.filename}`;
            const ext = path.extname(file.filename).toLowerCase();
            let type = 'doc';
            
            if (['.mp4', '.webm', '.mov'].includes(ext)) type = 'video';
            else if (['.pdf'].includes(ext)) type = 'pdf';
            else if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) type = 'image';
            else if (['.ppt', '.pptx'].includes(ext)) type = 'ppt';
            else if (['.doc', '.docx'].includes(ext)) type = 'doc';

            db.run("INSERT INTO lesson_files (lesson_id, file_path, file_type, original_name) VALUES (?,?,?,?)",
                [lessonId, filePath, type, file.originalname], 
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    });

    Promise.all(promises)
        .then(() => res.json({ success: true, message: "Files added" }))
        .catch(err => res.status(500).json({ error: err.message }));
});

// GET COURSES
app.get('/api/courses', (req, res) => db.all("SELECT * FROM courses", [], (err, rows) => res.json(rows)));

// CREATE COURSE
app.post('/api/courses', (req, res) => {
    const { title, description, image_url, category, duration, level } = req.body;
    db.run("INSERT INTO courses (title, description, image_url, category, duration, level) VALUES (?,?,?,?,?,?)", 
        [title, description, image_url, category, duration, level], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
        });
});

// UPDATE COURSE
app.put('/api/courses/:id', (req, res) => {
    const { title, description, image_url, category, duration, level } = req.body;
    db.run("UPDATE courses SET title = ?, description = ?, image_url = ?, category = ?, duration = ?, level = ? WHERE id = ?", 
        [title, description, image_url, category, duration, level, req.params.id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
});

// GET FULL COURSE DATA
app.get('/api/course/:id', (req, res) => {
    const id = req.params.id;
    db.get("SELECT * FROM courses WHERE id = ?", [id], (err, course) => {
        if (!course) return res.status(404).json({ error: "Not found" });
        
        db.all("SELECT * FROM lessons WHERE course_id = ? ORDER BY order_index ASC, id ASC", [id], (err, lessons) => {
            if (!lessons.length) return res.json({ course, lessons: [] });
            
            const ids = lessons.map(l => l.id).join(',');
            db.all(`SELECT * FROM lesson_files WHERE lesson_id IN (${ids})`, [], (err, files) => {
                const lessonsWithFiles = lessons.map(l => ({
                    ...l,
                    // Filter files and normalize paths (remove legacy localhost:5000)
                    files: files.filter(f => f.lesson_id === l.id).map(f => ({
                        ...f,
                        file_path: f.file_path.replace('http://localhost:5000', '')
                    }))
                }));
                res.json({ course, lessons: lessonsWithFiles });
            });
        });
    });
});

// --- DELETION LOGIC (UPDATED) ---

// 1. DELETE SINGLE FILE
app.delete('/api/files/:id', (req, res) => {
    db.get("SELECT file_path FROM lesson_files WHERE id = ?", [req.params.id], (err, row) => {
        if (row) deleteFileFromDisk(row.file_path); // Delete from disk
        
        db.run("DELETE FROM lesson_files WHERE id = ?", [req.params.id], (err) => {
            if (err) return res.status(500).json(err);
            res.json({ success: true });
        });
    });
});

// 2. DELETE LESSON (AND ITS FILES)
app.delete('/api/lessons/:id', (req, res) => {
    const id = req.params.id;
    // Find all files for this lesson first
    db.all("SELECT file_path FROM lesson_files WHERE lesson_id = ?", [id], (err, rows) => {
        if (rows) {
            rows.forEach(row => deleteFileFromDisk(row.file_path)); // Delete all from disk
        }
        // Now clear DB
        db.run("DELETE FROM lesson_files WHERE lesson_id = ?", [id], () => {
            db.run("DELETE FROM lessons WHERE id = ?", [id], () => res.json({ success: true }));
        });
    });
});
// REORDER LESSONS
app.post('/api/courses/:id/reorder-lessons', (req, res) => {
    const { order } = req.body; // Array of { id: lessonId, order_index: newIndex }
    
    if (!order || !Array.isArray(order)) {
        return res.status(400).json({ error: "Invalid order data" });
    }

    const stmt = db.prepare("UPDATE lessons SET order_index = ? WHERE id = ?");
    
    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        order.forEach((item, index) => {
            stmt.run(index, item.id);
        });
        db.run("COMMIT", (err) => {
            if (err) {
                console.error("Reorder error:", err);
                return res.status(500).json({ error: "Failed to reorder" });
            }
            res.json({ success: true });
        });
        stmt.finalize();
    });
});
// 3. DELETE COURSE (AND ALL LESSONS AND FILES)
app.delete('/api/courses/:id', (req, res) => {
    const id = req.params.id;
    
    // Get all lesson IDs for this course
    db.all("SELECT id FROM lessons WHERE course_id = ?", [id], (err, lessons) => {
        const lessonIds = lessons.map(l => l.id);
        
        if (lessonIds.length > 0) {
            const placeholders = lessonIds.map(() => '?').join(',');
            
            // Get all files for these lessons
            db.all(`SELECT file_path FROM lesson_files WHERE lesson_id IN (${placeholders})`, lessonIds, (err, files) => {
                if (files) {
                    files.forEach(f => deleteFileFromDisk(f.file_path)); // Delete from disk
                }

                // Delete DB records
                db.run(`DELETE FROM lesson_files WHERE lesson_id IN (${placeholders})`, lessonIds, () => {
                    db.run("DELETE FROM lessons WHERE course_id = ?", [id], () => {
                        db.run("DELETE FROM courses WHERE id = ?", [id], () => res.json({ success: true }));
                    });
                });
            });
        } else {
            // No lessons, just delete course
            db.run("DELETE FROM courses WHERE id = ?", [id], () => res.json({ success: true }));
        }
    });
});

// --- PROGRESS & DASHBOARD ROUTES ---

// 1. Enroll User in Course
app.post('/api/enroll', (req, res) => {
    const { userId, courseId } = req.body;
    db.run("INSERT OR IGNORE INTO enrollments (user_id, course_id) VALUES (?, ?)", [userId, courseId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// 2. Check Enrollment Status
app.get('/api/users/:userId/enrollment/:courseId', (req, res) => {
    const { userId, courseId } = req.params;
    db.get("SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?", [userId, courseId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ enrolled: !!row });
    });
});

// 3. Toggle Lesson Completion
app.post('/api/progress', (req, res) => {
    const { userId, lessonId, completed } = req.body;
    if (completed) {
        db.run("INSERT OR IGNORE INTO user_progress (user_id, lesson_id) VALUES (?, ?)", [userId, lessonId], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    } else {
        db.run("DELETE FROM user_progress WHERE user_id = ? AND lesson_id = ?", [userId, lessonId], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    }
});

// 4. Get User's Completed Lessons for a Course
app.get('/api/users/:userId/course/:courseId/progress', (req, res) => {
    const { userId, courseId } = req.params;
    // Get all lesson IDs for this course first
    db.all("SELECT id FROM lessons WHERE course_id = ?", [courseId], (err, lessons) => {
        if (err) return res.status(500).json({ error: err.message });
        if (lessons.length === 0) return res.json({ completedLessonIds: [] });

        const lessonIds = lessons.map(l => l.id);
        const placeholders = lessonIds.map(() => '?').join(',');
        
        // Find which of these are completed by user
        db.all(
            `SELECT lesson_id FROM user_progress WHERE user_id = ? AND lesson_id IN (${placeholders})`, 
            [userId, ...lessonIds], 
            (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ completedLessonIds: rows.map(r => r.lesson_id) });
            }
        );
    });
});

// 5. DASHBOARD DATA (My Courses + Progress)
app.get('/api/users/:userId/dashboard', (req, res) => {
    const userId = req.params.userId;
    
    // 1. Get Enrolled Courses
    const query = `
        SELECT c.*, e.enrolled_at 
        FROM courses c 
        JOIN enrollments e ON c.id = e.course_id 
        WHERE e.user_id = ?
        ORDER BY e.enrolled_at DESC
    `;
    
    db.all(query, [userId], (err, courses) => {
        if (err) return res.status(500).json({ error: err.message });
        if (courses.length === 0) return res.json([]);

        // 2. Fetch progress statistics for each course
        const coursesWithStats = [];
        let completed = 0;

        courses.forEach(course => {
            db.all("SELECT id FROM lessons WHERE course_id = ?", [course.id], (err, lessons) => {
                const totalLessons = lessons.length;
                
                if (totalLessons === 0) {
                    coursesWithStats.push({ ...course, totalLessons: 0, completedLessons: 0, progress: 0 });
                    if (coursesWithStats.length === courses.length) res.json(coursesWithStats);
                    return;
                }

                const lessonIds = lessons.map(l => l.id);
                const placeholders = lessonIds.map(() => '?').join(',');

                db.get(
                    `SELECT COUNT(*) as count FROM user_progress WHERE user_id = ? AND lesson_id IN (${placeholders})`,
                    [userId, ...lessonIds],
                    (err, row) => {
                        const completedCount = row ? row.count : 0;
                        const progress = Math.round((completedCount / totalLessons) * 100);
                        
                        coursesWithStats.push({ 
                            ...course, 
                            totalLessons, 
                            completedLessons: completedCount, 
                            progress 
                        });

                        if (coursesWithStats.length === courses.length) {
                             // Sort by enrollment time (newest first) to maintain order from initial query
                             coursesWithStats.sort((a,b) => new Date(b.enrolled_at) - new Date(a.enrolled_at));
                             res.json(coursesWithStats);
                        }
                    }
                );
            });
        });
    });
});


// --- AUTH ---
app.post('/api/register', (req, res) => {
    const { name, email, password } = req.body;
    const hash = bcrypt.hashSync(password, 10);
    const token = crypto.randomBytes(32).toString('hex');

    db.run("INSERT INTO users (name, email, password, is_verified, verification_token) VALUES (?,?,?,0,?)", [name, email, hash, token], 
        (err) => {
            if (err) return res.status(400).json({error: "Email exists"});

            const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}`;
            
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Verify your email - K-LMS',
                html: `
                    <h2>Welcome to K-LMS!</h2>
                    <p>Please verify your email by clicking the link below:</p>
                    <a href="${verificationUrl}">${verificationUrl}</a>
                `
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.log(error);
                    return res.json({ success: true, message: "Registered, but email failed to send. Contact admin." }); 
                }
                console.log('Email sent: ' + info.response);
                res.json({ success: true, message: "Registration successful! Please check your email to verify account." });
            });
        }
    );
});

app.get('/api/verify-email', (req, res) => {
    const { token } = req.query;
    db.get("SELECT * FROM users WHERE verification_token = ?", [token], (err, user) => {
        if (!user) return res.status(400).json({ error: "Invalid or expired token" });

        db.run("UPDATE users SET is_verified = 1, verification_token = NULL WHERE id = ?", [user.id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, message: "Email verified successfully!" });
        });
    });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    db.get("SELECT * FROM users WHERE email = ?", [email], (err, user) => {
        if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: "Invalid credentials" });
        
        if (user.role !== 'admin' && user.is_verified === 0) {
            return res.status(403).json({ error: "Please verify your email address first." });
        }

        res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    });
});


app.get('/api/users', (req, res) => db.all("SELECT id, name, email, role FROM users", [], (err, rows) => res.json(rows)));

// UPDATE USER ROLE
app.put('/api/users/:id/role', (req, res) => {
    const { role } = req.body;
    db.run("UPDATE users SET role = ? WHERE id = ?", [role, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.delete('/api/users/:id', (req, res) => db.run("DELETE FROM users WHERE id = ?", [req.params.id], () => res.json({ success: true })));

// --- 7. DEBUG & START ---
process.on('exit', (code) => {
    console.log(`Process exited with code: ${code}`);
});

process.on('SIGINT', () => {
    console.log('Received SIGINT. Press Control-D to exit.');
});

const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Uploads directory: ${uploadDir}`);
    console.log(`Database: school.db`);
});

server.on('close', () => {
    console.log('Server closed');
});

server.on('error', (err) => {
    console.error('Server error:', err);
});

// Keep process alive explicitly (though app.listen should do this)
setInterval(() => {}, 1000 * 60 * 60);

server.keepAliveTimeout = 1200000;
server.headersTimeout = 1200000;
server.timeout = 0; // Disable socket timeout for large files

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});