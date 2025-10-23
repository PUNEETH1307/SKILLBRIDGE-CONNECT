// SkillBridge Connect - Complete Client-Side JavaScript with Auth & Database

const API_BASE_URL = 'http://localhost:3000/api';

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

let currentSection = 'home';
let filteredWorkers = [];
let currentWorker = null;
let authToken = localStorage.getItem('authToken');

document.addEventListener('DOMContentLoaded', function() {
  console.log('Initializing SkillBridge Connect...');
  initializeApp();
});

function initializeApp() {
  try {
    checkAuthStatus();
    populateFormDropdowns();
    populateSearchDropdowns();
    loadAllWorkers();
    setupEventHandlers();
    console.log('✓ App initialized');
  } catch (error) {
    console.error('Init error:', error);
  }
}

// ============= AUTHENTICATION =============

function checkAuthStatus() {
  if (authToken) {
    console.log('✓ User logged in');
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
  const form = e.target;
  const email = form.querySelector('input[name="email"]').value;
  const password = form.querySelector('input[name="password"]').value;
  
  if (!email || !password) {
    alert('Please enter both email and password');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
      authToken = data.token;
      localStorage.setItem('authToken', authToken);
      localStorage.setItem('userId', data.userId);
      
      alert('Login successful!');
      closeModal('login-modal');
      updateUIForLoggedInUser();
      
      if (localStorage.getItem('pendingAction') === 'worker-registration') {
        localStorage.removeItem('pendingAction');
        showSection('worker-registration');
      }
    } else {
      alert(data.error || 'Login failed');
    }
  } catch (error) {
    console.error('Login error:', error);
    alert('Login error. Please try again.');
  }
}

async function handleSignup(e) {
  e.preventDefault();
  const form = e.target;
  const email = form.querySelector('input[name="email"]').value;
  const phone = form.querySelector('input[name="phone"]').value;
  const password = form.querySelector('input[name="password"]').value;
  const confirmPassword = form.querySelector('input[name="confirm_password"]').value;
  
  if (!email || !phone || !password || !confirmPassword) {
    alert('Please fill in all fields');
    return;
  }
  
  if (password !== confirmPassword) {
    alert('Passwords do not match');
    return;
  }
  
  if (password.length < 6) {
    alert('Password must be at least 6 characters');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, phone, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
      authToken = data.token;
      localStorage.setItem('authToken', authToken);
      localStorage.setItem('userId', data.userId);
      
      alert('Account created successfully!');
      closeModal('signup-modal');
      updateUIForLoggedInUser();
      
      if (localStorage.getItem('pendingAction') === 'worker-registration') {
        localStorage.removeItem('pendingAction');
        showSection('worker-registration');
      }
    } else {
      alert(data.error || 'Signup failed');
    }
  } catch (error) {
    console.error('Signup error:', error);
    alert('Signup error. Please try again.');
  }
}

// ============= WORKER REGISTRATION =============

async function handleWorkerRegistration(e) {
  e.preventDefault();
  console.log('Submitting worker registration...');
  
  if (!isLoggedIn()) {
    alert('Please login first to register as a worker');
    localStorage.setItem('pendingAction', 'worker-registration');
    showModal('login-modal');
    return;
  }
  
  try {
    const specialtyCheckboxes = document.querySelectorAll('#specialties-container input[type="checkbox"]:checked');
    const specialties = Array.from(specialtyCheckboxes).map(cb => cb.value);
    
    const areaCheckboxes = document.querySelectorAll('#work-areas-container input[type="checkbox"]:checked');
    const workAreas = Array.from(areaCheckboxes).map(cb => cb.value);
    
    const formData = {
      name: document.getElementById('worker-name').value,
      phone: document.getElementById('worker-phone').value,
      email: document.getElementById('worker-email').value,
      occupation: document.getElementById('worker-occupation').value,
      experience: document.getElementById('worker-experience').value,
      specialties: specialties,
      hourly_rate: parseInt(document.getElementById('worker-rate').value),
      available_hours: document.getElementById('worker-hours').value,
      location: document.getElementById('worker-location').value,
      travel_radius: document.getElementById('worker-radius').value,
      work_areas: workAreas,
      description: document.getElementById('worker-description').value,
      certifications: document.getElementById('worker-certifications').value
    };
    
    if (!formData.name || !formData.phone || !formData.email || !formData.occupation || 
        !formData.experience || !formData.hourly_rate || !formData.location) {
      alert('Please fill in all required fields marked with *');
      return;
    }
    
    const response = await fetch(`${API_BASE_URL}/worker/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(formData)
    });
    
    const data = await response.json();
    
    if (data.success) {
      document.getElementById('success-title').textContent = 'Registration Successful!';
      document.getElementById('success-message').textContent = 
        'Your worker profile has been created successfully and saved to database!';
      showModal('success-modal');
      
      document.getElementById('worker-form').reset();
      document.getElementById('specialties-container').innerHTML = '';
      
      console.log('✓ Worker registered:', data);
    } else {
      alert(data.error || 'Registration failed');
    }
    
  } catch (error) {
    console.error('Registration error:', error);
    alert('Registration error. Please try again.');
  }
}

// ============= LOAD & SEARCH WORKERS =============

async function loadAllWorkers() {
  console.log('Loading workers from database...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/workers`);
    const data = await response.json();
    
    if (data.success) {
      filteredWorkers = data.workers;
      displayWorkers();
      updateResultsCount();
      console.log(`✓ Loaded ${filteredWorkers.length} workers`);
    } else {
      filteredWorkers = [];
      displayWorkers();
    }
  } catch (error) {
    console.error('Load error:', error);
    filteredWorkers = [];
    displayWorkers();
  }
}

