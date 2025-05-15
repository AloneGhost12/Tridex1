/**
 * Ban System for Tridex
 * This file contains all the functionality related to the user ban system.
 *
 * Version 2.4 - Fixed ban/unban functionality with improved server synchronization and admin panel integration
 */

// Initialize the ban system immediately
(function() {
    console.log('Ban System 2.4 initializing...');

    // Create a global variable to track initialization
    window.banSystemInitialized = false;

    // Store the ban check interval ID
    let banCheckIntervalId = null;

    // Initialize the ban system
    initBanSystem();

    // Function to initialize the ban system
    function initBanSystem() {
        try {
            console.log('Ban System: Initializing...');

            // Create the ban system object
            window.banSystem = {
                isUserBanned: isUserBanned,
                banUser: banUser,
                unbanUser: unbanUser,
                showBanMessage: showBanMessage,
                checkCurrentUserBan: checkCurrentUserBan,
                checkServerBanStatus: checkServerBanStatus,
                getBannedUsers: getBannedUsers,
                debugBanSystem: debugBanSystem,
                version: '2.4',
                forceCheckBanStatus: forceCheckBanStatus
            };

            // Mark as initialized
            window.banSystemInitialized = true;

            console.log('Ban System: Initialized successfully');

            // Check if the current user is banned
            setTimeout(function() {
                const username = localStorage.getItem('username') || localStorage.getItem('currentUser');
                if (username) {
                    // First check local storage
                    if (isUserBanned(username)) {
                        console.log(`Ban System: User ${username} is banned locally, handling ban...`);
                        checkCurrentUserBan();
                    }

                    // Then check with the server
                    checkServerBanStatus(username);

                    // Set up periodic checks with the server (every 5 seconds)
                    if (banCheckIntervalId) {
                        clearInterval(banCheckIntervalId);
                    }

                    banCheckIntervalId = setInterval(function() {
                        const currentUser = localStorage.getItem('username') || localStorage.getItem('currentUser');
                        if (currentUser) {
                            checkServerBanStatus(currentUser);
                        } else {
                            // If no user is logged in, clear the interval
                            clearInterval(banCheckIntervalId);
                            banCheckIntervalId = null;
                        }
                    }, 5000); // Check every 5 seconds for more responsive unban detection

                    // Set up a broadcast channel to listen for ban/unban events
                    try {
                        if (typeof BroadcastChannel !== 'undefined') {
                            // Create a broadcast channel for ban system events
                            const banChannel = new BroadcastChannel('tridex_ban_system');

                            // Listen for ban/unban events
                            banChannel.onmessage = function(event) {
                                console.log('Ban System: Received broadcast message:', event.data);

                                const currentUser = localStorage.getItem('username') || localStorage.getItem('currentUser');

                                // Handle unban events
                                if (event.data && event.data.type === 'unban' && event.data.username) {
                                    // If this is the unbanned user, clear ban flags and reload
                                    if (currentUser === event.data.username) {
                                        console.log(`Ban System: Received unban broadcast for current user ${currentUser}`);

                                        // Clear ban flags
                                        sessionStorage.removeItem('userBanned');
                                        sessionStorage.removeItem('showBanMessage');

                                        // Remove the user from the banned list
                                        const bannedUsers = JSON.parse(localStorage.getItem('bannedUsers') || '[]');
                                        const updatedList = bannedUsers.filter(user => user !== currentUser);
                                        localStorage.setItem('bannedUsers', JSON.stringify(updatedList));
                                        sessionStorage.setItem('bannedUsers', JSON.stringify(updatedList));

                                        // Remove any existing ban message
                                        const banMessage = document.getElementById('ban-message');
                                        if (banMessage) {
                                            console.log('Ban System: Removing ban message due to broadcast unban');
                                            banMessage.remove();
                                        }

                                        // Allow scrolling again
                                        document.body.style.overflow = '';
                                        document.documentElement.style.overflow = '';

                                        // Reload the page to reflect the unbanned status
                                        console.log('Ban System: Reloading page due to broadcast unban');
                                        window.location.reload();
                                    }
                                }

                                // Handle ban events
                                if (event.data && event.data.type === 'ban' && event.data.username) {
                                    // If this is the banned user, show ban message and reload
                                    if (currentUser === event.data.username) {
                                        console.log(`Ban System: Received ban broadcast for current user ${currentUser}`);

                                        // Set ban flags
                                        sessionStorage.setItem('userBanned', 'true');
                                        sessionStorage.setItem('showBanMessage', 'true');

                                        // Add the user to the banned list
                                        const bannedUsers = JSON.parse(localStorage.getItem('bannedUsers') || '[]');
                                        if (!bannedUsers.includes(currentUser)) {
                                            bannedUsers.push(currentUser);
                                            localStorage.setItem('bannedUsers', JSON.stringify(bannedUsers));
                                            sessionStorage.setItem('bannedUsers', JSON.stringify(bannedUsers));
                                        }

                                        // Show the ban message
                                        console.log('Ban System: Showing ban message due to broadcast ban');
                                        showBanMessage();
                                    }
                                }
                            };

                            // Store the channel in the window object for later use
                            window.tridexBanChannel = banChannel;
                        }
                    } catch (error) {
                        console.error('Ban System: Error setting up broadcast channel:', error);
                    }
                }
            }, 100);

        } catch (error) {
            console.error('Ban System: Initialization failed', error);
        }
    }
})();

