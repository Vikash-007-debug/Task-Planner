// Firebase Configuration (REPLACE THESE WITH YOUR ACTUAL FIREBASE KEYS)
const firebaseConfig = {
  apiKey: "AIzaSyBKXNW2g4vEXSEhtAu-vWJWI_ff_7gPsQs",
  authDomain: "task-planner-6bb12.firebaseapp.com",
  projectId: "task-planner-6bb12",
  storageBucket: "task-planner-6bb12.firebasestorage.app",
  messagingSenderId: "70120467440",
  appId: "1:70120467440:web:7e333c7304710312734b35",
  measurementId: "G-JFJ15EZRG0"
};

// Initialize Firebase
let auth, db;
let currentUser = null;
let isLoginMode = true;

try {
  firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
  db = firebase.firestore();
} catch (error) {
  console.error("Firebase not configured correctly yet:", error);
}

// Authentication UI Logic
function toggleAuthMode() {
  isLoginMode = !isLoginMode;
  document.getElementById('auth-subtitle').innerText = isLoginMode ? "Sign in to sync your timetable" : "Create an account to sync your timetable";
  document.getElementById('auth-submit-btn').innerText = isLoginMode ? "Sign In" : "Sign Up";
  document.getElementById('auth-toggle-text').innerText = isLoginMode ? "Don't have an account?" : "Already have an account?";
  event.target.innerText = isLoginMode ? "Sign Up" : "Sign In";
  document.getElementById('auth-error').style.display = 'none';
  document.getElementById('signup-fields').style.display = isLoginMode ? 'none' : 'block';
}

function handleAuth(e) {
  e.preventDefault();
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;
  const errorElement = document.getElementById('auth-error');
  const submitBtn = document.getElementById('auth-submit-btn');

  errorElement.style.display = 'none';

  if (!auth) {
    showAuthError("Firebase keys are missing! Please configure firebase-config.js first.");
    return;
  }

  submitBtn.innerText = "Processing...";
  submitBtn.disabled = true;

  if (isLoginMode) {
    auth.signInWithEmailAndPassword(email, password)
      .then(() => {
        // Success handled by onAuthStateChanged
      })
      .catch(error => {
        showAuthError(error.message);
        submitBtn.innerText = "Sign In";
        submitBtn.disabled = false;
      });
  } else {
    auth.createUserWithEmailAndPassword(email, password)
      .then(() => {
        // Grab the extra profile fields
        state.profile = {
          name: document.getElementById('auth-name').value || "New User",
          education: document.getElementById('auth-education').value || "",
          work: document.getElementById('auth-work').value || ""
        };
        // Success handled by onAuthStateChanged
      })
      .catch(error => {
        showAuthError(error.message);
        submitBtn.innerText = "Sign Up";
        submitBtn.disabled = false;
      });
  }
}

function showAuthError(message) {
  const errorElement = document.getElementById('auth-error');
  errorElement.innerText = message;
  errorElement.style.display = 'block';
}

// Global Auth State Observer
if (auth) {
  auth.onAuthStateChanged(user => {
    if (user) {
      // User is signed in
      currentUser = user;
      document.getElementById('auth-overlay').classList.remove('active');
      document.getElementById('landing-page').classList.remove('active');
      document.getElementById('app-container').classList.add('visible');
      
      // Load user's data from Firestore
      loadDataFromFirestore();
    } else {
      // User is signed out
      currentUser = null;
      document.getElementById('auth-overlay').classList.remove('active');
      document.getElementById('landing-page').classList.add('active');
      document.getElementById('app-container').classList.remove('visible');
      
      state.tasks = []; // Clear local state
      if (typeof renderOverview === 'function') renderOverview();
    }
  });
}

function logout() {
  if (auth) auth.signOut();
}

function openAuthModal(isLogin) {
  isLoginMode = isLogin;
  
  // Set correct text based on mode
  document.getElementById('auth-subtitle').innerText = isLoginMode ? "Sign in to sync your timetable" : "Create an account to sync your timetable";
  document.getElementById('auth-submit-btn').innerText = isLoginMode ? "Sign In" : "Sign Up";
  document.getElementById('auth-toggle-text').innerText = isLoginMode ? "Don't have an account?" : "Already have an account?";
  document.getElementById('signup-fields').style.display = isLoginMode ? 'none' : 'block';
  document.getElementById('auth-error').style.display = 'none';
  
  document.getElementById('auth-overlay').classList.add('active');
}

function closeAuthModal() {
  document.getElementById('auth-overlay').classList.remove('active');
}

// Database Operations
async function loadDataFromFirestore() {
  if (!db || !currentUser) return;

  try {
    const docRef = db.collection('users').doc(currentUser.uid);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      const data = docSnap.data();
      if (data.profile) state.profile = data.profile;
      if (data.tasks) state.tasks = data.tasks;
    } else {
      // Initialize new user with mock data
      loadData(); // This loads the mock data from app.js if local tasks are empty
      saveToFirestore();
    }

    // Update UI
    if (state.profile) {
      document.getElementById('profile-name').textContent = state.profile.name || 'User';
      document.getElementById('profile-role').textContent = state.profile.work || 'Student';
    }
    renderOverview();

  } catch (error) {
    console.error("Error loading data:", error);
  }
}

async function saveToFirestore() {
  if (!db || !currentUser) return;

  try {
    await db.collection('users').doc(currentUser.uid).set({
      profile: state.profile || null,
      tasks: state.tasks || [],
      lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error("Error saving data:", error);
  }
}
