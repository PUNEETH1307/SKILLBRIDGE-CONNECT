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






const http = require('http');
const socketIo = require('socket.io');

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
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

// Get current user profile
app.get('/api/users/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      `SELECT u.id, u.email, u.phone, u.user_type, w.id as worker_id, w.name as worker_name
       FROM users u
       LEFT JOIN workers w ON w.user_id = u.id
       WHERE u.id = ?`,
      [userId]
    );
    connection.release();

    if (!rows || rows.length === 0) {
      return res.json({ success: false, message: 'User not found' });
    }

    const user = rows[0];
    res.json({ 
      success: true, 
      data: { 
        id: user.id, 
        email: user.email, 
        phone: user.phone, 
        user_type: user.user_type, 
        name: user.worker_name || null,
        worker_id: user.worker_id || null
      } 
    });
  } catch (error) {
    console.error('❌ Get current user error:', error);
    res.json({ success: false, message: 'Error: ' + error.message });
  }
});

// Get worker's confirmed services/bookings (for Services view)
app.get('/api/bookings/worker/services', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const connection = await pool.getConnection();

    // Find worker id
    const [workerData] = await connection.query('SELECT id FROM workers WHERE user_id = ?', [userId]);
    if (!workerData || workerData.length === 0) {
      connection.release();
      return res.json({ success: true, data: [] });
    }
    const workerId = workerData[0].id;

    const [bookings] = await connection.query(
      `SELECT b.*, u.email as customer_email, u.phone as customer_phone, u.id as customer_id
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       WHERE b.worker_id = ? AND b.status = 'confirmed'
       ORDER BY b.booking_date DESC, b.start_time DESC`,
      [workerId]
    );

    connection.release();
    res.json({ success: true, data: bookings });
  } catch (error) {
    console.error('❌ Get worker services error:', error);
    res.json({ success: false, message: 'Error: ' + error.message });
  }
});

// Admin stats - requires user to be admin
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const connection = await pool.getConnection();

    // Check admin
    const [usersRows] = await connection.query('SELECT user_type FROM users WHERE id = ?', [userId]);
    if (!usersRows || usersRows.length === 0 || usersRows[0].user_type !== 'admin') {
      connection.release();
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const stats = {};
    const [[{count: usersCount}]] = await connection.query('SELECT COUNT(*) as count FROM users');
    const [[{count: workersCount}]] = await connection.query('SELECT COUNT(*) as count FROM workers');
    const [[{count: bookingsCount}]] = await connection.query('SELECT COUNT(*) as count FROM bookings');
    const [[{pending: pendingCount}]] = await connection.query("SELECT SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending FROM bookings");
    const [[{confirmed: confirmedCount}]] = await connection.query("SELECT SUM(CASE WHEN status='confirmed' THEN 1 ELSE 0 END) as confirmed FROM bookings");
    const [[{avgRating}]] = await connection.query('SELECT AVG(rating) as avgRating FROM workers');
    const [[{count: certCount}]] = await connection.query('SELECT COUNT(*) as count FROM certificates');

    connection.release();

    stats.users = usersCount || 0;
    stats.workers = workersCount || 0;
    stats.bookings_total = bookingsCount || 0;
    stats.bookings_pending = pendingCount || 0;
    stats.bookings_confirmed = confirmedCount || 0;
    stats.avg_rating = parseFloat(avgRating) || 0;
    stats.certificates = certCount || 0;

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('❌ Admin stats error:', error);
    res.json({ success: false, message: 'Error: ' + error.message });
  }
});

// Store active users
const activeUsers = new Map();

// Socket.io connection
io.on('connection', (socket) => {
  console.log('✅ User connected:', socket.id);

  // User joins with their ID
  socket.on('join', (userId) => {
    activeUsers.set(userId, socket.id);
    console.log('User joined:', userId);
  });

  // Send message
  socket.on('send_message', (data) => {
    const { to, from, message, timestamp } = data;
    const recipientSocketId = activeUsers.get(to);
    
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('receive_message', {
        from,
        message,
        timestamp
      });
      console.log('Message sent:', from, '→', to);
    }
  });

  // User disconnect
  socket.on('disconnect', () => {
    for (let [userId, socketId] of activeUsers.entries()) {
      if (socketId === socket.id) {
        activeUsers.delete(userId);
        console.log('User disconnected:', userId);
        break;
      }
    }
  });
});

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

// ============= ADMIN AUTHENTICATION =============

// Admin Login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('🔐 Admin login attempt:', username);

    if (!username || !password) {
      return res.json({ success: false, message: 'Username and password required' });
    }

    const connection = await pool.getConnection();
    const [admins] = await connection.query('SELECT * FROM admins WHERE username = ?', [username]);

    if (admins.length === 0) {
      connection.release();
      return res.json({ success: false, message: 'Invalid admin credentials' });
    }

    const admin = admins[0];
    const validPassword = await bcrypt.compare(password, admin.password);

    if (!validPassword) {
      connection.release();
      return res.json({ success: false, message: 'Invalid admin credentials' });
    }

    connection.release();

    // Create token for admin
    const token = jwt.sign(
      { id: admin.id, username: admin.username, isAdmin: true },
      SECRET_KEY,
      { expiresIn: '7d' }
    );

    console.log('✅ Admin logged in:', username);
    res.json({
      success: true,
      message: 'Admin login successful',
      token: token,
      data: { adminId: admin.id, username: admin.username, role: admin.role }
    });
  } catch (error) {
    console.error('❌ Admin login error:', error);
    res.json({ success: false, message: 'Admin login error: ' + error.message });
  }
});

// ============= ADMIN DASHBOARD ROUTES =============

// Get platform analytics
app.get('/api/admin/analytics', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    // Get total users
    const [usersCount] = await connection.query('SELECT COUNT(*) as count FROM users');
    
    // Get total workers
    const [workersCount] = await connection.query('SELECT COUNT(*) as count FROM workers');
    
    // Get total bookings
    const [bookingsCount] = await connection.query('SELECT COUNT(*) as count FROM bookings');
    
    // Get total revenue
    const [revenue] = await connection.query('SELECT SUM(total_amount) as total FROM commissions WHERE status = "completed"');
    
    // Get platform commission
    const [platformFee] = await connection.query('SELECT SUM(commission_amount) as total FROM commissions WHERE status = "completed"');
    
    // Get bookings by status
    const [bookingsByStatus] = await connection.query(
      'SELECT status, COUNT(*) as count FROM bookings GROUP BY status'
    );
    
    // Get top workers
    const [topWorkers] = await connection.query(
      'SELECT w.name, w.occupation, w.rating, COUNT(b.id) as booking_count FROM workers w LEFT JOIN bookings b ON w.id = b.worker_id GROUP BY w.id ORDER BY w.rating DESC LIMIT 5'
    );
    
    connection.release();

    res.json({
      success: true,
      data: {
        totalUsers: usersCount[0].count,
        totalWorkers: workersCount[0].count,
        totalBookings: bookingsCount[0].count,
        totalRevenue: revenue[0].total || 0,
        platformCommission: platformFee[0].total || 0,
        bookingsByStatus: bookingsByStatus,
        topWorkers: topWorkers
      }
    });
  } catch (error) {
    console.error('❌ Analytics error:', error);
    res.json({ success: false, message: 'Error fetching analytics: ' + error.message });
  }
});

// Get all disputes
app.get('/api/admin/disputes', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [disputes] = await connection.query(
      `SELECT d.*, b.service_name, w.name as worker_name, u.email as user_email
       FROM disputes d
       LEFT JOIN bookings b ON d.booking_id = b.id
       LEFT JOIN workers w ON d.worker_id = w.id
       LEFT JOIN users u ON d.user_id = u.id
       ORDER BY d.created_at DESC`
    );
    connection.release();

    res.json({ success: true, data: disputes });
  } catch (error) {
    console.error('❌ Disputes error:', error);
    res.json({ success: false, message: 'Error fetching disputes: ' + error.message });
  }
});

// Resolve dispute
app.put('/api/admin/disputes/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution, status } = req.body;
    
    const connection = await pool.getConnection();
    await connection.query(
      'UPDATE disputes SET status = ?, resolution = ?, resolved_at = NOW() WHERE id = ?',
      [status || 'resolved', resolution, id]
    );
    connection.release();

    res.json({ success: true, message: 'Dispute resolved' });
  } catch (error) {
    console.error('❌ Resolve dispute error:', error);
    res.json({ success: false, message: 'Error resolving dispute: ' + error.message });
  }
});

// Get all reviews
app.get('/api/admin/reviews', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [reviews] = await connection.query(
      `SELECT r.*, w.name as worker_name, u.email as user_email
       FROM rating r
       LEFT JOIN workers w ON r.worker_id = w.id
       LEFT JOIN users u ON r.user_id = u.id
       ORDER BY r.created_at DESC`
    );
    connection.release();

    res.json({ success: true, data: reviews });
  } catch (error) {
    console.error('❌ Reviews error:', error);
    res.json({ success: false, message: 'Error fetching reviews: ' + error.message });
  }
});

// Moderate review
app.put('/api/admin/reviews/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { approved } = req.body;
    
    const connection = await pool.getConnection();
    await connection.query(
      'UPDATE rating SET approved = ? WHERE id = ?',
      [approved, id]
    );
    connection.release();

    res.json({ success: true, message: 'Review moderated' });
  } catch (error) {
    console.error('❌ Moderate review error:', error);
    res.json({ success: false, message: 'Error moderating review: ' + error.message });
  }
});

// Get commission/payment tracking
app.get('/api/admin/commissions', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [commissions] = await connection.query(
      `SELECT c.*, w.name as worker_name, b.service_name
       FROM commissions c
       LEFT JOIN workers w ON c.worker_id = w.id
       LEFT JOIN bookings b ON c.booking_id = b.id
       ORDER BY c.created_at DESC`
    );
    connection.release();

    res.json({ success: true, data: commissions });
  } catch (error) {
    console.error('❌ Commissions error:', error);
    res.json({ success: false, message: 'Error fetching commissions: ' + error.message });
  }
});

// Process commission payment
app.put('/api/admin/commissions/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const connection = await pool.getConnection();
    await connection.query(
      'UPDATE commissions SET status = ? WHERE id = ?',
      [status, id]
    );
    connection.release();

    res.json({ success: true, message: 'Commission status updated' });
  } catch (error) {
    console.error('❌ Update commission error:', error);
    res.json({ success: false, message: 'Error updating commission: ' + error.message });
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

// ============= RECOMMENDATIONS (Lightweight ML-like scorer) =============
// Simple, explainable recommendation endpoint that ranks workers
// by matching occupation, location, rating and review counts.
// You can later replace this with a proper ML model or collaborative filtering.
app.get('/api/recommendations', async (req, res) => {
  try {
    const { occupation, location, min_rating } = req.query;

    const connection = await pool.getConnection();

    // Basic scoring: occupation match (5), location match (3), rating (x2), reviews_count contribution
    // Use COALESCE to avoid NULL issues
    const [workers] = await connection.query(
      `SELECT w.*, 
         (CASE WHEN w.occupation = ? THEN 5 ELSE 0 END) +
         (CASE WHEN w.location = ? THEN 3 ELSE 0 END) +
         (COALESCE(w.rating,0) * 2) +
         (COALESCE(w.reviews_count,0) / 10) AS score
       FROM workers w
       ORDER BY score DESC, w.rating DESC, w.reviews_count DESC
       LIMIT 50`,
      [occupation || '', location || '']
    );

    connection.release();

    // Optionally filter by min_rating on the server side
    let results = workers;
    if (min_rating) {
      const mr = parseFloat(min_rating) || 0;
      results = results.filter(w => (parseFloat(w.rating) || 0) >= mr);
    }

    res.json({ success: true, data: results });
  } catch (error) {
    console.error('❌ Recommendations error:', error);
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

    res.json({ success: true, data: workers[0] });
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
// Upload certificate
app.post('/api/certificates', authenticateToken, upload.single('certificate_file'), async (req, res) => {
  try {
    const { certificate_name, description, worker_id } = req.body;
    const user_id = req.user.id;

    console.log('📄 Certificate upload:', { user_id, worker_id, certificate_name });

    if (!certificate_name || !req.file) {
      return res.json({ success: false, message: 'Certificate name and PDF file required' });
    }

    // Use worker_id from request body if provided, otherwise use user_id
    const actualWorkerId = worker_id || user_id;

    const connection = await pool.getConnection();

    try {
      await connection.query(
        `INSERT INTO certificates (worker_id, certificate_name, description, file_name, file_path, file_size) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          actualWorkerId,
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
        [actualWorkerId]
      );
      const certCount = result.count;

      await connection.query(
        `UPDATE workers SET certificate_count = ? WHERE id = ?`,
        [certCount, actualWorkerId]
      );

      console.log('✅ Certificate uploaded for worker:', actualWorkerId);

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
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }
    res.json({ success: false, message: 'Certificate upload error: ' + error.message });
  }
});

