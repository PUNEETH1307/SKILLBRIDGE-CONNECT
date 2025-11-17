const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;


app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));

// Database connection pool
const pool = mysql.createPool({
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: 'PUNEE13@work',
  database: 'skillbridge',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

pool.getConnection()
  .then((connection) => {
    console.log('✅ Connected to MySQL database successfully');
    connection.release();
  })
  .catch((err) => {
    console.error('❌ Database connection failed:', err);
  });

// ============= AUTHENTICATION MIDDLEWARE =============

const SECRET_KEY = 'your-secret-key-change-this-in-production-12345';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Token required' });
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      console.error('❌ JWT Error:', err.message);
      return res.status(403).json({ success: false, message: 'Invalid token: ' + err.message });
    }
    req.user = user;
    next();
  });
};

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const connection = await pool.getConnection();
    const [users] = await connection.query('SELECT * FROM users WHERE email = ?', [email]);

    if (users.length === 0 || !await bcrypt.compare(password, users[0].password)) {
      connection.release();
      return res.json({ success: false, message: 'Invalid credentials' });
    }

    const user = users[0];
    const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, { expiresIn: '7d' });
    connection.release();

    console.log('✅ Login success, token created with SECRET_KEY');
    res.json({ success: true, token: token, data: { userId: user.id, email: user.email } });
  } catch (error) {
    res.json({ success: false, message: 'Login error: ' + error.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, phone, password, userType } = req.body;
    const connection = await pool.getConnection();
    const [existing] = await connection.query('SELECT id FROM users WHERE email = ?', [email]);

    if (existing.length > 0) {
      connection.release();
      return res.json({ success: false, message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await connection.query(
      'INSERT INTO users (email, phone, password, user_type, created_at) VALUES (?, ?, ?, ?, NOW())',
      [email, phone, hashedPassword, userType || 'customer']
    );

    const token = jwt.sign({ id: result.insertId, email: email }, SECRET_KEY, { expiresIn: '7d' });
    connection.release();

    console.log('✅ Signup success, token created with SECRET_KEY');
    res.json({ success: true, token: token, data: { userId: result.insertId, email: email } });
  } catch (error) {
    res.json({ success: false, message: 'Signup error: ' + error.message });
  }
});


// ============= AUTH ROUTES =============

// SIGNUP
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, phone, password, userType } = req.body;
    console.log('📝 Signup request:', email);

    if (!email || !password) {
      return res.json({ success: false, message: 'Email and password required' });
    }

    const connection = await pool.getConnection();
    const [existing] = await connection.query('SELECT id FROM users WHERE email = ?', [email]);

    if (existing.length > 0) {
      connection.release();
      return res.json({ success: false, message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await connection.query(
      'INSERT INTO users (email, phone, password, user_type, created_at) VALUES (?, ?, ?, ?, NOW())',
      [email, phone, hashedPassword, userType || 'customer']
    );
    connection.release();

    // Create token with SAME SECRET_KEY
    const token = jwt.sign(
      { id: result.insertId, email: email },
      SECRET_KEY,
      { expiresIn: '7d' }
    );

    console.log('✅ User registered:', email);
    res.json({
      success: true,
      message: 'User registered',
      token: token,
      data: { userId: result.insertId, email: email }
    });
  } catch (error) {
    console.error('❌ Signup error:', error);
    res.json({ success: false, message: 'Signup error: ' + error.message });
  }
});

// LOGIN
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('🔐 Login request:', email);

    if (!email || !password) {
      return res.json({ success: false, message: 'Email and password required' });
    }

    const connection = await pool.getConnection();
    const [users] = await connection.query('SELECT * FROM users WHERE email = ?', [email]);

    if (users.length === 0) {
      connection.release();
      return res.json({ success: false, message: 'Invalid email or password' });
    }

    const user = users;
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      connection.release();
      return res.json({ success: false, message: 'Invalid email or password' });
    }

    connection.release();

    // Create token with SAME SECRET_KEY
    const token = jwt.sign(
      { id: user.id, email: user.email },
      SECRET_KEY,
      { expiresIn: '7d' }
    );

    console.log('✅ User logged in:', email);
    res.json({
      success: true,
      message: 'Login successful',
      token: token,
      data: { userId: user.id, email: user.email }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.json({ success: false, message: 'Login error: ' + error.message });
  }
});

