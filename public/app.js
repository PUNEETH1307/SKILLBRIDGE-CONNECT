// ========================================
// SKILLBRIDGE CONNECT - COMPLETE APP.JS
// Production Ready with SQL Integration
// ========================================

const API_BASE_URL = 'http://localhost:3000/api';

// ========================================
// APP DATA & CONFIGURATION
// ========================================

const appData = {
  occupationsList: [
    'Carpenter', 'Plumber', 'Electrician', 'Painter', 'Cleaner', 'Gardener',
    'Cook', 'Driver', 'Mason', 'Welder', 'AC Repair', 'Appliance Repair',
    'Handyman', 'Security Guard', 'Babysitter', 'Elderly Care'
  ],
  locationsList: [
    'Central Delhi', 'South Delhi', 'North Delhi', 'East Delhi', 'West Delhi',
    'Gurgaon', 'Faridabad', 'Noida', 'Ghaziabad', 'Mumbai', 'Bangalore', 'Pune'
  ],
  specialtiesMap: {
    'Plumber': ['Pipe Installation', 'Leak Repair', 'Bathroom Fitting', 'Water Heater', 'Drain Cleaning'],
    'Carpenter': ['Furniture Making', 'Cabinet Installation', 'Door Repair', 'Custom Woodwork', 'Flooring'],
    'Electrician': ['Wiring', 'Fan Installation', 'Light Fitting', 'Electrical Repair', 'Switch Installation'],
    'Painter': ['Wall Painting', 'Wood Painting', 'Texture Work', 'Waterproofing', 'Exterior Painting'],
    'Cleaner': ['House Cleaning', 'Office Cleaning', 'Deep Cleaning', 'Move-in/out', 'Carpet Cleaning'],
    'Gardener': ['Lawn Maintenance', 'Plant Care', 'Garden Design', 'Pest Control', 'Tree Trimming'],
    'Cook': ['North Indian', 'South Indian', 'Chinese', 'Continental', 'Punjabi'],
    'Driver': ['Personal Driver', 'Delivery', 'Airport Transfer', 'Outstation', 'Corporate'],
    'Mason': ['Brickwork', 'Plastering', 'Tiling', 'Construction', 'Renovation'],
    'Welder': ['Metal Welding', 'Steel Fabrication', 'Gate Making', 'Railing', 'Repair Work'],
    'AC Repair': ['AC Installation', 'AC Servicing', 'Gas Filling', 'Repair', 'Maintenance'],
    'Appliance Repair': ['Refrigerator', 'Washing Machine', 'Microwave', 'TV', 'Other Appliances']
  }
};

// ========================================
// STATE VARIABLES
// ========================================

let currentSection = 'home';
let filteredWorkers = [];
let allWorkersData = [];  // SQL workers from database
let currentWorker = null;
let authToken = localStorage.getItem('authToken');

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Initializing SkillBridge Connect...');
  initializeTheme();
  initializeApp();
});

// ========================================
// THEME MANAGEMENT
// ========================================

function initializeTheme() {
  // Check for saved theme preference or default to system preference
  const savedTheme = localStorage.getItem('theme') || 'light';
  setTheme(savedTheme);
  setupThemeToggle();
}

function setTheme(theme) {
  const html = document.documentElement;
  const themeToggle = document.getElementById('theme-toggle');
  
  if (theme === 'dark') {
    html.setAttribute('data-color-scheme', 'dark');
    if (themeToggle) {
      themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
      themeToggle.title = 'Switch to Light Mode';
    }
  } else {
    html.setAttribute('data-color-scheme', 'light');
    if (themeToggle) {
      themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
      themeToggle.title = 'Switch to Dark Mode';
    }
  }
  
  localStorage.setItem('theme', theme);
  console.log(`✨ Theme switched to: ${theme}`);
}

function setupThemeToggle() {
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const currentTheme = localStorage.getItem('theme') || 'light';
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      setTheme(newTheme);
    });
  }
}

// ========================================
// INITIALIZATION
// ========================================
// INITIALIZATION
// ========================================

function initializeApp() {
  try {
    checkAuthStatus();
    populateFormDropdowns();
    populateSearchDropdowns();
    fetchWorkersFromSQL();  // Load from database
    setupEventHandlers();
    console.log('✅ App initialized successfully');
  } catch (error) {
    console.error('❌ Init error:', error);
  }
}

// ========================================
// AUTHENTICATION
// ========================================

function checkAuthStatus() {
  if (authToken) {
    console.log('✅ User logged in');
    updateUIForLoggedInUser();
  }
}

function isLoggedIn() {
  return authToken !== null && authToken !== '';
}

function updateUIForLoggedInUser() {
  const loginBtn = document.getElementById('login-btn');
  if (!loginBtn) return;

  if (!isLoggedIn()) {
    loginBtn.textContent = 'Login';
    loginBtn.onclick = () => showModal('login-modal');
    // hide admin link if visible
    const adminLink = document.getElementById('admin-link'); if (adminLink) adminLink.style.display = 'none';
    return;
  }

  // Fetch current user info and update button to show profile
  fetchCurrentUser().then(user => {
    if (!user) {
      loginBtn.textContent = 'Account';
      loginBtn.onclick = () => showSection('user-profile');
      return;
    }

    const displayName = user.name || user.email;
    loginBtn.textContent = displayName;
    loginBtn.onclick = () => { showSection('user-profile'); populateUserProfile(user); };

    // Show admin link for admin users
    const adminLink = document.getElementById('admin-link');
    if (adminLink) adminLink.style.display = (user.user_type === 'admin') ? 'inline-block' : 'none';
  }).catch(err => {
    console.error('Error fetching user for UI update:', err);
  });
}

// Fetch current user profile from server
async function fetchCurrentUser() {
  try {
    const resp = await fetch(`${API_BASE_URL}/users/me`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` } });
    const data = await resp.json();
    if (data.success) return data.data;
    return null;
  } catch (error) {
    console.error('Error fetching current user:', error);
    return null;
  }
}

function populateUserProfile(user) {
  showSection('user-profile');
  document.getElementById('profile-name').textContent = user.name || '-';
  document.getElementById('profile-email').textContent = user.email || '-';
  document.getElementById('profile-role').textContent = user.user_type || '-';

  const servicesBtn = document.getElementById('profile-services-btn');
  if (servicesBtn) servicesBtn.style.display = (user.user_type === 'worker') ? 'inline-block' : 'none';

  const logoutBtn = document.getElementById('profile-logout');
  if (logoutBtn) logoutBtn.onclick = handleLogout;
}

// Load worker's confirmed services
async function loadWorkerServices() {
  try {
    const resp = await fetch(`${API_BASE_URL}/bookings/worker/services`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` } });
    const data = await resp.json();
    const container = document.getElementById('worker-services-list');
    if (!container) return;
    if (!data.success || !Array.isArray(data.data) || data.data.length === 0) {
      container.innerHTML = '<p class="services-empty-state">No confirmed services yet.</p>';
      return;
    }

    let html = '';
    data.data.forEach(b => {
      html += `
        <div class="service-card">
          <div class="service-card-header">
            <h4>📍 ${escapeHtml(b.customer_email)}</h4>
          </div>
          <div class="service-card-body">
            <p class="service-date"><i class="fas fa-calendar"></i> ${new Date(b.booking_date).toLocaleDateString()} | ${b.start_time} - ${b.end_time}</p>
            <p class="service-price"><i class="fas fa-rupee-sign"></i> ₹${b.total_price || 0}</p>
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
  } catch (error) {
    console.error('Error loading worker services:', error);
  }
}

// Admin stats loader
async function loadAdminStats() {
  try {
    const resp = await fetch(`${API_BASE_URL}/admin/stats`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` } });
    const data = await resp.json();
    const containerId = 'admin-stats-container';
    let container = document.getElementById(containerId);
    if (!container) {
      // create container in admin-dashboard
      const dash = document.getElementById('admin-dashboard');
      if (!dash) return;
      container = document.createElement('div'); container.id = containerId; dash.querySelector('.container').appendChild(container);
    }
    if (!data.success) {
      container.innerHTML = `<p style="color:#f44336;">${escapeHtml(data.message || 'Error loading stats')}</p>`;
      return;
    }

    const s = data.data;
    container.innerHTML = `
      <div class="admin-grid">
        <div><strong>Users:</strong> ${s.users}</div>
        <div><strong>Workers:</strong> ${s.workers}</div>
        <div><strong>Bookings (total):</strong> ${s.bookings_total}</div>
        <div><strong>Pending:</strong> ${s.bookings_pending}</div>
        <div><strong>Confirmed:</strong> ${s.bookings_confirmed}</div>
        <div><strong>Certificates:</strong> ${s.certificates}</div>
        <div><strong>Average Rating:</strong> ${s.avg_rating.toFixed ? s.avg_rating.toFixed(2) : s.avg_rating}</div>
      </div>
    `;
  } catch (error) {
    console.error('Error loading admin stats:', error);
  }
}

function handleLogout() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('userId');
  authToken = null;
  alert('Logged out successfully');
  location.reload();
}

async function handleLogin(e) {
  e.preventDefault();
  console.log('🔐 Starting login...');
  
  const form = e.target;
  const email = form.querySelector('input[name="email"]')?.value?.trim();
  const password = form.querySelector('input[name="password"]')?.value;
  
  console.log('📧 Email:', email);
  console.log('🔑 Password received:', password ? '✓' : '✗');
  
  if (!email || !password) {
    alert('❌ Please enter both email and password');
    return;
  }
  
  try {
    console.log('🚀 Sending login request to:', `${API_BASE_URL}/auth/login`);
    
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        email, 
        password
      })
    });
    
    console.log('📊 Response status:', response.status);
    
    const data = await response.json();
    console.log('📥 Login response:', data);
    
    if (data.success) {
      // Store auth token
      authToken = data.token || data.data?.token;
      localStorage.setItem('authToken', authToken);
      localStorage.setItem('userId', data.userId || data.data?.userId);
      localStorage.setItem('userEmail', email);
      
      console.log('✅ Login successful! Token:', authToken);
      alert('✅ Login successful!');
      // In handleLogin() after successful login, add:
initializeChat();

      // Close modal
      closeModal('login-modal');
      
      // Update UI
      updateUIForLoggedInUser();
      
      // Clear form
      form.reset();
      
      // Redirect if needed
      if (localStorage.getItem('pendingAction') === 'worker-registration') {
        localStorage.removeItem('pendingAction');
        showSection('worker-registration');
      }
    } else {
      console.error('❌ Login failed:', data.message);
      alert('❌ ' + (data.message || 'Login failed. Check email and password.'));
    }
  } catch (error) {
    console.error('❌ Login error:', error);
    alert('❌ Error: ' + error.message);
  }
}



async function handleSignup(e) {
  e.preventDefault();
  console.log('📝 Starting signup...');
  
  const form = e.target;
  const email = form.querySelector('input[name="email"]')?.value?.trim();
  const phone = form.querySelector('input[name="phone"]')?.value?.trim();
  const password = form.querySelector('input[name="password"]')?.value;
  const confirmPassword = form.querySelector('input[name="confirm_password"]')?.value;
  
  console.log('📧 Email:', email);
  console.log('📱 Phone:', phone);
  console.log('🔑 Password:', password ? '✓' : '✗');
  console.log('🔑 Confirm Password:', confirmPassword ? '✓' : '✗');
  
  if (!email || !phone || !password || !confirmPassword) {
    alert('❌ Please fill in all fields');
    return;
  }
  
  if (!email.includes('@')) {
    alert('❌ Please enter a valid email');
    return;
  }
  
  if (password !== confirmPassword) {
    alert('❌ Passwords do not match');
    return;
  }
  
  if (password.length < 6) {
    alert('❌ Password must be at least 6 characters');
    return;
  }
  
  try {
    console.log('🚀 Sending signup request to:', `${API_BASE_URL}/auth/register`);
    
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        email, 
        phone, 
        password,
        userType: 'customer'
      })
    });
    
    console.log('📊 Response status:', response.status);
    
    const data = await response.json();
    console.log('📥 Signup response:', data);
    
    if (data.success) {
      // Store auth token
      authToken = data.token || data.data?.token;
      localStorage.setItem('authToken', authToken);
      localStorage.setItem('userId', data.userId || data.data?.userId);
      localStorage.setItem('userEmail', email);
      
      console.log('✅ Signup successful! New user created.');
      alert('✅ Account created successfully!');
      
      // Close modal
      closeModal('signup-modal');
      
      // Update UI
      updateUIForLoggedInUser();
      
      // Clear form
      form.reset();
      
      // Redirect to worker registration if needed
      if (localStorage.getItem('pendingAction') === 'worker-registration') {
        localStorage.removeItem('pendingAction');
        showSection('worker-registration');
      }
    } else {
      console.error('❌ Signup failed:', data.message);
      alert('❌ ' + (data.message || 'Signup failed.'));
    }
  } catch (error) {
    console.error('❌ Signup error:', error);
    alert('❌ Error: ' + error.message);
  }
}


// ========================================
// WORKER REGISTRATION
// ========================================

