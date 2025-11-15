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
  initializeApp();
});

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
  if (loginBtn && isLoggedIn()) {
    loginBtn.textContent = 'Logout';
    loginBtn.onclick = handleLogout;
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

// Get auth token from localStorage
const authToken = localStorage.getItem('authToken');

if (!authToken) {
alert('❌ You must login first to register as a worker');
return;
}

try {
// Collect specialties
const specialtyCheckboxes = document.querySelectorAll('#specialties-container input[type="checkbox"]:checked');
const specialties = Array.from(specialtyCheckboxes).map(cb => cb.value);


// Collect work areas
const areaCheckboxes = document.querySelectorAll('#work-areas-container input[type="checkbox"]:checked');
const service_areas = Array.from(areaCheckboxes).map(cb => cb.value);

// Collect form data
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

console.log('📋 Form data:', formData);

// Validate
if (!formData.name || !formData.phone || !formData.email || !formData.occupation || !formData.hourly_rate || !formData.location) {
  alert('❌ Please fill in all required fields');
  return;
}

// Send to server
console.log('🚀 Sending to server...');
console.log('📡 Token:', authToken.substring(0, 20) + '...');

const response = await fetch('http://localhost:3000/api/workers', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`
  },
  body: JSON.stringify(formData)
});

console.log('📊 Response status:', response.status);
const data = await response.json();
console.log('📥 Response:', data);

if (data.success) {
  // Show success
  document.getElementById('success-title').textContent = 'Registration Successful!';
  document.getElementById('success-message').textContent = 'Your worker profile has been created successfully!';
  showModal('success-modal');

  // Reset form
  document.getElementById('worker-form').reset();
  document.getElementById('specialties-container').innerHTML = '';

  console.log('✅ Worker registered successfully');
} else {
  alert('❌ ' + (data.message || 'Registration failed'));
  console.error('❌ Server error:', data);
}
} catch (error) {
console.error('❌ Registration error:', error);
alert('❌ Error: ' + error.message);
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
function displayWorkerProfile(worker) {
  const profileContent = document.getElementById('profile-content');
  if (!profileContent) {
    console.error('❌ profile-content element not found');
    return;
  }
  
  const specialties = parseJSON(worker.specialties);
  const serviceAreas = parseJSON(worker.service_areas);
  
  profileContent.innerHTML = `
    <div style="padding: 20px; background: white;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
        <div style="display: flex; gap: 20px; align-items: flex-start;">
          <div style="width: 120px; height: 120px; background: rgba(255,255,255,0.2); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 48px; font-weight: bold;">
            ${worker.name.charAt(0).toUpperCase()}
          </div>
          <div style="flex: 1;">
            <h1 style="margin: 0; font-size: 28px;">${escapeHtml(worker.name)}</h1>
            <p style="margin: 8px 0; font-size: 18px; opacity: 0.9;">${escapeHtml(worker.occupation)}</p>
            <div style="display: flex; gap: 15px; margin-top: 12px; font-size: 14px;">
              <span>⭐ ${worker.rating || 0}/5</span>
              <span>💼 ${worker.experience} years</span>
              <span>💰 ₹${worker.hourly_rate}/hr</span>
              ${worker.verified ? '<span style="background: rgba(255,255,255,0.3); padding: 4px 10px; border-radius: 4px;">✓ Verified</span>' : ''}
            </div>
          </div>
        </div>
      </div>
      
      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 30px;">
        <div class="profile-main">
          <div style="background: #999; padding: 20px;border:0.5px solid black; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin-top: 0; color: #333;">About</h3>
            <p style="color: #666; line-height: 1.6;">${escapeHtml(worker.description || 'No description provided.')}</p>
          </div>
          
          ${specialties.length > 0 ? `
          <div style="background: #999; padding: 20px; border:0.5px solid black;  border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin-top: 0; color: #333;">Skills & Specialties</h3>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
              ${specialties.map(s => `<div style="background: white; padding: 10px; border-radius: 4px; border-left: 4px solid #2196F3; color: #333;">${escapeHtml(s)}</div>`).join('')}
            </div>
          </div>
          ` : ''}
          
          ${serviceAreas.length > 0 ? `
          <div style="background: #999; padding: 20px; border:0.5px solid black;  border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin-top: 0; color: #333;">Service Areas</h3>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
              ${serviceAreas.map(a => `<div style="background: white; padding: 10px; border-radius: 4px; border-left: 4px solid #4CAF50; color: #333;">📍 ${escapeHtml(a)}</div>`).join('')}
            </div>
          </div>
          ` : ''}
          
          ${worker.certifications ? `
          <div style="background: #999; padding: 20px; border:0.5px solid black;  border-radius: 8px;">
            <h3 style="margin-top: 0; color: #333;">Certifications</h3>
            <p style="color: #666;">${escapeHtml(worker.certifications)}</p>
          </div>
          ` : ''}
        </div>
        
        <div class="profile-sidebar">
          <div style="background: #2196F3; color: white; padding: 20px; border-radius: 8px; text-align: center;">
            <h3 style="margin-top: 0;">Contact Worker</h3>
            <button style="width: 100%; padding: 12px; background: white; color: #2196F3; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; margin: 10px 0;" onclick="contactWorker(${worker.id})">
              📞 Call Now
            </button>
            <p style="font-size: 12px; margin: 10px 0 0 0; opacity: 0.9;">Response time: Usually within 1 hour</p>
          </div>
        </div>
      </div>
    </div>
  `;
  console.log('✅ Profile displayed');
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
  
  console.log('✅ Event handlers setup complete');
}

function bindEvent(id, event, handler) {
  const element = document.getElementById(id);
  if (element) {
    element.addEventListener(event, handler);
  }
}

// ========================================
// NAVIGATION
// ========================================

function showSection(sectionId) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById(sectionId)?.classList.add('active');
  currentSection = sectionId;
  console.log('📄 Showing section:', sectionId);
}

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