// ============= WORKER ROUTES =============

// CREATE WORKER PROFILE
// Submit or update a rating


// ============= RATING ROUTES =============

// Submit a rating
// Register new worker
app.post('/api/workers', authenticateToken, async (req, res) => {
  try {
    const {
      name, phone, email, occupation, experience, specialties,
      hourly_rate, available_hours, location, travel_radius,
      service_areas, description, certifications
    } = req.body;

    const user_id = req.user.id;

    console.log('📝 Worker registration:', { user_id, name, occupation });

    // Validation
    if (!name || !occupation || !hourly_rate || !location) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: name, occupation, hourly_rate, location' 
      });
    }

    if (hourly_rate < 50 || hourly_rate > 5000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Hourly rate must be between 50 and 5000' 
      });
    }

    const connection = await pool.getConnection();

    try {
      // Check if worker already exists for this user
      const [existing] = await connection.query(
        'SELECT id FROM workers WHERE user_id = ?',
        [user_id]
      );

      if (existing.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'You already have a worker profile. Please update it instead.' 
        });
      }

      // Insert worker record
      const [result] = await connection.query(
        `INSERT INTO workers (user_id, name, phone, email, occupation, experience, specialties, hourly_rate, available_hours, location, travel_radius, work_areas, description, certifications, rating, reviews_count) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`,
        [
          user_id,
          name,
          phone || '',
          email || '',
          occupation,
          experience || '1',
          JSON.stringify(specialties || []),
          hourly_rate,
          available_hours || 'flexible',
          location,
          travel_radius || '5',
          JSON.stringify(service_areas || []),
          description || '',
          certifications || ''
        ]
      );

      console.log('✅ Worker registered with ID:', result.insertId);

      return res.status(201).json({
        success: true,
        message: 'Worker profile created successfully',
        data: {
          id: result.insertId,
          name: name,
          occupation: occupation
        }
      });

    } catch (dbError) {
      console.error('❌ Database error:', dbError);
      throw dbError;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('❌ Worker registration error:', error);
    
    // Send proper error response
    return res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + (error.message || 'Unknown error'),
      error: error.message
    });
  }
});
// ============= RATING ROUTES =============

