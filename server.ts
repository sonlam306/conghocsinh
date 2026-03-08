import express from 'express';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Setup SQLite Database
const db = new Database('submissions.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fullName TEXT NOT NULL,
    className TEXT NOT NULL,
    school TEXT NOT NULL,
    groupName TEXT NOT NULL,
    filename TEXT NOT NULL,
    originalName TEXT NOT NULL,
    mimeType TEXT NOT NULL,
    size INTEGER NOT NULL,
    submittedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    grade TEXT,
    feedback TEXT
  )
`);

// Add columns if they don't exist (for existing databases)
try {
  db.exec('ALTER TABLE submissions ADD COLUMN grade TEXT');
} catch (e) {
  // Column might already exist
}
try {
  db.exec('ALTER TABLE submissions ADD COLUMN feedback TEXT');
} catch (e) {
  // Column might already exist
}

// Setup Multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

app.use(express.json());

// API Routes
app.post('/api/submit', upload.single('file'), (req, res) => {
  try {
    const { fullName, className, school, groupName } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'File is required' });
    }

    const stmt = db.prepare(`
      INSERT INTO submissions (fullName, className, school, groupName, filename, originalName, mimeType, size)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      fullName,
      className,
      school,
      groupName,
      file.filename,
      file.originalname,
      file.mimetype,
      file.size
    );

    res.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    console.error('Submission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  // Simple hardcoded password for demonstration
  // In a real app, use proper authentication and environment variables
  if (password === 'admin123') {
    res.json({ success: true, token: 'fake-jwt-token-123' });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

// Middleware to check fake token
const checkAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.headers.authorization;
  if (token === 'Bearer fake-jwt-token-123') {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

app.get('/api/admin/submissions', checkAuth, (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM submissions ORDER BY submittedAt DESC');
    const submissions = stmt.all();
    res.json(submissions);
  } catch (error) {
    console.error('Fetch submissions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/admin/download/:id', checkAuth, (req, res) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare('SELECT * FROM submissions WHERE id = ?');
    const submission = stmt.get(id) as any;

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const filePath = path.join(uploadsDir, submission.filename);
    if (fs.existsSync(filePath)) {
      res.download(filePath, submission.originalName);
    } else {
      res.status(404).json({ error: 'File not found on server' });
    }
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/admin/grade/:id', checkAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { grade, feedback } = req.body;
    
    const stmt = db.prepare('UPDATE submissions SET grade = ?, feedback = ? WHERE id = ?');
    const result = stmt.run(grade, feedback, id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Grade error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/admin/submissions/:id', checkAuth, (req, res) => {
  try {
    const { id } = req.params;
    
    // First get the submission to find the filename
    const getStmt = db.prepare('SELECT filename FROM submissions WHERE id = ?');
    const submission = getStmt.get(id) as any;
    
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    
    // Delete from database
    const delStmt = db.prepare('DELETE FROM submissions WHERE id = ?');
    delStmt.run(id);
    
    // Delete file from filesystem
    const filePath = path.join(uploadsDir, submission.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/submissions/search', (req, res) => {
  try {
    const { fullName, className } = req.query;
    if (!fullName || !className) {
      return res.status(400).json({ error: 'Missing search parameters' });
    }
    
    const stmt = db.prepare('SELECT id, fullName, className, school, groupName, originalName, submittedAt, grade, feedback FROM submissions WHERE fullName LIKE ? AND className LIKE ? ORDER BY submittedAt DESC');
    const submissions = stmt.all(`%${fullName}%`, `%${className}%`);
    
    res.json(submissions);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, 'dist')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