async function searchWorkers() {
  try {
    const occupation = document.getElementById('search-occupation')?.value || '';
    const location = document.getElementById('search-location')?.value || '';
    const budget = document.getElementById('search-budget')?.value || '';
    
    const params = new URLSearchParams();
    if (occupation) params.append('occupation', occupation);
    if (location) params.append('location', location);
    
    if (budget) {
      if (budget === '500+') {
        params.append('min_rate', '500');
      } else {
        const [min, max] = budget.split('-');
        if (min) params.append('min_rate', min);
        if (max) params.append('max_rate', max);
      }
    }
    
    const sortBy = document.getElementById('sort-by')?.value || '';
    if (sortBy) params.append('sort', sortBy);
    
    const response = await fetch(`${API_BASE_URL}/workers?${params.toString()}`);
    const data = await response.json();
    
    if (data.success) {
      filteredWorkers = data.workers;
      displayWorkers();
      updateResultsCount();
    }
  } catch (error) {
    console.error('Search error:', error);
  }
}

function sortWorkers() {
  searchWorkers();
}

// ============= DISPLAY FUNCTIONS =============

function displayWorkers() {
  const workersGrid = document.getElementById('workers-grid');
  if (!workersGrid) return;
  
  if (filteredWorkers.length === 0) {
    workersGrid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
        <i class="fas fa-search" style="font-size: 48px; opacity: 0.5;"></i>
        <h3>No workers found</h3>
        <p>Try adjusting your search criteria</p>
      </div>
    `;
    return;
  }
  
  workersGrid.innerHTML = filteredWorkers.map(worker => {
    const specialties = parseJSON(worker.specialties);
    
    return `
    <div class="worker-card">
      <div class="worker-header">
        <img src="https://via.placeholder.com/150x150?text=${worker.name?.charAt(0) || 'W'}" 
             alt="${worker.name}" class="worker-avatar">
        <div class="worker-info">
          <h3>${worker.name}</h3>
          <div class="worker-occupation">${worker.occupation}</div>
          <div class="worker-rating">
            <span class="rating-stars">${generateStars(worker.rating || 0)}</span>
            <span>${(worker.rating || 0).toFixed(1)} (${worker.reviews_count || 0} reviews)</span>
            ${worker.verified ? '<span class="verified-badge"><i class="fas fa-check-circle"></i> Verified</span>' : ''}
          </div>
        </div>
      </div>
      
      <div class="worker-details">
        <div class="detail-item">
          <i class="fas fa-map-marker-alt"></i>
          <span>${worker.location}</span>
        </div>
        <div class="detail-item">
          <i class="fas fa-briefcase"></i>
          <span>${worker.experience} years experience</span>
        </div>
        <div class="detail-item">
          <i class="fas fa-money-bill-wave"></i>
          <span>₹${worker.hourly_rate}/hour</span>
        </div>
      </div>
      
      <div class="worker-specialties">
        ${specialties.slice(0, 3).map(s => `<span class="specialty-tag">${s}</span>`).join('')}
        ${specialties.length > 3 ? `<span class="specialty-tag">+${specialties.length - 3} more</span>` : ''}
      </div>
      
      <div class="worker-actions">
        <button class="btn btn--outline btn--sm" onclick="viewWorkerProfile(${worker.id})">
          <i class="fas fa-eye"></i> View Profile
        </button>
        <button class="btn btn--primary btn--sm" onclick="contactWorker(${worker.id})">
          <i class="fas fa-comment"></i> Contact
        </button>
      </div>
    </div>
    `;
  }).join('');
}

async function viewWorkerProfile(workerId) {
  try {
    const response = await fetch(`${API_BASE_URL}/workers/${workerId}`);
    const data = await response.json();
    
    if (data.success) {
      currentWorker = data.worker;
      displayWorkerProfile(data.worker);
      showSection('worker-profile');
    }
  } catch (error) {
    console.error('Profile load error:', error);
  }
}

function displayWorkerProfile(worker) {
  const profileContent = document.getElementById('profile-content');
  if (!profileContent) return;
  
  const specialties = parseJSON(worker.specialties);
  const workAreas = parseJSON(worker.work_areas);
  
  profileContent.innerHTML = `
    <div class="profile-header">
      <div class="profile-basic-info">
        <img src="https://via.placeholder.com/150x150?text=${worker.name?.charAt(0) || 'W'}" 
             alt="${worker.name}" class="profile-avatar">
        <div class="profile-details">
          <h1>${worker.name}</h1>
          <div class="profile-occupation">${worker.occupation}</div>
          <div class="profile-rating">
            <div class="rating-stars">${generateStars(worker.rating || 0)}</div>
            <span>${(worker.rating || 0).toFixed(1)} stars (${worker.reviews_count || 0} reviews)</span>
            ${worker.verified ? '<span class="verified-badge"><i class="fas fa-check-circle"></i> Verified</span>' : ''}
          </div>
          <div class="profile-contact-info">
            <span class="detail-item"><i class="fas fa-map-marker-alt"></i> ${worker.location}</span>
            <span class="detail-item"><i class="fas fa-money-bill-wave"></i> ₹${worker.hourly_rate}/hour</span>
            <span class="detail-item"><i class="fas fa-briefcase"></i> ${worker.experience} years</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="profile-sections">
      <div class="profile-main">
        <div class="profile-section">
          <h3><i class="fas fa-user"></i> About</h3>
          <p>${worker.description || 'No description provided.'}</p>
        </div>
        
        ${specialties.length > 0 ? `
        <div class="profile-section">
          <h3><i class="fas fa-tools"></i> Skills & Specialties</h3>
          <div class="skills-grid">
            ${specialties.map(s => `<div class="skill-item"><div class="skill-name">${s}</div></div>`).join('')}
          </div>
        </div>
        ` : ''}
        
        ${workAreas.length > 0 ? `
        <div class="profile-section">
          <h3><i class="fas fa-map"></i> Service Areas</h3>
          <div class="skills-grid">
            ${workAreas.map(a => `<div class="skill-item"><div class="skill-name">${a}</div></div>`).join('')}
          </div>
        </div>
        ` : ''}
        
        ${worker.certifications ? `
        <div class="profile-section">
          <h3><i class="fas fa-certificate"></i> Certifications</h3>
          <p>${worker.certifications}</p>
        </div>
        ` : ''}
      </div>
      
      <div class="profile-sidebar">
        <div class="profile-section">
          <h3><i class="fas fa-phone"></i> Contact</h3>
          <button class="btn btn--primary btn--full-width" onclick="contactWorker(${worker.id})">
            <i class="fas fa-phone"></i> Contact Worker
          </button>
        </div>
      </div>
    </div>
  `;
}

function contactWorker(workerId) {
  const worker = filteredWorkers.find(w => w.id === workerId) || currentWorker;
  if (worker) {
    alert(`Contact Information:\n\nName: ${worker.name}\nPhone: ${worker.phone}\nEmail: ${worker.email}\n\nYou can now contact this worker directly!`);
  }
}

// ============= UTILITY FUNCTIONS =============

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
  
  for (let i = 0; i < fullStars; i++) stars += '<i class="fas fa-star"></i>';
  if (hasHalfStar) stars += '<i class="fas fa-star-half-alt"></i>';
  for (let i = 0; i < (5 - Math.ceil(rating)); i++) stars += '<i class="far fa-star"></i>';
  
  return stars;
}

function updateResultsCount() {
  const resultsCount = document.getElementById('results-count');
  if (resultsCount) {
    resultsCount.textContent = `Showing ${filteredWorkers.length} worker${filteredWorkers.length !== 1 ? 's' : ''}`;
  }
}

// ============= FORM POPULATION =============

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

// ============= EVENT HANDLERS =============

function setupEventHandlers() {
  bindEvent('join-worker-btn', 'click', () => {
    if (!isLoggedIn()) {
      localStorage.setItem('pendingAction', 'worker-registration');
      showModal('login-modal');
    } else {
      showSection('worker-registration');
    }
  });
  
  bindEvent('find-workers-btn', 'click', () => showSection('customer-search'));
  bindEvent('login-btn', 'click', () => showModal('login-modal'));
  bindEvent('nav-brand', 'click', () => showSection('home'));
  bindEvent('home-link', 'click', (e) => { e.preventDefault(); showSection('home'); });
  
  bindEvent('back-from-registration', 'click', () => showSection('home'));
  bindEvent('back-from-search', 'click', () => showSection('home'));
  bindEvent('back-from-profile', 'click', () => showSection('customer-search'));
  
  bindEvent('search-workers-btn', 'click', searchWorkers);
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
  
  console.log('✓ Event handlers setup complete');
}

function bindEvent(id, event, handler) {
  const element = document.getElementById(id);
  if (element) {
    element.addEventListener(event, handler);
  }
}

// ============= NAVIGATION =============

function showSection(sectionId) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById(sectionId)?.classList.add('active');
  currentSection = sectionId;
}

function showModal(modalId) {
  document.getElementById(modalId)?.classList.remove('hidden');
}

function closeModal(modalId) {
  document.getElementById(modalId)?.classList.add('hidden');
}

console.log('✓ SkillBridge Connect loaded');