// Submit or update a rating
app.post('/api/ratings', authenticateToken, async (req, res) => {
  try {
    const { worker_id, rating, review } = req.body;
    const user_id = req.user.id;

    if (!worker_id || !rating) {
      return res.json({ success: false, message: 'Worker ID and rating required' });
    }

    // Validate 1-5
    if (rating < 1 || rating > 5) {
      return res.json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    const connection = await pool.getConnection();

    // Check if rating already exists for this user/worker
    const [existing] = await connection.query(
      'SELECT id FROM rating WHERE user_id = ? AND worker_id = ?',
      [user_id, worker_id]
    );

    if (existing.length > 0) {
      await connection.query(
        'UPDATE rating SET rating = ?, review = ? WHERE user_id = ? AND worker_id = ?',
        [rating, review || '', user_id, worker_id]
      );
    } else {
      await connection.query(
        'INSERT INTO rating (worker_id, user_id, rating, review, created_at) VALUES (?, ?, ?, ?, NOW())',
        [worker_id, user_id, rating, review || '']
      );
    }

    // Update worker average & review count
    const [stats] = await connection.query(
      'SELECT AVG(rating) as avg_rating, COUNT(*) as total FROM rating WHERE worker_id = ?',
      [worker_id]
    );

    let avgRating = 0, totalReviews = 0;
    if (stats && stats.length > 0 && stats[0].avg_rating) {
      avgRating = parseFloat(stats[0].avg_rating).toFixed(1);
      totalReviews = stats[0].total;
    }

    await connection.query(
      'UPDATE workers SET rating = ?, reviews_count = ? WHERE id = ?',
      [avgRating, totalReviews, worker_id]
    );

    connection.release();

    res.json({
      success: true,
      message: 'Rating submitted successfully',
      data: { avgRating, totalReviews }
    });
  } catch (error) {
    console.error('❌ Rating error:', error);
    res.json({ success: false, message: 'Rating error: ' + error.message });
  }
});


// Get ratings for a worker
app.get('/api/ratings/:workerId', async (req, res) => {
  try {
    const workerId = req.params.workerId;

    const connection = await pool.getConnection();
    const [ratings] = await connection.query(
      `SELECT r.*, u.email as user_email 
       FROM ratings r 
       LEFT JOIN users u ON r.user_id = u.id 
       WHERE r.worker_id = ? 
       ORDER BY r.created_at DESC`,
      [workerId]
    );
    connection.release();

    res.json({
      success: true,
      data: ratings
    });

  } catch (error) {
    console.error('❌ Get ratings error:', error);
    res.json({ success: false, message: 'Error: ' + error.message });
  }
});

// Get user's rating for a specific worker
app.get('/api/ratings/:workerId/user', authenticateToken, async (req, res) => {
  try {
    const workerId = req.params.workerId;
    const userId = req.user.id;

    const connection = await pool.getConnection();
    const [ratings] = await connection.query(
      'SELECT * FROM ratings WHERE worker_id = ? AND user_id = ?',
      [workerId, userId]
    );
    connection.release();

    res.json({
      success: true,
      data: ratings.length > 0 ? ratings : null
    });

  } catch (error) {
    console.error('❌ Get user rating error:', error);
    res.json({ success: false, message: 'Error: ' + error.message });
  }
});

// GET ALL WORKERS
app.get('/api/workers', async (req, res) => {
  try {
    const { occupation, location, min_rate, max_rate, sort } = req.query;
    let query = 'SELECT * FROM workers WHERE 1=1';
    const params = [];

    if (occupation) {
      query += ' AND LOWER(occupation) = LOWER(?)';
      params.push(occupation);
    }
    if (location) {
      query += ' AND (LOWER(location) LIKE LOWER(?) OR LOWER(service_areas) LIKE LOWER(?))';
      params.push('%' + location + '%', '%' + location + '%');
    }
    if (min_rate) {
      query += ' AND hourly_rate >= ?';
      params.push(parseInt(min_rate));
    }
    if (max_rate) {
      query += ' AND hourly_rate <= ?';
      params.push(parseInt(max_rate));
    }

    if (sort === 'rating') {
      query += ' ORDER BY rating DESC';
    } else if (sort === 'price-low') {
      query += ' ORDER BY hourly_rate ASC';
    } else if (sort === 'price-high') {
      query += ' ORDER BY hourly_rate DESC';
    } else {
      query += ' ORDER BY created_at DESC';
    }

    const connection = await pool.getConnection();
    const [workers] = await connection.query(query, params);
    connection.release();

    res.json({ success: true, data: workers, workers: workers });
  } catch (error) {
    console.error('❌ Get workers error:', error);
    res.json({ success: false, message: 'Error: ' + error.message });
  }
});

// GET SINGLE WORKER
app.get('/api/workers/:id', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [workers] = await connection.query('SELECT * FROM workers WHERE id = ?', [req.params.id]);
    connection.release();

    if (workers.length === 0) {
      return res.json({ success: false, message: 'Worker not found' });
    }

    res.json({ success: true, data: workers, worker: workers });
  } catch (error) {
    console.error('❌ Get worker error:', error);
    res.json({ success: false, message: 'Error: ' + error.message });
  }
});
const multer = require('multer');

const fs = require('fs');

// ============= FILE UPLOAD SETUP =============

// Create uploads folder if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads/certificates');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for PDF uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Allow only PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// ============= CERTIFICATE ROUTES =============