async function handleWorkerRegistration(e) {
  e.preventDefault();
  console.log('📝 Submitting worker registration...');

  const authToken = localStorage.getItem('authToken');

  if (!authToken) {
    alert('❌ You must login first to register as a worker');
    return;
  }

  try {
    // Collect form data
    const specialtyCheckboxes = document.querySelectorAll('#specialties-container input[type="checkbox"]:checked');
    const specialties = Array.from(specialtyCheckboxes).map(cb => cb.value);

    const areaCheckboxes = document.querySelectorAll('#work-areas-container input[type="checkbox"]:checked');
    const service_areas = Array.from(areaCheckboxes).map(cb => cb.value);

    const formData = {
      name: document.getElementById('worker-name').value,
      phone: document.getElementById('worker-phone').value,
      email: document.getElementById('worker-email').value,
      occupation: document.getElementById('worker-occupation').value,
      experience: parseInt(document.getElementById('worker-experience').value),
      specialties: specialties,
      hourly_rate: parseInt(document.getElementById('worker-rate').value),
      available_hours: document.getElementById('worker-hours').value,
      location: document.getElementById('worker-location').value,
      travel_radius: document.getElementById('worker-radius').value,
      service_areas: service_areas,
      description: document.getElementById('worker-description').value,
      certifications: document.getElementById('worker-certifications').value
    };

    // Validate
    if (!formData.name || !formData.phone || !formData.email || !formData.occupation || !formData.hourly_rate || !formData.location) {
      alert('❌ Please fill in all required fields');
      return;
    }

    // Show loading
    const submitBtn = document.querySelector('#worker-form button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ Registering...';
    }

    // Register worker
    const response = await fetch('http://localhost:3000/api/workers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(formData)
    });

    const data = await response.json();
    console.log('📥 Registration response:', data);

    if (data.success) {
      const workerId = data.data.id;
      console.log('✅ Worker registered with ID:', workerId);

      // Upload certificates if any
      if (certificatesToUpload.length > 0) {
        if (submitBtn) submitBtn.textContent = '📤 Uploading certificates...';
        await uploadCertificatesAfterRegistration(workerId);
      }

      // Show success
      document.getElementById('success-title').textContent = 'Registration Successful!';
      document.getElementById('success-message').textContent = 
        certificatesToUpload.length > 0 
        ? 'Your worker profile and certificates have been uploaded successfully!'
        : 'Your worker profile has been created successfully!';
      showModal('success-modal');

      // Reset form
      document.getElementById('worker-form').reset();
      document.getElementById('specialties-container').innerHTML = '';
      
      // Clear certificate queue
      certificatesToUpload = [];
      displayCertificatesToUpload();

      // Refresh workers list
      await fetchWorkersFromSQL();

    } else {
      alert('❌ ' + (data.message || 'Registration failed'));
    }

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit';
    }

  } catch (error) {
    console.error('❌ Registration error:', error);
    alert('❌ Error: ' + error.message);
    
    const submitBtn = document.querySelector('#worker-form button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit';
    }
  }
}

// ============= LOAD & DISPLAY CERTIFICATES IN PROFILE =============

