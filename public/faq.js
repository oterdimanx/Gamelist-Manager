// Netlify Identity
console.log('Initializing Netlify Identity...');
if (typeof netlifyIdentity === 'undefined') {
  console.error('Netlify Identity script not loaded');
} else {
  netlifyIdentity.init({ API_ENDPOINT: 'https://gamelist-manager.netlify.app/.netlify/identity' });
  console.log('Netlify Identity initialized');
  
  // Manual session check on load (fix for refresh)
  const currentUser = netlifyIdentity.currentUser();
  if (currentUser) {
    console.log('Restored session:', currentUser.email, 'ID:', currentUser.id);
    handleAuthChange(currentUser);
  } else {
    console.log('No session to restore');
  }
}

netlifyIdentity.on('init', user => {
  console.log('Identity init:', user ? user.email : 'No user');
  handleAuthChange(user);
});

netlifyIdentity.on('login', user => {
  console.log('Login:', user.email, 'ID:', user.id);
  handleAuthChange(user);
  netlifyIdentity.close();
});

netlifyIdentity.on('logout', () => {
  console.log('Logout');
  handleAuthChange(null);
});

function handleAuthChange(user) {
  window.currentUser = user;
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const dashboardLink = document.getElementById('dashboard-link');
  if (user) {
    loginBtn.style.display = 'none';
    logoutBtn.style.display = 'inline';
    dashboardLink.style.display = 'inline';
    console.log('Logged in:', user.email, 'ID:', user.id);
  } else {
    loginBtn.style.display = 'inline';
    logoutBtn.style.display = 'none';
    dashboardLink.style.display = 'none';
    console.log('Not logged in');
  }
}