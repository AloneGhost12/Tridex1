/**
 * Ban System for Tridex
 * This file contains all the functionality related to the user ban system.
 */

// Function to check if a user is banned
function isUserBanned(username) {
    if (!username) return false;

    // Get the list of banned users from localStorage
    const bannedUsers = JSON.parse(localStorage.getItem('bannedUsers') || '[]');
    return bannedUsers.includes(username);
}

// Function to ban a user
function banUser(username) {
    if (!username) return false;

    // Get the current list of banned users
    const bannedUsers = JSON.parse(localStorage.getItem('bannedUsers') || '[]');

    // Check if the user is already banned
    if (bannedUsers.includes(username)) {
        return true; // User is already banned
    }

    // Add the user to the banned list
    bannedUsers.push(username);

    // Save the updated list
    localStorage.setItem('bannedUsers', JSON.stringify(bannedUsers));

    return true;
}

// Function to unban a user
function unbanUser(username) {
    if (!username) return false;

    // Get the current list of banned users
    const bannedUsers = JSON.parse(localStorage.getItem('bannedUsers') || '[]');

    // Check if the user is banned
    if (!bannedUsers.includes(username)) {
        return true; // User is not banned
    }

    // Remove the user from the banned list
    const updatedList = bannedUsers.filter(user => user !== username);

    // Save the updated list
    localStorage.setItem('bannedUsers', JSON.stringify(updatedList));

    return true;
}

// Function to show the ban message
function showBanMessage() {
    // Hide any loading screen that might be visible
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }

    // Create the ban message element if it doesn't exist
    if (!document.getElementById('ban-message')) {
        const banMessage = document.createElement('div');
        banMessage.id = 'ban-message';
        // Set z-index to 999999 to ensure it's above everything, including loading screens
        banMessage.style.cssText = 'display:flex; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.8); z-index:999999; align-items:center; justify-content:center;';

        const messageContent = document.createElement('div');
        messageContent.style.cssText = 'background:#fff; padding:32px 24px; border-radius:8px; box-shadow:0 2px 12px rgba(0,0,0,0.15); min-width:320px; max-width:90%; text-align:center;';

        messageContent.innerHTML = `
            <div style="margin-bottom:10px; font-size:3em; color:#d32f2f;">⚠️</div>
            <h2 style="margin-bottom:10px; color:#d32f2f; font-size:1.5em;">Account Banned</h2>
            <p style="margin-bottom:24px; font-size:1.1em; color:#555; line-height:1.5;">Your account has been banned by the administrator. You no longer have access to this site.</p>
            <p style="margin-bottom:24px; font-size:0.9em; color:#777;">For more information, please contact support.</p>
            <button id="ban-ok-btn" style="padding:10px 24px; background:#dc3545; color:#fff; border:none; border-radius:5px; font-size:1rem; cursor:pointer; font-weight:bold; transition:all 0.2s ease;">OK</button>
        `;

        banMessage.appendChild(messageContent);
        document.body.appendChild(banMessage);

        // Add click event to the OK button
        document.getElementById('ban-ok-btn').onclick = function() {
            // Clear all login data
            localStorage.removeItem('token');
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('username');
            localStorage.removeItem('currentUser');

            // Redirect to login page with banned parameter
            window.location.href = 'login.html?banned=true';
        };

        // Add hover effect to the button
        document.getElementById('ban-ok-btn').addEventListener('mouseover', function() {
            this.style.backgroundColor = '#b71c1c';
        });
        document.getElementById('ban-ok-btn').addEventListener('mouseout', function() {
            this.style.backgroundColor = '#dc3545';
        });
    } else {
        // Show the existing ban message
        document.getElementById('ban-message').style.display = 'flex';

        // Hide any loading screen that might be visible
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }

    // Prevent scrolling
    document.body.style.overflow = 'hidden';
}

// Function to check if the current user is banned and handle accordingly
function checkCurrentUserBan() {
    const username = localStorage.getItem('username') || localStorage.getItem('currentUser');

    if (isUserBanned(username)) {
        // Hide any loading screen that might be visible
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }

        // Clear all login data
        localStorage.removeItem('token');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('username');
        localStorage.removeItem('currentUser');

        // Show the ban message
        showBanMessage();

        return true; // User is banned
    }

    return false; // User is not banned
}

// Export the functions
window.banSystem = {
    isUserBanned,
    banUser,
    unbanUser,
    showBanMessage,
    checkCurrentUserBan
};