/**
 * Check if a user is banned
 * @param {string} username - The username to check
 * @returns {boolean} - True if the user is banned, false otherwise
 */
function isUserBanned(username) {
    try {
        if (!username) {
            console.log('Ban System: isUserBanned: No username provided');
            return false;
        }

        // Get the list of banned users from localStorage
        const bannedUsers = JSON.parse(localStorage.getItem('bannedUsers') || '[]');
        const isBanned = bannedUsers.includes(username);

        console.log(`Ban System: Checking if user ${username} is banned: ${isBanned}`);

        return isBanned;
    } catch (error) {
        console.error('Ban System: Error checking if user is banned', error);
        return false;
    }
}

/**
 * Ban a user
 * @param {string} username - The username to ban
 * @returns {boolean} - True if the ban was successful, false otherwise
 */
function banUser(username) {
    try {
        if (!username) {
            console.error('Ban System: Cannot ban: No username provided');
            return false;
        }

        console.log(`Ban System: Attempting to ban user: ${username}`);

        // Get the current list of banned users
        const bannedUsers = JSON.parse(localStorage.getItem('bannedUsers') || '[]');

        // Check if the user is already banned
        if (bannedUsers.includes(username)) {
            console.log(`Ban System: User ${username} is already banned`);
            return true; // User is already banned
        }

        // Add the user to the banned list
        bannedUsers.push(username);

        // Save the updated list
        localStorage.setItem('bannedUsers', JSON.stringify(bannedUsers));

        // Also save to sessionStorage for redundancy
        sessionStorage.setItem('bannedUsers', JSON.stringify(bannedUsers));

        // Verify the update was successful
        const verifyList = JSON.parse(localStorage.getItem('bannedUsers') || '[]');
        const success = verifyList.includes(username);

        console.log(`Ban System: Ban operation ${success ? 'successful' : 'failed'} for ${username}`);

        // If the banned user is the current user, handle the ban
        const currentUser = localStorage.getItem('username') || localStorage.getItem('currentUser');
        if (success && username === currentUser) {
            console.log(`Ban System: Current user ${username} was banned, handling ban...`);

            // Set a flag in sessionStorage
            sessionStorage.setItem('userBanned', 'true');

            // Show the ban message if we're on a page other than login
            if (!window.location.href.includes('login.html')) {
                setTimeout(function() {
                    checkCurrentUserBan();
                }, 100);
            }
        }

        return success;
    } catch (error) {
        console.error('Ban System: Error banning user', error);
        return false;
    }
}

/**
 * Unban a user
 * @param {string} username - The username to unban
 * @returns {boolean} - True if the unban was successful, false otherwise
 */