// ============= MESSAGING ROUTES =============

// Send message
app.post('/api/messages', authenticateToken, async (req, res) => {
  try {
    const { receiver_id, message } = req.body;
    const sender_id = req.user.id;

    if (!receiver_id || !message) {
      return res.json({ success: false, message: 'Receiver ID and message required' });
    }

    const connection = await pool.getConnection();
    const [result] = await connection.query(
      'INSERT INTO messages (sender_id, receiver_id, message, created_at) VALUES (?, ?, ?, NOW())',
      [sender_id, receiver_id, message]
    );
    connection.release();

    res.json({
      success: true,
      message: 'Message sent',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('❌ Send message error:', error);
    res.json({ success: false, message: 'Error: ' + error.message });
  }
});

// Get conversation
app.get('/api/messages/:userId', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const otherUserId = req.params.userId;

    const connection = await pool.getConnection();
    const [messages] = await connection.query(
      `SELECT * FROM messages 
       WHERE (sender_id = ? AND receiver_id = ?) 
          OR (sender_id = ? AND receiver_id = ?)
       ORDER BY created_at ASC`,
      [currentUserId, otherUserId, otherUserId, currentUserId]
    );
    connection.release();

    res.json({ success: true, data: messages });
  } catch (error) {
    console.error('❌ Get messages error:', error);
    res.json({ success: false, message: 'Error: ' + error.message });
  }
});

