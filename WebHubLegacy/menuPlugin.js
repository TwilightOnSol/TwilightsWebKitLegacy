// Spotify API Service
const SpotifyService = {
    config: {
        redirectUri: 'https://sillybotto55.vercel.app/menu.html',
        authEndpoint: 'https://accounts.spotify.com/authorize',
        tokenEndpoint: 'https://accounts.spotify.com/api/token',
        apiEndpoint: 'https://api.spotify.com/v1',
        scopes: [
            'user-read-private',
            'user-read-email',
            'streaming',
            'playlist-read-private',
            'user-read-playback-state',
            'user-modify-playback-state',
            'user-read-currently-playing'
        ],
        clientId: window.envConfig?.SPOTIFY_CLIENT_ID || 'dac1994e8adf4fc9b12e216e1f740628' // Fallback for demo
    },

    async generateCodeChallenge(verifier) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(verifier);
            const digest = await crypto.subtle.digest('SHA-256', data);
            const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');
            return base64;
        } catch (e) {
            MenuPlugin.showError('Error generating PKCE challenge: ' + e.message);
            return null;
        }
    },

    generateCodeVerifier() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        return Array.from({ length: 128 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    },

    async connect() {
        const verifier = this.generateCodeVerifier();
        localStorage.setItem('spotify_code_verifier', verifier);
        const challenge = await this.generateCodeChallenge(verifier);
        if (!challenge) return;

        const params = new URLSearchParams({
            client_id: this.config.clientId,
            response_type: 'code',
            redirect_uri: this.config.redirectUri,
            code_challenge_method: 'S256',
            code_challenge: challenge,
            scope: this.config.scopes.join(' ')
        });

        window.location = `${this.config.authEndpoint}?${params.toString()}`;
    },

    async handleOAuthCallback() {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        if (!code) return;

        const verifier = localStorage.getItem('spotify_code_verifier');
        try {
            const response = await fetch(this.config.tokenEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: this.config.clientId,
                    grant_type: 'authorization_code',
                    code,
                    redirect_uri: this.config.redirectUri,
                    code_verifier: verifier
                })
            });
            const data = await response.json();
            if (data.access_token) {
                localStorage.setItem('spotify_access_token', data.access_token);
                localStorage.setItem('spotify_token_expires_at', Date.now() + (data.expires_in * 1000));
                if (data.refresh_token) {
                    localStorage.setItem('spotify_refresh_token', data.refresh_token);
                }
                await this.fetchPlaylists(data.access_token);
                this.updatePlayerState(data.access_token);
                window.history.replaceState({}, document.title, window.location.pathname);
            } else {
                MenuPlugin.showError('Spotify login failed: ' + (data.error_description || 'Unknown error'));
            }
        } catch (e) {
            MenuPlugin.showError('Error during Spotify login: ' + e.message);
        }
    },

    async refreshAccessToken() {
        const refreshToken = localStorage.getItem('spotify_refresh_token');
        if (!refreshToken) {
            MenuPlugin.showError('No refresh token available. Please reconnect Spotify.');
            localStorage.removeItem('spotify_access_token');
            localStorage.removeItem('spotify_token_expires_at');
            return false;
        }
        try {
            const response = await fetch(this.config.tokenEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: this.config.clientId,
                    grant_type: 'refresh_token',
                    refresh_token: refreshToken
                })
            });
            const data = await response.json();
            if (data.access_token) {
                localStorage.setItem('spotify_access_token', data.access_token);
                localStorage.setItem('spotify_token_expires_at', Date.now() + (data.expires_in * 1000));
                if (data.refresh_token) {
                    localStorage.setItem('spotify_refresh_token', data.refresh_token);
                }
                return true;
            } else {
                MenuPlugin.showError('Failed to refresh Spotify token.');
                localStorage.removeItem('spotify_refresh_token');
                return false;
            }
        } catch (e) {
            MenuPlugin.showError('Error refreshing Spotify token: ' + e.message);
            localStorage.removeItem('spotify_refresh_token');
            return false;
        }
    },

    async apiRequest(endpoint, method = 'GET', accessToken, body = null) {
        try {
            const response = await fetch(`${this.config.apiEndpoint}${endpoint}`, {
                method,
                headers: { Authorization: `Bearer ${accessToken}` },
                body
            });
            if (response.status === 401) {
                if (await this.refreshAccessToken()) {
                    return this.apiRequest(endpoint, method, localStorage.getItem('spotify_access_token'), body);
                }
                return null;
            }
            return await response.json();
        } catch (e) {
            MenuPlugin.showError(`API error at ${endpoint}: ${e.message}`);
            return null;
        }
    },

    async fetchPlaylists(accessToken) {
        const data = await this.apiRequest('/me/playlists', 'GET', accessToken);
        if (data?.items) {
            const playlistSelect = document.getElementById('spotifyPlaylist');
            playlistSelect.innerHTML = '<option value="">Select a playlist</option>';
            data.items.forEach(playlist => {
                const option = document.createElement('option');
                option.value = playlist.id;
                option.textContent = playlist.name;
                playlistSelect.appendChild(option);
            });
            playlistSelect.onchange = () => MenuPlugin.loadSpotifyPlaylist(playlistSelect.value);
        }
    },

    async updatePlayerState(accessToken) {
        const data = await this.apiRequest('/me/player', 'GET', accessToken);
        if (data?.item) {
            const trackInfo = document.getElementById('trackInfo');
            trackInfo.textContent = `Now Playing: ${data.item.name} by ${data.item.artists[0].name}`;
            document.getElementById('playPause').textContent = data.is_playing ? 'Pause' : 'Play';
            document.getElementById('shuffle').textContent = `Shuffle: ${data.shuffle_state ? 'On' : 'Off'}`;
            document.getElementById('repeat').textContent = `Repeat: ${data.repeat_state === 'off' ? 'Off' : 'On'}`;
        }
    }
};