function unbanUser(username) {
    try {
        if (!username) {
            console.error('Ban System: Cannot unban: No username provided');
            return false;
        }

        console.log(`Ban System: Attempting to unban user: ${username}`);

        // Get the current list of banned users
        const bannedUsers = JSON.parse(localStorage.getItem('bannedUsers') || '[]');

        // Check if the user is banned
        if (!bannedUsers.includes(username)) {
            console.log(`Ban System: User ${username} is not in the banned list`);
            return true; // User is not banned
        }

        // Remove the user from the banned list
        const updatedList = bannedUsers.filter(user => user !== username);

        // Save the updated list
        localStorage.setItem('bannedUsers', JSON.stringify(updatedList));

        // Also update sessionStorage
        sessionStorage.setItem('bannedUsers', JSON.stringify(updatedList));

        // Verify the update was successful
        const verifyList = JSON.parse(localStorage.getItem('bannedUsers') || '[]');
        const success = !verifyList.includes(username);

        console.log(`Ban System: Unban operation ${success ? 'successful' : 'failed'} for ${username}`);

        if (success) {
            // Broadcast the unban event to all tabs/windows
            try {
                if (typeof BroadcastChannel !== 'undefined' && window.tridexBanChannel) {
                    console.log(`Ban System: Broadcasting unban event for ${username}`);
                    window.tridexBanChannel.postMessage({
                        type: 'unban',
                        username: username,
                        timestamp: Date.now()
                    });
                }
            } catch (error) {
                console.error('Ban System: Error broadcasting unban event:', error);
            }

            // If the unbanned user is the current user, clear ban flags
            const currentUser = localStorage.getItem('username') || localStorage.getItem('currentUser');
            if (username === currentUser) {
                console.log(`Ban System: Current user ${username} was unbanned, clearing ban flags...`);

                // Clear ban flags in sessionStorage
                sessionStorage.removeItem('userBanned');
                sessionStorage.removeItem('showBanMessage');

                // Remove any existing ban message
                const banMessage = document.getElementById('ban-message');
                if (banMessage) {
                    console.log('Ban System: Removing ban message');
                    banMessage.remove();
                }

                // Allow scrolling again
                document.body.style.overflow = '';
                document.documentElement.style.overflow = '';

                // Remove the touchmove event listener if it exists
                if (document.body.getAttribute('data-ban-touchmove-handler') === 'true') {
                    document.removeEventListener('touchmove', function(e) { e.preventDefault(); }, { passive: false });
                    document.body.removeAttribute('data-ban-touchmove-handler');
                }

                // Force a page reload to ensure all ban-related UI elements are cleared
                console.log('Ban System: Reloading page to reflect unbanned status');
                setTimeout(function() {
                    window.location.reload();
                }, 500);
            }
        }

        return success;
    } catch (error) {
        console.error('Ban System: Error unbanning user', error);
        return false;
    }
}

/**
 * Show the ban message
 */