async function loadProfileCertificates(workerId) {
  console.log('📄 Loading certificates for worker:', workerId);
  
  try {
    const response = await fetch(`${API_BASE_URL}/certificates/${workerId}`);
    const data = await response.json();
    
    console.log('📥 Certificates response:', data);
    
    const container = document.getElementById(`profile-certificates-${workerId}`);
    if (!container) {
      console.error('❌ Certificate container not found for worker', workerId);
      return;
    }

    if (!data.success || !data.data || data.data.length === 0) {
      console.log('ℹ️ No certificates found');
      container.innerHTML = '<p style="color: #999;">No certificates uploaded</p>';
      return;
    }

    console.log('✅ Found', data.data.length, 'certificates');

    let html = '<div style="display: grid; gap: 12px;">';
    
    data.data.forEach(cert => {
      const uploadDate = new Date(cert.uploaded_at).toLocaleDateString();
      
      html += `
        <div style="background: white; padding: 12px; border-radius: 4px; border-left: 4px solid #4CAF50;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="flex: 1;">
              <strong style="color: #333;">📄 ${escapeHtml(cert.certificate_name)}</strong>
              ${cert.description ? `<p style="font-size: 12px; color: #666; margin: 5px 0;">${escapeHtml(cert.description)}</p>` : ''}
              <small style="color: #999;">Uploaded: ${uploadDate}</small>
            </div>
            <a href="${cert.file_path}" target="_blank" style="padding: 8px 12px; background: #2196F3; color: white; border-radius: 3px; text-decoration: none; font-size: 12px; white-space: nowrap;">📥 Download</a>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    
    console.log('✅ Displaying', data.data.length, 'certificates');
    container.innerHTML = html;

  } catch (error) {
    console.error('❌ Error loading certificates:', error);
    const container = document.getElementById(`profile-certificates-${workerId}`);
    if (container) {
      container.innerHTML = '<p style="color: #999;">Error loading certificates</p>';
    }
  }
}



// ========================================
// SQL INTEGRATION - FETCH WORKERS
// ========================================

async function fetchWorkersFromSQL() {
  try {
    console.log('🔄 Fetching workers from SQL...');
    console.log('📡 API URL:', `${API_BASE_URL}/workers`);
    
    const response = await fetch(`${API_BASE_URL}/workers`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('📊 Response status:', response.status);

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const data = await response.json();
    console.log('📥 Raw response:', data);
    console.log('📥 Response type:', typeof data);
    console.log('📥 Is array?', Array.isArray(data));
    
    // IMPORTANT: Handle different response formats
    let workersArray = [];
    
    if (Array.isArray(data)) {
      // If response is directly an array
      workersArray = data;
      console.log('✅ Response is array');
    } else if (data.success && Array.isArray(data.data)) {
      // If response is {success: true, data: [...]}
      workersArray = data.data;
      console.log('✅ Response has data array');
    } else if (data.success && Array.isArray(data.workers)) {
      // If response is {success: true, workers: [...]}
      workersArray = data.workers;
      console.log('✅ Response has workers array');
    } else if (!data.success) {
      // If API returned error
      throw new Error(data.message || 'API returned success: false');
    } else {
      // Unknown format
      console.error('❌ Unknown response format:', data);
      throw new Error('Unknown API response format');
    }
    
    // Now assign to global variables
    allWorkersData = workersArray;
    filteredWorkers = [...allWorkersData];  // Now this works!
    
    console.log(`✅ Loaded ${allWorkersData.length} workers`);
    
    // Display workers
    displayAllWorkers();
    updateResultsCount();
    
    return true;
    
  } catch (error) {
    console.error('❌ Error fetching workers:', error);
    console.error('Stack:', error.stack);
    
    // Reset to empty arrays
    allWorkersData = [];
    filteredWorkers = [];
    
    displayAllWorkers();
    alert('❌ Error loading workers: ' + error.message);
    return false;
  }
}


// ========================================
// DISPLAY FUNCTIONS
// ========================================
function displayAllWorkers() {
  console.log('📋 Displaying workers...');
  console.log('Filtered workers count:', filteredWorkers ? filteredWorkers.length : 0);
  console.log('Filtered workers array:', filteredWorkers);
  
  const workersGrid = document.getElementById('workers-grid');
  
  if (!workersGrid) {
    console.error('❌ ERROR: workers-grid container NOT found!');
    alert('❌ Error: workers-grid element not found in HTML!');
    return;
  }
  
  console.log('✅ Found workers-grid container');
  
  // Make sure filteredWorkers is an array
  if (!Array.isArray(filteredWorkers)) {
    console.error('❌ filteredWorkers is not an array:', filteredWorkers);
    filteredWorkers = [];
  }
  
  if (filteredWorkers.length === 0) {
    console.warn('⚠️ No workers to display');
    workersGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #999;">
        <p style="font-size: 18px;">📭 No workers found</p>
        <p>Try adjusting your filters or search terms</p>
        <button onclick="displayAllWorkers()" style="padding: 10px 20px; background: #2196F3; color: white; border: none; cursor: pointer; border-radius: 4px;">
          🔄 Reload
        </button>
      </div>
    `;
    return;
  }
  
  try {
    const htmlCards = filteredWorkers.map(worker => {
      if (!worker) {
        console.warn('⚠️ Worker is null or undefined');
        return '';
      }
      console.log('Creating card for:', worker.name);
      return createWorkerCard(worker);
    }).filter(card => card !== '').join('');
    
    workersGrid.innerHTML = htmlCards;
    console.log(`✅ Displayed ${filteredWorkers.length} workers`);
    
  } catch (error) {
    console.error('❌ Error displaying workers:', error);
    workersGrid.innerHTML = `<div style="grid-column: 1 / -1; color: red; padding: 20px;">❌ Error: ${error.message}</div>`;
  }
}



function createWorkerCard(worker) {
  // Parse specialties safely
  let specialties = [];
  try {
    specialties = Array.isArray(worker.specialties) 
      ? worker.specialties 
      : JSON.parse(worker.specialties || '[]');
  } catch (e) {
    specialties = [];
  }

  // Parse service areas safely
  let serviceAreas = [];
  try {
    serviceAreas = Array.isArray(worker.service_areas)
      ? worker.service_areas
      : JSON.parse(worker.service_areas || '[]');
  } catch (e) {
    serviceAreas = [];
  }

  const rating = parseFloat(worker.rating) || 0;
  const reviews = parseInt(worker.total_reviews) || 0;

  return `
    <div class="worker-card" data-worker-id="${worker.id}">
      <div class="worker-header">
        <div class="worker-avatar" style="width: 80px; height: 80px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 32px; color: white;">
          ${worker.name.charAt(0).toUpperCase()}
        </div>
        <div class="worker-title" style="flex: 1; margin-left: 15px;">
          <h3 style="margin: 0; font-size: 18px; color: #333;">${escapeHtml(worker.name)}</h3>
          <p style="margin: 5px 0; color: #666; font-size: 14px;">${escapeHtml(worker.occupation)}</p>
          ${worker.verified ? '<span style="color: #4CAF50; font-size: 12px; font-weight: bold;">✓ Verified</span>' : ''}
        </div>
      </div>

      <div class="worker-rating" style="margin: 15px 0; padding: 12px 0; border-top: 1px solid #eee; border-bottom: 1px solid #eee;">
        <span>${generateStars(rating)}</span>
        <span style="margin-left: 10px; color: #666; font-size: 14px;"><strong>${rating.toFixed(1)}</strong>/5 <span style="color: #999;">(${reviews} reviews)</span></span>
      </div>

      <div class="worker-details" style="font-size: 13px; margin: 12px 0; line-height: 1.8; color: #555;">
        <p style="margin: 6px 0;"><strong>📍 Location:</strong> ${escapeHtml(worker.location)}</p>
        <p style="margin: 6px 0;"><strong>💼 Experience:</strong> ${worker.experience} years</p>
        <p style="margin: 6px 0;"><strong>💰 Rate:</strong> <span style="color: #2196F3; font-weight: bold;">₹${worker.hourly_rate}/hr</span></p>
        ${worker.description ? `<p style="margin: 6px 0;"><strong>About:</strong> ${escapeHtml(worker.description.substring(0, 100))}${worker.description.length > 100 ? '...' : ''}</p>` : ''}
      </div>

      <div class="worker-specialties" style="margin: 12px 0;">
        <strong style="font-size: 12px; color: #666;">Specialties:</strong>
        <div style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 5px;">
          ${specialties.slice(0, 5).map(s => `<span style="background: #e8f5e9; padding: 4px 10px; border-radius: 4px; font-size: 11px; color: #2e7d32;">${escapeHtml(s)}</span>`).join('')}
          ${specialties.length > 5 ? `<span style="background: #e8f5e9; padding: 4px 10px; border-radius: 4px; font-size: 11px; color: #2e7d32;">+${specialties.length - 5} more</span>` : ''}
        </div>
      </div>

      <div class="worker-areas" style="margin: 12px 0; font-size: 12px; color: #666;">
        <strong>Service Areas:</strong> <span style="color: #333;">${serviceAreas.slice(0, 2).join(', ')}${serviceAreas.length > 2 ? ` +${serviceAreas.length - 2} more` : ''}</span>
      </div>

      <div class="worker-actions" style="display: flex; gap: 8px; margin-top: 15px;">
        <button style="flex: 1; padding: 10px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 13px;" onclick="bookWorker(${worker.id})">📅 Book Now</button>
        <button style="flex: 1; padding: 10px; background: #f0f0f0; color: #333; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 13px;" onclick="viewWorkerProfile(${worker.id})">👤 View</button>
      </div>
    </div>
  `;
}

async function viewWorkerProfile(workerId) {
  try {
    const worker = allWorkersData.find(w => w.id === workerId);
    if (worker) {
      currentWorker = worker;
      displayWorkerProfile(worker);
      showSection('worker-profile');
    }
  } catch (error) {
    console.error('Profile load error:', error);
  }
}
async function displayWorkerProfile(worker) {
  const profileContent = document.getElementById('profile-content');
  if (!profileContent) {
    console.error('❌ profile-content element not found');
    return;
  }
  
  const specialties = parseJSON(worker.specialties);
  const serviceAreas = parseJSON(worker.service_areas);
  
  // Check if user already rated this worker
  let userRating = null;
  if (authToken) {
    try {
      const response = await fetch(`${API_BASE_URL}/ratings/${worker.id}/user`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await response.json();
      if (data.success && data.data) {
        userRating = data.data;
      }
    } catch (e) {
      console.log('User rating check error:', e);
    }
  }
  
  profileContent.innerHTML = `
    <div class="profile-container">
      <!-- Header Section -->
      <div class="profile-header-section">
        <div class="profile-header-content">
          <div class="profile-avatar-box">
            ${worker.name.charAt(0).toUpperCase()}
          </div>
          <div class="profile-header-info">
            <h1>${escapeHtml(worker.name)}</h1>
            <p class="profile-header-occupation">${escapeHtml(worker.occupation)}</p>
            <div class="profile-stats">
              <div class="profile-stat-item">⭐ ${worker.rating || 0}/5 (${worker.reviews_count || worker.total_reviews || 0})</div>
              <div class="profile-stat-item">💼 ${worker.experience}y experience</div>
              <div class="profile-stat-item">💰 ₹${worker.hourly_rate}/hr</div>
              ${worker.verified ? '<div class="profile-stat-item">✓ Verified</div>' : ''}
            </div>
          </div>
        </div>
      </div>
      
      <!-- Main Content Grid -->
      <div class="profile-sections-wrapper">
        <!-- Left Column: About, Skills, Services -->
        <div>
          <!-- About Section -->
          <div class="profile-section-box">
            <h3>📋 About</h3>
            <p>${escapeHtml(worker.description || 'No description provided.')}</p>
          </div>
          
          <!-- Skills & Specialties -->
          ${specialties.length > 0 ? `
            <div class="profile-section-box">
              <h3>🔧 Skills & Specialties</h3>
              <div class="skills-specialties-grid">
                ${specialties.map(s => `<div class="skill-specialty-item">${escapeHtml(s)}</div>`).join('')}
              </div>
            </div>
          ` : ''}
          
          <!-- Service Areas -->
          ${serviceAreas.length > 0 ? `
            <div class="profile-section-box">
              <h3>📍 Service Areas</h3>
              <div class="skills-specialties-grid">
                ${serviceAreas.map(a => `<div class="service-area-item">📍 ${escapeHtml(a)}</div>`).join('')}
              </div>
            </div>
          ` : ''}
          
          <!-- Certificates -->
          <div class="profile-section-box">
            <h3>📄 Certificates</h3>
            <div id="profile-certificates-${worker.id}" class="certificates-grid">Loading certificates...</div>
          </div>
        </div>
        
        <!-- Right Column: Contact, Booking, Rating -->
        <div>
          <!-- Contact Box -->
          <div class="profile-contact-box">
            <h3>Contact Worker</h3>
            <button onclick="contactWorker(${worker.id})">📞 Call Now</button>
            <p class="profile-contact-note">Response time: Usually within 1 hour</p>
          </div>
          
          <!-- Booking Box -->
          <div class="profile-booking-box">
            <h3>📅 Book Service</h3>
            
            <div class="booking-form-group">
              <label>Date:</label>
              <input type="date" id="booking-date-${worker.id}" min="${new Date().toISOString().split('T')[0]}">
            </div>
            
            <div class="booking-form-group">
              <label>Start Time:</label>
              <input type="time" id="booking-start-${worker.id}">
            </div>
            
            <div class="booking-form-group">
              <label>Duration (hours):</label>
              <select id="booking-duration-${worker.id}">
                <option value="1">1 hour</option>
                <option value="2">2 hours</option>
                <option value="3">3 hours</option>
                <option value="4">4 hours</option>
                <option value="8">Full day (8 hours)</option>
              </select>
            </div>
            
            <div class="booking-form-group">
              <label>Service Details:</label>
              <textarea id="booking-desc-${worker.id}" placeholder="Describe what you need..."></textarea>
            </div>
            
            <button class="booking-submit-btn" onclick="createBooking(${worker.id}, ${worker.hourly_rate})">📅 Book Now</button>
            <p class="booking-rate-info">Rate: ₹${worker.hourly_rate}/hour</p>
          </div>
          
          <!-- Rating Box -->
          <div class="profile-rating-box">
            <h3>⭐ Rate This Worker</h3>
            ${userRating ? `<p class="rating-display">Your Rating: ${userRating.rating}/5</p>` : ''}
            <div class="star-rating-container">
              <span onclick="window.selectRating(${worker.id}, 1)">☆</span>
              <span onclick="window.selectRating(${worker.id}, 2)">☆</span>
              <span onclick="window.selectRating(${worker.id}, 3)">☆</span>
              <span onclick="window.selectRating(${worker.id}, 4)">☆</span>
              <span onclick="window.selectRating(${worker.id}, 5)">☆</span>
            </div>
            <textarea class="review-textarea" id="review-text-${worker.id}" placeholder="Write your review (optional)..."></textarea>
            <button class="rating-submit-btn" onclick="window.submitRating(${worker.id})">⭐ Submit Rating</button>
            <p class="rating-note">Click stars to rate (1-5)</p>
          </div>
        </div>
      </div>
      
      <!-- Map -->
      <div id="profile-map"></div>
    </div>
  `;
  
  // Load certificates and map
  if (worker.location) {
    try {
      initMapForAddress(worker.location);
    } catch (e) {
      console.log('Map init error:', e);
    }
  }
  loadProfileCertificates(worker.id);
  console.log('✅ Profile displayed');
}

// Load certificates for worker profile
async function loadProfileCertificates(workerId) {
  try {
    const response = await fetch(`${API_BASE_URL}/certificates/${workerId}`);
    const data = await response.json();
    
    const container = document.getElementById(`profile-certificates-${workerId}`);
    if (!container) return;

    if (!data.success || data.data.length === 0) {
      container.innerHTML = '<p style="color: var(--color-text-secondary);">No certificates</p>';
      return;
    }

    let html = '';
    data.data.forEach(cert => {
      html += `
        <div class="certificate-item">
          <strong>${escapeHtml(cert.certificate_name)}</strong>
          ${cert.description ? `<p>${escapeHtml(cert.description)}</p>` : ''}
          <a href="${cert.file_path}" target="_blank">📥 Download PDF</a>
        </div>
      `;
    });
    
    container.innerHTML = html;
  } catch (error) {
    console.error('Error loading certificates:', error);
  }
}

// ============= BOOKING SYSTEM =============

async function createBooking(workerId, hourlyRate) {
  const token = localStorage.getItem('authToken');
  if (!token) {
    alert('❌ Please login to book services');
    return;
  }

  const date = document.getElementById(`booking-date-${workerId}`)?.value;
  const startTime = document.getElementById(`booking-start-${workerId}`)?.value;
  const duration = parseInt(document.getElementById(`booking-duration-${workerId}`)?.value || 1);
  const description = document.getElementById(`booking-desc-${workerId}`)?.value;

  if (!date || !startTime) {
    alert('❌ Please select date and time');
    return;
  }

  // Calculate end time
  const [hours, minutes] = startTime.split(':');
  const endHours = (parseInt(hours) + duration) % 24;
  const endTime = `${endHours.toString().padStart(2, '0')}:${minutes}`;

  const totalPrice = hourlyRate * duration;

  try {
    const response = await fetch(`${API_BASE_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        worker_id: workerId,
        booking_date: date,
        start_time: startTime,
        end_time: endTime,
        service_description: description,
        total_price: totalPrice
      })
    });

    const data = await response.json();

    if (data.success) {
      alert(`✅ Booking created successfully!\n\nTotal: ₹${totalPrice}\nDate: ${date}\nTime: ${startTime} - ${endTime}`);
      
      // Clear form
      document.getElementById(`booking-date-${workerId}`).value = '';
      document.getElementById(`booking-start-${workerId}`).value = '';
      document.getElementById(`booking-desc-${workerId}`).value = '';
    } else {
      alert('❌ ' + data.message);
    }
  } catch (error) {
    console.error('Booking error:', error);
    alert('❌ Error: ' + error.message);
  }
}

// Load user bookings
async function loadMyBookings() {
  try {
    const response = await fetch(`${API_BASE_URL}/bookings/user`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
    });
    const data = await response.json();

    const container = document.getElementById('my-bookings-list');
    if (!container) return;

    if (!data.success || data.data.length === 0) {
      container.innerHTML = '<p style="color: #999;">No bookings yet</p>';
      return;
    }

    let html = '';
    data.data.forEach(booking => {
      const statusColors = {
        pending: '#ff9800',
        confirmed: '#4CAF50',
        completed: '#2196F3',
        cancelled: '#f44336'
      };

      html += `
        <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid ${statusColors[booking.status]}; margin-bottom: 15px;">
          <h4 style="margin: 0 0 10px 0;">${booking.worker_name} - ${booking.occupation}</h4>
          <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date(booking.booking_date).toLocaleDateString()}</p>
          <p style="margin: 5px 0;"><strong>Time:</strong> ${booking.start_time} - ${booking.end_time}</p>
          <p style="margin: 5px 0;"><strong>Price:</strong> ₹${booking.total_price}</p>
          <p style="margin: 5px 0;"><strong>Status:</strong> <span style="background: ${statusColors[booking.status]}; color: white; padding: 3px 10px; border-radius: 3px; font-size: 12px;">${booking.status.toUpperCase()}</span></p>
          ${booking.service_description ? `<p style="margin: 10px 0 0 0; color: #666;">${booking.service_description}</p>` : ''}
        </div>
      `;
    });

    container.innerHTML = html;
  } catch (error) {
    console.error('Error loading bookings:', error);
  }
}


// ============= CERTIFICATE FUNCTIONS =============
async function uploadCertificate() {
  console.log('📤 Starting certificate upload...');
  
  // ✅ FIXED: Get token from localStorage (not from local scope)
  const token = localStorage.getItem('authToken');
  console.log('Auth token:', token ? 'YES' : 'NO');
  
  if (!token) {
    alert('❌ You must login first to upload certificates');
    return;
  }
  
  const certName = document.getElementById('certificate-name')?.value?.trim();
  const certDesc = document.getElementById('certificate-description')?.value?.trim() || '';
  const certFileInput = document.getElementById('certificate-file');
  
  console.log('Cert name:', certName);
  console.log('Cert file input:', certFileInput);

  if (!certName) {
    alert('❌ Please enter certificate name');
    return;
  }

  if (!certFileInput || !certFileInput.files || certFileInput.files.length === 0) {
    alert('❌ Please select a PDF file');
    return;
  }

  const certFile = certFileInput.files[0];
  console.log('Cert file:', certFile);
  console.log('File name:', certFile.name);
  console.log('File type:', certFile.type);
  console.log('File size:', certFile.size);

  if (!certFile) {
    alert('❌ File not found');
    return;
  }

  // ✅ Check file extension
  const fileName = certFile.name.toLowerCase();
  const fileExtension = fileName.substring(fileName.lastIndexOf('.') + 1);
  
  console.log('File extension:', fileExtension);

  if (fileExtension !== 'pdf') {
    alert('❌ Only PDF files are allowed. You selected: ' + fileExtension);
    return;
  }

  // Check file size
  if (certFile.size > 5 * 1024 * 1024) {
    alert('❌ File size must be less than 5MB. Your file: ' + (certFile.size / 1024 / 1024).toFixed(2) + 'MB');
    return;
  }

  try {
    const btn = document.getElementById('upload-cert-btn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '⏳ Uploading...';
    }

    const formData = new FormData();
    formData.append('certificate_name', certName);
    formData.append('description', certDesc);
    formData.append('certificate_file', certFile);

    console.log('🚀 Uploading to:', `${API_BASE_URL}/certificates`);
    console.log('📡 Token:', token.substring(0, 20) + '...');

    const response = await fetch(`${API_BASE_URL}/certificates`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`  // ✅ FIXED: Use token from localStorage
      },
      body: formData
    });

    console.log('Response status:', response.status);
    const data = await response.json();
    console.log('Response data:', data);

    if (data.success) {
      alert('✅ Certificate uploaded successfully!');
      
      // Clear form
      document.getElementById('certificate-name').value = '';
      document.getElementById('certificate-description').value = '';
      document.getElementById('certificate-file').value = '';
      
      // Refresh certificates list
      if (typeof loadCertificates === 'function') {
        loadCertificates();
      }
      
    } else {
      alert('❌ ' + (data.message || 'Upload failed'));
    }
    
    if (btn) {
      btn.disabled = false;
      btn.textContent = '📤 Upload Certificate';
    }

  } catch (error) {
    console.error('❌ Upload error:', error);
    alert('❌ Error: ' + error.message);
    
    const btn = document.getElementById('upload-cert-btn');
    if (btn) {
      btn.disabled = false;
      btn.textContent = '📤 Upload Certificate';
    }
  }
}
// ============= COMBINED CERTIFICATE MANAGEMENT =============

// ============= CERTIFICATE MANAGEMENT - COMPLETE WORKING VERSION =============

let certificatesToUpload = []; // Store certificates before registration

// Add certificate to the upload queue
function addCertificateToList() {
  console.log('➕ Adding certificate to list...');
  
  const certName = document.getElementById('certificate-name-field')?.value?.trim();
  const certDesc = document.getElementById('certificate-description-field')?.value?.trim() || '';
  const certFileInput = document.getElementById('certificate-file-field');
  
  // Validate inputs
  if (!certName) {
    alert('❌ Please enter certificate name');
    return;
  }
  
  if (!certFileInput || !certFileInput.files || certFileInput.files.length === 0) {
    alert('❌ Please select a PDF file');
    return;
  }
  
  const certFile = certFileInput.files[0];
  
  // ✅ FIXED: Check if certFile exists and has name
  if (!certFile || !certFile.name) {
    console.error('❌ File object invalid:', certFile);
    alert('❌ File selection failed. Please try again.');
    return;
  }
  
  console.log('📄 File:', certFile.name, 'Size:', certFile.size);
  
  // Check extension - ✅ FIXED: Handle undefined safely
  const fileName = certFile.name ? certFile.name.toLowerCase() : '';
  
  if (!fileName) {
    alert('❌ Invalid file');
    return;
  }
  
  const fileExtension = fileName.substring(fileName.lastIndexOf('.') + 1);
  
  console.log('📋 Extension:', fileExtension);
  
  if (fileExtension !== 'pdf') {
    alert('❌ Only PDF files allowed. You selected: ' + fileExtension);
    return;
  }
  
  // Check size (5MB)
  if (certFile.size > 5 * 1024 * 1024) {
    alert('❌ File size must be less than 5MB. Your file: ' + (certFile.size / 1024 / 1024).toFixed(2) + 'MB');
    return;
  }
  
  // Add to queue
  const certId = Date.now();
  certificatesToUpload.push({
    id: certId,
    name: certName,
    description: certDesc,
    file: certFile
  });
  
  console.log('✅ Certificate added. Total:', certificatesToUpload.length);
  
  // Show success message
  alert('✅ Certificate added! You can add more or click Submit to register.');
  
  // Clear form fields
  document.getElementById('certificate-name-field').value = '';
  document.getElementById('certificate-description-field').value = '';
  document.getElementById('certificate-file-field').value = '';
  
  // Update display
  displayCertificatesToUpload();
}


