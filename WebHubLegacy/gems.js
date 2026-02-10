// gems.js
const GEMS_PER_INTERVAL = 10;
const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutes

let gemsInterval = null;
let inactivityTimeout = null;
let isActive = true;

function checkLoginStatus() {
    // Skip login check for index.html
    if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
        return;
    }
    // Redirect to dashboard.html if not logged in
    if (localStorage.getItem('isLoggedIn') !== 'true') {
        window.location.href = 'dashboard.html';
    }
}

function startGemsTimer(username) {
    stopGemsTimer();
    const gemsKey = `gems_${username}`;
    const lastGemTimeKey = `lastGemTime_${username}`;
    let gems = parseInt(localStorage.getItem(gemsKey)) || 0;

    // Update UI if display elements exist
    updateGemsDisplay(gems);

    // Calculate time since last gem award
    const lastGemTime = parseInt(localStorage.getItem(lastGemTimeKey)) || Date.now();
    const timeSinceLastGem = Date.now() - lastGemTime;
    const initialDelay = timeSinceLastGem >= INTERVAL_MS ? 0 : INTERVAL_MS - timeSinceLastGem;

    setTimeout(() => {
        gemsInterval = setInterval(() => {
            if (isActive) {
                gems += GEMS_PER_INTERVAL;
                localStorage.setItem(gemsKey, gems);
                localStorage.setItem(lastGemTimeKey, Date.now());
                updateGemsDisplay(gems);
            }
        }, INTERVAL_MS);
        // Award gems immediately if overdue and active
        if (isActive && timeSinceLastGem >= INTERVAL_MS) {
            gems += GEMS_PER_INTERVAL;
            localStorage.setItem(gemsKey, gems);
            localStorage.setItem(lastGemTimeKey, Date.now());
            updateGemsDisplay(gems);
        }
    }, initialDelay);
}

function stopGemsTimer() {
    if (gemsInterval) {
        clearInterval(gemsInterval);
        gemsInterval = null;
    }
}

function updateGemsDisplay(gems) {
    const gemsDisplay = document.getElementById('gemsDisplay');
    if (gemsDisplay) {
        gemsDisplay.textContent = gems;
    }
    const showGems = document.getElementById('showGems');
    if (showGems) {
        showGems.textContent = gems;
    }
}

function resetInactivityTimeout(username) {
    clearTimeout(inactivityTimeout);
    if (localStorage.getItem('isLoggedIn') === 'true') {
        inactivityTimeout = setTimeout(() => {
            isActive = false;
            stopGemsTimer();
        }, INACTIVITY_LIMIT);
        if (!isActive) {
            isActive = true;
            startGemsTimer(username);
        }
    }
}

function initGems() {
    // Check login status first
    checkLoginStatus();

    if (localStorage.getItem('isLoggedIn') === 'true') {
        const username = localStorage.getItem('username');
        isActive = true;
        startGemsTimer(username);
        resetInactivityTimeout(username);
        updateLoginStatus(true, username);
    } else {
        updateLoginStatus(false);
        isActive = false;
        stopGemsTimer();
    }

    // Add event listeners for activity
    document.addEventListener('mousemove', () => resetInactivityTimeout(localStorage.getItem('username')));
    document.addEventListener('keydown', () => resetInactivityTimeout(localStorage.getItem('username')));
}

function updateLoginStatus(isLoggedIn, username) {
    const loginBtn = document.getElementById('loginBtn');
    const gemsContainer = document.getElementById('gemsContainer');
    if (!loginBtn || !gemsContainer) return;

    if (isLoggedIn) {
        loginBtn.textContent = 'Logout';
        loginBtn.href = '#';
        loginBtn.onclick = () => {
            stopGemsTimer();
            clearTimeout(inactivityTimeout);
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('username');
            localStorage.removeItem('password');
            isActive = false;
            window.location.href = 'dashboard.html';
        };
        gemsContainer.style.display = 'block';
        loginBtn.style.display = 'block';
        updateGemsDisplay(parseInt(localStorage.getItem(`gems_${username}`)) || 0);
    } else {
        loginBtn.textContent = 'Login';
        loginBtn.href = 'dashboard.html';
        loginBtn.onclick = null;
        gemsContainer.style.display = 'none';
        loginBtn.style.display = 'block';
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initGems);// gems.js
const GEMS_PER_INTERVAL = 10;
const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutes

let gemsInterval = null;
let inactivityTimeout = null;
let isActive = true;

function checkLoginStatus() {
    // Skip login check for index.html
    if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
        return;
    }
    // Redirect to dashboard.html if not logged in
    if (localStorage.getItem('isLoggedIn') !== 'true') {
        window.location.href = 'dashboard.html';
    }
}

