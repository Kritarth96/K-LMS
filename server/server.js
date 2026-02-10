const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 5000;

// --- 1. SETUP STORAGE ---
const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// --- 2. MIDDLEWARE ---
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));

// --- 3. DATABASE INIT ---
const db = new sqlite3.Database('school.db');
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT, email TEXT UNIQUE, password TEXT, role TEXT DEFAULT 'student')`);
    db.run(`CREATE TABLE IF NOT EXISTS courses (id INTEGER PRIMARY KEY, title TEXT, description TEXT, image_url TEXT, category TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS lessons (id INTEGER PRIMARY KEY, course_id INTEGER, title TEXT, content TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS lesson_files (id INTEGER PRIMARY KEY, lesson_id INTEGER, file_path TEXT, file_type TEXT, original_name TEXT)`);

    const hash = bcrypt.hashSync('admin123', 10);
    db.run(`INSERT OR IGNORE INTO users (name, email, password, role) VALUES ('Admin', 'admin@lms.com', ?, 'admin')`, [hash]);
});

// --- 4. MULTER CONFIG ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads/'),
    filename: (req, file, cb) => {
        const cleanName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
        cb(null, Date.now() + '-' + cleanName);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 * 1024 } // 2GB
}).array('files', 20); 

const uploadHandler = (req, res, next) => {
    upload(req, res, function (err) {
        if (err) return res.status(500).json({ error: err.message });
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
                    const filePath = `http://localhost:5000/uploads/${file.filename}`;
                    const ext = path.extname(file.filename).toLowerCase();
                    let type = 'doc';
                    if (['.mp4','.webm','.mov'].includes(ext)) type = 'video';
                    else if (['.pdf'].includes(ext)) type = 'pdf';
                    else if (['.jpg','.jpeg','.png'].includes(ext)) type = 'image';
                    else if (['.ppt','.pptx'].includes(ext)) type = 'ppt';

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

// GET COURSES
app.get('/api/courses', (req, res) => db.all("SELECT * FROM courses", [], (err, rows) => res.json(rows)));

// CREATE COURSE
app.post('/api/courses', (req, res) => {
    const { title, description, image_url, category } = req.body;
    db.run("INSERT INTO courses (title, description, image_url, category) VALUES (?,?,?,?)", 
        [title, description, image_url, category], () => res.json({ success: true }));
});

// UPDATE COURSE
app.put('/api/courses/:id', (req, res) => {
    const { title, description, image_url, category } = req.body;
    db.run("UPDATE courses SET title = ?, description = ?, image_url = ?, category = ? WHERE id = ?", 
        [title, description, image_url, category, req.params.id], () => res.json({ success: true }));
});

// GET FULL COURSE DATA
app.get('/api/course/:id', (req, res) => {
    const id = req.params.id;
    db.get("SELECT * FROM courses WHERE id = ?", [id], (err, course) => {
        if (!course) return res.status(404).json({ error: "Not found" });
        
        db.all("SELECT * FROM lessons WHERE course_id = ?", [id], (err, lessons) => {
            if (!lessons.length) return res.json({ course, lessons: [] });
            
            const ids = lessons.map(l => l.id).join(',');
            db.all(`SELECT * FROM lesson_files WHERE lesson_id IN (${ids})`, [], (err, files) => {
                const lessonsWithFiles = lessons.map(l => ({
                    ...l,
                    files: files.filter(f => f.lesson_id === l.id)
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

// --- AUTH ---
app.post('/api/register', (req, res) => {
    const { name, email, password } = req.body;
    const hash = bcrypt.hashSync(password, 10);
    db.run("INSERT INTO users (name, email, password) VALUES (?,?,?)", [name, email, hash], 
        (err) => err ? res.status(400).json({error: "Email exists"}) : res.json({ success: true }));
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    db.get("SELECT * FROM users WHERE email = ?", [email], (err, user) => {
        if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: "Invalid credentials" });
        res.json({ user: { id: user.id, name: user.name, role: user.role } });
    });
});

app.get('/api/users', (req, res) => db.all("SELECT id, name, email, role FROM users", [], (err, rows) => res.json(rows)));
app.delete('/api/users/:id', (req, res) => db.run("DELETE FROM users WHERE id = ?", [req.params.id], () => res.json({ success: true })));

// --- START ---
const server = app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
server.keepAliveTimeout = 1200000;
server.headersTimeout = 1200000;