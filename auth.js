// Attach event listeners after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Login form handler
    const loginForm = document.querySelector('.login-container form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(loginForm);
            const data = Object.fromEntries(formData.entries());
            try {
                const res = await fetch('/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await res.json();
                if (res.ok) {
                    // Redirect or show success
                    alert('Login successful!');
                    // window.location.href = '/dashboard'; // example
                } else {
                    alert(result.message || 'Login failed');
                }
            } catch (err) {
                alert('Server error');
            }
        });
    }

    /* Signup form handler (if present)
    const signupForm = document.querySelector('.signup-container form');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(signupForm);
            const data = Object.fromEntries(formData.entries());
            try {
                const res = await fetch('/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await res.json();
                if (res.ok) {
                    alert('You are signup is successful!');
                    window.location.href = '/login.html'; // Adjust path if needed
                } else {
                    alert(result.message || 'Signup failed');
                }
            } catch (err) {
                alert('Server error');
            }
        });
    }*/

    // Output all users in JSON format to the console (for demo/debug)
    const users = localStorage.getItem('users');
    if (users) {
        console.log('Registered users (JSON):', users);
    } else {
        console.log('No users registered yet.');
    }

    // Interactive welcome for signup
    const signupForm = document.querySelector('.signup-container form');
    if (signupForm) {
        signupForm.addEventListener('submit', function(e) {
            setTimeout(() => {
                const users = localStorage.getItem('users');
                if (users) {
                    const usersArr = JSON.parse(users);
                    const lastUser = usersArr[usersArr.length - 1];
                    if (lastUser) {
                        // Create a beautiful welcome popup
                        let welcomeDiv = document.createElement('div');
                        welcomeDiv.style.position = 'fixed';
                        welcomeDiv.style.top = '0';
                        welcomeDiv.style.left = '0';
                        welcomeDiv.style.width = '100vw';
                        welcomeDiv.style.height = '100vh';
                        welcomeDiv.style.background = 'rgba(0,0,0,0.5)';
                        welcomeDiv.style.display = 'flex';
                        welcomeDiv.style.alignItems = 'center';
                        welcomeDiv.style.justifyContent = 'center';
                        welcomeDiv.style.zIndex = '9999';

                        welcomeDiv.innerHTML = `
                            <div style="background:#fff; padding:36px 32px; border-radius:14px; box-shadow:0 4px 24px rgba(0,0,0,0.18); text-align:center; max-width:350px;">
                                <h2 style="color:#007bff; margin-bottom:18px;">🎉 Welcome, ${lastUser.name || lastUser.username}!</h2>
                                <p style="font-size:1.1em; margin-bottom:18px;">
                                    Your account has been created.<br>
                                    <span style="color:#555;">Username:</span> <b>${lastUser.username}</b><br>
                                    <span style="color:#555;">Gender:</span> <b>${lastUser.gender}</b>
                                </p>
                                <button id="welcome-login-btn" style="padding:10px 24px; background:#007bff; color:#fff; border:none; border-radius:6px; font-size:1rem; cursor:pointer;">Go to Login</button>
                                <button id="welcome-edit-btn" style="margin-left:10px; padding:10px 24px; background:#28a745; color:#fff; border:none; border-radius:6px; font-size:1rem; cursor:pointer;">Edit Profile</button>
                                <button id="welcome-change-password-btn" style="margin-left:10px; padding:10px 24px; background:#ffc107; color:#333; border:none; border-radius:6px; font-size:1rem; cursor:pointer;">Change Password</button>
                            </div>
                        `;
                        document.body.appendChild(welcomeDiv);
                        document.getElementById('welcome-login-btn').onclick = function() {
                            window.location.href = 'login.html';
                        };
                        document.getElementById('welcome-edit-btn').onclick = function() {
                            window.location.href = 'profile.html';
                        };
                        document.getElementById('welcome-change-password-btn').onclick = function() {
                            window.location.href = 'profile.html#change-password';
                        };
                    }
                }
            }, 100); // Wait for localStorage update
        });
    }

    // Sync dark mode across all pages
    function syncDarkMode() {
        const darkMode = localStorage.getItem('siteDarkMode') === 'true';
        if (darkMode) {
            document.body.classList.add('dark-mode');
            document.documentElement.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
            document.documentElement.classList.remove('dark-mode');
        }
    }

    // Listen for changes to dark mode in localStorage (from other tabs/pages)
    window.addEventListener('storage', function(e) {
        if (e.key === 'siteDarkMode') {
            syncDarkMode();
        }
    });

    // Always sync on page load
    syncDarkMode();

    // Always sync on page show (when navigating back/forward)
    window.addEventListener('pageshow', function() {
        syncDarkMode();
    });

    // If there is a dark mode toggle button, update siteDarkMode and theme for all pages
    const themeBtn = document.getElementById('toggle-theme-btn');
    if (themeBtn) {
        themeBtn.onclick = function() {
            const darkMode = !(localStorage.getItem('siteDarkMode') === 'true');
            localStorage.setItem('siteDarkMode', darkMode);
            // Force update on all tabs including this one
            syncDarkMode();
        };
    }
});