function showBanMessage() {
    try {
        console.log('Ban System: Showing ban message');

        // Hide any loading screen that might be visible
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }

        // Remove any existing ban message to avoid duplicates
        const existingBanMessage = document.getElementById('ban-message');
        if (existingBanMessage) {
            existingBanMessage.remove();
        }

        // Create the ban message element
        console.log('Ban System: Creating new ban message element');

        const banMessage = document.createElement('div');
        banMessage.id = 'ban-message';

        // Set styles to ensure it's visible and above everything
        banMessage.style.display = 'flex';
        banMessage.style.position = 'fixed';
        banMessage.style.top = '0';
        banMessage.style.left = '0';
        banMessage.style.width = '100%';
        banMessage.style.height = '100%';
        banMessage.style.backgroundColor = 'rgba(0,0,0,0.8)';
        banMessage.style.zIndex = '2147483647'; // Maximum z-index value
        banMessage.style.alignItems = 'center';
        banMessage.style.justifyContent = 'center';
        banMessage.style.touchAction = 'none'; // Prevent scrolling on touch devices

        const messageContent = document.createElement('div');
        messageContent.style.backgroundColor = '#fff';
        messageContent.style.padding = '32px 24px';
        messageContent.style.borderRadius = '8px';
        messageContent.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)';
        messageContent.style.minWidth = '280px';
        messageContent.style.maxWidth = '90%';
        messageContent.style.textAlign = 'center';
        messageContent.style.margin = '20px';

        messageContent.innerHTML = `
            <div style="margin-bottom:15px; font-size:3em; color:#d32f2f;">⚠️</div>
            <h2 style="margin-bottom:15px; color:#d32f2f; font-size:1.5em; font-weight:bold;">Account Banned</h2>
            <p style="margin-bottom:24px; font-size:1.1em; color:#555; line-height:1.5;">Your account has been banned by the administrator. You no longer have access to this site.</p>
            <p style="margin-bottom:24px; font-size:0.9em; color:#777;">For more information, please contact support.</p>
            <button id="ban-ok-btn" style="padding:12px 28px; background:#dc3545; color:#fff; border:none; border-radius:5px; font-size:1.1rem; cursor:pointer; font-weight:bold; transition:all 0.2s ease; -webkit-tap-highlight-color:transparent;">OK</button>
        `;

        banMessage.appendChild(messageContent);

        // Ensure the ban message is added to the body
        const addBanMessageToDOM = function() {
            console.log('Ban System: Adding ban message to DOM');

            // Make sure the body exists
            if (document.body) {
                document.body.appendChild(banMessage);
                setupBanButtonHandlers();

                // Force reflow to ensure the message is displayed
                void banMessage.offsetWidth;
            } else {
                console.error('Ban System: Document body not available');

                // Try again in 100ms
                setTimeout(addBanMessageToDOM, 100);
            }
        };

        // Wait for the DOM to be fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', addBanMessageToDOM);
        } else {
            addBanMessageToDOM();
        }

        // Prevent scrolling
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';

        // Prevent touchmove events on mobile
        const preventTouchMove = function(e) {
            e.preventDefault();
        };

        // Remove any existing touchmove event listeners
        document.removeEventListener('touchmove', preventTouchMove, { passive: false });

        // Add event listener to prevent touch scrolling
        document.addEventListener('touchmove', preventTouchMove, { passive: false });

        // Store the event listener in a data attribute so we can remove it later
        document.body.setAttribute('data-ban-touchmove-handler', 'true');

        // Set a flag in sessionStorage
        sessionStorage.setItem('userBanned', 'true');

    } catch (error) {
        console.error('Ban System: Error showing ban message', error);
    }
}

/**
 * Set up the ban button handlers
 */
function setupBanButtonHandlers() {
    try {
        console.log('Ban System: Setting up ban button handlers');
        const banOkBtn = document.getElementById('ban-ok-btn');
        if (banOkBtn) {
            // Remove any existing event listeners to prevent duplicates
            const newBanOkBtn = banOkBtn.cloneNode(true);
            banOkBtn.parentNode.replaceChild(newBanOkBtn, banOkBtn);

            // Add click event to the OK button
            newBanOkBtn.onclick = function() {
                console.log('Ban System: Ban OK button clicked');

                // Remove the touchmove event listener if it exists
                if (document.body.getAttribute('data-ban-touchmove-handler') === 'true') {
                    document.removeEventListener('touchmove', function(e) { e.preventDefault(); }, { passive: false });
                    document.body.removeAttribute('data-ban-touchmove-handler');
                }

                // Clear all login data
                localStorage.removeItem('token');
                localStorage.removeItem('isLoggedIn');
                localStorage.removeItem('username');
                localStorage.removeItem('currentUser');

                // Allow scrolling again
                document.body.style.overflow = '';
                document.documentElement.style.overflow = '';

                // Set flags in sessionStorage to show the ban message on the login page
                sessionStorage.setItem('showBanMessage', 'true');
                sessionStorage.setItem('userBanned', 'true');

                // Remove the ban message element
                const banMessage = document.getElementById('ban-message');
                if (banMessage) {
                    banMessage.remove();
                }

                // Redirect to login page with banned parameter
                console.log('Ban System: Redirecting to login page with banned parameter');
                window.location.href = 'login.html?banned=true';
            };

            // Add hover effect to the button
            newBanOkBtn.addEventListener('mouseover', function() {
                this.style.backgroundColor = '#b71c1c';
            });
            newBanOkBtn.addEventListener('mouseout', function() {
                this.style.backgroundColor = '#dc3545';
            });

            // Add touch event for mobile devices
            newBanOkBtn.addEventListener('touchstart', function() {
                this.style.backgroundColor = '#b71c1c';
            });
            newBanOkBtn.addEventListener('touchend', function() {
                this.style.backgroundColor = '#dc3545';
            });
        } else {
            console.error('Ban System: Ban OK button not found');
        }
    } catch (error) {
        console.error('Ban System: Error setting up ban button handlers', error);
    }
}