// Display the list of certificates to be uploaded
function displayCertificatesToUpload() {
  const container = document.getElementById('certificates-container');
  
  if (!container) {
    console.error('❌ certificates-container not found');
    return;
  }
  
  if (certificatesToUpload.length === 0) {
    container.innerHTML = '';
    return;
  }
  
  let html = '<div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 15px;">';
  html += '<h4 style="margin: 0 0 10px 0; color: #1976d2;">📋 Certificates Ready to Upload:</h4>';
  html += '<div style="display: grid; gap: 8px;">';
  
  certificatesToUpload.forEach(cert => {
    const fileSizeKB = (cert.file.size / 1024).toFixed(0);
    html += `
      <div style="background: white; padding: 10px; border-radius: 4px; border-left: 4px solid #4CAF50; display: flex; justify-content: space-between; align-items: center;">
        <div style="flex: 1;">
          <strong style="color: #333;">📄 ${escapeHtml(cert.name)}</strong>
          <p style="font-size: 11px; color: #666; margin: 3px 0 0 0;">
            ${escapeHtml(cert.file.name)} (${fileSizeKB} KB)
            ${cert.description ? ' - ' + escapeHtml(cert.description) : ''}
          </p>
        </div>
        <button onclick="removeCertificateFromList(${cert.id})" style="background: #f44336; color: white; border: none; border-radius: 3px; padding: 5px 10px; cursor: pointer; font-size: 11px;">
          🗑️ Remove
        </button>
      </div>
    `;
  });
  
  html += '</div></div>';
  container.innerHTML = html;
}

// Remove certificate from upload queue
function removeCertificateFromList(certId) {
  certificatesToUpload = certificatesToUpload.filter(c => c.id !== certId);
  console.log('🗑️ Certificate removed. Remaining:', certificatesToUpload.length);
  displayCertificatesToUpload();
}

// Upload all certificates after worker is created
async function uploadCertificatesAfterRegistration(workerId) {
  console.log('📤 Starting certificate upload for worker:', workerId);
  console.log('Certificates to upload:', certificatesToUpload.length);
  
  if (certificatesToUpload.length === 0) {
    console.log('ℹ️ No certificates to upload');
    return true;
  }
  
  const token = localStorage.getItem('authToken');
  
  if (!token) {
    console.error('❌ No auth token found');
    return false;
  }
  
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < certificatesToUpload.length; i++) {
    const cert = certificatesToUpload[i];
    
    try {
      const formData = new FormData();
      formData.append('certificate_name', cert.name);
      formData.append('description', cert.description);
      formData.append('certificate_file', cert.file);
      formData.append('worker_id', workerId); // Explicitly pass worker_id
      
      console.log(`📤 Uploading certificate ${i + 1}/${certificatesToUpload.length}:`, cert.name);
      
      const response = await fetch(`${API_BASE_URL}/certificates`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Certificate uploaded:', cert.name);
        successCount++;
      } else {
        console.error('❌ Certificate upload failed:', data.message);
        failCount++;
      }
    } catch (error) {
      console.error('❌ Error uploading certificate:', error);
      failCount++;
    }
  }
  
  console.log(`📊 Upload complete: ${successCount} success, ${failCount} failed`);
  
  // Clear the upload queue
  certificatesToUpload = [];
  displayCertificatesToUpload();
  
  if (failCount > 0) {
    alert(`⚠️ Warning: ${failCount} certificate(s) failed to upload`);
  }
  
  return successCount > 0;
}

// Load and display certificates in worker profile
async function loadProfileCertificates(workerId) {
  console.log('📄 Loading certificates for worker:', workerId);
  
  try {
    const response = await fetch(`${API_BASE_URL}/certificates/${workerId}`);
    const data = await response.json();
    
    console.log('📥 Certificates response:', data);
    
    const container = document.getElementById(`profile-certificates-${workerId}`);
    if (!container) {
      console.error('❌ Certificate container not found');
      return;
    }

    if (!data.success || !data.data || data.data.length === 0) {
      console.log('ℹ️ No certificates found for worker', workerId);
      container.innerHTML = '<p style="color: #999; font-style: italic;">No certificates uploaded</p>';
      return;
    }

    console.log('✅ Found', data.data.length, 'certificate(s)');

    let html = '<div style="display: grid; gap: 12px;">';
    
    data.data.forEach(cert => {
      const uploadDate = new Date(cert.uploaded_at).toLocaleDateString();
      
      html += `
        <div style="background: white; padding: 12px; border-radius: 6px; border-left: 4px solid #4CAF50; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="flex: 1;">
              <strong style="color: #333; font-size: 14px;">📄 ${escapeHtml(cert.certificate_name)}</strong>
              ${cert.description ? `<p style="font-size: 12px; color: #666; margin: 5px 0 0 0;">${escapeHtml(cert.description)}</p>` : ''}
              <small style="color: #999; font-size: 11px;">Uploaded: ${uploadDate}</small>
            </div>
            <a href="${cert.file_path}" target="_blank" download style="padding: 8px 12px; background: #2196F3; color: white; border-radius: 4px; text-decoration: none; font-size: 12px; white-space: nowrap;">
              📥 Download
            </a>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    
    container.innerHTML = html;
    console.log('✅ Displayed', data.data.length, 'certificate(s)');

  } catch (error) {
    console.error('❌ Error loading certificates:', error);
    const container = document.getElementById(`profile-certificates-${workerId}`);
    if (container) {
      container.innerHTML = '<p style="color: #f44336;">Error loading certificates</p>';
    }
  }
}


async function loadCertificates(workerId = null) {
  // If no workerId provided, get from current user
  if (!workerId && !document.getElementById('worker-form')) return;

  try {
    const response = await fetch(`${API_BASE_URL}/certificates/${workerId}`);
    const data = await response.json();

    const list = document.getElementById('certificates-list');
    if (!list) return;

    if (!data.success || data.data.length === 0) {
      list.innerHTML = '<p style="color: #999;">No certificates uploaded yet</p>';
      return;
    }

    let html = '<h4>Uploaded Certificates:</h4><div style="display: grid; gap: 10px;">';
    
    data.data.forEach(cert => {
      html += `
        <div style="background: #f0f0f0; padding: 12px; border-radius: 4px; border-left: 4px solid #2196F3;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong>📄 ${escapeHtml(cert.certificate_name)}</strong>
              ${cert.description ? `<p style="font-size: 12px; color: #666; margin: 5px 0;">${escapeHtml(cert.description)}</p>` : ''}
              <small style="color: #999;">Uploaded: ${new Date(cert.uploaded_at).toLocaleDateString()}</small>
            </div>
            <div style="display: flex; gap: 5px;">
              <a href="${cert.file_path}" target="_blank" style="padding: 6px 12px; background: #2196F3; color: white; border-radius: 3px; text-decoration: none; font-size: 12px;">📥 View</a>
              <button onclick="deleteCertificate(${cert.id})" style="padding: 6px 12px; background: #f44336; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 12px;">🗑️ Delete</button>
            </div>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    list.innerHTML = html;

  } catch (error) {
    console.error('Error loading certificates:', error);
  }
}

async function deleteCertificate(certificateId) {
  if (!confirm('Are you sure you want to delete this certificate?')) return;

  try {
    const response = await fetch(`${API_BASE_URL}/certificates/${certificateId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const data = await response.json();

    if (data.success) {
      alert('✅ Certificate deleted');
      loadCertificates();
    } else {
      alert('❌ ' + data.message);
    }
  } catch (error) {
    console.error('Error deleting:', error);
    alert('❌ Error: ' + error.message);
  }
}



// ============= RATING FUNCTIONS =============
// ============= GLOBAL RATING FUNCTIONS =============

// Make functions available globally
window.selectedRating = 0;

window.selectRating = function(workerId, rating) {
  window.selectedRating = rating;
  console.log('⭐ Selected rating:', rating, 'for worker:', workerId);
  
  // Update star display
  const starContainer = document.getElementById(`star-rating-${workerId}`);
  if (starContainer) {
    const spans = starContainer.querySelectorAll('span');
    spans.forEach((span, index) => {
      if (index < rating) {
        span.textContent = '★';
        span.style.color = '#ffc107';
      } else {
        span.textContent = '☆';
        span.style.color = '#ccc';
      }
    });
  }
  
  console.log('✅ Stars updated');
};

window.submitRating = async function(workerId) {
  console.log('🚀 submitRating called for worker:', workerId);
  console.log('Rating selected:', window.selectedRating);
  
  if (!authToken) {
    alert('❌ Please login first to rate workers');
    return;
  }
  
  if (window.selectedRating === 0) {
    alert('❌ Please select a rating by clicking stars');
    return;
  }
  
  const reviewText = document.getElementById(`review-text-${workerId}`)?.value || '';
  
  try {
    console.log('📤 Submitting to:', `${API_BASE_URL}/ratings`);
    
    const response = await fetch(`${API_BASE_URL}/ratings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        worker_id: parseInt(workerId),
        rating: window.selectedRating,
        review: reviewText
      })
    });
    
    const data = await response.json();
    console.log('✅ Response:', data);
    
    if (data.success) {
      alert('✅ Thank you! Your ' + window.selectedRating + ' star rating has been submitted!');
      
      // Reset
      window.selectedRating = 0;
      
      // Refresh data
      await fetchWorkersFromSQL();
      const worker = allWorkersData.find(w => w.id === parseInt(workerId));
      if (worker) {
        displayWorkerProfile(worker);
      }
      
    } else {
      alert('❌ Error: ' + data.message);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    alert('❌ Error: ' + error.message);
  }
};

// ============= RATING FUNCTIONS - FIXED =============

let selectedRating = 0;


function selectRating(workerId, rating) {
  selectedRating = rating;
  console.log('⭐ Selected rating:', rating, 'for worker:', workerId);
  
  // Update star display
  const starContainer = document.getElementById(`star-rating-${workerId}`);
  if (!starContainer) {
    console.error('❌ Star container not found for worker', workerId);
    return;
  }
  
  const stars = starContainer.querySelectorAll('.star');
  console.log('Stars found:', stars.length);
  
  stars.forEach((star, index) => {
    if (index < rating) {
      star.textContent = '★';
      star.style.color = '#ffc107';
    } else {
      star.textContent = '☆';
      star.style.color = '#ccc';
    }
  });
  
  // Enable submit button
  const submitBtn = document.getElementById(`submit-rating-btn-${workerId}`);
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.style.opacity = '1';
    submitBtn.style.cursor = 'pointer';
    submitBtn.style.backgroundColor = '#ffc107';
    console.log('✅ Submit button enabled');
  } else {
    console.error('❌ Submit button not found for worker', workerId);
  }
}