// Upload certificate
app.post('/api/certificates', authenticateToken, upload.single('certificate_file'), async (req, res) => {
  try {
    const { certificate_name, description } = req.body;
    const worker_id = req.user.id;

    console.log('📄 Certificate upload:', { worker_id, certificate_name });

    if (!certificate_name || !req.file) {
      return res.json({ success: false, message: 'Certificate name and PDF file required' });
    }

    const connection = await pool.getConnection();

    try {
      // Insert certificate record
      await connection.query(
        `INSERT INTO certificates (worker_id, certificate_name, description, file_name, file_path, file_size) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          worker_id,
          certificate_name,
          description || '',
          req.file.filename,
          `/uploads/certificates/${req.file.filename}`,
          req.file.size
        ]
      );

      // Update worker certificate count
      const [result] = await connection.query(
        `SELECT COUNT(*) as count FROM certificates WHERE worker_id = ?`,
        [worker_id]
      );
      const certCount = result.count;

      await connection.query(
        `UPDATE workers SET certificate_count = ? WHERE id = ?`,
        [certCount, worker_id]
      );

      console.log('✅ Certificate uploaded successfully');

      res.json({
        success: true,
        message: 'Certificate uploaded successfully',
        data: {
          file_name: req.file.filename,
          file_path: `/uploads/certificates/${req.file.filename}`
        }
      });
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('❌ Certificate upload error:', error);
    
    // Delete uploaded file if database insert fails
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }

    res.json({ success: false, message: 'Certificate upload error: ' + error.message });
  }
});

// Get worker's certificates
app.get('/api/certificates/:workerId', async (req, res) => {
  try {
    const workerId = req.params.workerId;

    const connection = await pool.getConnection();

    try {
      const [certificates] = await connection.query(
        `SELECT id, certificate_name, description, file_path, uploaded_at 
         FROM certificates 
         WHERE worker_id = ? 
         ORDER BY uploaded_at DESC`,
        [workerId]
      );

      res.json({
        success: true,
        data: certificates
      });
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('❌ Get certificates error:', error);
    res.json({ success: false, message: 'Error: ' + error.message });
  }
});

// Delete certificate
app.delete('/api/certificates/:certificateId', authenticateToken, async (req, res) => {
  try {
    const certificateId = req.params.certificateId;
    const userId = req.user.id;

    const connection = await pool.getConnection();

    try {
      // Get certificate info
      const [certs] = await connection.query(
        `SELECT file_name, worker_id FROM certificates WHERE id = ?`,
        [certificateId]
      );

      if (certs.length === 0) {
        return res.json({ success: false, message: 'Certificate not found' });
      }

      const cert = certs;

      // Check if user owns this certificate
      if (cert.worker_id !== userId) {
        return res.json({ success: false, message: 'Unauthorized' });
      }

      // Delete certificate record
      await connection.query(
        `DELETE FROM certificates WHERE id = ?`,
        [certificateId]
      );

      // Delete file
      const filePath = path.join(__dirname, 'uploads/certificates', cert.file_name);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Update certificate count
      const [result] = await connection.query(
        `SELECT COUNT(*) as count FROM certificates WHERE worker_id = ?`,
        [cert.worker_id]
      );
      const certCount = result.count;

      await connection.query(
        `UPDATE workers SET certificate_count = ? WHERE id = ?`,
        [certCount, cert.worker_id]
      );

      console.log('✅ Certificate deleted');

      res.json({
        success: true,
        message: 'Certificate deleted successfully'
      });
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('❌ Delete certificate error:', error);
    res.json({ success: false, message: 'Error: ' + error.message });
  }
});

// Serve uploaded files (with security check)
app.get('/uploads/certificates/:filename', (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(__dirname, 'uploads/certificates', filename);

  // Prevent directory traversal
  if (!filepath.startsWith(path.join(__dirname, 'uploads/certificates'))) {
    return res.status(403).json({ error: 'Access denied' });
  }

  res.download(filepath);
});


// ============= SERVE FRONTEND =============

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   🚀 SkillBridge Server Running        ║
║   📡 http://localhost:${PORT}            ║
║   🗄️  MySQL Connected                  ║
║   🔑 JWT Authentication Ready          ║
╚════════════════════════════════════════╝
  `);
});