function startGemsTimer(username) {
    stopGemsTimer();
    const gemsKey = `gems_${username}`;
    const lastGemTimeKey = `lastGemTime_${username}`;
    let gems = parseInt(localStorage.getItem(gemsKey)) || 0;

    // Update UI if display elements exist
    updateGemsDisplay(gems);

    // Calculate time since last gem award
    const lastGemTime = parseInt(localStorage.getItem(lastGemTimeKey)) || Date.now();
    const timeSinceLastGem = Date.now() - lastGemTime;
    const initialDelay = timeSinceLastGem >= INTERVAL_MS ? 0 : INTERVAL_MS - timeSinceLastGem;

    setTimeout(() => {
        gemsInterval = setInterval(() => {
            if (isActive) {
                gems += GEMS_PER_INTERVAL;
                localStorage.setItem(gemsKey, gems);
                localStorage.setItem(lastGemTimeKey, Date.now());
                updateGemsDisplay(gems);
            }
        }, INTERVAL_MS);
        // Award gems immediately if overdue and active
        if (isActive && timeSinceLastGem >= INTERVAL_MS) {
            gems += GEMS_PER_INTERVAL;
            localStorage.setItem(gemsKey, gems);
            localStorage.setItem(lastGemTimeKey, Date.now());
            updateGemsDisplay(gems);
        }
    }, initialDelay);
}

function stopGemsTimer() {
    if (gemsInterval) {
        clearInterval(gemsInterval);
        gemsInterval = null;
    }
}

function updateGemsDisplay(gems) {
    const gemsDisplay = document.getElementById('gemsDisplay');
    if (gemsDisplay) {
        gemsDisplay.textContent = gems;
    }
    const showGems = document.getElementById('showGems');
    if (showGems) {
        showGems.textContent = gems;
    }
}

function resetInactivityTimeout(username) {
    clearTimeout(inactivityTimeout);
    if (localStorage.getItem('isLoggedIn') === 'true') {
        inactivityTimeout = setTimeout(() => {
            isActive = false;
            stopGemsTimer();
        }, INACTIVITY_LIMIT);
        if (!isActive) {
            isActive = true;
            startGemsTimer(username);
        }
    }
}

function initGems() {
    // Check login status first
    checkLoginStatus();

    if (localStorage.getItem('isLoggedIn') === 'true') {
        const username = localStorage.getItem('username');
        isActive = true;
        startGemsTimer(username);
        resetInactivityTimeout(username);
        updateLoginStatus(true, username);
    } else {
        updateLoginStatus(false);
        isActive = false;
        stopGemsTimer();
    }

    // Add event listeners for activity
    document.addEventListener('mousemove', () => resetInactivityTimeout(localStorage.getItem('username')));
    document.addEventListener('keydown', () => resetInactivityTimeout(localStorage.getItem('username')));
}

function updateLoginStatus(isLoggedIn, username) {
    const loginBtn = document.getElementById('loginBtn');
    const gemsContainer = document.getElementById('gemsContainer');
    if (!loginBtn || !gemsContainer) return;

    if (isLoggedIn) {
        loginBtn.textContent = 'Logout';
        loginBtn.href = '#';
        loginBtn.onclick = () => {
            stopGemsTimer();
            clearTimeout(inactivityTimeout);
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('username');
            localStorage.removeItem('password');
            isActive = false;
            window.location.href = 'dashboard.html';
        };
        gemsContainer.style.display = 'block';
        loginBtn.style.display = 'block';
        updateGemsDisplay(parseInt(localStorage.getItem(`gems_${username}`)) || 0);
    } else {
        loginBtn.textContent = 'Login';
        loginBtn.href = 'dashboard.html';
        loginBtn.onclick = null;
        gemsContainer.style.display = 'none';
        loginBtn.style.display = 'block';
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initGems);