async function submitRating(workerId) {
  console.log('🚀 submitRating() called for worker:', workerId);
  console.log('Selected rating:', selectedRating);
  console.log('Auth token:', authToken ? 'YES' : 'NO');
  
  if (!authToken) {
    console.error('❌ No auth token');
    alert('❌ Please login to rate workers');
    showModal('login-modal');
    return;
  }
  
  if (selectedRating === 0) {
    console.error('❌ No rating selected');
    alert('❌ Please select a rating (1-5 stars)');
    return;
  }
  
  const reviewText = document.getElementById(`review-text-${workerId}`)?.value || '';
  
  console.log('📤 Submitting rating:', { 
    workerId, 
    rating: selectedRating, 
    review: reviewText,
    apiUrl: `${API_BASE_URL}/ratings`
  });
  
  try {
    // Show loading state
    const submitBtn = document.getElementById(`submit-rating-btn-${workerId}`);
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ Submitting...';
    }
    
    const payload = {
      worker_id: parseInt(workerId),
      rating: parseInt(selectedRating),
      review: reviewText
    };
    
    console.log('📋 Payload:', JSON.stringify(payload));
    
    const response = await fetch(`${API_BASE_URL}/ratings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(payload)
    });
    
    console.log('📊 Response status:', response.status);
    
    const data = await response.json();
    console.log('📥 Response data:', data);
    
    if (data.success) {
      console.log('✅ Rating submitted successfully');
      alert('✅ Thank you for rating! Your feedback helps others.\n\nRating: ' + selectedRating + ' stars');
      
      // Reset UI
      selectedRating = 0;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '⭐ Submit Rating';
        submitBtn.style.opacity = '0.5';
      }
      
      // Clear stars display
      const starContainer = document.getElementById(`star-rating-${workerId}`);
      if (starContainer) {
        const stars = starContainer.querySelectorAll('.star');
        stars.forEach(star => {
          star.textContent = '☆';
          star.style.color = '#ccc';
        });
      }
      
      // Clear review text
      const reviewInput = document.getElementById(`review-text-${workerId}`);
      if (reviewInput) {
        reviewInput.value = '';
      }
      
      // Refresh workers data
      console.log('🔄 Refreshing workers...');
      await fetchWorkersFromSQL();
      
      // Refresh profile
      const worker = allWorkersData.find(w => w.id === parseInt(workerId));
      if (worker) {
        console.log('✅ Refreshing profile for:', worker.name);
        displayWorkerProfile(worker);
      }
      
    } else {
      console.error('❌ Server error:', data.message);
      alert('❌ ' + (data.message || 'Rating submission failed'));
      
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '⭐ Submit Rating';
      }
    }
  } catch (error) {
    console.error('❌ Rating submission error:', error);
    console.error('Error stack:', error.stack);
    alert('❌ Error: ' + error.message);
    
    const submitBtn = document.getElementById(`submit-rating-btn-${workerId}`);
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = '⭐ Submit Rating';
    }
  }
}



function contactWorker(workerId) {
  const worker = allWorkersData.find(w => w.id === workerId) || currentWorker;
  if (worker) {
    alert(`Contact Information:\n\nName: ${worker.name}\nPhone: ${worker.phone}\nEmail: ${worker.email}\n\nPlease feel free to contact this worker directly!`);
  }
}

// ========================================
// FILTER FUNCTIONS
// ========================================

// ============= FILTER FUNCTIONS =============

// ============= COMBINED FILTER STATE =============
let activeFilters = {
  occupation: '',
  location: '',
  budget: ''
};

function applyAllFilters() {
  console.log('🔄 Applying all filters:', activeFilters);
  
  filteredWorkers = allWorkersData.filter(worker => {
    let matches = true;

    // Filter by occupation
    if (activeFilters.occupation && activeFilters.occupation !== '') {
      const workerOcc = (worker.occupation || '').toLowerCase();
      const selectedOcc = activeFilters.occupation.toLowerCase();
      matches = matches && (workerOcc === selectedOcc);
    }

    // Filter by location
    if (activeFilters.location && activeFilters.location !== '') {
      const workerLoc = (worker.location || '').toLowerCase();
      const selectedLoc = activeFilters.location.toLowerCase();
      matches = matches && (workerLoc.includes(selectedLoc) || selectedLoc.includes(workerLoc));
    }

    // Filter by budget
    if (activeFilters.budget && activeFilters.budget !== '') {
      const rate = parseFloat(worker.hourly_rate);
      
      if (activeFilters.budget === '500') {
        matches = matches && (rate >= 500);
      } else {
        const [min, max] = activeFilters.budget.split('-');
        const minRate = parseInt(min);
        const maxRate = parseInt(max);
        matches = matches && (rate >= minRate && rate <= maxRate);
      }
    }

    return matches;
  });

  console.log('✅ Filtered workers count:', filteredWorkers.length);
  displayAllWorkers();
  updateResultsCount();
}

// ============= INDIVIDUAL FILTER FUNCTIONS =============

function filterWorkersByOccupation(occupation) {
  console.log('🔍 Setting occupation filter:', occupation);
  activeFilters.occupation = occupation;
  applyAllFilters();
}

function filterWorkersByLocation(location) {
  console.log('🔍 Setting location filter:', location);
  activeFilters.location = location;
  applyAllFilters();
}

function handleBudgetFilter(budgetRange) {
  console.log('🔍 Setting budget filter:', budgetRange);
  activeFilters.budget = budgetRange;
  applyAllFilters();
}

function searchWorkers(searchTerm) {
  console.log('🔍 Searching for:', searchTerm);
  
  if (!searchTerm || searchTerm.trim() === '') {
    // Reset to all data and apply other active filters
    filteredWorkers = [...allWorkersData];
    applyAllFilters();
    return;
  }

  const term = searchTerm.toLowerCase().trim();
  
  // Start with all workers
  filteredWorkers = allWorkersData.filter(worker => {
    const name = (worker.name || '').toLowerCase();
    const occupation = (worker.occupation || '').toLowerCase();
    const location = (worker.location || '').toLowerCase();
    const description = (worker.description || '').toLowerCase();
    
    let specialties = '';
    try {
      const specs = Array.isArray(worker.specialties)
        ? worker.specialties
        : JSON.parse(worker.specialties || '[]');
      specialties = specs.map(s => s.toLowerCase()).join(' ');
    } catch (e) {
      specialties = '';
    }

    // Search match
    const searchMatch = name.includes(term) || 
           occupation.includes(term) || 
           location.includes(term) || 
           description.includes(term) ||
           specialties.includes(term);

    // AND apply other active filters
    let otherFiltersMatch = true;

    if (activeFilters.occupation && activeFilters.occupation !== '') {
      const workerOcc = (worker.occupation || '').toLowerCase();
      const selectedOcc = activeFilters.occupation.toLowerCase();
      otherFiltersMatch = otherFiltersMatch && (workerOcc === selectedOcc);
    }

    if (activeFilters.location && activeFilters.location !== '') {
      const workerLoc = (worker.location || '').toLowerCase();
      const selectedLoc = activeFilters.location.toLowerCase();
      otherFiltersMatch = otherFiltersMatch && (workerLoc.includes(selectedLoc) || selectedLoc.includes(workerLoc));
    }

    if (activeFilters.budget && activeFilters.budget !== '') {
      const rate = parseFloat(worker.hourly_rate);
      if (activeFilters.budget === '500') {
        otherFiltersMatch = otherFiltersMatch && (rate >= 500);
      } else {
        const [min, max] = activeFilters.budget.split('-');
        const minRate = parseInt(min);
        const maxRate = parseInt(max);
        otherFiltersMatch = otherFiltersMatch && (rate >= minRate && rate <= maxRate);
      }
    }

    return searchMatch && otherFiltersMatch;
  });

  console.log('✅ Search + filter results:', filteredWorkers.length);
  displayAllWorkers();
  updateResultsCount();
}

function sortWorkers() {
  const sortBy = document.getElementById('sort-by')?.value || '';
  console.log('🔄 Sorting by:', sortBy);
  
  if (!sortBy) return;
  
  switch(sortBy) {
    case 'rating':
      filteredWorkers.sort((a, b) => parseFloat(b.rating || 0) - parseFloat(a.rating || 0));
      break;
    case 'price-low':
      filteredWorkers.sort((a, b) => parseFloat(a.hourly_rate) - parseFloat(b.hourly_rate));
      break;
    case 'price-high':
      filteredWorkers.sort((a, b) => parseFloat(b.hourly_rate) - parseFloat(a.hourly_rate));
      break;
    case 'experience':
      filteredWorkers.sort((a, b) => parseFloat(b.experience) - parseFloat(a.experience));
      break;
  }
  
  displayAllWorkers();
}

function updateResultsCount() {
  console.log('📊 Updating results count. Total filtered:', filteredWorkers.length);
  const resultsCount = document.getElementById('results-count');
  if (resultsCount) {
    const count = filteredWorkers.length;
    const text = count === 0 ? 'No workers found' : `Showing ${count} worker${count !== 1 ? 's' : ''}`;
    resultsCount.textContent = text;
    console.log('✅ Results count updated:', text);
  }
}

// ============= HELPER FUNCTIONS =============

function parseJSON(str) {
  try {
    return Array.isArray(str) ? str : JSON.parse(str || '[]');
  } catch (e) {
    return [];
  }
}

function escapeHtml(text) {
  return (text || '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
}

// ============= FILTER FUNCTIONS =============

function filterWorkersByOccupation(occupation) {
  console.log('🔍 Filtering by occupation:', occupation);
  console.log('Total workers:', allWorkersData.length);
  
  if (!occupation || occupation === '') {
    filteredWorkers = [...allWorkersData];
  } else {
    filteredWorkers = allWorkersData.filter(worker => {
      const workerOcc = (worker.occupation || '').toLowerCase();
      const selectedOcc = occupation.toLowerCase();
      return workerOcc === selectedOcc;
    });
  }

  console.log('Filtered count:', filteredWorkers.length);
  displayAllWorkers();
  updateResultsCount();
}

function filterWorkersByLocation(location) {
  console.log('🔍 Filtering by location:', location);
  
  if (!location || location === '') {
    filteredWorkers = [...allWorkersData];
  } else {
    filteredWorkers = allWorkersData.filter(worker => {
      const workerLoc = (worker.location || '').toLowerCase();
      const selectedLoc = location.toLowerCase();
      return workerLoc.includes(selectedLoc) || selectedLoc.includes(workerLoc);
    });
  }

  console.log('Filtered count:', filteredWorkers.length);
  displayAllWorkers();
  updateResultsCount();
}

function handleBudgetFilter(budgetRange) {
  console.log('🔍 Filtering by budget:', budgetRange);
  
  if (!budgetRange || budgetRange === '') {
    filteredWorkers = [...allWorkersData];
  } else if (budgetRange === '500') {
    filteredWorkers = allWorkersData.filter(w => {
      const rate = parseFloat(w.hourly_rate);
      return rate >= 500;
    });
  } else {
    const [min, max] = budgetRange.split('-');
    const minRate = parseInt(min);
    const maxRate = parseInt(max);
    filteredWorkers = allWorkersData.filter(w => {
      const rate = parseFloat(w.hourly_rate);
      return rate >= minRate && rate <= maxRate;
    });
  }

  console.log('Filtered count:', filteredWorkers.length);
  displayAllWorkers();
  updateResultsCount();
}

function searchWorkers(searchTerm) {
  console.log('🔍 Searching for:', searchTerm);
  
  if (!searchTerm || searchTerm.trim() === '') {
    filteredWorkers = [...allWorkersData];
  } else {
    const term = searchTerm.toLowerCase().trim();
    filteredWorkers = allWorkersData.filter(worker => {
      const name = (worker.name || '').toLowerCase();
      const occupation = (worker.occupation || '').toLowerCase();
      const location = (worker.location || '').toLowerCase();
      const description = (worker.description || '').toLowerCase();
      
      return name.includes(term) || 
             occupation.includes(term) || 
             location.includes(term) || 
             description.includes(term);
    });
  }

  console.log('Filtered count:', filteredWorkers.length);
  displayAllWorkers();
  updateResultsCount();
}

function updateResultsCount() {
  console.log('📊 Updating results count. Total filtered:', filteredWorkers.length);
  const resultsCount = document.getElementById('results-count');
  if (resultsCount) {
    const count = filteredWorkers.length;
    const text = count === 0 ? 'No workers found' : `Showing ${count} worker${count !== 1 ? 's' : ''}`;
    resultsCount.textContent = text;
    console.log('✅ Results count updated:', text);
  }
}

function sortWorkers() {
  const sortBy = document.getElementById('sort-by').value;
  console.log('🔄 Sorting by:', sortBy);
  
  if (sortBy === 'rating') {
    filteredWorkers.sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0));
  } else if (sortBy === 'price-low') {
    filteredWorkers.sort((a, b) => parseFloat(a.hourly_rate) - parseFloat(b.hourly_rate));
  } else if (sortBy === 'price-high') {
    filteredWorkers.sort((a, b) => parseFloat(b.hourly_rate) - parseFloat(a.hourly_rate));
  } else if (sortBy === 'experience') {
    filteredWorkers.sort((a, b) => parseInt(b.experience) - parseInt(a.experience));
  }
  
  displayAllWorkers();
}

// ========================================
// SEARCH & SORT
// ========================================

async function handleSearch(e) {
  e?.preventDefault?.();
  searchWorkers();
}

function sortWorkers() {
  const sortBy = document.getElementById('sort-by')?.value || '';
  
  if (!sortBy) return;
  
  switch(sortBy) {
    case 'rating':
      filteredWorkers.sort((a, b) => parseFloat(b.rating || 0) - parseFloat(a.rating || 0));
      break;
    case 'price-low':
      filteredWorkers.sort((a, b) => parseFloat(a.hourly_rate) - parseFloat(b.hourly_rate));
      break;
    case 'price-high':
      filteredWorkers.sort((a, b) => parseFloat(b.hourly_rate) - parseFloat(a.hourly_rate));
      break;
    case 'experience':
      filteredWorkers.sort((a, b) => parseFloat(b.experience) - parseFloat(a.experience));
      break;
  }
  
  displayAllWorkers();
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

function parseJSON(jsonString) {
  try {
    return JSON.parse(jsonString || '[]');
  } catch {
    return [];
  }
}

function generateStars(rating) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  let stars = '';
  
  for (let i = 0; i < fullStars; i++) stars += '⭐';
  if (hasHalfStar) stars += '⭐';
  
  return stars || '✓';
}

function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function updateResultsCount() {
  const resultsCount = document.getElementById('results-count');
  if (resultsCount) {
    resultsCount.textContent = `Showing ${filteredWorkers.length} worker${filteredWorkers.length !== 1 ? 's' : ''}`;
  }
}

// ========================================
// FORM POPULATION
// ========================================

function populateFormDropdowns() {
  const occupationSelect = document.getElementById('worker-occupation');
  const workAreasContainer = document.getElementById('work-areas-container');
  
  if (occupationSelect) {
    occupationSelect.innerHTML = '<option value="">Select your occupation</option>';
    appData.occupationsList.forEach(occ => {
      occupationSelect.innerHTML += `<option value="${occ}">${occ}</option>`;
    });
  }
  
  if (workAreasContainer) {
    workAreasContainer.innerHTML = '';
    appData.locationsList.forEach(loc => {
      const id = `area-${loc.replace(/\s+/g, '-')}`;
      workAreasContainer.innerHTML += `
        <div class="checkbox-item">
          <input type="checkbox" id="${id}" value="${loc}">
          <label for="${id}">${loc}</label>
        </div>
      `;
    });
  }
}

function populateSearchDropdowns() {
  const occupationSelect = document.getElementById('search-occupation');
  const locationSelect = document.getElementById('search-location');
  
  if (occupationSelect) {
    occupationSelect.innerHTML = '<option value="">All Services</option>';
    appData.occupationsList.forEach(occ => {
      occupationSelect.innerHTML += `<option value="${occ}">${occ}</option>`;
    });
  }
  
  if (locationSelect) {
    locationSelect.innerHTML = '<option value="">All Areas</option>';
    appData.locationsList.forEach(loc => {
      locationSelect.innerHTML += `<option value="${loc}">${loc}</option>`;
    });
  }
}

function updateSpecialties() {
  const occupation = document.getElementById('worker-occupation').value;
  const container = document.getElementById('specialties-container');
  
  if (!container) return;
  
  container.innerHTML = '';
  
  if (occupation && appData.specialtiesMap[occupation]) {
    appData.specialtiesMap[occupation].forEach(spec => {
      const id = `specialty-${spec.replace(/\s+/g, '-')}`;
      container.innerHTML += `
        <div class="checkbox-item">
          <input type="checkbox" id="${id}" value="${spec}">
          <label for="${id}">${spec}</label>
        </div>
      `;
    });
  }
}

// ========================================
// EVENT HANDLERS
// ========================================

function setupEventHandlers() {
  bindEvent('join-worker-btn', 'click', () => {
    if (!isLoggedIn()) {
      localStorage.setItem('pendingAction', 'worker-registration');
      showModal('login-modal');
    } else {
      showSection('worker-registration');
    }
  });
  
  bindEvent('find-workers-btn', 'click', () => {
    fetchWorkersFromSQL();
    showSection('customer-search');
  });
  
  bindEvent('login-btn', 'click', () => showModal('login-modal'));
  bindEvent('nav-brand', 'click', () => showSection('home'));
  bindEvent('home-link', 'click', (e) => { e.preventDefault(); showSection('home'); });
  
  bindEvent('back-from-registration', 'click', () => showSection('home'));
  bindEvent('back-from-search', 'click', () => showSection('home'));
  bindEvent('back-from-profile', 'click', () => showSection('customer-search'));
  bindEvent('back-from-about', 'click', () => showSection('home'));
  bindEvent('back-from-messages', 'click', () => showSection('home'));
  bindEvent('back-from-chat', 'click', () => showSection('home'));
  
  // Message send button
  const messagesSendBtn = document.getElementById('messages-send-btn');
  if (messagesSendBtn) {
    messagesSendBtn.addEventListener('click', () => sendMessageFromSection('messages'));
  }
  
  const messagesInput = document.getElementById('messages-input');
  if (messagesInput) {
    messagesInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendMessageFromSection('messages');
      }
    });
  }
  
  bindEvent('search-workers-btn', 'click', handleSearch);
  bindEvent('sort-by', 'change', sortWorkers);
  
  bindEvent('worker-form', 'submit', handleWorkerRegistration);
  bindEvent('login-form', 'submit', handleLogin);
  bindEvent('signup-form', 'submit', handleSignup);
  
  bindEvent('worker-occupation', 'change', updateSpecialties);
  
  bindEvent('login-modal-close', 'click', () => closeModal('login-modal'));
  bindEvent('signup-modal-close', 'click', () => closeModal('signup-modal'));
  bindEvent('success-modal-close', 'click', () => closeModal('success-modal'));
  bindEvent('success-continue', 'click', () => {
    closeModal('success-modal');
    showSection('home');
  });
  
  bindEvent('switch-to-register', 'click', (e) => {
    e.preventDefault();
    closeModal('login-modal');
    showModal('signup-modal');
  });
  
  bindEvent('switch-to-login', 'click', (e) => {
    e.preventDefault();
    closeModal('signup-modal');
    showModal('login-modal');
  });
  
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', function() {
      this.closest('.modal')?.classList.add('hidden');
    });
  });
  
  // Search inputs
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('keyup', () => searchWorkers(searchInput.value));
  }
  
  const occupationFilter = document.getElementById('search-occupation');
  if (occupationFilter) {
    occupationFilter.addEventListener('change', () => {
      filterWorkersByOccupation(occupationFilter.value);
    });
  }
  
  const locationFilter = document.getElementById('search-location');
  if (locationFilter) {
    locationFilter.addEventListener('change', () => {
      filterWorkersByLocation(locationFilter.value);
    });
  }
  
  const budgetFilter = document.getElementById('search-budget');
  if (budgetFilter) {
    budgetFilter.addEventListener('change', () => {
      const budget = budgetFilter.value;
      if (budget === '500+') {
        filterWorkersByBudget(999999);
      } else if (budget) {
        const max = parseInt(budget.split('-')) || parseInt(budget);
        filterWorkersByBudget(max);
      } else {
        filteredWorkers = [...allWorkersData];
        displayAllWorkers();
      }
      updateResultsCount();
    });
  }
  
  // Chat send button (in bookings/chat section)
  const chatSendBtn = document.getElementById('chat-send-btn');
  if (chatSendBtn) {
    chatSendBtn.addEventListener('click', sendMessage);
  }
  
  const chatInput = document.getElementById('chat-input');
  if (chatInput) {
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendMessage();
      }
    });
  }
  
  console.log('✅ Event handlers setup complete');
}

function bindEvent(id, event, handler) {
  const element = document.getElementById(id);
  if (element) {
    element.addEventListener(event, handler);
  }
}
// ============= WORKER PROFILE (ABOUT SECTION) =============

async function loadWorkerProfile() {
  try {
    const token = localStorage.getItem('authToken');
    console.log('🔍 Loading worker profile... Token:', token ? 'Present' : 'Missing');
    
    if (!token) {
      document.getElementById('about-content').innerHTML = '<p style="color: var(--color-text-secondary); text-align: center; padding: 20px; font-size: 16px;">🔑 Please login to view your worker profile.</p>';
      return;
    }

    const response = await fetch(`${API_BASE_URL}/users/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    console.log('👤 User data response:', data);

    if (!data.success) {
      document.getElementById('about-content').innerHTML = '<p style="color: var(--color-text-secondary); text-align: center; padding: 20px;">❌ Error loading profile.</p>';
      return;
    }

    const user = data.data;
    console.log('✅ User loaded:', user.name, 'Worker ID:', user.worker_id);

    // Check if user is a worker
    if (!user.worker_id) {
      document.getElementById('about-content').innerHTML = `
        <div style="background: var(--color-bg-1); padding: 40px 20px; border-radius: 12px; text-align: center;">
          <h3 style="color: var(--color-text); margin-top: 0;">👷 Not Registered as a Worker</h3>
          <p style="color: var(--color-text-secondary); font-size: 16px; line-height: 1.6;">
            You haven't registered as a worker yet. Register now to display your profile, skills, and attract customers!
          </p>
          <button class="btn btn--primary" onclick="showSection('worker-registration')" style="margin-top: 20px;">
            📝 Register as Worker
          </button>
        </div>
      `;
      return;
    }

    // Fetch worker details
    console.log('🔄 Fetching worker details for ID:', user.worker_id);
    const workerResponse = await fetch(`${API_BASE_URL}/workers/${user.worker_id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const workerData = await workerResponse.json();
    console.log('📊 Worker data response:', workerData);

    if (!workerData.success) {
      document.getElementById('about-content').innerHTML = '<p style="color: var(--color-text-secondary); text-align: center; padding: 20px;">❌ Error loading worker profile.</p>';
      return;
    }

    const worker = workerData.data;
    const specialties = parseJSON(worker.specialties);
    const serviceAreas = parseJSON(worker.service_areas);

    let html = `
      <div style="max-width: 900px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-active) 100%); color: var(--color-btn-primary-text); padding: 30px; border-radius: 12px; margin-bottom: 30px; text-align: center;">
          <h1 style="margin: 0 0 10px 0; font-size: 28px;">👤 ${escapeHtml(worker.name)}</h1>
          <p style="margin: 5px 0; font-size: 18px; opacity: 0.95;">🎯 ${escapeHtml(worker.occupation)}</p>
          <div style="display: flex; justify-content: center; gap: 30px; margin-top: 20px; flex-wrap: wrap;">
            <div><strong>⭐ Rating:</strong> ${worker.rating || 0}/5 (${worker.total_reviews || 0} reviews)</div>
            <div><strong>💼 Experience:</strong> ${worker.experience} years</div>
            <div><strong>💰 Rate:</strong> ₹${worker.hourly_rate}/hour</div>
            ${worker.verified ? '<div><strong>✓ Verified</strong></div>' : ''}
          </div>
        </div>

        <div style="display: grid; gap: 20px;">
          ${worker.description ? `
            <div style="background: var(--color-surface); padding: 20px; border-radius: 8px; border: 1px solid var(--color-card-border);">
              <h3 style="color: var(--color-text); margin-top: 0; margin-bottom: 10px;">📋 About Me</h3>
              <p style="color: var(--color-text); line-height: 1.6; margin: 0;">${escapeHtml(worker.description)}</p>
            </div>
          ` : ''}

          ${specialties && specialties.length > 0 ? `
            <div style="background: var(--color-surface); padding: 20px; border-radius: 8px; border: 1px solid var(--color-card-border);">
              <h3 style="color: var(--color-text); margin-top: 0; margin-bottom: 15px;">🔧 Skills & Specialties</h3>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px;">
                ${specialties.map(s => `<div style="background: var(--color-bg-1); padding: 10px; border-radius: 6px; border-left: 4px solid var(--color-primary); color: var(--color-text); font-size: 14px; text-align: center;">✓ ${escapeHtml(s)}</div>`).join('')}
              </div>
            </div>
          ` : ''}

          ${serviceAreas && serviceAreas.length > 0 ? `
            <div style="background: var(--color-surface); padding: 20px; border-radius: 8px; border: 1px solid var(--color-card-border);">
              <h3 style="color: var(--color-text); margin-top: 0; margin-bottom: 15px;">📍 Service Areas</h3>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px;">
                ${serviceAreas.map(a => `<div style="background: var(--color-bg-3); padding: 10px; border-radius: 6px; border-left: 4px solid var(--color-success); color: var(--color-text); font-size: 14px; text-align: center;">📍 ${escapeHtml(a)}</div>`).join('')}
              </div>
            </div>
          ` : ''}

          <div style="background: var(--color-surface); padding: 20px; border-radius: 8px; border: 1px solid var(--color-card-border);">
            <h3 style="color: var(--color-text); margin-top: 0; margin-bottom: 15px;">📋 Work Information</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
              <div>
                <p style="color: var(--color-text-secondary); margin: 0 0 5px 0; font-weight: bold;">📍 Location</p>
                <p style="color: var(--color-text); margin: 0; font-size: 16px;">${escapeHtml(worker.location || 'Not specified')}</p>
              </div>
              <div>
                <p style="color: var(--color-text-secondary); margin: 0 0 5px 0; font-weight: bold;">⏱️ Available Hours</p>
                <p style="color: var(--color-text); margin: 0; font-size: 16px;">${escapeHtml(worker.available_hours || 'Flexible')}</p>
              </div>
              <div>
                <p style="color: var(--color-text-secondary); margin: 0 0 5px 0; font-weight: bold;">🚗 Travel Radius</p>
                <p style="color: var(--color-text); margin: 0; font-size: 16px;">${escapeHtml(worker.travel_radius || 'Negotiable')} km</p>
              </div>
              <div>
                <p style="color: var(--color-text-secondary); margin: 0 0 5px 0; font-weight: bold;">📱 Phone</p>
                <p style="color: var(--color-text); margin: 0; font-size: 16px;">${escapeHtml(worker.phone || 'Not specified')}</p>
              </div>
            </div>
          </div>

          <div style="background: var(--color-surface); padding: 20px; border-radius: 8px; border: 1px solid var(--color-card-border);">
            <h3 style="color: var(--color-text); margin-top: 0; margin-bottom: 15px;">📧 Contact Information</h3>
            <div style="display: grid; gap: 12px;">
              <div>
                <p style="color: var(--color-text-secondary); margin: 0 0 5px 0; font-weight: bold;">✉️ Email</p>
                <p style="color: var(--color-text); margin: 0; font-size: 16px;">${escapeHtml(user.email)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('about-content').innerHTML = html;
    console.log('✅ Worker profile displayed successfully');
  } catch (error) {
    console.error('❌ Error loading worker profile:', error);
    document.getElementById('about-content').innerHTML = '<p style="color: #f44336; padding: 20px; text-align: center;">⚠️ Error loading profile. Please try again.</p>';
  }
}

// ============= REAL-TIME CHAT SYSTEM =============

let socket = null;
let currentChatUserId = null;
let currentConversationId = null;

// Initialize Socket.io
function initializeChat() {
  const token = localStorage.getItem('authToken');
  if (!token) return;

  socket = io('http://localhost:3000');
  
  const userId = localStorage.getItem('userId');
  socket.emit('join', userId);

  socket.on('receive_message', (data) => {
    console.log('📥 Message received:', data);
    if (currentChatUserId == data.from) {
      displayMessage(data.message, 'received', data.timestamp);
    }
    loadConversations();
  });

  loadConversations();
}

// Load conversations list (for both old chat and new messages sections)
async function loadConversations() {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    const response = await fetch(`${API_BASE_URL}/conversations`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();

    // Update both conversation lists
    const oldList = document.getElementById('chat-list');
    const newList = document.getElementById('conversations-list');

    if (!data.success || !data.data || data.data.length === 0) {
      const emptyHtml = '<p style="color: var(--color-text-secondary); padding: 15px; text-align: center;">No conversations yet</p>';
      if (oldList) oldList.innerHTML = emptyHtml;
      if (newList) newList.innerHTML = emptyHtml;
      return;
    }

    let html = '';
    data.data.forEach(conv => {
      const lastMsg = conv.last_message || 'No messages yet';
      const msgTime = new Date(conv.last_message_time).toLocaleString();
      const initials = conv.user_email.charAt(0).toUpperCase();
      
      html += `
        <div class="conversation-item" onclick="openMessageConversation(${conv.user_id}, '${escapeHtml(conv.user_email)}', ${conv.conversation_id})" style="padding: 12px; border-bottom: 1px solid var(--color-border); cursor: pointer; transition: background 0.2s;">
          <div style="display: flex; gap: 10px; align-items: flex-start;">
            <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--color-primary); display: flex; align-items: center; justify-content: center; color: var(--color-btn-primary-text); font-weight: bold; flex-shrink: 0;">
              ${initials}
            </div>
            <div style="flex: 1; min-width: 0;">
              <strong style="color: var(--color-text); display: block;">${escapeHtml(conv.user_email)}</strong>
              <small style="color: var(--color-text-secondary); display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(lastMsg.substring(0, 50))}</small>
              <small style="color: var(--color-text-secondary); font-size: 11px;">${msgTime}</small>
            </div>
          </div>
        </div>
      `;
    });

    if (oldList) oldList.innerHTML = html;
    if (newList) newList.innerHTML = html;
    
    console.log('✅ Conversations loaded:', data.data.length);
  } catch (error) {
    console.error('❌ Error loading conversations:', error);
  }
}
// ============= COMPLETE BOOKING WORKFLOW =============

let currentBookingId = null;
let currentBookingData = null;

// Load bookings for both customer and worker
async function loadBookings() {
  console.log('📅 Loading bookings...');
  
  try {
    // ✅ Clear containers FIRST
    const workerContainer = document.getElementById('worker-booking-requests');
    const customerContainer = document.getElementById('customer-bookings');
    
    console.log('🔍 Container check:');
    console.log('  - worker-booking-requests:', !!workerContainer);
    console.log('  - customer-bookings:', !!customerContainer);
    
    if (workerContainer) workerContainer.innerHTML = '<p style="color: #999; grid-column: 1/-1;">⏳ Loading...</p>';
    if (customerContainer) customerContainer.innerHTML = '<p style="color: #999; grid-column: 1/-1;">⏳ Loading...</p>';
    
    // Load customer bookings
    await loadCustomerBookings();
    
    // Load worker booking requests
    await loadWorkerBookingRequests();
  } catch (error) {
    console.error('❌ Error loading bookings:', error);
  }
}


// Load bookings made by customer
async function loadCustomerBookings() {
  try {
    const response = await fetch(`${API_BASE_URL}/bookings/customer`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
    });
    const data = await response.json();

    const container = document.getElementById('customer-bookings');
    
    console.log('👥 Customer Bookings Response:');
    console.log('  - Container found:', !!container);
    console.log('  - Success:', data.success);
    console.log('  - Bookings count:', data.data?.length);

    if (!container) {
      console.error('❌ Container NOT FOUND! Looking for id="customer-bookings"');
      return;
    }

    if (!data.success || !Array.isArray(data.data) || data.data.length === 0) {
      container.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">No bookings made yet</p>';
      return;
    }

    let html = '';
    data.data.forEach(booking => {
      const statusConfig = getStatusConfig(booking.status);
      const bookingDate = new Date(booking.booking_date).toLocaleDateString();
      const workerName = booking.worker_name || 'Unknown Worker';
      const workerEmail = booking.worker_email || 'No email';

      html += `
        <div style="background: white; padding: 20px; border-radius: 8px; border-left: 5px solid ${statusConfig.color}; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
            <div style="flex: 1;">
              <h4 style="margin: 0; color: #333;">${escapeHtml(workerName)} - ${escapeHtml(booking.occupation || 'Service')}</h4>
              <p style="margin: 5px 0; color: #666; font-size: 14px;">📧 ${escapeHtml(workerEmail)}</p>
            </div>
            <span style="background: ${statusConfig.color}; color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">
              ${statusConfig.label}
            </span>
          </div>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
            <p style="margin: 5px 0; font-size: 14px;"><strong>📅 Date:</strong> ${bookingDate}</p>
            <p style="margin: 5px 0; font-size: 14px;"><strong>⏰ Time:</strong> ${booking.start_time || 'N/A'} - ${booking.end_time || 'N/A'}</p>
            <p style="margin: 5px 0; font-size: 14px;"><strong>💰 Price:</strong> ₹${booking.total_price || 0}</p>
            ${booking.service_description ? `<p style="margin: 5px 0; font-size: 14px; color: #666;"><strong>📝 Details:</strong> ${escapeHtml(booking.service_description)}</p>` : ''}
          </div>
          
          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <button onclick="viewBookingDetails(${booking.id}, 'customer')" style="flex: 1; min-width: 120px; padding: 10px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
              👁️ View Details
            </button>
            <button onclick="openChatWithWorker(${booking.worker_user_id}, '${escapeHtml(workerName)}')" style="flex: 1; min-width: 120px; padding: 10px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
              💬 Chat
            </button>
            ${booking.status === 'pending' ? `<button onclick="cancelBooking(${booking.id})" style="flex: 1; min-width: 120px; padding: 10px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">❌ Cancel</button>` : ''}
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
    console.log('✅ Customer bookings displayed:', data.data.length);
  } catch (error) {
    console.error('❌ Error loading customer bookings:', error);
    const container = document.getElementById('customer-bookings');
    if (container) {
      container.innerHTML = '<p style="color: #f44336; text-align: center; padding: 20px;">Error loading bookings</p>';
    }
  }
}


// Load booking requests for worker
// Load booking requests for worker
async function loadWorkerBookingRequests() {
  try {
    console.log('👷 Loading worker booking requests...');
    
    const response = await fetch(`${API_BASE_URL}/bookings/worker`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
    });
    const data = await response.json();

    console.log('📥 Worker bookings response:', data);

    const container = document.getElementById('worker-booking-requests');
    if (!container) {
      console.error('❌ worker-booking-requests container not found');
      return;
    }

    if (!data.success || !data.data || data.data.length === 0) {
      console.log('ℹ️ No worker booking requests');
      container.innerHTML = '<p style="color: #999; grid-column: 1/-1;">No booking requests yet</p>';
      return;
    }

    console.log('✅ Found', data.data.length, 'worker booking requests');

    let html = '';
    data.data.forEach(booking => {
      const statusConfig = getStatusConfig(booking.status);
      const bookingDate = new Date(booking.booking_date).toLocaleDateString();
      const customerName = booking.customer_name || booking.customer_email || 'Customer';
      
      // Show action buttons only for pending bookings
      const actionButtons = booking.status === 'pending' ? `
        <button onclick="acceptBooking(${booking.id})" style="flex: 1; padding: 10px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
          ✅ Accept
        </button>
        <button onclick="rejectBooking(${booking.id})" style="flex: 1; padding: 10px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
          ❌ Reject
        </button>
      ` : '';

      html += `
        <div class="booking-card" style="border-left: 5px solid ${statusConfig.color};">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
            <div style="flex: 1;">
              <h4 class="booking-title">🔔 Booking Request</h4>
              <p class="booking-subtitle">👤 ${escapeHtml(customerName)}</p>
              <p class="booking-subtitle">📧 ${escapeHtml(booking.customer_email)}</p>
              <p class="booking-subtitle">📱 ${booking.customer_phone || 'N/A'}</p>
            </div>
            <span class="booking-status" style="background: ${statusConfig.color}; color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">
              ${statusConfig.label}
            </span>
          </div>
          
          <div class="booking-details">
            <p style="margin: 5px 0; font-size: 14px;"><strong>📅 Date:</strong> ${bookingDate}</p>
            <p style="margin: 5px 0; font-size: 14px;"><strong>⏰ Time:</strong> ${booking.start_time} - ${booking.end_time}</p>
            <p style="margin: 5px 0; font-size: 14px;"><strong>💰 Price:</strong> ₹${booking.total_price}</p>
            ${booking.service_description ? `<p style="margin: 5px 0; font-size: 14px; color: inherit;"><strong>📝 Details:</strong> ${escapeHtml(booking.service_description)}</p>` : ''}
          </div>
          
          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <button onclick="viewBookingDetails(${booking.id}, 'worker')" style="flex: 1; min-width: 120px; padding: 10px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
              👁️ View Details
            </button>
            <button onclick="openChatWithCustomer(${booking.user_id}, '${escapeHtml(customerName)}')" style="flex: 1; min-width: 120px; padding: 10px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
              💬 Chat
            </button>
            ${actionButtons}
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
    console.log('✅ Worker booking requests displayed:', data.data.length);

  } catch (error) {
    console.error('❌ Error loading worker booking requests:', error);
    const container = document.getElementById('worker-booking-requests');
    if (container) {
      container.innerHTML = '<p style="color: #f44336;">Error loading requests</p>';
    }
  }
}


// Get status config (color and label)
function getStatusConfig(status) {
  const configs = {
    'pending': { color: '#ff9800', label: '⏳ Pending' },
    'confirmed': { color: '#4CAF50', label: '✅ Confirmed' },
    'rejected': { color: '#f44336', label: '❌ Rejected' },
    'completed': { color: '#2196F3', label: '✓ Completed' },
    'cancelled': { color: '#9E9E9E', label: '⊘ Cancelled' }
  };
  return configs[status] || configs['pending'];
}

// View booking details
async function viewBookingDetails(bookingId, userType) {
  console.log('👁️ Viewing booking details:', bookingId);
  
  try {
    const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
    });
    const data = await response.json();

    if (!data.success) {
      alert('Error loading booking details');
      return;
    }

    currentBookingId = bookingId;
    currentBookingData = data.data;

    const booking = data.data;
    const bookingDate = new Date(booking.booking_date).toLocaleDateString();
    const statusConfig = getStatusConfig(booking.status);

    let detailsHtml = `
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h4 style="margin-top: 0;">Booking Information</h4>
        
        <p style="margin: 10px 0;"><strong>📅 Date:</strong> ${bookingDate}</p>
        <p style="margin: 10px 0;"><strong>⏰ Time:</strong> ${booking.start_time} - ${booking.end_time}</p>
        <p style="margin: 10px 0;"><strong>💰 Total Price:</strong> ₹${booking.total_price}</p>
        <p style="margin: 10px 0;"><strong>Status:</strong> <span style="background: ${statusConfig.color}; color: white; padding: 3px 10px; border-radius: 3px;">${statusConfig.label}</span></p>
        
        ${booking.service_description ? `<p style="margin: 10px 0;"><strong>📝 Service Details:</strong> ${booking.service_description}</p>` : ''}
        
        <hr style="margin: 15px 0; border: none; border-top: 1px solid #ddd;">
        
        <h4>Worker Information</h4>
        <p style="margin: 10px 0;"><strong>Name:</strong> ${booking.worker_name}</p>
        <p style="margin: 10px 0;"><strong>Email:</strong> ${booking.worker_email}</p>
        <p style="margin: 10px 0;"><strong>Phone:</strong> ${booking.worker_phone}</p>
        
        <hr style="margin: 15px 0; border: none; border-top: 1px solid #ddd;">
        
        <h4>Customer Information</h4>
        <p style="margin: 10px 0;"><strong>Email:</strong> ${booking.customer_email}</p>
        <p style="margin: 10px 0;"><strong>Phone:</strong> ${booking.customer_phone}</p>
      </div>
    `;

    document.getElementById('modal-booking-details').innerHTML = detailsHtml;
    document.getElementById('modal-title').textContent = `Booking #${bookingId}`;

    // Show action buttons only for worker viewing pending bookings
    const actionsDiv = document.getElementById('modal-worker-actions');
    if (userType === 'worker' && booking.status === 'pending') {
      actionsDiv.innerHTML = `
        <button onclick="updateBookingStatus(${bookingId}, 'confirmed')" style="width: 48%; padding: 12px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
          ✅ Accept
        </button>
        <button onclick="updateBookingStatus(${bookingId}, 'rejected')" style="width: 48%; padding: 12px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
          ❌ Reject
        </button>
      `;
    } else {
      actionsDiv.innerHTML = '';
    }

    showModal('booking-details-modal');
  } catch (error) {
    console.error('Error viewing booking details:', error);
    alert('Error loading booking details');
  }
}

// Initialize Google Maps for a given address string (if Maps API loaded)
function initMapForAddress(address) {
  try {
    if (!address || typeof google === 'undefined' || !google.maps) {
      console.log('Google Maps not available or no address provided');
      return;
    }

    const mapDiv = document.getElementById('profile-map');
    if (!mapDiv) return;
    mapDiv.style.display = 'block';

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: address }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const loc = results[0].geometry.location;
        const map = new google.maps.Map(mapDiv, { center: loc, zoom: 13 });
        new google.maps.Marker({ position: loc, map: map });
      } else {
        console.warn('Geocode failed:', status);
      }
    });
  } catch (e) {
    console.error('initMapForAddress error:', e);
  }
}

