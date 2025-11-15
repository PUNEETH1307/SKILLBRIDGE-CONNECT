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
app.post('/api/workers', authenticateToken, async (req, res) => {
  try {
    const { name, phone, email, occupation, experience, specialties, hourly_rate, available_hours, location, travel_radius, service_areas, description, certifications } = req.body;

    console.log('👤 Worker registration:', name);

    if (!name || !phone || !email || !occupation || !hourly_rate || !location) {
      return res.json({ success: false, message: 'Required fields missing' });
    }

    const connection = await pool.getConnection();
    const specialtiesStr = Array.isArray(specialties) ? JSON.stringify(specialties) : '[]';
    const serviceAreasStr = Array.isArray(service_areas) ? JSON.stringify(service_areas) : '[]';

    const [result] = await connection.query(
      'INSERT INTO workers (user_id, name, phone, email, occupation, experience, specialties, hourly_rate, available_hours, location, travel_radius, service_areas, description, certifications, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
      [req.user.id, name, phone, email, occupation, experience, specialtiesStr, hourly_rate, available_hours || 'flexible', location, travel_radius || '10', serviceAreasStr, description || '', certifications || '']
    );

    connection.release();
    console.log('✅ Worker registered:', name);
    res.json({ success: true, message: 'Worker profile created', data: { workerId: result.insertId } });
  } catch (error) {
    console.error('❌ Worker registration error:', error);
    res.json({ success: false, message: 'Worker error: ' + error.message });
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
