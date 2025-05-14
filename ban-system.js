/**
 * Ban System for Tridex
 * This file contains all the functionality related to the user ban system.
 */

// Function to check if a user is banned
function isUserBanned(username) {
    if (!username) {
        console.log('isUserBanned: No username provided');
        return false;
    }

    // Get the list of banned users from localStorage
    const bannedUsers = JSON.parse(localStorage.getItem('bannedUsers') || '[]');
    const isBanned = bannedUsers.includes(username);

    console.log(`Checking if user ${username} is banned: ${isBanned}`);
    console.log('Current banned users:', bannedUsers);

    return isBanned;
}

// Function to ban a user
function banUser(username) {
    if (!username) {
        console.error('Cannot ban: No username provided');
        return false;
    }

    console.log(`Attempting to ban user: ${username}`);

    // Get the current list of banned users
    const bannedUsers = JSON.parse(localStorage.getItem('bannedUsers') || '[]');
    console.log('Current banned users before ban:', bannedUsers);

    // Check if the user is already banned
    if (bannedUsers.includes(username)) {
        console.log(`User ${username} is already banned`);
        return true; // User is already banned
    }

    // Add the user to the banned list
    bannedUsers.push(username);
    console.log('Updated banned users after ban:', bannedUsers);

    // Save the updated list
    localStorage.setItem('bannedUsers', JSON.stringify(bannedUsers));

    // Verify the update was successful
    const verifyList = JSON.parse(localStorage.getItem('bannedUsers') || '[]');
    const success = verifyList.includes(username);
    console.log(`Ban operation ${success ? 'successful' : 'failed'} for ${username}`);

    return success;
}

// Function to unban a user
function unbanUser(username) {
    if (!username) {
        console.error('Cannot unban: No username provided');
        return false;
    }

    console.log(`Attempting to unban user: ${username}`);

    // Get the current list of banned users
    const bannedUsers = JSON.parse(localStorage.getItem('bannedUsers') || '[]');
    console.log('Current banned users before unban:', bannedUsers);

    // Check if the user is banned
    if (!bannedUsers.includes(username)) {
        console.log(`User ${username} is not in the banned list`);
        return true; // User is not banned
    }

    // Remove the user from the banned list
    const updatedList = bannedUsers.filter(user => user !== username);
    console.log('Updated banned users after unban:', updatedList);

    // Save the updated list
    localStorage.setItem('bannedUsers', JSON.stringify(updatedList));

    // Verify the update was successful
    const verifyList = JSON.parse(localStorage.getItem('bannedUsers') || '[]');
    const success = !verifyList.includes(username);
    console.log(`Unban operation ${success ? 'successful' : 'failed'} for ${username}`);

    return success;
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
        banMessage.style.cssText = 'display:flex; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:999999; align-items:center; justify-content:center;';

        const messageContent = document.createElement('div');
        messageContent.style.cssText = 'background:#fff; padding:32px 24px; border-radius:8px; box-shadow:0 2px 12px rgba(0,0,0,0.15); min-width:280px; max-width:90%; text-align:center;';

        messageContent.innerHTML = `
            <div style="margin-bottom:10px; font-size:3em; color:#d32f2f;">⚠️</div>
            <h2 style="margin-bottom:10px; color:#d32f2f; font-size:1.5em;">Account Banned</h2>
            <p style="margin-bottom:24px; font-size:1.1em; color:#555; line-height:1.5;">Your account has been banned by the administrator. You no longer have access to this site.</p>
            <p style="margin-bottom:24px; font-size:0.9em; color:#777;">For more information, please contact support.</p>
            <button id="ban-ok-btn" style="padding:10px 24px; background:#dc3545; color:#fff; border:none; border-radius:5px; font-size:1rem; cursor:pointer; font-weight:bold; transition:all 0.2s ease;">OK</button>
        `;

        banMessage.appendChild(messageContent);

        // Ensure the ban message is added to the body
        // Wait for the DOM to be fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                document.body.appendChild(banMessage);
                setupBanButtonHandlers();
            });
        } else {
            document.body.appendChild(banMessage);
            setupBanButtonHandlers();
        }
    } else {
        // If the ban message already exists, just show it
        const banMessage = document.getElementById('ban-message');
        banMessage.style.display = 'flex';

        // Ensure the ban message is visible on mobile
        banMessage.style.position = 'fixed';
        banMessage.style.top = '0';
        banMessage.style.left = '0';
        banMessage.style.width = '100%';
        banMessage.style.height = '100%';
        banMessage.style.zIndex = '999999';

        // Make sure the button handlers are set up
        setupBanButtonHandlers();

        // Hide any loading screen that might be visible
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }

    // Prevent scrolling
    document.body.style.overflow = 'hidden';
}

// Helper function to set up ban button handlers
function setupBanButtonHandlers() {
    const banOkBtn = document.getElementById('ban-ok-btn');
    if (banOkBtn) {
        // Remove any existing event listeners to prevent duplicates
        const newBanOkBtn = banOkBtn.cloneNode(true);
        banOkBtn.parentNode.replaceChild(newBanOkBtn, banOkBtn);

        // Add click event to the OK button
        newBanOkBtn.onclick = function() {
            // Clear all login data
            localStorage.removeItem('token');
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('username');
            localStorage.removeItem('currentUser');

            // Allow scrolling again
            document.body.style.overflow = '';

            // Redirect to login page with banned parameter
            window.location.href = 'login.html?banned=true';
        };

        // Add hover effect to the button
        newBanOkBtn.addEventListener('mouseover', function() {
            this.style.backgroundColor = '#b71c1c';
        });
        newBanOkBtn.addEventListener('mouseout', function() {
            this.style.backgroundColor = '#dc3545';
        });
    }
}

// Function to check if the current user is banned and handle accordingly
function checkCurrentUserBan() {
    const username = localStorage.getItem('username') || localStorage.getItem('currentUser');

    if (isUserBanned(username)) {
        console.log(`User ${username} is banned. Showing ban message.`);

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

        // Ensure the ban message is shown even if the DOM isn't fully loaded yet
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                showBanMessage();
            });
        } else {
            // Show the ban message immediately
            showBanMessage();
        }

        return true; // User is banned
    }

    return false; // User is not banned
}

// Function to get the list of banned users
function getBannedUsers() {
    return JSON.parse(localStorage.getItem('bannedUsers') || '[]');
}

// Function to debug the ban system
function debugBanSystem() {
    const bannedUsers = getBannedUsers();
    console.log('Current banned users:', bannedUsers);
    return bannedUsers;
}

// Export the functions
window.banSystem = {
    isUserBanned,
    banUser,
    unbanUser,
    showBanMessage,
    checkCurrentUserBan,
    getBannedUsers,
    debugBanSystem
};