// ============= ACCEPT/REJECT BOOKING =============

// Cancel booking (customer cancels)
async function cancelBooking(bookingId) {
  console.log('❌ Cancelling booking:', bookingId);
  
  const confirmed = confirm('Are you sure you want to cancel this booking?');
  if (!confirmed) return;
  
  try {
    const authToken = localStorage.getItem('authToken');
    const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ status: 'cancelled' })
    });

    console.log('📤 Response status:', response.status);
    const data = await response.json();
    console.log('📥 Response data:', data);

    if (data.success) {
      console.log('✅ Booking cancelled successfully');
      alert('✅ Booking Cancelled');
      loadBookings(); // Reload to show updated status
    } else {
      console.error('❌ Server error:', data.message);
      alert('❌ Error: ' + data.message);
    }
  } catch (error) {
    console.error('Error cancelling booking:', error);
    alert('❌ Error cancelling booking: ' + error.message);
  }
}

// Accept booking (worker accepts)
async function acceptBooking(bookingId) {
  console.log('✅ Accepting booking:', bookingId);
  
  const confirmed = confirm('Are you sure you want to accept this booking?');
  if (!confirmed) return;
  
  try {
    const authToken = localStorage.getItem('authToken');
    console.log('🔐 Using token:', authToken ? 'Present' : 'Missing');
    
    const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ status: 'confirmed' })
    });

    console.log('📤 Response status:', response.status);
    const data = await response.json();
    console.log('📥 Response data:', data);

    if (data.success) {
      console.log('✅ Booking accepted successfully');
      alert('✅ Booking Accepted! You can now chat with the customer.');
      loadBookings(); // Reload to show updated status
    } else {
      console.error('❌ Server error:', data.message);
      alert('❌ Error: ' + data.message);
    }
  } catch (error) {
    console.error('Error accepting booking:', error);
    alert('❌ Error accepting booking: ' + error.message);
  }
}