/**
 * Check if the current user is banned and handle accordingly
 * @returns {boolean} - True if the user is banned, false otherwise
 */
function checkCurrentUserBan() {
    try {
        const username = localStorage.getItem('username') || localStorage.getItem('currentUser');
        console.log(`Ban System: Checking if user ${username} is banned`);

        // Check if the user is banned
        if (isUserBanned(username)) {
            console.log(`Ban System: User ${username} is banned. Showing ban message.`);

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

            // Set ban flags in sessionStorage
            sessionStorage.setItem('userBanned', 'true');
            sessionStorage.setItem('showBanMessage', 'true');

            // Function to show ban message
            const showBanMessageAndStopExecution = function() {
                // Show the ban message
                showBanMessage();
            };

            // Ensure the ban message is shown even if the DOM isn't fully loaded yet
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', showBanMessageAndStopExecution);
            } else {
                // Show the ban message immediately
                showBanMessageAndStopExecution();
            }

            return true; // User is banned
        } else {
            // Check if there's a ban flag in sessionStorage
            if (sessionStorage.getItem('userBanned') === 'true') {
                console.log('Ban System: Ban flag found in sessionStorage. User was previously banned.');

                // Clear all login data
                localStorage.removeItem('token');
                localStorage.removeItem('isLoggedIn');
                localStorage.removeItem('username');
                localStorage.removeItem('currentUser');

                // Show the ban message
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', showBanMessage);
                } else {
                    showBanMessage();
                }

                return true; // User is banned
            }
        }

        return false; // User is not banned
    } catch (error) {
        console.error('Ban System: Error checking if current user is banned', error);
        return false;
    }
}

/**
 * Check the server for a user's ban status
 * @param {string} username - The username to check
 * @returns {Promise<boolean>} - Promise resolving to true if the user is banned, false otherwise
 */
async function checkServerBanStatus(username) {
    try {
        if (!username) {
            console.log('Ban System: checkServerBanStatus: No username provided');
            return false;
        }

        console.log(`Ban System: Checking server ban status for ${username}`);

        // Try production server first
        let response;
        try {
            response = await fetch(`https://tridex1.onrender.com/users/check-ban/${username}`);
        } catch (fetchError) {
            console.warn('Could not reach production server, trying local server...');
            // If production server fails, try local server
            response = await fetch(`http://localhost:3000/users/check-ban/${username}`);
        }

        if (!response.ok) {
            console.error(`Ban System: Server returned ${response.status} when checking ban status`);
            return isUserBanned(username); // Fall back to local check
        }

        const data = await response.json();
        console.log(`Ban System: Server says user ${username} ban status is: ${data.isBanned}`);

        // Update local ban status based on server response
        if (data.isBanned) {
            // If server says user is banned but not banned locally, update local storage
            if (!isUserBanned(username)) {
                console.log(`Ban System: Updating local ban status for ${username} to banned`);
                banUser(username);

                // Show ban message if this is the current user
                const currentUser = localStorage.getItem('username') || localStorage.getItem('currentUser');
                if (username === currentUser) {
                    console.log(`Ban System: Current user ${username} was banned by server, showing ban message`);
                    checkCurrentUserBan();
                }
            }
        } else {
            // If server says user is not banned but banned locally, update local storage
            if (isUserBanned(username)) {
                console.log(`Ban System: Updating local ban status for ${username} to unbanned`);

                // Get the current list of banned users
                const bannedUsers = JSON.parse(localStorage.getItem('bannedUsers') || '[]');

                // Remove the user from the banned list
                const updatedList = bannedUsers.filter(user => user !== username);

                // Save the updated list
                localStorage.setItem('bannedUsers', JSON.stringify(updatedList));
                sessionStorage.setItem('bannedUsers', JSON.stringify(updatedList));

                // Broadcast the unban event to all tabs/windows
                try {
                    if (typeof BroadcastChannel !== 'undefined' && window.tridexBanChannel) {
                        console.log(`Ban System: Broadcasting unban event for ${username} from server check`);
                        window.tridexBanChannel.postMessage({
                            type: 'unban',
                            username: username,
                            timestamp: Date.now(),
                            source: 'server-check'
                        });
                    }
                } catch (error) {
                    console.error('Ban System: Error broadcasting unban event:', error);
                }

                // If this is the current user, clear ban flags and reload
                const currentUser = localStorage.getItem('username') || localStorage.getItem('currentUser');
                if (username === currentUser) {
                    console.log(`Ban System: Current user ${username} was unbanned by server, clearing ban flags`);

                    // Clear ban flags in sessionStorage
                    sessionStorage.removeItem('userBanned');
                    sessionStorage.removeItem('showBanMessage');

                    // Remove any existing ban message
                    const banMessage = document.getElementById('ban-message');
                    if (banMessage) {
                        console.log('Ban System: Removing ban message due to server unban');
                        banMessage.remove();
                    }

                    // Allow scrolling again
                    document.body.style.overflow = '';
                    document.documentElement.style.overflow = '';

                    // Remove the touchmove event listener if it exists
                    if (document.body.getAttribute('data-ban-touchmove-handler') === 'true') {
                        document.removeEventListener('touchmove', function(e) { e.preventDefault(); }, { passive: false });
                        document.body.removeAttribute('data-ban-touchmove-handler');
                    }

                    // Reload the page to reflect the unbanned status
                    console.log(`Ban System: Reloading page to reflect unbanned status for ${username}`);
                    setTimeout(function() {
                        window.location.reload();
                    }, 500);
                }
            }
        }

        return data.isBanned;
    } catch (error) {
        console.error('Ban System: Error checking server ban status', error);
        return isUserBanned(username); // Fall back to local check
    }
}

