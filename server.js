const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;
const SECRET_KEY = 'your-secret-key-change-this-in-production-12345';

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public')); // 'public' folder for frontend

const db = mysql.createConnection({
   host: '127.0.0.1',     // Try this instead of 'localhost'
  port: 3306,
  user: 'root',      // <--- Change to your MySQL username
  password: 'PUNEE13@work',      // <--- Change to your MySQL password
  database: 'skillbridge'
});

db.connect((err) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
    return;
  }
  console.log('✓ Connected to MySQL database');
});

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// ============= USER AUTH =============

app.post('/api/signup', async (req, res) => {
  const { email, phone, password } = req.body;

  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  try {
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (results.length > 0) return res.status(400).json({ error: 'User already exists with this email' });

      const hashedPassword = await bcrypt.hash(password, 10);
      db.query(
        'INSERT INTO users (email, phone, password) VALUES (?, ?, ?)',
        [email, phone, hashedPassword],
        (err, result) => {
          if (err) return res.status(500).json({ error: 'Failed to create user' });
          const token = jwt.sign({ id: result.insertId, email }, SECRET_KEY, { expiresIn: '24h' });
          res.json({ success: true, token, userId: result.insertId });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (results.length === 0) return res.status(400).json({ error: 'Invalid email or password' });

    const user = results[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, { expiresIn: '24h' });
    res.json({ success: true, token, userId: user.id });
  });
});

// ============= WORKER REGISTRATION =============

app.post('/api/worker/register', authenticateToken, (req, res) => {
  const {
    name, phone, email, occupation, experience, specialties,
    hourly_rate, available_hours, location, travel_radius,
    work_areas, description, certifications
  } = req.body;

  if (!name || !phone || !email || !occupation || !experience || !hourly_rate || !location)
    return res.status(400).json({ error: 'All required fields must be filled' });

  const specialtiesStr = Array.isArray(specialties) ? JSON.stringify(specialties) : specialties || '[]';
  const workAreasStr = Array.isArray(work_areas) ? JSON.stringify(work_areas) : work_areas || '[]';

  const workerData = {
    user_id: req.user.id,
    name, phone, email, occupation, experience,
    specialties: specialtiesStr,
    hourly_rate: parseInt(hourly_rate),
    available_hours: available_hours || 'flexible',
    location,
    travel_radius: travel_radius || '10',
    work_areas: workAreasStr,
    description: description || '',
    certifications: certifications || ''
  };

  db.query('INSERT INTO workers SET ?', workerData, (err, result) => {
    if (err) return res.status(500).json({ error: 'Failed to register worker profile' });
    res.json({ success: true, message: 'Worker profile created successfully', workerId: result.insertId });
  });
});

// ============= LIST/QUERY WORKERS =============

app.get('/api/workers', (req, res) => {
  const { occupation, location, min_rate, max_rate, sort } = req.query;
  let query = 'SELECT * FROM workers WHERE 1=1';
  const params = [];

  if (occupation) {
    query += ' AND occupation = ?';
    params.push(occupation);
  }
  if (location) {
    query += ' AND location LIKE ?';
    params.push(`%${location}%`);
  }
  if (min_rate) {
    query += ' AND hourly_rate >= ?';
    params.push(parseInt(min_rate));
  }
  if (max_rate) {
    query += ' AND hourly_rate <= ?';
    params.push(parseInt(max_rate));
  }
  // Sorting
  if (sort === 'rating') {
    query += ' ORDER BY rating DESC';
  } else if (sort === 'price-low') {
    query += ' ORDER BY hourly_rate ASC';
  } else if (sort === 'price-high') {
    query += ' ORDER BY hourly_rate DESC';
  } else if (sort === 'experience') {
    query += ' ORDER BY CAST(experience AS UNSIGNED) DESC';
  } else {
    query += ' ORDER BY created_at DESC';
  }
  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch workers' });
    res.json({ success: true, workers: results });
  });
});

app.get('/api/workers/:id', (req, res) => {
  const workerId = req.params.id;
  db.query('SELECT * FROM workers WHERE id = ?', [workerId], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (results.length === 0) return res.status(404).json({ error: 'Worker not found' });
    res.json({ success: true, worker: results[0] });
  });
});

app.get('/api/worker/profile', authenticateToken, (req, res) => {
  db.query('SELECT * FROM workers WHERE user_id = ?', [req.user.id], (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (results.length === 0) return res.status(404).json({ error: 'Worker profile not found' });
    res.json({ success: true, worker: results[0] });
  });
});

app.put('/api/worker/update', authenticateToken, (req, res) => {
  const updates = req.body;
  if (updates.specialties && Array.isArray(updates.specialties)) updates.specialties = JSON.stringify(updates.specialties);
  if (updates.work_areas && Array.isArray(updates.work_areas)) updates.work_areas = JSON.stringify(updates.work_areas);

  db.query('UPDATE workers SET ? WHERE user_id = ?', [updates, req.user.id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Failed to update profile' });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Worker profile not found' });
    res.json({ success: true, message: 'Profile updated successfully' });
  });
});

// ============= SERVE FRONTEND APP =============

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at: http://localhost:${PORT}`);
});