// Reject booking (worker rejects)
async function rejectBooking(bookingId) {
  console.log('❌ Rejecting booking:', bookingId);
  
  const confirmed = confirm('Are you sure you want to reject this booking?');
  if (!confirmed) return;
  
  try {
    const authToken = localStorage.getItem('authToken');
    const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ status: 'rejected' })
    });

    console.log('📤 Response status:', response.status);
    const data = await response.json();
    console.log('📥 Response data:', data);

    if (data.success) {
      console.log('❌ Booking rejected successfully');
      alert('❌ Booking Rejected');
      loadBookings(); // Reload to show updated status
    } else {
      console.error('❌ Server error:', data.message);
      alert('❌ Error: ' + data.message);
    }
  } catch (error) {
    console.error('Error rejecting booking:', error);
    alert('❌ Error rejecting booking: ' + error.message);
  }
}

// Update booking status
async function updateBookingStatus(bookingId, newStatus) {
  console.log('📝 Updating booking status:', newStatus);
  
  try {
    const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify({ status: newStatus })
    });

    const data = await response.json();

    if (data.success) {
      const statusText = newStatus === 'confirmed' ? 'Accepted ✅' : 'Rejected ❌';
      alert('Booking ' + statusText);
      
      closeModal('booking-details-modal');
      loadBookings();
    } else {
      alert('❌ ' + data.message);
    }
  } catch (error) {
    console.error('Error updating booking:', error);
    alert('❌ Error: ' + error.message);
  }
}