/**
 * Get the list of banned users
 * @returns {Array} - The list of banned users
 */
function getBannedUsers() {
    try {
        return JSON.parse(localStorage.getItem('bannedUsers') || '[]');
    } catch (error) {
        console.error('Ban System: Error getting banned users', error);
        return [];
    }
}

/**
 * Force an immediate check of the ban status with the server
 * @param {string} [username] - Optional username to check. If not provided, checks the current user.
 * @returns {Promise<boolean>} - Promise resolving to true if the user is banned, false otherwise
 */
async function forceCheckBanStatus(username) {
    try {
        // If no username provided, use the current user
        const userToCheck = username || localStorage.getItem('username') || localStorage.getItem('currentUser');

        if (!userToCheck) {
            console.log('Ban System: forceCheckBanStatus: No username provided or found');
            return false;
        }

        console.log(`Ban System: Force checking ban status for ${userToCheck}`);

        // Check with the server
        return await checkServerBanStatus(userToCheck);
    } catch (error) {
        console.error('Ban System: Error force checking ban status', error);
        return isUserBanned(username); // Fall back to local check
    }
}

/**
 * Debug the ban system
 * @returns {Array} - The list of banned users
 */
function debugBanSystem() {
    try {
        const bannedUsers = getBannedUsers();
        console.log('Ban System: Current banned users:', bannedUsers);

        // Check if the ban system is initialized
        console.log('Ban System: Initialized:', window.banSystemInitialized);

        // Check if the ban system has a broadcast channel
        console.log('Ban System: Broadcast channel available:', !!window.tridexBanChannel);

        // Check if there are ban flags in sessionStorage
        console.log('Ban System: userBanned flag in sessionStorage:', sessionStorage.getItem('userBanned'));
        console.log('Ban System: showBanMessage flag in sessionStorage:', sessionStorage.getItem('showBanMessage'));

        // Check if the current user is banned
        const username = localStorage.getItem('username') || localStorage.getItem('currentUser');
        if (username) {
            console.log(`Ban System: Current user ${username} is banned:`, isUserBanned(username));

            // Force a server check
            forceCheckBanStatus(username).then(isBanned => {
                console.log(`Ban System: Server says user ${username} ban status is: ${isBanned}`);
            });
        }

        return bannedUsers;
    } catch (error) {
        console.error('Ban System: Error debugging ban system', error);
        return [];
    }
}