// Main Menu Plugin
const MenuPlugin = {
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        document.querySelector('.menu')?.prepend(errorDiv);
        setTimeout(() => errorDiv.remove(), 5000);
    },

    init() {
        if (!SpotifyService.config.clientId) {
            this.showError('Spotify Client ID not configured');
            return;
        }

        // Create меню
        const menu = document.createElement('div');
        menu.id = 'menu';
        menu.className = 'menu';
        menu.setAttribute('role', 'dialog');
        menu.setAttribute('aria-labelledby', 'menu-title');
        menu.innerHTML = `
            <h2 id="menu-title">Settings</h2>
            <button id="toggleMenu" aria-label="Toggle settings menu">Toggle Menu</button>
            <label for="volume">Volume:</label>
            <input type="range" id="volume" min="0" max="100" value="50" aria-label="Volume control">
            <label for="spotifyToggle">Spotify Player:</label>
            <select id="spotifyToggle" aria-label="Spotify player toggle">
                <option value="off">Off</option>
                <option value="on">On</option>
            </select>
            <button id="connectSpotify" aria-label="Connect to Spotify">Connect Spotify</button>
            <label for="spotifyPlaylist">Your Playlists:</label>
            <select id="spotifyPlaylist" aria-label="Spotify playlist selector">
                <option value="">Select a playlist</option>
            </select>
            <div id="spotifyPlayer" style="display: none;">
                <iframe id="spotifyIframe" src="" width="100%" height="80" frameborder="0" 
                        allowtransparency="true" allow="encrypted-media" title="Spotify Player"></iframe>
                <div id="playerControls" class="player-controls">
                    <button id="playPause" aria-label="Play or pause track">Play</button>
                    <button id="nextTrack" aria-label="Next track">Next</button>
                    <button id="prevTrack" aria-label="Previous track">Previous</button>
                    <button id="shuffle" aria-label="Toggle shuffle">Shuffle: Off</button>
                    <button id="repeat" aria-label="Toggle repeat">Repeat: Off</button>
                </div>
                <div id="trackInfo" aria-live="polite"></div>
            </div>
            <label for="theme">Theme:</label>
            <select id="theme" aria-label="Theme selector">
                <option value="light">Light</option>
                <option value="dark">Dark</option>
            </select>
            <label for="fontSize">Font Size (px):</label>
            <input type="number" id="fontSize" min="12" max="24" value="16" aria-label="Font size">
            <button id="applySettings" aria-label="Apply settings">Apply Settings</button>
        `;
        document.body.appendChild(menu);

        // Inject styles (unchanged for brevity)
        const style = document.createElement('style');
        style.textContent = `/* Same styles as original */`;
        document.head.appendChild(style);

        // Event listeners
        menu.querySelector('#toggleMenu').addEventListener('click', () => menu.classList.toggle('show'));
        menu.querySelector('#connectSpotify').addEventListener('click', () => SpotifyService.connect());
        menu.querySelector('#applySettings').addEventListener('click', () => this.applySettings());
        menu.querySelector('#playPause').addEventListener('click', () => this.togglePlayPause());
        menu.querySelector('#nextTrack').addEventListener('click', () => this.nextTrack());
        menu.querySelector('#prevTrack').addEventListener('click', () => this.previousTrack());
        menu.querySelector('#shuffle').addEventListener('click', () => this.toggleShuffle());
        menu.querySelector('#repeat').addEventListener('click', () => this.toggleRepeat());
        document.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'x') menu.classList.toggle('show');
        });

        // Check Spotify authentication
        const token = localStorage.getItem('spotify_access_token');
        const expiresAt = localStorage.getItem('spotify_token_expires_at');
        if (token && expiresAt && Date.now() < parseInt(expiresAt)) {
            SpotifyService.fetchPlaylists(token);
            SpotifyService.updatePlayerState(token);
        } else if (token) {
            SpotifyService.refreshAccessToken().then(success => {
                if (success) {
                    SpotifyService.fetchPlaylists(localStorage.getItem('spotify_access_token'));
                    SpotifyService.updatePlayerState(localStorage.getItem('spotify_access_token'));
                }
            });
        }

        SpotifyService.handleOAuthCallback();
    },

    async loadSpotifyPlaylist(playlistId) {
        if (!playlistId) return;
        const spotifyIframe = document.getElementById('spotifyIframe');
        spotifyIframe.src = `https://open.spotify.com/embed/playlist/${playlistId}?theme=0`;
        document.getElementById('spotifyPlayer').style.display = 'block';
        document.getElementById('spotifyToggle').value = 'on';
        const accessToken = localStorage.getItem('spotify_access_token');
        if (accessToken) {
            SpotifyService.updatePlayerState(accessToken);
        }
    },

    async togglePlayPause() {
        const accessToken = localStorage.getItem('spotify_access_token');
        if (!accessToken) {
            this.showError('Please connect to Spotify first.');
            return;
        }
        const data = await SpotifyService.apiRequest('/me/player', 'GET', accessToken);
        if (data) {
            const isPlaying = data.is_playing;
            await SpotifyService.apiRequest(`/me/player/${isPlaying ? 'pause' : 'play'}`, 'PUT', accessToken);
            document.getElementById('playPause').textContent = isPlaying ? 'Play' : 'Pause';
            SpotifyService.updatePlayerState(accessToken);
        }
    },

    async nextTrack() {
        const accessToken = localStorage.getItem('spotify_access_token');
        if (!accessToken) {
            this.showError('Please connect to Spotify first.');
            return;
        }
        await SpotifyService.apiRequest('/me/player/next', 'POST', accessToken);
        SpotifyService.updatePlayerState(accessToken);
    },

    async previousTrack() {
        const accessToken = localStorage.getItem('spotify_access_token');
        if (!accessToken) {
            this.showError('Please connect to Spotify first.');
            return;
        }
        await SpotifyService.apiRequest('/me/player/previous', 'POST', accessToken);
        SpotifyService.updatePlayerState(accessToken);
    },

    async toggleShuffle() {
        const accessToken = localStorage.getItem('spotify_access_token');
        if (!accessToken) {
            this.showError('Please connect to Spotify first.');
            return;
        }
        const data = await SpotifyService.apiRequest('/me/player', 'GET', accessToken);
        if (data) {
            const shuffleState = !data.shuffle_state;
            await SpotifyService.apiRequest(`/me/player/shuffle?state=${shuffleState}`, 'PUT', accessToken);
            document.getElementById('shuffle').textContent = `Shuffle: ${shuffleState ? 'On' : 'Off'}`;
        }
    },

    async toggleRepeat() {
        const accessToken = localStorage.getItem('spotify_access_token');
        if (!accessToken) {
            this.showError('Please connect to Spotify first.');
            return;
        }
        const data = await SpotifyService.apiRequest('/me/player', 'GET', accessToken);
        if (data) {
            const currentState = data.repeat_state;
            const newState = currentState === 'off' ? 'context' : 'off';
            await SpotifyService.apiRequest(`/me/player/repeat?state=${newState}`, 'PUT', accessToken);
            document.getElementById('repeat').textContent = `Repeat: ${newState === 'context' ? 'On' : 'Off'}`;
        }
    },

    applySettings() {
        const volume = document.getElementById('volume').value;
        const spotifyToggle = document.getElementById('spotifyToggle').value;
        const theme = document.getElementById('theme').value;
        const fontSize = document.getElementById('fontSize').value;

        document.querySelectorAll('audio, video').forEach(el => {
            el.volume = volume / 100;
        });

        document.getElementById('spotifyPlayer').style.display = spotifyToggle === 'on' ? 'block' : 'none';
        document.body.className = theme === 'dark' ? 'theme-dark' : '';
        document.body.style.fontSize = `${fontSize}px`;

        localStorage.setItem('settings', JSON.stringify({
            volume,
            spotifyToggle,
            theme,
            fontSize
        }));
    },

    loadSavedSettings() {
        const saved = localStorage.getItem('settings');
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                if (
                    typeof settings.volume === 'string' &&
                    typeof settings.spotifyToggle === 'string' &&
                    typeof settings.theme === 'string' &&
                    typeof settings.fontSize === 'string'
                ) {
                    document.getElementById('volume').value = settings.volume;
                    document.getElementById('spotifyToggle').value = settings.spotifyToggle;
                    document.getElementById('theme').value = settings.theme;
                    document.getElementById('fontSize').value = settings.fontSize;
                    this.applySettings();
                }
            } catch (e) {
                console.error('Invalid settings in localStorage:', e);
            }
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    MenuPlugin.init();
    MenuPlugin.loadSavedSettings();
});