// Open chat from booking (from details modal)
function openChatFromBooking() {
  if (!currentBookingData) return;
  
  // Determine if viewing as customer or worker
  const currentUserId = parseInt(localStorage.getItem('userId'));
  
  if (currentBookingData.user_id === currentUserId) {
    // Customer viewing, chat with worker
    openChatWithWorker(currentBookingData.user_id, currentBookingData.worker_name);
  } else {
    // Worker viewing, chat with customer
    openChatWithCustomer(currentBookingData.user_id, currentBookingData.customer_email);
  }
  
  closeModal('booking-details-modal');
}

// Open chat with worker
function openChatWithWorker(workerUserId, workerName) {
  if (!socket) initializeChat();
  
  showSection('chat');
  setTimeout(() => {
    openChat(workerUserId, workerName);
  }, 500);
}

// Open chat with customer
function openChatWithCustomer(customerId, customerEmail) {
  if (!socket) initializeChat();
  
  showSection('chat');
  setTimeout(() => {
    openChat(customerId, customerEmail);
  }, 500);
}

// Create booking (updated)
async function createBooking(workerId, hourlyRate) {
  const token = localStorage.getItem('authToken');
  if (!token) {
    alert('❌ Please login to book services');
    showSection('login');
    return;
  }

  const date = document.getElementById(`booking-date-${workerId}`)?.value;
  const startTime = document.getElementById(`booking-start-${workerId}`)?.value;
  const duration = parseInt(document.getElementById(`booking-duration-${workerId}`)?.value || 1);
  const description = document.getElementById(`booking-desc-${workerId}`)?.value;

  if (!date || !startTime) {
    alert('❌ Please select date and time');
    return;
  }

  // Calculate end time
  const [hours, minutes] = startTime.split(':');
  const endHours = (parseInt(hours) + duration) % 24;
  const endTime = `${endHours.toString().padStart(2, '0')}:${minutes}`;

  const totalPrice = hourlyRate * duration;

  try {
    const response = await fetch(`${API_BASE_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        worker_id: workerId,
        booking_date: date,
        start_time: startTime,
        end_time: endTime,
        service_description: description,
        total_price: totalPrice
      })
    });

    const data = await response.json();

    if (data.success) {
      alert(`✅ Booking request sent!\n\nWorker will review your request.\n\nTotal: ₹${totalPrice}`);
      
      // Clear form
      document.getElementById(`booking-date-${workerId}`).value = '';
      document.getElementById(`booking-start-${workerId}`).value = '';
      document.getElementById(`booking-desc-${workerId}`).value = '';
      
      // Load bookings
      loadBookings();
    } else {
      alert('❌ ' + data.message);
    }
  } catch (error) {
    console.error('Booking error:', error);
    alert('❌ Error: ' + error.message);
  }
}

// Open chat with user
// ============= MESSAGES SECTION (NEW) =============

async function openMessageConversation(userId, userEmail, conversationId) {
  currentChatUserId = userId;
  currentConversationId = conversationId;
  
  // Update header
  document.getElementById('messages-user-name').textContent = userEmail;
  document.getElementById('messages-user-email').textContent = 'Last active: Just now';
  
  // Show input container
  document.getElementById('messages-input-container').style.display = 'flex';
  
  try {
    const response = await fetch(`${API_BASE_URL}/messages/${userId}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
    });
    const data = await response.json();

    const messagesDiv = document.getElementById('messages-content');
    messagesDiv.innerHTML = '';

    if (data.success && data.data.length > 0) {
      data.data.forEach(msg => {
        const isSent = msg.sender_id == localStorage.getItem('userId');
        displayMessageInSection(msg.message, isSent ? 'sent' : 'received', msg.created_at, 'messages');
      });
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    } else {
      messagesDiv.innerHTML = '<div style="text-align: center; color: var(--color-text-secondary); padding: 20px;">No messages yet. Start a conversation!</div>';
    }
  } catch (error) {
    console.error('❌ Error loading messages:', error);
    document.getElementById('messages-content').innerHTML = '<p style="color: #f44336;">Error loading messages</p>';
  }
}

function sendMessageFromSection(sectionId) {
  const inputId = sectionId === 'messages' ? 'messages-input' : 'message-input';
  const input = document.getElementById(inputId);
  const message = input.value.trim();

  if (!message || !currentChatUserId) return;

  sendMessageToUser(message, sectionId);
  input.value = '';
}

async function sendMessageToUser(message, sectionId) {
  try {
    const response = await fetch(`${API_BASE_URL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify({
        receiver_id: currentChatUserId,
        message: message
      })
    });

    const data = await response.json();
    
    if (data.success) {
      displayMessageInSection(message, 'sent', new Date(), sectionId);
      
      // Scroll to bottom
      const messagesDiv = sectionId === 'messages' ? document.getElementById('messages-content') : document.getElementById('chat-messages');
      if (messagesDiv) messagesDiv.scrollTop = messagesDiv.scrollHeight;
      
      // Send via socket
      if (socket) {
        socket.emit('send_message', {
          to: currentChatUserId,
          from: localStorage.getItem('userId'),
          message: message,
          timestamp: new Date()
        });
      }
      
      // Reload conversations
      loadConversations();
    }
  } catch (error) {
    console.error('❌ Error sending message:', error);
  }
}

function displayMessageInSection(message, type, timestamp, sectionId) {
  const containerId = sectionId === 'messages' ? 'messages-content' : 'chat-messages';
  const container = document.getElementById(containerId);
  
  const align = type === 'sent' ? 'flex-end' : 'flex-start';
  const bgColor = type === 'sent' ? 'var(--color-primary)' : 'var(--color-secondary)';
  const textColor = type === 'sent' ? 'var(--color-btn-primary-text)' : 'var(--color-text)';
  const time = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const msgHtml = `
    <div style="display: flex; justify-content: ${align}; margin-bottom: 10px;">
      <div style="max-width: 70%; padding: 10px 15px; border-radius: 15px; background: ${bgColor}; color: ${textColor};">
        <p style="margin: 0; word-wrap: break-word;">${escapeHtml(message)}</p>
        <small style="opacity: 0.7; font-size: 10px;">${time}</small>
      </div>
    </div>
  `;
  
  container.innerHTML += msgHtml;
}

async function openChat(userId, userName) {
  currentChatUserId = userId;
  document.getElementById('chat-user-name').textContent = userName;
  
  // Show the chat input container
  document.getElementById('chat-input-container').style.display = 'block';
  
  try {
    const response = await fetch(`${API_BASE_URL}/messages/${userId}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
    });
    const data = await response.json();

    const messagesDiv = document.getElementById('chat-messages');
    messagesDiv.innerHTML = '';

    if (data.success && data.data.length > 0) {
      data.data.forEach(msg => {
        const isSent = msg.sender_id == localStorage.getItem('userId');
        displayMessage(msg.message, isSent ? 'sent' : 'received', msg.created_at);
      });
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
  } catch (error) {
    console.error('Error loading messages:', error);
  }
}

// Send message
async function sendMessage() {
  const input = document.getElementById('chat-input');
  const message = input.value.trim();

  if (!message || !currentChatUserId) return;

  try {
    const response = await fetch(`${API_BASE_URL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify({
        receiver_id: currentChatUserId,
        message: message
      })
    });

    const data = await response.json();
    
    if (data.success) {
      displayMessage(message, 'sent', new Date());
      input.value = '';
      
      // Send via socket
      socket.emit('send_message', {
        to: currentChatUserId,
        from: localStorage.getItem('userId'),
        message: message,
        timestamp: new Date()
      });
    }
  } catch (error) {
    console.error('Error sending message:', error);
  }
}
// ============= INITIALIZE ON PAGE LOAD =============

// Check if user is logged in and initialize
document.addEventListener('DOMContentLoaded', function() {
  const token = localStorage.getItem('authToken');
  
  if (token) {
    console.log('✅ User logged in, initializing...');
    
    // Initialize chat
    initializeChat();
    
    // Load bookings when page loads
    loadBookings();
  }
});

// Also reinitialize when showing sections

function showSection(sectionId) {
  console.log('🔄 Switching to section:', sectionId);
  
  // Hide all sections
  const allSections = document.querySelectorAll('.section');
  console.log('📋 Total sections found:', allSections.length);
  allSections.forEach(s => s.classList.remove('active'));

  // Show requested section
  const section = document.getElementById(sectionId);
  console.log('🔍 Section element found:', !!section);
  
  if (section) {
    section.classList.add('active');
    currentSection = sectionId;
    console.log('✅ Section active class added, display should be: block');

    // Load data if needed
    if (sectionId === 'my-bookings') {
      console.log('📅 Loading my bookings section...');
      loadBookings();
    }
    else if (sectionId === 'messages') {
      console.log('💬 Loading messages section...');
      if (!socket) initializeChat();
      loadConversations();
    }
    else if (sectionId === 'chat') {
      console.log('💬 Loading chat section...');
      if (!socket) initializeChat();
      loadConversations();
    }
    else if (sectionId === 'about') {
      console.log('👤 Loading about section...');
      loadWorkerProfile();
    }
  } else {
    console.error('❌ Section not found:', sectionId);
  }
}


// Display message in chat
function displayMessage(message, type, timestamp) {
  const messagesDiv = document.getElementById('chat-messages');
  const align = type === 'sent' ? 'flex-end' : 'flex-start';
  const bg = type === 'sent' ? '#2196F3' : '#e0e0e0';
  const color = type === 'sent' ? 'white' : 'black';

  const msgHtml = `
    <div style="display: flex; justify-content: ${align}; margin-bottom: 10px;">
      <div style="max-width: 70%; padding: 10px 15px; border-radius: 15px; background: ${bg}; color: ${color};">
        <p style="margin: 0;">${escapeHtml(message)}</p>
        <small style="opacity: 0.7; font-size: 10px;">${new Date(timestamp).toLocaleTimeString()}</small>
      </div>
    </div>
  `;
  
  messagesDiv.innerHTML += msgHtml;
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Update contactWorker function
function contactWorker(workerId) {
  // Get worker details
  const worker = allWorkersData.find(w => w.id === workerId);
  if (!worker) return;

  // Open chat
  showSection('chat');
  initializeChat();
  
  // Find or create conversation
  setTimeout(() => {
    openChat(worker.user_id, worker.name);
  }, 500);
}

// ========================================
// NAVIGATION
// ========================================

function showModal(modalId) {
  document.getElementById(modalId)?.classList.remove('hidden');
  console.log('📋 Showing modal:', modalId);
}

function closeModal(modalId) {
  document.getElementById(modalId)?.classList.add('hidden');
  console.log('✖️ Closing modal:', modalId);
}

// ========================================
// ACTIONS
// ========================================

function bookWorker(workerId) {
  const worker = allWorkersData.find(w => w.id === workerId);
  if (worker) {
    alert(`Booking ${worker.name}...\n\nPhone: ${worker.phone}\n\nPlease contact this worker directly to finalize booking!`);
  }
}

// ========================================
// APP LOADED
// ========================================

console.log('✅ SkillBridge Connect fully loaded and ready!');