// Get conversations list
app.get('/api/conversations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const connection = await pool.getConnection();
    
    const [conversations] = await connection.query(
      `SELECT 
        CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END as user_id,
        MAX(created_at) as last_message_time
      FROM messages
      WHERE sender_id = ? OR receiver_id = ?
      GROUP BY user_id
      ORDER BY last_message_time DESC`,
      [userId, userId, userId]
    );

    let conversationList = [];
    for (let conv of conversations) {
      const [user] = await connection.query('SELECT email FROM users WHERE id = ?', [conv.user_id]);
      if (user.length > 0) {
        conversationList.push({
          user_id: conv.user_id,
          user_email: user[0].email,
          last_message_time: conv.last_message_time
        });
      }
    }

    connection.release();
    res.json({ success: true, data: conversationList });
  } catch (error) {
    console.error('❌ Get conversations error:', error);
    res.json({ success: false, message: 'Error: ' + error.message });
  }
});



// ============= BOOKING ROUTES =============

// Create booking
// ============= BOOKING ROUTES - COMPLETE WORKFLOW =============

// Create booking (customer books worker)
app.post('/api/bookings', authenticateToken, async (req, res) => {
  try {
    const { worker_id, booking_date, start_time, end_time, service_description, total_price } = req.body;
    const user_id = req.user.id;

    console.log('📅 Creating booking:', { user_id, worker_id, booking_date });

    if (!worker_id || !booking_date || !start_time || !end_time) {
      return res.json({ success: false, message: 'Missing required fields' });
    }

    const connection = await pool.getConnection();
    
    // Check if slot is available
    const [conflicts] = await connection.query(
      `SELECT id FROM bookings 
       WHERE worker_id = ? AND booking_date = ? 
       AND status IN ('pending', 'confirmed')
       AND ((start_time < ? AND end_time > ?)
            OR (start_time < ? AND end_time > ?))`,
      [worker_id, booking_date, end_time, start_time, end_time, start_time]
    );

    if (conflicts.length > 0) {
      connection.release();
      return res.json({ success: false, message: 'Time slot already booked' });
    }

    const [result] = await connection.query(
      `INSERT INTO bookings (user_id, worker_id, booking_date, start_time, end_time, service_description, total_price, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [user_id, worker_id, booking_date, start_time, end_time, service_description || '', total_price || 0]
    );
    
    connection.release();

    console.log('✅ Booking created:', result.insertId);

    res.json({
      success: true,
      message: 'Booking request sent to worker',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('❌ Booking error:', error);
    res.json({ success: false, message: 'Error: ' + error.message });
  }
});

// Get customer's bookings (what customer booked)
app.get('/api/bookings/customer', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const connection = await pool.getConnection();
    const [bookings] = await connection.query(
      `SELECT b.*, w.name as worker_name, w.occupation, w.phone as worker_phone, w.email as worker_email, w.user_id as worker_user_id
       FROM bookings b
       JOIN workers w ON b.worker_id = w.id
       WHERE b.user_id = ?
       ORDER BY b.booking_date DESC, b.start_time DESC`,
      [userId]
    );
    connection.release();

    console.log('✅ Customer bookings found:', bookings.length);

    res.json({ success: true, data: bookings });
  } catch (error) {
    console.error('❌ Get customer bookings error:', error);
    res.json({ success: false, message: 'Error: ' + error.message });
  }
});

// Get worker's booking requests (bookings for this worker)
// Get worker's booking requests (bookings for this worker)
// Get worker's booking requests (bookings for this worker)
// Get worker's booking requests (bookings for this worker)
app.get('/api/bookings/worker', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('👷 Fetching bookings for user:', userId);

    const connection = await pool.getConnection();
    
    // Step 1: Get worker_id for this user
    const [workerData] = await connection.query(
      'SELECT id FROM workers WHERE user_id = ?',
      [userId]
    );

    if (!workerData || workerData.length === 0) {
      console.log('ℹ️ No worker profile for user:', userId);
      connection.release();
      return res.json({ success: true, data: [] });
    }

    const workerId = workerData[0].id;
    console.log('✅ Found worker_id:', workerId);

    // Step 2: Get all bookings where worker_id matches
    const [bookings] = await connection.query(
      `SELECT 
        b.id,
        b.user_id,
        b.worker_id,
        b.booking_date,
        b.start_time,
        b.end_time,
        b.status,
        b.service_description,
        b.total_price,
        b.created_at,
        u.email as customer_email,
        u.phone as customer_phone,
        COALESCE(w.name, u.email) as customer_name
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       LEFT JOIN workers w ON u.id = w.user_id
       WHERE b.worker_id = ?
       ORDER BY b.created_at DESC, b.booking_date DESC, b.start_time DESC`,
      [workerId]
    );

    connection.release();

    console.log('✅ Worker booking requests found:', bookings.length);

    res.json({ 
      success: true, 
      data: bookings,
      worker_id: workerId 
    });

  } catch (error) {
    console.error('❌ Get worker bookings error:', error);
    res.json({ success: false, message: 'Error: ' + error.message });
  }
});





// Update booking status (worker accepts/rejects)
app.patch('/api/bookings/:id/status', authenticateToken, async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { status } = req.body;
    const userId = req.user.id;

    console.log('📝 Updating booking status:', { bookingId, status, userId });

    if (!['confirmed', 'rejected', 'completed', 'cancelled'].includes(status)) {
      return res.json({ success: false, message: 'Invalid status' });
    }

    const connection = await pool.getConnection();

    // Get booking details
    const [booking] = await connection.query(
      `SELECT b.*, w.user_id as worker_user_id 
       FROM bookings b
       JOIN workers w ON b.worker_id = w.id
       WHERE b.id = ?`,
      [bookingId]
    );

    if (booking.length === 0) {
      connection.release();
      return res.json({ success: false, message: 'Booking not found' });
    }

    // Verify user is the worker OR the customer (for cancel)
    const bookingData = booking[0];
    console.log('🔍 Booking data:', { bookingId, bookingUserId: bookingData.user_id, workerUserId: bookingData.worker_user_id, currentUserId: userId, status });
    
    if (status === 'cancelled' && bookingData.user_id !== userId) {
      connection.release();
      console.log('❌ Unauthorized - customer mismatch');
      return res.json({ success: false, message: 'Unauthorized - Only customer can cancel' });
    }
    
    if ((status === 'confirmed' || status === 'rejected') && bookingData.worker_user_id !== userId) {
      connection.release();
      console.log('❌ Unauthorized - worker mismatch');
      return res.json({ success: false, message: 'Unauthorized - Only worker can accept/reject' });
    }

    // Update status
    await connection.query(
      'UPDATE bookings SET status = ? WHERE id = ?',
      [status, bookingId]
    );

    connection.release();

    console.log('✅ Booking status updated:', status);

    res.json({ 
      success: true, 
      message: 'Booking ' + status,
      data: { id: bookingId, status: status }
    });
  } catch (error) {
    console.error('❌ Update booking error:', error);
    res.json({ success: false, message: 'Error: ' + error.message });
  }
});

// Get booking details
app.get('/api/bookings/:id', authenticateToken, async (req, res) => {
  try {
    const bookingId = req.params.id;

    const connection = await pool.getConnection();
    const [bookings] = await connection.query(
      `SELECT b.*, w.name as worker_name, w.occupation, w.phone as worker_phone, w.email as worker_email,
              u.email as customer_email, u.phone as customer_phone
       FROM bookings b
       JOIN workers w ON b.worker_id = w.id
       JOIN users u ON b.user_id = u.id
       WHERE b.id = ?`,
      [bookingId]
    );

    connection.release();

    if (bookings.length === 0) {
      return res.json({ success: false, message: 'Booking not found' });
    }

    res.json({ success: true, data: bookings[0] });
  } catch (error) {
    console.error('❌ Get booking error:', error);
    res.json({ success: false, message: 'Error: ' + error.message });
  }
});


// Get user bookings
app.get('/api/bookings/user', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const connection = await pool.getConnection();
    const [bookings] = await connection.query(
      `SELECT b.*, w.name as worker_name, w.occupation, w.phone as worker_phone
       FROM bookings b
       JOIN workers w ON b.worker_id = w.id
       WHERE b.user_id = ?
       ORDER BY b.booking_date DESC, b.start_time DESC`,
      [userId]
    );
    connection.release();

    res.json({ success: true, data: bookings });
  } catch (error) {
    console.error('❌ Get bookings error:', error);
    res.json({ success: false, message: 'Error: ' + error.message });
  }
});

// Update booking status
app.patch('/api/bookings/:id', authenticateToken, async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { status } = req.body;

    if (!['confirmed', 'completed', 'cancelled'].includes(status)) {
      return res.json({ success: false, message: 'Invalid status' });
    }

    const connection = await pool.getConnection();
    await connection.query(
      'UPDATE bookings SET status = ? WHERE id = ?',
      [status, bookingId]
    );
    connection.release();

    res.json({ success: true, message: 'Booking updated' });
  } catch (error) {
    console.error('❌ Update booking error:', error);
    res.json({ success: false, message: 'Error: ' + error.message });
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

// Replace this:
// app.listen(PORT, () => { ... });

// Initialize admin account
async function initializeAdmin() {
  try {
    const connection = await pool.getConnection();
    
    // Create tables if they don't exist
    await connection.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        role VARCHAR(50) DEFAULT 'admin',
        permissions TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS disputes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        booking_id INT,
        worker_id INT,
        user_id INT,
        description TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'open',
        resolution TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP NULL,
        FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS commissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        booking_id INT,
        worker_id INT,
        total_amount DECIMAL(10, 2),
        commission_percentage INT DEFAULT 10,
        commission_amount DECIMAL(10, 2),
        platform_fee DECIMAL(10, 2),
        worker_payout DECIMAL(10, 2),
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
      )
    `);
    
    // Add approved column to rating if it doesn't exist
    try {
      await connection.query(`ALTER TABLE rating ADD COLUMN approved BOOLEAN DEFAULT TRUE`);
    } catch (e) {
      // Column might already exist
    }
    
    console.log('✅ Admin tables created/verified');
    
    // Check if admin already exists
    const [existing] = await connection.query('SELECT id FROM admins WHERE username = ?', ['ATMECE']);
    
    if (existing.length === 0) {
      // Create default admin account
      const hashedPassword = await bcrypt.hash('student123', 10);
      await connection.query(
        'INSERT INTO admins (username, password, email, role) VALUES (?, ?, ?, ?)',
        ['ATMECE', hashedPassword, 'admin@skillbridge.com', 'admin']
      );
      console.log('✅ Admin account created: ATMECE / student123');
    } else {
      console.log('✅ Admin account already exists');
    }
    
    connection.release();
  } catch (error) {
    console.error('⚠️ Admin initialization error:', error);
  }
}

// Initialize admin on server start
initializeAdmin();

// With this:
server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   🚀 SkillBridge Server Running        ║
║   📡 http://localhost:${PORT}            ║
║   🗄️  MySQL Connected                  ║
║   🔑 JWT Authentication Ready          ║
║   💬 Socket.io Real-time Chat Ready    ║
║   👨‍💼 Admin Account: ATMECE / student123  ║
╚════════════════════════════════════════╝
  `);
});

