/* ============================================
   FinFlow — Personal Finance App
   Full Application Logic
   ============================================ */

(function () {
    'use strict';

    // Stub for lucide.createIcons to prevent errors when external CDN script is removed
    window.lucide = {
        createIcons: () => {}
    };

    // ===== CONFIG =====
    const API = 'api';
    let currentUser = null;
    let authConfig = { google_client_id: '', facebook_app_id: '' };
    let currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

    const MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    const SAVINGS_ICONS = ['target','piggy-bank','wallet','coins','trophy','plane','home','car','laptop','smartphone','gift','heart'];
    const SAVINGS_COLORS = ['#818cf8','#34d399','#fbbf24','#ff6b6b','#f472b6','#38bdf8','#a78bfa','#fb923c'];

    let csrfToken = null;
    let vapidPublicKey = null;

    // ===== API CLIENT =====
    async function api(endpoint, options = {}) {
        try {
            const method = (options.method || 'GET').toUpperCase();
            const headers = { 'Content-Type': 'application/json', ...options.headers };
            
            // Attach CSRF Token for state-changing methods if available
            if (['POST', 'PUT', 'DELETE'].includes(method) && csrfToken) {
                headers['X-CSRF-Token'] = csrfToken;
            }

            const res = await fetch(`${API}/${endpoint}`, {
                ...options,
                headers,
                credentials: 'include',
            });
            const data = await res.json();
            
            // Capture CSRF Token if returned by the API
            if (data && data.csrf_token) {
                csrfToken = data.csrf_token;
            }

            if (!res.ok) {
                const err = new Error(data.error || 'Request failed');
                // Pass through verification data for OTP flow
                if (data.needs_verification) {
                    err.needs_verification = true;
                    err.email = data.email;
                    err.message = data.message || data.error;
                }
                if (data.wait) err.wait = data.wait;
                throw err;
            }
            return data;
        } catch (err) {
            if (err.message && err.message.includes('Unauthorized')) {
                showAuth();
            }
            throw err;
        }
    }

    // ===== UTILITIES =====
    
    function parseRupiah(str) {
        if (!str) return 0;
        return parseInt(str.toString().replace(/[^0-9]/g, '')) || 0;
    }

    function initRupiahFormatter(inputId) {
        const input = document.getElementById(inputId);
        if (!input) return;
        
        function formatValue() {
            let val = input.value.replace(/[^0-9]/g, '');
            if (val === '' || val === '0') { input.value = ''; return; }
            input.value = 'Rp ' + parseInt(val).toLocaleString('id-ID');
        }
        
        // Format existing value immediately if present
        if (input.value && input.value.trim() !== '') {
            formatValue();
        }
        
        input.addEventListener('input', formatValue);
    }

    function formatRp(amount, short = false) {
        const abs = Math.abs(Number(amount));
        if (short && abs >= 1000000) return 'Rp ' + (abs / 1000000).toFixed(1) + ' Jt';
        if (short && abs >= 1000) return 'Rp ' + (abs / 1000).toFixed(0) + ' Rb';
        return 'Rp ' + abs.toLocaleString('id-ID');
    }

    function escapeHTML(str) {
        if (!str) return '';
        return str.replace(/[&<>"']/g, function(m) {
            switch (m) {
                case '&': return '&amp;';
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '"': return '&quot;';
                case "'": return '&#039;';
                default: return m;
            }
        });
    }

    // Safely resolve a Lucide icon name, falling back to 'box' for missing/emoji values
    function safeIcon(name) {
        if (!name || name.length < 3) return 'box';
        return name;
    }

        const LUCIDE_SVGs = {
        // ponytail: minimal SVG set, emoji fallback handles the rest
        'box': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>',
        'eye': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z"/><circle cx="12" cy="12" r="3"/></svg>',
        'eye-off': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>',
        'home': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
        'wallet': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>',
'banknote': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>',
'tag': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12.586 3h1.172a2 2 0 0 1 1.414.586l6.242 6.242a2 2 0 0 1 0 2.828l-6.242 6.242a2 2 0 0 1-2.828 0L6.002 12.65a2 2 0 0 1-.586-1.414V10.06a8 8 0 0 1 8-8z"/><circle cx="10" cy="10" r="1"/></svg>',
'plus-circle': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>',
'trash-2': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
'calendar': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>',
'help-circle': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>',
'file-text': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>',
'flag': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>',
'trending-up': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M16 7h6v6"/><path d="m22 7-8.5 8.5-5-5L2 17"/></svg>',
'piggy-bank': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M19 5c-1.5 0-2.8 1.4-3 2-1-.6-2.5-.5-3-1l-1.5 1.5c.5.5.4 2 .9 3-.6.2-2 1.5-2 3"/><path d="M9 19c-.5 0-1-.5-1-1v-2c0-.5.5-1 1-1h2v3Z"/><path d="M15 19c-.5 0-1-.5-1-1v-2c0-.5.5-1 1-1h2v3Z"/><path d="M20 9v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V9a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4Z"/><path d="M6 10h.01"/></svg>',
'target': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
'trophy': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34"/><path d="M12 2a6 6 0 0 1 6 6v3a6 6 0 0 1-6 6 6 6 0 0 1-6-6V8a6 6 0 0 1 6-6z"/></svg>',
'heart': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>',
'gift': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 7v14"/><path d="M20 11v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8"/><path d="M7.5 7a1 1 0 0 1 0-5A4.8 8 0 0 1 12 7a4.8 8 0 0 1 4.5-5 1 1 0 0 1 0 5"/><rect x="3" y="7" width="18" height="4" rx="1"/></svg>',
'key': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/><path d="m21 2-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/></svg>',
'wifi': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 20h.01"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.859a10 10 0 0 1 14 0"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/></svg>',
'zap': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>',
'coins': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13.744 17.736a6 6 0 1 1-7.48-7.48"/><path d="M15 6h1v4"/><path d="m6.134 14.768.866-.5 2 3.464"/><circle cx="16" cy="8" r="6"/></svg>',
'plane': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>',
'car': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>',
'house': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
'laptop': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 5a2 2 0 0 1 2 2v8.526a2 2 0 0 0 .212.897l1.068 2.127a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45l1.068-2.127A2 2 0 0 0 4 15.526V7a2 2 0 0 1 2-2z"/><path d="M20.054 15.987H3.946"/></svg>',
'smartphone': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>'
    };
    LUCIDE_SVGs['home'] = LUCIDE_SVGs['house'];
    LUCIDE_SVGs['💧'] = LUCIDE_SVGs['droplets'];
    LUCIDE_SVGs['📶'] = LUCIDE_SVGs['wifi'];
    LUCIDE_SVGs['🔑'] = LUCIDE_SVGs['key'];
    LUCIDE_SVGs['🗑️'] = LUCIDE_SVGs['trash-2'];
    LUCIDE_SVGs['🔧'] = LUCIDE_SVGs['wrench'];
    LUCIDE_SVGs['🔨'] = LUCIDE_SVGs['hammer'];
    LUCIDE_SVGs['👶'] = LUCIDE_SVGs['baby'];
    LUCIDE_SVGs['📖'] = LUCIDE_SVGs['book-open'];
    LUCIDE_SVGs['🖊️'] = LUCIDE_SVGs['pen-tool'];
    LUCIDE_SVGs['📚'] = LUCIDE_SVGs['book'];
    LUCIDE_SVGs['👕'] = LUCIDE_SVGs['shirt'];
    LUCIDE_SVGs['🧩'] = LUCIDE_SVGs['toy-brick'];
    LUCIDE_SVGs['🩺'] = LUCIDE_SVGs['stethoscope'];
    LUCIDE_SVGs['🍳'] = LUCIDE_SVGs['utensils-crossed'];
    LUCIDE_SVGs['🥕'] = LUCIDE_SVGs['carrot'];
    LUCIDE_SVGs['🍗'] = LUCIDE_SVGs['drumstick'];
    LUCIDE_SVGs['🔥'] = LUCIDE_SVGs['flame'];
    LUCIDE_SVGs['🌾'] = LUCIDE_SVGs['wheat'];
    LUCIDE_SVGs['🥤'] = LUCIDE_SVGs['cup-soda'];
    LUCIDE_SVGs['🚗'] = LUCIDE_SVGs['car'];
    LUCIDE_SVGs['⛽'] = LUCIDE_SVGs['fuel'];
    LUCIDE_SVGs['🅿️'] = LUCIDE_SVGs['circle-parking'];
    LUCIDE_SVGs['🧭'] = LUCIDE_SVGs['navigation'];
    LUCIDE_SVGs['🚌'] = LUCIDE_SVGs['bus'];
    LUCIDE_SVGs['🍕'] = LUCIDE_SVGs['pizza'];
    LUCIDE_SVGs['☕'] = LUCIDE_SVGs['coffee'];
    LUCIDE_SVGs['🍜'] = LUCIDE_SVGs['soup'];
    LUCIDE_SVGs['🍽️'] = LUCIDE_SVGs['utensils'];
    LUCIDE_SVGs['🥛'] = LUCIDE_SVGs['glass-water'];
    LUCIDE_SVGs['🍪'] = LUCIDE_SVGs['cookie'];
    LUCIDE_SVGs['🔬'] = LUCIDE_SVGs['activity'];
    LUCIDE_SVGs['🩺'] = LUCIDE_SVGs['stethoscope'];
    LUCIDE_SVGs['🩺'] = LUCIDE_SVGs['stethoscope'];
    LUCIDE_SVGs['🏥'] = LUCIDE_SVGs['hospital'];
    LUCIDE_SVGs['💊'] = LUCIDE_SVGs['pill'];
    LUCIDE_SVGs['💖'] = LUCIDE_SVGs['heart-pulse'];
    LUCIDE_SVGs['🏛️'] = LUCIDE_SVGs['landmark'];
    LUCIDE_SVGs['🏋️'] = LUCIDE_SVGs['dumbbell'];
    LUCIDE_SVGs['🎉'] = LUCIDE_SVGs['party-popper'];
    LUCIDE_SVGs['🎬'] = LUCIDE_SVGs['film'];
    LUCIDE_SVGs['📺'] = LUCIDE_SVGs['tv'];
    LUCIDE_SVGs['🎮'] = LUCIDE_SVGs['gamepad-2'];
    LUCIDE_SVGs['✈️'] = LUCIDE_SVGs['plane'];
    LUCIDE_SVGs['🎨'] = LUCIDE_SVGs['palette'];
    LUCIDE_SVGs['👣'] = LUCIDE_SVGs['footprints'];
    LUCIDE_SVGs['⌚'] = LUCIDE_SVGs['watch'];
    LUCIDE_SVGs['🧺'] = LUCIDE_SVGs['washing-machine'];
    LUCIDE_SVGs['📦'] = LUCIDE_SVGs['box'];
    LUCIDE_SVGs['🤲'] = LUCIDE_SVGs['heart-handshake'];
    LUCIDE_SVGs['🎁'] = LUCIDE_SVGs['gift'];
    LUCIDE_SVGs['❓'] = LUCIDE_SVGs['help-circle'];
    LUCIDE_SVGs['💵'] = LUCIDE_SVGs['coins'];
    LUCIDE_SVGs['💰'] = LUCIDE_SVGs['wallet'];
    LUCIDE_SVGs['🕌'] = LUCIDE_SVGs['coins'];
    LUCIDE_SVGs['💻'] = LUCIDE_SVGs['laptop'];
    LUCIDE_SVGs['📈'] = LUCIDE_SVGs['trending-up'];
    LUCIDE_SVGs['🍔'] = LUCIDE_SVGs['utensils'];
    LUCIDE_SVGs['🛍️'] = LUCIDE_SVGs['box'];
    LUCIDE_SVGs['🎓'] = LUCIDE_SVGs['book-open'];
    LUCIDE_SVGs['💼'] = LUCIDE_SVGs['wallet'];

    // Additional category emojis mapped to corresponding SVGs
    LUCIDE_SVGs['👔'] = LUCIDE_SVGs['shirt'];
    LUCIDE_SVGs['🧹'] = LUCIDE_SVGs['trash-2'];
    LUCIDE_SVGs['📡'] = LUCIDE_SVGs['wifi'];
    LUCIDE_SVGs['⚡'] = LUCIDE_SVGs['zap'];
    LUCIDE_SVGs['✏️'] = LUCIDE_SVGs['pen-tool'];
    LUCIDE_SVGs['🍩'] = LUCIDE_SVGs['cookie'];
    LUCIDE_SVGs['🍿'] = LUCIDE_SVGs['pizza'];
    LUCIDE_SVGs['🥩'] = LUCIDE_SVGs['drumstick'];
    LUCIDE_SVGs['🌶️'] = LUCIDE_SVGs['flame'];
    LUCIDE_SVGs['🍚'] = LUCIDE_SVGs['wheat'];
    LUCIDE_SVGs['🧃'] = LUCIDE_SVGs['cup-soda'];
    LUCIDE_SVGs['🪣'] = LUCIDE_SVGs['hammer'];
    LUCIDE_SVGs['🥬'] = LUCIDE_SVGs['carrot'];
    LUCIDE_SVGs['🍼'] = LUCIDE_SVGs['baby'];
    LUCIDE_SVGs['🧸'] = LUCIDE_SVGs['toy-brick'];
    LUCIDE_SVGs['🧋'] = LUCIDE_SVGs['glass-water'];
    LUCIDE_SVGs['💪'] = LUCIDE_SVGs['activity'];
    LUCIDE_SVGs['🛵'] = LUCIDE_SVGs['navigation'];
    LUCIDE_SVGs['👟'] = LUCIDE_SVGs['footprints'];

    LUCIDE_SVGs['Listrik'] = LUCIDE_SVGs['zap'];
    LUCIDE_SVGs['Air (PDAM)'] = LUCIDE_SVGs['droplets'];
    LUCIDE_SVGs['Internet'] = LUCIDE_SVGs['wifi'];
    LUCIDE_SVGs['Sewa/Cicilan'] = LUCIDE_SVGs['key'];
    LUCIDE_SVGs['Kebersihan'] = LUCIDE_SVGs['trash-2'];
    LUCIDE_SVGs['Perbaikan'] = LUCIDE_SVGs['wrench'];
    LUCIDE_SVGs['Servis Kendaraan'] = LUCIDE_SVGs['wrench'];
    LUCIDE_SVGs['Peralatan RT'] = LUCIDE_SVGs['hammer'];
    LUCIDE_SVGs['Anak'] = LUCIDE_SVGs['baby'];
    LUCIDE_SVGs['Susu/Makanan Bayi'] = LUCIDE_SVGs['baby'];
    LUCIDE_SVGs['Sekolah/SPP'] = LUCIDE_SVGs['book-open'];
    LUCIDE_SVGs['Les/Kursus'] = LUCIDE_SVGs['pen-tool'];
    LUCIDE_SVGs['Buku/Alat Tulis'] = LUCIDE_SVGs['book'];
    LUCIDE_SVGs['Pakaian Anak'] = LUCIDE_SVGs['shirt'];
    LUCIDE_SVGs['Pakaian'] = LUCIDE_SVGs['shirt'];
    LUCIDE_SVGs['Baju'] = LUCIDE_SVGs['shirt'];
    LUCIDE_SVGs['Mainan'] = LUCIDE_SVGs['toy-brick'];
    LUCIDE_SVGs['Kesehatan Anak'] = LUCIDE_SVGs['stethoscope'];
    LUCIDE_SVGs['Dapur'] = LUCIDE_SVGs['utensils-crossed'];
    LUCIDE_SVGs['Belanja Sayur/Buah'] = LUCIDE_SVGs['carrot'];
    LUCIDE_SVGs['Daging/Ikan'] = LUCIDE_SVGs['drumstick'];
    LUCIDE_SVGs['beef'] = LUCIDE_SVGs['drumstick'];
    LUCIDE_SVGs['Bumbu/Rempah'] = LUCIDE_SVGs['flame'];
    LUCIDE_SVGs['Gas/LPG'] = LUCIDE_SVGs['flame'];
    LUCIDE_SVGs['Beras/Minyak'] = LUCIDE_SVGs['wheat'];
    LUCIDE_SVGs['Snack/Minuman'] = LUCIDE_SVGs['cup-soda'];
    LUCIDE_SVGs['Transport'] = LUCIDE_SVGs['car'];
    LUCIDE_SVGs['Bensin/BBM'] = LUCIDE_SVGs['fuel'];
    LUCIDE_SVGs['Parkir/Tol'] = LUCIDE_SVGs['circle-parking'];
    LUCIDE_SVGs['parking-circle'] = LUCIDE_SVGs['circle-parking'];
    LUCIDE_SVGs['Ojol/Taksi'] = LUCIDE_SVGs['navigation'];
    LUCIDE_SVGs['Angkutan Umum'] = LUCIDE_SVGs['bus'];
    LUCIDE_SVGs['Jajan'] = LUCIDE_SVGs['pizza'];
    LUCIDE_SVGs['Kopi/Cafe'] = LUCIDE_SVGs['coffee'];
    LUCIDE_SVGs['Street Food'] = LUCIDE_SVGs['soup'];
    LUCIDE_SVGs['Restaurant'] = LUCIDE_SVGs['utensils'];
    LUCIDE_SVGs['Boba/Minuman'] = LUCIDE_SVGs['glass-water'];
    LUCIDE_SVGs['Snack'] = LUCIDE_SVGs['cookie'];
    LUCIDE_SVGs['Kesehatan'] = LUCIDE_SVGs['heart-pulse'];
    LUCIDE_SVGs['Dokter/RS'] = LUCIDE_SVGs['hospital'];
    LUCIDE_SVGs['Obat-obatan'] = LUCIDE_SVGs['pill'];
    LUCIDE_SVGs['Vitamin/Suplemen'] = LUCIDE_SVGs['activity'];
    LUCIDE_SVGs['BPJS'] = LUCIDE_SVGs['landmark'];
    LUCIDE_SVGs['Gym/Fitness'] = LUCIDE_SVGs['dumbbell'];
    LUCIDE_SVGs['Hiburan'] = LUCIDE_SVGs['party-popper'];
    LUCIDE_SVGs['Film/Bioskop'] = LUCIDE_SVGs['film'];
    LUCIDE_SVGs['Streaming'] = LUCIDE_SVGs['tv'];
    LUCIDE_SVGs['Game'] = LUCIDE_SVGs['gamepad-2'];
    LUCIDE_SVGs['Liburan/Wisata'] = LUCIDE_SVGs['plane'];
    LUCIDE_SVGs['Hobi'] = LUCIDE_SVGs['palette'];
    LUCIDE_SVGs['Sepatu'] = LUCIDE_SVGs['footprints'];
    LUCIDE_SVGs['Aksesoris'] = LUCIDE_SVGs['watch'];
    LUCIDE_SVGs['Laundry'] = LUCIDE_SVGs['washing-machine'];
    LUCIDE_SVGs['Lainnya'] = LUCIDE_SVGs['box'];
    LUCIDE_SVGs['Sedekah/Donasi'] = LUCIDE_SVGs['heart-handshake'];
    LUCIDE_SVGs['Hadiah'] = LUCIDE_SVGs['gift'];
    LUCIDE_SVGs['Bonus'] = LUCIDE_SVGs['gift'];
    LUCIDE_SVGs['Tak Terduga'] = LUCIDE_SVGs['help-circle'];
    LUCIDE_SVGs['circle-question-mark'] = LUCIDE_SVGs['help-circle'];
    LUCIDE_SVGs['circle-question'] = LUCIDE_SVGs['help-circle'];
    LUCIDE_SVGs['Gaji'] = LUCIDE_SVGs['wallet'];
    LUCIDE_SVGs['THR'] = LUCIDE_SVGs['coins'];
    LUCIDE_SVGs['Freelance'] = LUCIDE_SVGs['laptop'];
    LUCIDE_SVGs['Investasi'] = LUCIDE_SVGs['trending-up'];
    LUCIDE_SVGs['document'] = LUCIDE_SVGs['file-text'];
    LUCIDE_SVGs['eye-crossed'] = LUCIDE_SVGs['eye-off'];

    // Render either an emoji character or an inline Lucide SVG depending on the value
    function renderEmojiOrIcon(emojiOrIcon, size = '16px', color = '', extraStyles = '') {
        if (!emojiOrIcon) {
            emojiOrIcon = 'box';
        }
        
        // Check if we have an SVG for this icon name or category
        let svg = LUCIDE_SVGs[emojiOrIcon];
        if (svg) {
            // Replace width and height attributes
            svg = svg.replace(/width="24"/, `width="${size}"`);
            svg = svg.replace(/height="24"/, `height="${size}"`);
            // Inject color and styling directly to the SVG
            const styleAttr = `style="color:${color || 'currentColor'}; min-width:${size}; min-height:${size}; ${extraStyles}"`;
            svg = svg.replace(/<svg/, `<svg ${styleAttr}`);
            return svg;
        }

        // If it looks like a general icon name that we don't have, fall back to a box icon SVG
        if (/^[a-z0-9\-]{3,}$/.test(emojiOrIcon)) {
            let fallbackSvg = LUCIDE_SVGs['box'];
            fallbackSvg = fallbackSvg.replace(/width="24"/, `width="${size}"`);
            fallbackSvg = fallbackSvg.replace(/height="24"/, `height="${size}"`);
            const styleAttr = `style="color:${color || 'currentColor'}; min-width:${size}; min-height:${size}; ${extraStyles}"`;
            return fallbackSvg.replace(/<svg/, `<svg ${styleAttr}`);
        }

        // Otherwise treat it as a raw emoji character
        return `<span class="icon-emoji" style="font-size:${size}; line-height:1; display:inline-flex; align-items:center; justify-content:center; width:${size}; height:${size}; ${extraStyles}">${emojiOrIcon}</span>`;
    }

    function getGreeting() {
        const h = new Date().getHours();
        if (h < 11) return 'Selamat Pagi';
        if (h < 15) return 'Selamat Siang';
        if (h < 18) return 'Selamat Sore';
        return 'Selamat Malam';
    }

    function showToast(msg) {
        const t = document.getElementById('toast');
        document.getElementById('toastMessage').textContent = msg;
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 2500);
    }

    function formatMonthLabel(ym) {
        const [y, m] = ym.split('-');
        return MONTHS_ID[parseInt(m) - 1] + ' ' + y;
    }

    function formatDate(dateStr) {
        const d = new Date(dateStr + 'T00:00:00');
        const today = new Date(); today.setHours(0,0,0,0);
        const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
        if (d.getTime() === today.getTime()) return 'Hari Ini';
        if (d.getTime() === yesterday.getTime()) return 'Kemarin';
        return d.getDate() + ' ' + MONTHS_ID[d.getMonth()];
    }

    // ===== AUTH =====
    function showAuth() {
        document.getElementById('authScreen').classList.add('active');
        document.getElementById('mainApp').classList.remove('active');
        // Reset to login form, hide all other forms
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const otpScreen = document.getElementById('otpScreen');
        const forgotForm = document.getElementById('forgotPasswordForm');
        const resetForm = document.getElementById('resetPasswordForm');
        if (loginForm) loginForm.classList.add('active');
        if (registerForm) registerForm.classList.remove('active');
        if (otpScreen) otpScreen.classList.remove('active');
        if (forgotForm) forgotForm.classList.remove('active');
        if (resetForm) resetForm.classList.remove('active');
        currentUser = null;
        
        // Pre-fill saved email
        const savedEmail = localStorage.getItem('selaraskas_last_email');
        if (savedEmail) {
            const emailInput = document.getElementById('loginEmail');
            if (emailInput) emailInput.value = savedEmail;
        }
        
        // Check biometric availability
        checkBiometricAvailability();
    }

    async function showApp(user) {
        currentUser = user;
        document.getElementById('authScreen').classList.remove('active');
        document.getElementById('mainApp').classList.add('active');
        
        updateUserUI();
        
        applyTheme(user.theme || 'dark');

        await loadWallets();
        loadDashboard();
        setTimeout(() => lucide.createIcons(), 50);
    }

    function updateUserUI() {
        if (!currentUser) return;
        
        const homeAvatarInitial = document.getElementById('avatarInitial');
        if (homeAvatarInitial) homeAvatarInitial.textContent = currentUser.avatar_initial || 'U';
        
        const userNameEl = document.getElementById('userName');
        if (userNameEl) userNameEl.textContent = currentUser.name;
        
        const greetingTextEl = document.getElementById('greetingText');
        if (greetingTextEl) greetingTextEl.textContent = getGreeting();
        
        const homeAvatarEl = document.getElementById('avatar');
        if (homeAvatarEl) {
            if (currentUser.avatar_url) {
                let imgUrl = currentUser.avatar_url;
                if (!imgUrl.startsWith('data:')) {
                    imgUrl = `${API}/../${imgUrl}`;
                }
                homeAvatarEl.style.backgroundImage = `url("${imgUrl}")`;
                homeAvatarEl.style.backgroundSize = 'cover';
                homeAvatarEl.style.backgroundPosition = 'center';
                if (homeAvatarInitial) homeAvatarInitial.style.display = 'none';
            } else {
                homeAvatarEl.style.backgroundImage = 'none';
                if (homeAvatarInitial) homeAvatarInitial.style.display = 'inline-block';
            }
        }

        const profileNameEl = document.getElementById('profileName');
        if (profileNameEl) profileNameEl.textContent = currentUser.name;
        
        const profileEmailEl = document.getElementById('profileEmail');
        if (profileEmailEl) profileEmailEl.textContent = currentUser.email;

        const profileAvatarEl = document.querySelector('.profile-avatar');
        const profileInitialEl = document.getElementById('profileInitial');
        if (profileAvatarEl) {
            if (currentUser.avatar_url) {
                let imgUrl = currentUser.avatar_url;
                if (!imgUrl.startsWith('data:')) {
                    imgUrl = `${API}/../${imgUrl}`;
                }
                profileAvatarEl.style.backgroundImage = `url("${imgUrl}")`;
                profileAvatarEl.style.backgroundSize = 'cover';
                profileAvatarEl.style.backgroundPosition = 'center';
                if (profileInitialEl) profileInitialEl.style.display = 'none';
            } else {
                profileAvatarEl.style.backgroundImage = 'none';
                if (profileInitialEl) {
                    profileInitialEl.style.display = 'inline-block';
                    profileInitialEl.textContent = currentUser.avatar_initial || 'U';
                }
            }
        }
    }

    function initAuth() {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const otpScreen = document.getElementById('otpScreen');
        const authError = document.getElementById('authError');
        let pendingEmail = '';
        let resendCountdown = null;

        function showOtpScreen(email) {
            pendingEmail = email;
            loginForm.classList.remove('active');
            registerForm.classList.remove('active');
            otpScreen.classList.add('active');
            authError.textContent = '';
            document.getElementById('otpEmailDisplay').textContent = email;
            document.getElementById('otpError').textContent = '';
            // Clear OTP inputs
            document.querySelectorAll('#otpInputs .otp-digit').forEach(inp => {
                inp.value = '';
                inp.classList.remove('filled', 'error');
            });
            document.querySelector('#otpInputs .otp-digit[data-index="0"]').focus();
            startResendCountdown(60);
        }

        function startResendCountdown(seconds) {
            const btn = document.getElementById('otpResendBtn');
            const countdown = document.getElementById('otpCountdown');
            btn.disabled = true;
            let remaining = seconds;
            countdown.textContent = `(${remaining}s)`;
            if (resendCountdown) clearInterval(resendCountdown);
            resendCountdown = setInterval(() => {
                remaining--;
                countdown.textContent = `(${remaining}s)`;
                if (remaining <= 0) {
                    clearInterval(resendCountdown);
                    btn.disabled = false;
                    countdown.textContent = '';
                }
            }, 1000);
        }

        // OTP input logic
        const otpInputs = document.querySelectorAll('#otpInputs .otp-digit');
        otpInputs.forEach((input, idx) => {
            input.addEventListener('input', (e) => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                e.target.value = val ? val[val.length - 1] : '';
                if (val) {
                    e.target.classList.add('filled');
                    e.target.classList.remove('error');
                    if (idx < 5) otpInputs[idx + 1].focus();
                } else {
                    e.target.classList.remove('filled');
                }
            });
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && idx > 0) {
                    otpInputs[idx - 1].focus();
                    otpInputs[idx - 1].value = '';
                    otpInputs[idx - 1].classList.remove('filled');
                }
                if (e.key === 'Enter') {
                    document.getElementById('otpVerifyBtn').click();
                }
            });
            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const pasted = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
                if (pasted.length === 6) {
                    pasted.split('').forEach((d, i) => {
                        otpInputs[i].value = d;
                        otpInputs[i].classList.add('filled');
                    });
                    otpInputs[5].focus();
                }
            });
        });

        // Verify OTP
        document.getElementById('otpVerifyBtn').addEventListener('click', async () => {
            const code = Array.from(otpInputs).map(i => i.value).join('');
            const otpError = document.getElementById('otpError');
            otpError.textContent = '';

            if (code.length !== 6) {
                otpError.textContent = 'Masukkan 6 digit kode verifikasi';
                otpInputs.forEach(i => i.classList.add('error'));
                return;
            }

            const btn = document.getElementById('otpVerifyBtn');
            btn.disabled = true;
            btn.querySelector('span').textContent = 'Memverifikasi...';

            try {
                const data = await api('auth.php?action=verify_email', {
                    method: 'POST',
                    body: JSON.stringify({ email: pendingEmail, code }),
                });
                showApp(data.user);
                showToast('Email berhasil diverifikasi! 🎉');
            } catch (err) {
                otpError.textContent = err.message;
                otpInputs.forEach(i => i.classList.add('error'));
                // Clear inputs for retry
                setTimeout(() => {
                    otpInputs.forEach(i => { i.value = ''; i.classList.remove('filled', 'error'); });
                    otpInputs[0].focus();
                }, 1500);
            } finally {
                btn.disabled = false;
                btn.querySelector('span').textContent = 'Verifikasi';
            }
        });

        // Resend code
        document.getElementById('otpResendBtn').addEventListener('click', async () => {
            const btn = document.getElementById('otpResendBtn');
            const otpError = document.getElementById('otpError');
            btn.disabled = true;
            try {
                const data = await api('auth.php?action=resend_code', {
                    method: 'POST',
                    body: JSON.stringify({ email: pendingEmail }),
                });
                otpError.textContent = '';
                showToast(data.message || 'Kode verifikasi baru telah dikirim! 📧');
                startResendCountdown(60);
                // Clear inputs
                otpInputs.forEach(i => { i.value = ''; i.classList.remove('filled', 'error'); });
                otpInputs[0].focus();
            } catch (err) {
                otpError.textContent = err.message;
                if (err.wait) startResendCountdown(err.wait);
                else btn.disabled = false;
            }
        });

        // Back from OTP
        document.getElementById('otpBackBtn').addEventListener('click', () => {
            otpScreen.classList.remove('active');
            registerForm.classList.add('active');
            if (resendCountdown) clearInterval(resendCountdown);
        });

        // Helper to hide all auth forms
        function hideAllForms() {
            loginForm.classList.remove('active');
            registerForm.classList.remove('active');
            otpScreen.classList.remove('active');
            const fp = document.getElementById('forgotPasswordForm');
            const rp = document.getElementById('resetPasswordForm');
            if (fp) fp.classList.remove('active');
            if (rp) rp.classList.remove('active');
            authError.textContent = '';
        }

        document.getElementById('showRegister').addEventListener('click', () => {
            hideAllForms();
            registerForm.classList.add('active');
        });

        document.getElementById('showLogin').addEventListener('click', () => {
            hideAllForms();
            loginForm.classList.add('active');
        });

        // ===== FORGOT PASSWORD FLOW =====
        const forgotPasswordForm = document.getElementById('forgotPasswordForm');
        const resetPasswordForm = document.getElementById('resetPasswordForm');
        let resetEmail = '';
        let resetCountdownTimer = null;

        // Show forgot password form
        document.getElementById('showForgotPassword')?.addEventListener('click', () => {
            hideAllForms();
            if (forgotPasswordForm) forgotPasswordForm.classList.add('active');
            // Pre-fill email from login form
            const loginEmailVal = document.getElementById('loginEmail')?.value;
            const forgotEmailInput = document.getElementById('forgotEmail');
            if (loginEmailVal && forgotEmailInput) forgotEmailInput.value = loginEmailVal;
        });

        // Back from forgot password
        document.getElementById('forgotBackBtn')?.addEventListener('click', () => {
            hideAllForms();
            loginForm.classList.add('active');
        });
        document.getElementById('forgotToLogin')?.addEventListener('click', () => {
            hideAllForms();
            loginForm.classList.add('active');
        });

        // Submit forgot password (send OTP)
        document.getElementById('forgotSubmitBtn')?.addEventListener('click', async () => {
            const forgotError = document.getElementById('forgotError');
            const btn = document.getElementById('forgotSubmitBtn');
            const email = document.getElementById('forgotEmail')?.value?.trim();
            if (forgotError) forgotError.textContent = '';
            if (!email) {
                if (forgotError) forgotError.textContent = 'Masukkan alamat email';
                return;
            }
            btn.disabled = true;
            try {
                const data = await api('auth.php?action=forgot_password', {
                    method: 'POST',
                    body: JSON.stringify({ email })
                });
                showToast(data.message || 'Kode reset telah dikirim 📧');
                resetEmail = email;
                // Show reset password form
                hideAllForms();
                if (resetPasswordForm) resetPasswordForm.classList.add('active');
                const resetEmailDisplay = document.getElementById('resetEmailDisplay');
                if (resetEmailDisplay) resetEmailDisplay.textContent = email;
                // Clear OTP inputs
                const resetOtpInputs = document.querySelectorAll('#resetOtpInputs .otp-digit');
                resetOtpInputs.forEach(i => { i.value = ''; });
                if (resetOtpInputs[0]) resetOtpInputs[0].focus();
                // Start resend countdown
                startResetResendCountdown(60);
            } catch (err) {
                if (forgotError) forgotError.textContent = err.message || 'Terjadi kesalahan';
            } finally {
                btn.disabled = false;
            }
        });

        // Reset OTP input handling
        const resetOtpContainer = document.getElementById('resetOtpInputs');
        if (resetOtpContainer) {
            const resetDigits = resetOtpContainer.querySelectorAll('.otp-digit');
            resetDigits.forEach((input, idx) => {
                input.addEventListener('input', (e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    e.target.value = val;
                    if (val && idx < resetDigits.length - 1) resetDigits[idx + 1].focus();
                });
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Backspace' && !e.target.value && idx > 0) {
                        resetDigits[idx - 1].focus();
                    }
                });
                input.addEventListener('paste', (e) => {
                    e.preventDefault();
                    const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '').slice(0, 6);
                    pasted.split('').forEach((ch, i) => {
                        if (resetDigits[i]) resetDigits[i].value = ch;
                    });
                    if (resetDigits[Math.min(pasted.length, resetDigits.length - 1)]) {
                        resetDigits[Math.min(pasted.length, resetDigits.length - 1)].focus();
                    }
                });
            });
        }

        // Back from reset password
        document.getElementById('resetBackBtn')?.addEventListener('click', () => {
            hideAllForms();
            if (forgotPasswordForm) forgotPasswordForm.classList.add('active');
            if (resetCountdownTimer) clearInterval(resetCountdownTimer);
        });

        // Reset resend countdown
        function startResetResendCountdown(seconds) {
            const btn = document.getElementById('resetResendBtn');
            const countdown = document.getElementById('resetCountdown');
            if (!btn || !countdown) return;
            btn.disabled = true;
            let sec = seconds;
            countdown.textContent = `(${sec}s)`;
            if (resetCountdownTimer) clearInterval(resetCountdownTimer);
            resetCountdownTimer = setInterval(() => {
                sec--;
                countdown.textContent = `(${sec}s)`;
                if (sec <= 0) {
                    clearInterval(resetCountdownTimer);
                    btn.disabled = false;
                    countdown.textContent = '';
                }
            }, 1000);
        }

        // Resend reset code
        document.getElementById('resetResendBtn')?.addEventListener('click', async () => {
            if (!resetEmail) return;
            try {
                await api('auth.php?action=forgot_password', {
                    method: 'POST',
                    body: JSON.stringify({ email: resetEmail })
                });
                showToast('Kode reset dikirim ulang 📧');
                startResetResendCountdown(60);
            } catch (err) {
                showToast(err.message || 'Gagal mengirim ulang kode');
                if (err.wait) startResetResendCountdown(err.wait);
            }
        });

        // Submit reset password
        document.getElementById('resetSubmitBtn')?.addEventListener('click', async () => {
            const resetError = document.getElementById('resetError');
            const btn = document.getElementById('resetSubmitBtn');
            if (resetError) resetError.textContent = '';

            // Collect OTP
            const resetDigits = document.querySelectorAll('#resetOtpInputs .otp-digit');
            const code = Array.from(resetDigits).map(i => i.value).join('');
            if (code.length !== 6) {
                if (resetError) resetError.textContent = 'Masukkan 6 digit kode verifikasi';
                return;
            }

            const newPassword = document.getElementById('resetNewPassword')?.value;
            const confirmPassword = document.getElementById('resetConfirmPassword')?.value;
            if (!newPassword || newPassword.length < 6) {
                if (resetError) resetError.textContent = 'Password minimal 6 karakter';
                return;
            }
            if (newPassword !== confirmPassword) {
                if (resetError) resetError.textContent = 'Password tidak cocok';
                return;
            }

            btn.disabled = true;
            try {
                const data = await api('auth.php?action=reset_password', {
                    method: 'POST',
                    body: JSON.stringify({
                        email: resetEmail,
                        code: code,
                        new_password: newPassword
                    })
                });
                showToast(data.message || 'Password berhasil direset! 🎉');
                if (data.user) {
                    localStorage.setItem('selaraskas_last_email', resetEmail);
                    showApp(data.user);
                } else {
                    hideAllForms();
                    loginForm.classList.add('active');
                }
            } catch (err) {
                if (resetError) resetError.textContent = err.message || 'Gagal mereset password';
            } finally {
                btn.disabled = false;
            }
        });

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            authError.textContent = '';
            const btn = document.getElementById('loginSubmitBtn');
            btn.disabled = true;
            try {
                const loginEmail = document.getElementById('loginEmail').value;
                const rememberMe = document.getElementById('rememberMeCheck')?.checked || false;
                const data = await api('auth.php?action=login', {
                    method: 'POST',
                    body: JSON.stringify({
                        email: loginEmail,
                        password: document.getElementById('loginPassword').value,
                        remember_me: rememberMe,
                    }),
                });
                if (data.needs_verification) {
                    showOtpScreen(data.email);
                    showToast(data.message || 'Cek email untuk kode verifikasi 📧');
                } else {
                    // Save email for biometric login
                    localStorage.setItem('selaraskas_last_email', loginEmail);
                    showApp(data.user);
                    promptPushNotification();
                }
            } catch (err) {
                // Check if server says needs verification (403)
                if (err.needs_verification && err.email) {
                    showOtpScreen(err.email);
                    showToast(err.message || 'Cek email untuk kode verifikasi 📧');
                } else {
                    authError.textContent = err.message;
                }
            } finally { btn.disabled = false; }
        });

        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            authError.textContent = '';
            const btn = document.getElementById('registerSubmitBtn');
            btn.disabled = true;

            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('registerPasswordConfirm').value;

            if (password !== confirmPassword) {
                authError.textContent = 'Password dan konfirmasi password tidak cocok';
                btn.disabled = false;
                return;
            }

            try {
                const data = await api('auth.php?action=register', {
                    method: 'POST',
                    body: JSON.stringify({
                        name: document.getElementById('registerName').value,
                        email: document.getElementById('registerEmail').value,
                        password: password,
                    }),
                });
                if (data.needs_verification) {
                    showOtpScreen(data.email);
                    showToast(data.message || 'Kode verifikasi telah dikirim! 📧');
                } else if (data.user) {
                    showApp(data.user);
                    showToast('Akun berhasil dibuat! 🎉');
                }
            } catch (err) {
                if (err.needs_verification && err.email) {
                    showOtpScreen(err.email);
                    showToast(err.message || 'Kode verifikasi telah dikirim! 📧');
                } else {
                    authError.textContent = err.message;
                }
            } finally { btn.disabled = false; }
        });

        // Toggle password visibility
        document.querySelectorAll('.password-toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = btn.dataset.toggle;
                const input = document.getElementById(targetId);
                if (input) {
                    const isPassword = input.type === 'password';
                    input.type = isPassword ? 'text' : 'password';
                    btn.innerHTML = isPassword ? renderEmojiOrIcon('eye-off', '20px') : renderEmojiOrIcon('eye', '20px');
                }
            });
        });

        document.getElementById('logoutBtn').addEventListener('click', async () => {
            try { await api('auth.php?action=logout', { method: 'POST' }); } catch(e) {}
            showAuth();
            showToast('Berhasil keluar 👋');
        });
    }

    async function checkSession() {
        try {
            const data = await api('auth.php?action=check');
            if (data.authenticated) {
                showApp(data.user);
            } else {
                showAuth();
            }
        } catch {
            showAuth();
        }
    }

    // ===== THEME =====
    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        const label = document.getElementById('themeLabel');
        if (label) label.textContent = theme === 'dark' ? 'Dark Mode' : 'Light Mode';
    }

    function initTheme() {
        const toggle = document.getElementById('themeToggle');
        const switchBtn = document.getElementById('themeSwitchBtn');

        async function toggleTheme() {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            applyTheme(next);
            if (currentUser) {
                currentUser.theme = next;
                try { await api('user.php', { method: 'PUT', body: JSON.stringify({ theme: next }) }); } catch(e) {}
            }
        }

        toggle.addEventListener('click', toggleTheme);
        if (switchBtn) switchBtn.addEventListener('click', toggleTheme);
    }

    // ===== NAVIGATION =====
    function initNavigation() {
        const navItems = document.querySelectorAll('#bottomNav .nav-item');
        const pages = document.querySelectorAll('.page');

        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const target = item.dataset.page;
                navItems.forEach(n => n.classList.remove('active'));
                item.classList.add('active');
                pages.forEach(p => p.classList.remove('active'));
                const page = document.getElementById(`page-${target}`);
                if (page) { page.classList.add('active'); page.scrollTop = 0; }

                if (target === 'analytics') loadAnalytics();
                if (target === 'budget') loadBudgets();
                if (target === 'savings') loadSavings();
                if (target === 'profile') loadBiometricSettings();
            });
        });

        // Quick nav from balance card
        document.getElementById('goSavingsBtn').addEventListener('click', () => {
            document.querySelector('[data-page="savings"]').click();
        });
    }

    // ===== WALLETS =====
    async function loadWallets() {
        try {
            const data = await api('wallets.php?action=list');
            if (data && data.wallets) {
                const switcher = document.getElementById('walletSwitcher');
                if (switcher) {
                    switcher.innerHTML = '';
                    let activeName = 'Dompet';
                    let myWalletRole = '';
                    data.wallets.forEach(w => {
                        const opt = document.createElement('option');
                        opt.value = w.id;
                        let typeIcon = w.type === 'shared' ? '👥 ' : '👤 ';
                        let roleIcon = w.role === 'owner' ? '👑 ' : '';
                        opt.textContent = typeIcon + roleIcon + w.name;
                        if (w.is_active) {
                            opt.selected = true;
                            activeName = w.name;
                            myWalletRole = w.role;
                        }
                        switcher.appendChild(opt);
                    });
                    
                    // Sembunyikan tombol kelola jika bukan owner
                    const manageBtn = document.getElementById('manageWalletBtn');
                    if (manageBtn) {
                        manageBtn.style.display = (myWalletRole === 'owner') ? 'flex' : 'none';
                    }
                    
                    switcher.onchange = async (e) => {
                        const newWalletId = e.target.value;
                        if (!newWalletId) return;
                        try {
                            const res = await api('wallets.php?action=switch', {
                                method: 'POST',
                                body: JSON.stringify({ wallet_id: newWalletId })
                            });
                            if (res && res.success) {
                                loadDashboard();
                                const activeNavItem = document.querySelector('.nav-item.active');
                                const activePage = activeNavItem ? activeNavItem.dataset.page : 'home';
                                if (activePage === 'analytics') loadAnalytics();
                                if (activePage === 'budget') loadBudgets();
                                if (activePage === 'savings') loadSavings();
                            } else {
                                alert(res.error || 'Gagal pindah dompet');
                            }
                        } catch (err) {
                            alert('Terjadi kesalahan saat pindah dompet');
                        }
                    };
                }
            }
        } catch (err) {
            console.error('Wallet load error:', err);
        }
    }

    // ===== GAMIFICATION & AI CHAT =====
    async function loadGamification() {
        try {
            const data = await api('gamification.php?action=status');
            if (data && data.success) {
                const fill = document.getElementById('healthBarFill');
                const val = document.getElementById('healthScoreValue');
                const pts = document.getElementById('pointsValue');
                
                if (fill && val && pts) {
                    fill.style.width = data.health_score + '%';
                    val.textContent = data.health_score + '/100';
                    pts.textContent = data.points;
                    
                    if (data.health_score < 40) {
                        fill.style.background = 'linear-gradient(90deg, #ef4444, #f87171)';
                        val.style.color = '#ef4444';
                    } else if (data.health_score < 70) {
                        fill.style.background = 'linear-gradient(90deg, #f59e0b, #fbbf24)';
                        val.style.color = '#f59e0b';
                    } else {
                        fill.style.background = 'linear-gradient(90deg, #10b981, #34d399)';
                        val.style.color = '#10b981';
                    }
                }
            }
        } catch (err) {
            console.error('Gamification error:', err);
        }
    }

    function initAIChat() {
        const fab = document.getElementById('aiChatFab');
        const panel = document.getElementById('aiChatPanel');
        const closeBtn = document.getElementById('aiChatClose');
        const form = document.getElementById('aiChatForm');
        const input = document.getElementById('aiChatInput');
        const messages = document.getElementById('aiChatMessages');

        if (!fab || !panel) return;

        fab.addEventListener('click', () => {
            panel.style.display = panel.style.display === 'flex' ? 'none' : 'flex';
            if (panel.style.display === 'flex') {
                input.focus();
                messages.scrollTop = messages.scrollHeight;
            }
        });

        closeBtn.addEventListener('click', () => {
            panel.style.display = 'none';
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const text = input.value.trim();
            if (!text) return;

            // Simple tier check for AI Chat
            if (currentUser && currentUser.subscription_tier === 'free') {
                if (typeof window.showUpgradeModal === 'function') {
                    window.showUpgradeModal();
                } else {
                    showToast('Fitur SelarasAI eksklusif untuk pengguna Premium/Pro. Silakan upgrade!');
                }
                return;
            }

            const userMsg = document.createElement('div');
            userMsg.className = 'user-message';
            userMsg.style.cssText = 'background: #f59e0b; color: #fff; padding: 10px 14px; border-radius: 12px; border-top-right-radius: 4px; font-size: 14px; align-self: flex-end; max-width: 85%;';
            userMsg.textContent = text;
            messages.appendChild(userMsg);
            
            input.value = '';
            input.disabled = true;
            messages.scrollTop = messages.scrollHeight;

            try {
                const res = await api('ai_chat.php?action=chat', {
                    method: 'POST',
                    body: JSON.stringify({ message: text })
                });

                const aiMsg = document.createElement('div');
                aiMsg.className = 'ai-message';
                aiMsg.style.cssText = 'background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3); padding: 10px 14px; border-radius: 12px; border-top-left-radius: 4px; color: #e2e8f0; font-size: 14px; align-self: flex-start; max-width: 85%;';
                
                if (res && res.reply) {
                    aiMsg.textContent = res.reply;
                } else {
                    aiMsg.textContent = 'Maaf, terjadi kesalahan saat menghubungi AI.';
                }
                messages.appendChild(aiMsg);
            } catch (err) {
                const errMsg = document.createElement('div');
                errMsg.className = 'ai-message';
                errMsg.style.cssText = 'background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); padding: 10px 14px; border-radius: 12px; border-top-left-radius: 4px; color: #e2e8f0; font-size: 14px; align-self: flex-start; max-width: 85%;';
                errMsg.textContent = 'Gagal mengirim pesan.';
                messages.appendChild(errMsg);
            }

            input.disabled = false;
            input.focus();
            messages.scrollTop = messages.scrollHeight;
        });
    }

    // ===== DASHBOARD =====
    async function loadDashboard() {
        try {
            renderSkeletonTransactions(document.getElementById('transactionsList'));
            renderSkeletonChart(document.getElementById('spendingCategories'));
            
            const data = await api(`transactions.php?action=dashboard&month=${currentMonth}&limit=20`);

            renderBalance(data.summary);
            renderSpendingChart(data.chart);
            renderTransactions(document.getElementById('transactionsList'), data.transactions);
            
            await loadGamification();
        } catch (err) {
            console.error('Dashboard error:', err);
        }
    }

    function renderBalance(data) {
        const el = document.getElementById('mainBalance');
        animateNumber(el, data.balance);

        const net = data.income - data.expense;
        const changeEl = document.getElementById('balanceChange');
        const changeText = document.getElementById('balanceChangeText');

        if (net > 0) {
            changeEl.className = 'balance-change positive';
            changeText.textContent = '+' + formatRp(net) + ' bulan ini';
        } else if (net < 0) {
            changeEl.className = 'balance-change negative';
            changeText.textContent = '-' + formatRp(Math.abs(net)) + ' bulan ini';
        } else {
            changeEl.className = 'balance-change neutral';
            changeText.textContent = 'Rp 0 bulan ini';
        }
    }

    function animateNumber(el, target) {
        const duration = 1000;
        const start = Date.now();
        const startVal = 0;
        function update() {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(startVal + (target - startVal) * eased);
            el.textContent = current.toLocaleString('id-ID');
            if (progress < 1) requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
    }

    // ===== SPENDING CHART =====
    function renderSpendingChart(chartItems) {
        const canvas = document.getElementById('spendingChart');
        if (!canvas) return;

        const total = chartItems ? chartItems.reduce((s, d) => s + parseFloat(d.total), 0) : 0;
        document.getElementById('chartTotalAmount').textContent = formatRp(total, true);

        // Render categories
        const catEl = document.getElementById('spendingCategories');
        if (catEl) {
            setTimeout(() => {
                if (window.lucide) lucide.createIcons();
            }, 50);
        }
        
        if (!chartItems || !chartItems.length || isNaN(total) || total <= 0) {
            if (catEl) catEl.innerHTML = '<div class="empty-state-small">Belum ada data</div>';
            // Clear canvas
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
            return;
        }

        if (catEl) {
            catEl.innerHTML = chartItems.slice(0, 5).map(item => {
                const catLabel = item.category_name || item.name || 'Lainnya';
                return `
                <div class="category-item">
                    <div class="category-dot" style="background:${item.color || '#94a3b8'}"></div>
                    <div class="category-info">
                        <span class="category-name" style="display:flex;align-items:center;gap:8px;">${renderEmojiOrIcon(item.emoji, '16px')} ${catLabel}</span>
                        <span class="category-amount">${formatRp(item.total, true)} · ${((parseFloat(item.total) / total) * 100).toFixed(0)}%</span>
                    </div>
                </div>
            `;
            }).join('');
        }

        // Draw donut
        const dpr = window.devicePixelRatio || 1;
        canvas.width = 150 * dpr;
        canvas.height = 150 * dpr;
        canvas.style.width = '120px';
        canvas.style.height = '120px';
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.scale(dpr, dpr);
        const cx = 75, cy = 75, r = 54, lw = 12, gap = 0.04;
        let angle = -Math.PI / 2;

        chartItems.forEach(item => {
            const val = parseFloat(item.total) || 0;
            const slice = Math.max(0, (val / total) * (2 * Math.PI) - gap);
            ctx.beginPath();
            ctx.arc(cx, cy, r, angle, angle + slice);
            ctx.strokeStyle = item.color || '#818cf8';
            ctx.lineWidth = lw;
            ctx.lineCap = 'round';
            ctx.stroke();
            angle += slice + gap;
        });
    }

    // ===== TRANSACTIONS =====
    function renderTransactions(container, txList) {
        if (!txList || !txList.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">📝</span>
                    <span class="empty-text">Belum ada transaksi</span>
                    <span class="empty-sub">Tap Pemasukan / Pengeluaran untuk menambahkan</span>
                </div>`;
            return;
        }

        let html = '';
        let lastDate = '';

        txList.forEach(tx => {
            const dateLabel = formatDate(tx.transaction_date);
            if (dateLabel !== lastDate) {
                lastDate = dateLabel;
                html += `<div class="transaction-date-header">${dateLabel}</div>`;
            }
            const isIncome = tx.type === 'income';
            const catName = tx.parent_category_name || tx.category_name || 'Lainnya';
            const iconName = tx.emoji || 'box';
            const iconColor = tx.color || '#94a3b8';
            const bg = tx.color ? tx.color + '18' : 'rgba(148,163,184,0.1)';

            html += `
                <div class="transaction-item fade-in-up" data-id="${tx.id}">
                    <div class="transaction-content">
                        <div class="transaction-icon" style="background:${bg}; display:flex; align-items:center; justify-content:center;">${renderEmojiOrIcon(iconName, '20px', iconColor)}</div>
                        <div class="transaction-details">
                            <span class="transaction-name">${escapeHTML(tx.description || tx.category_name || 'Transaksi')}</span>
                            <span class="transaction-category">${escapeHTML(catName)}</span>
                        </div>
                        <div class="transaction-amount-col">
                            <span class="transaction-amount ${isIncome ? 'income' : 'expense'}">
                                ${isIncome ? '+' : '-'}${formatRp(tx.amount)}
                            </span>
                        </div>
                        <button class="transaction-delete" onclick="event.stopPropagation(); window.Selaraskas.deleteTransaction(${tx.id})">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                    </div>
                </div>`;
        });

        container.innerHTML = html;
        setTimeout(() => lucide.createIcons(), 50);
    }

    // ===== ANALYTICS =====
    async function loadAnalytics() {
        document.getElementById('monthLabel').textContent = formatMonthLabel(currentMonth);

        try {
            renderSkeletonChart(document.getElementById('topSpendingList'));
            document.getElementById('comparisonCards').innerHTML = '<div class="skeleton sk-item"></div>';

            const [summary, chart, weekly, comparison] = await Promise.all([
                api(`transactions.php?action=summary&month=${currentMonth}`),
                api(`transactions.php?action=chart&month=${currentMonth}`),
                api(`transactions.php?action=weekly&month=${currentMonth}`),
                api(`transactions.php?action=comparison&month=${currentMonth}`)
            ]);

            document.getElementById('analyticsIncome').textContent = formatRp(summary.income);
            document.getElementById('analyticsExpense').textContent = formatRp(summary.expense);

            const incChange = document.getElementById('analyticsIncomeChange');
            const expChange = document.getElementById('analyticsExpenseChange');

            if (summary.income_change !== 0) {
                incChange.textContent = (summary.income_change > 0 ? '+' : '') + summary.income_change + '%';
                incChange.className = 'analytics-card-change ' + (summary.income_change >= 0 ? 'positive' : 'negative');
            } else { incChange.textContent = '—'; incChange.className = 'analytics-card-change'; }

            if (summary.expense_change !== 0) {
                expChange.textContent = (summary.expense_change > 0 ? '+' : '') + summary.expense_change + '%';
                expChange.className = 'analytics-card-change ' + (summary.expense_change <= 0 ? 'positive' : 'negative');
            } else { expChange.textContent = '—'; expChange.className = 'analytics-card-change'; }

            renderAnalyticsCashflowChart(weekly.weekly);
            renderTopSpending(chart.chart);
            renderComparisonCards(comparison);
        } catch (err) {
            console.error('Analytics error:', err);
        }
    }

    let cashflowChartInstance = null;
    function renderAnalyticsCashflowChart(data) {
        const ctx = document.getElementById('analyticsCashflowChart');
        if (!ctx) return;
        if (cashflowChartInstance) cashflowChartInstance.destroy();

        if (!data || !data.length) return;

        let totalIncome = 0;
        let totalExpense = 0;
        data.forEach(d => {
            totalIncome += parseFloat(d.income);
            totalExpense += parseFloat(d.expense);
        });

        cashflowChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Pemasukan', 'Pengeluaran'],
                datasets: [{
                    data: [totalIncome, totalExpense],
                    backgroundColor: ['#34d399', '#ff6b6b'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: { position: 'right', labels: { color: 'var(--text-primary)' } },
                    tooltip: {
                        callbacks: { label: (ctx) => formatRp(ctx.raw) }
                    }
                }
            }
        });
    }

    function renderTopSpending(chart) {
        const el = document.getElementById('topSpendingList');
        if (!el) return;
        if (!chart || !chart.length) {
            el.innerHTML = '<div class="empty-state-small">Belum ada data</div>';
            return;
        }

        const max = parseFloat(chart[0].total) || 1;
        el.innerHTML = chart.slice(0, 5).map((item, i) => {
            const val = parseFloat(item.total) || 0;
            const pct = max > 0 ? (val / max) * 100 : 0;
            const rankClass = i < 3 ? `rank-${i + 1}` : '';
            const catLabel = item.category_name || item.name || 'Lainnya';
            return `
                <div class="top-spending-item">
                    <div class="top-spending-rank ${rankClass}" ${i >= 3 ? 'style="background:var(--bg-card);color:var(--text-muted);"' : ''}>
                        ${i + 1}
                    </div>
                    <div class="top-spending-icon" style="background:${item.color}18; display:flex; align-items:center; justify-content:center;">${renderEmojiOrIcon(item.emoji, '20px', item.color)}</div>
                    <div class="top-spending-info">
                        <span class="top-spending-name">${catLabel}</span>
                        <div class="top-spending-bar">
                            <div class="top-spending-bar-fill" style="width:${pct}%;background:${item.color}"></div>
                        </div>
                    </div>
                    <span class="top-spending-amount">${formatRp(item.total, true)}</span>
                </div>`;
        }).join('');
    }

    // ===== SAVINGS =====
    async function loadSavings() {
        try {
            const data = await api('savings.php');
            document.getElementById('savingsTotalAmount').textContent = formatRp(data.total_saved);
            renderSavingsGoals(data.goals);
            setTimeout(() => lucide.createIcons(), 50);
        } catch (err) {
            console.error('Savings error:', err);
        }
    }

    function renderSavingsGoals(goals) {
        const el = document.getElementById('savingsGoalsList');
        if (!goals || !goals.length) {
            el.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">🎯</span>
                    <span class="empty-text">Belum ada target nabung</span>
                    <span class="empty-sub">Tap + untuk membuat target</span>
                </div>`;
            return;
        }

        el.innerHTML = goals.map(g => {
            const pct = g.target_amount > 0 ? Math.min(100, Math.round((g.current_amount / g.target_amount) * 100)) : 0;
            const deadlineStr = g.deadline ? new Date(g.deadline).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' }) : '';
            const safeTitle = escapeHTML(g.title);
            const escapedOnclickTitle = escapeHTML(g.title.replace(/'/g, "\\'"));
            return `
                <div class="savings-goal-card">
                    <div class="savings-goal-top">
                        <div class="savings-goal-emoji" style="background:${g.color}18; display:flex; align-items:center; justify-content:center;">
                            ${renderEmojiOrIcon(g.emoji, '24px', g.color)}
                        </div>
                        <div class="savings-goal-info">
                            <span class="savings-goal-title">${safeTitle}</span>
                            <span class="savings-goal-amounts">${formatRp(g.current_amount, true)} / ${formatRp(g.target_amount, true)}</span>
                        </div>
                        <div class="savings-goal-actions">
                            <button class="savings-action-add" onclick="event.stopPropagation(); window.Selaraskas.showAddToSaving(${g.id}, '${escapedOnclickTitle}')">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            </button>
                            <button class="savings-action-delete" onclick="event.stopPropagation(); window.Selaraskas.deleteSaving(${g.id})">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                            </button>
                        </div>
                    </div>
                    <div class="savings-progress-bar">
                        <div class="savings-progress-fill" style="width:${pct}%;background:${g.color}"></div>
                    </div>
                    <div class="savings-progress-row">
                        <span class="savings-progress-text" style="color:${g.color}">${pct}%</span>
                        ${deadlineStr ? `<span class="savings-deadline">🗓 ${deadlineStr}</span>` : ''}
                    </div>
                </div>`;
        }).join('');
    }

    // ===== MODAL =====
    function openModal(title, bodyHTML) {
        const overlay = document.getElementById('modalOverlay');
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalBody').innerHTML = bodyHTML;
        overlay.classList.add('active');
    }

    function closeModal() {
        document.getElementById('modalOverlay').classList.remove('active');
    }

    function initModal() {
        document.getElementById('modalClose').addEventListener('click', closeModal);
        document.getElementById('modalOverlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) closeModal();
        });
    }

    // ===== TRANSACTION FORM =====
    let categoriesCache = {};

    async function loadCategories(type) {
        if (categoriesCache[type]) return categoriesCache[type];
        const data = await api(`categories.php?type=${type}`);
        categoriesCache[type] = data.categories;
        return data.categories;
    }

    async function showTransactionForm(type) {
        const title = type === 'income' ? 'Tambah Pemasukan' : 'Tambah Pengeluaran';
        const categories = await loadCategories(type);

        let catPickerHTML = categories.map(cat => {
            const hasChildren = cat.children && cat.children.length > 0;
            let childrenHTML = '';
            if (hasChildren) {
                childrenHTML = `<div class="category-children" data-parent="${cat.id}">
                    ${cat.children.map(ch => `
                        <div class="category-child" data-id="${ch.id}" data-name="${ch.name}" data-emoji="${ch.emoji || ''}">
                            <span class="category-child-emoji" style="display:flex; align-items:center;">${renderEmojiOrIcon(ch.emoji, '18px')}</span>
                            <span class="category-child-name">${ch.name}</span>
                        </div>
                    `).join('')}
                </div>`;
            }
            return `
                <div class="category-parent" data-id="${cat.id}" data-name="${cat.name}" data-emoji="${cat.emoji || ''}" data-has-children="${hasChildren}">
                    <span class="category-parent-emoji" style="display:flex; align-items:center;">${renderEmojiOrIcon(cat.emoji, '18px')}</span>
                    <span class="category-parent-name">${cat.name}</span>
                    <svg class="category-parent-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
                ${childrenHTML}`;
        }).join('');

        const formHTML = `
            <div class="form-group">
                <label>Jumlah (Rp)</label>
                <div class="input-with-icon">
                    <span class="input-icon">${renderEmojiOrIcon('banknote', '18px')}</span>
                    <input type="text" id="txAmount" placeholder="Rp 0" required inputmode="numeric">
                </div>
            </div>
            <div class="form-group">
                <label>Kategori</label>
                <input type="hidden" id="txCategoryId" value="">
                <div id="selectedCategory" class="select-category-trigger" onclick="document.getElementById('categoryPicker').style.display=document.getElementById('categoryPicker').style.display==='none'?'flex':'none'">
                    <span class="select-category-icon-wrapper">
                        <span class="input-icon">${renderEmojiOrIcon('tag', '18px')}</span>
                    </span>
                    <span class="select-category-text">Pilih kategori...</span>
                </div>
                <div class="category-picker" id="categoryPicker" style="display:none;margin-top:8px;max-height:200px;overflow-y:auto;">
                    ${catPickerHTML}
                </div>
            </div>
            <div class="form-group">
                <label>Keterangan (opsional)</label>
                <div class="input-with-icon">
                    <span class="input-icon">${renderEmojiOrIcon('document', '18px')}</span>
                    <input type="text" id="txDescription" placeholder="Contoh: Beli sayur di pasar">
                </div>
            </div>
            <div class="form-group">
                <label>Tanggal</label>
                <div class="input-with-icon">
                    <span class="input-icon">${renderEmojiOrIcon('calendar', '18px')}</span>
                    <input type="date" id="txDate" value="${new Date().toISOString().slice(0, 10)}" onclick="this.showPicker()">
                </div>
            </div>
            <button class="modal-submit-btn ${type === 'income' ? 'success-btn' : ''}" id="txSubmitBtn">
                ${type === 'income' ? '💰 Simpan Pemasukan' : '💸 Simpan Pengeluaran'}
            </button>`;

        openModal(title, formHTML);
        setTimeout(() => lucide.createIcons(), 50);
        setTimeout(() => initRupiahFormatter('txAmount'), 100);

        // Category picker logic
        setTimeout(() => {
            document.querySelectorAll('.category-parent').forEach(parent => {
                parent.addEventListener('click', () => {
                    const hasChildren = parent.dataset.hasChildren === 'true';
                    if (hasChildren) {
                        // Toggle children
                        const children = parent.nextElementSibling;
                        const isOpen = children.classList.contains('show');
                        document.querySelectorAll('.category-children').forEach(c => c.classList.remove('show'));
                        document.querySelectorAll('.category-parent').forEach(p => p.classList.remove('expanded'));
                        if (!isOpen) {
                            children.classList.add('show');
                            parent.classList.add('expanded');
                        }
                    } else {
                        // Select parent directly
                        selectCategory(parent.dataset.id, parent.dataset.name, parent.dataset.emoji);
                    }
                });
            });

            document.querySelectorAll('.category-child').forEach(child => {
                child.addEventListener('click', () => {
                    selectCategory(child.dataset.id, child.dataset.name, child.dataset.emoji);
                });
            });

            function selectCategory(id, name, emojiOrIcon) {
                document.getElementById('txCategoryId').value = id;
                const wrapper = document.querySelector('#selectedCategory .select-category-icon-wrapper');
                if (wrapper) wrapper.innerHTML = renderEmojiOrIcon(emojiOrIcon, '18px');
                const text = document.querySelector('#selectedCategory .select-category-text');
                if (text) text.textContent = name;
                document.getElementById('selectedCategory').classList.add('has-value');
                document.getElementById('categoryPicker').style.display = 'none';
                document.querySelectorAll('.category-child').forEach(c => c.classList.remove('selected'));
                const sel = document.querySelector(`.category-child[data-id="${id}"]`);
                if (sel) sel.classList.add('selected');
                setTimeout(() => { if (window.lucide) lucide.createIcons(); }, 10);
            }

            // Submit
            document.getElementById('txSubmitBtn').addEventListener('click', async () => {
                const amount = parseRupiah(document.getElementById('txAmount').value);
                const categoryId = document.getElementById('txCategoryId').value;
                const description = document.getElementById('txDescription').value;
                const date = document.getElementById('txDate').value;

                if (!amount || amount <= 0) { showToast('Masukkan jumlah yang valid'); return; }
                if (!categoryId) { showToast('Pilih kategori'); return; }

                try {
                    await api('transactions.php', {
                        method: 'POST',
                        body: JSON.stringify({ category_id: categoryId, amount, type, description, transaction_date: date }),
                    });
                    closeModal();
                    showToast(type === 'income' ? 'Pemasukan ditambahkan! 💰' : 'Pengeluaran dicatat! 📝');
                    loadDashboard();
        setTimeout(() => lucide.createIcons(), 50);
                } catch (err) {
                    showToast(err.message);
                }
            });
        }, 100);
    }

    // ===== SAVINGS FORM =====
    function showSavingsForm() {
        let selectedIcon = 'target';
        let selectedColor = '#818cf8';

        const formHTML = `
            <div class="form-group">
                <label>Nama Target</label>
                <div class="input-with-icon">
                    <span class="input-icon">${renderEmojiOrIcon('flag', '18px')}</span>
                    <input type="text" id="savingTitle" placeholder="Contoh: Dana Liburan" required>
                </div>
            </div>
            <div class="form-group">
                <label>Target (Rp)</label>
                <div class="input-with-icon">
                    <span class="input-icon">${renderEmojiOrIcon('banknote', '18px')}</span>
                    <input type="text" id="savingTarget" placeholder="Rp 0" required inputmode="numeric">
                </div>
            </div>
            <div class="form-group">
                <label>Sudah Terkumpul (Rp)</label>
                <div class="input-with-icon">
                    <span class="input-icon">${renderEmojiOrIcon('piggy-bank', '18px')}</span>
                    <input type="text" id="savingCurrent" placeholder="Rp 0" value="Rp 0" inputmode="numeric">
                </div>
            </div>
            <div class="form-group">
                <label>Deadline (opsional)</label>
                <div class="input-with-icon">
                    <span class="input-icon">${renderEmojiOrIcon('calendar', '18px')}</span>
                    <input type="date" id="savingDeadline" onclick="this.showPicker()">
                </div>
            </div>
            <div class="form-group">
                <label>Ikon Target</label>
                <div class="emoji-grid">
                    ${SAVINGS_ICONS.map(i => `<div class="icon-option ${i === selectedIcon ? 'selected' : ''}" data-icon="${i}">${renderEmojiOrIcon(i, '20px')}</div>`).join('')}
                </div>
            </div>
            <button class="modal-submit-btn success-btn" id="savingSubmitBtn">${renderEmojiOrIcon('plus-circle', '18px', '', 'margin-right:6px;vertical-align:-4px')} Buat Target</button>`;

        openModal('Target Nabung Baru', formHTML);
        setTimeout(() => lucide.createIcons(), 50);
        setTimeout(() => { initRupiahFormatter('savingTarget'); initRupiahFormatter('savingCurrent'); }, 100);

        setTimeout(() => {
            document.querySelectorAll('.icon-option').forEach(opt => {
                opt.addEventListener('click', () => {
                    document.querySelectorAll('.icon-option').forEach(o => o.classList.remove('selected'));
                    opt.classList.add('selected');
                    selectedIcon = opt.dataset.icon;
                });
            });

            document.getElementById('savingSubmitBtn').addEventListener('click', async () => {
                const title = document.getElementById('savingTitle').value.trim();
                const target = parseRupiah(document.getElementById('savingTarget').value);
                const current = parseRupiah(document.getElementById('savingCurrent').value) || 0;
                const deadline = document.getElementById('savingDeadline').value || null;

                if (!title) { showToast('Masukkan nama target'); return; }
                if (!target || target <= 0) { showToast('Masukkan target yang valid'); return; }

                const colorIdx = Math.floor(Math.random() * SAVINGS_COLORS.length);
                try {
                    await api('savings.php', {
                        method: 'POST',
                        body: JSON.stringify({ title, emoji: selectedIcon, target_amount: target, current_amount: current, deadline, color: SAVINGS_COLORS[colorIdx] }),
                    });
                    closeModal();
                    showToast('Target nabung dibuat! 🎯');
                    loadSavings();
                } catch (err) { showToast(err.message); }
            });
        }, 100);
    }

    function showAddToSaving(id, title) {
        const formHTML = `
            <p style="font-size:14px;color:var(--text-secondary);margin-bottom:12px;">Menambah ke: <strong>${escapeHTML(title)}</strong></p>
            <div class="form-group">
                <label>Jumlah Tambah (Rp)</label>
                <div class="input-with-icon">
                    <span class="input-icon">${renderEmojiOrIcon('banknote', '18px')}</span>
                    <input type="text" id="addSavingAmount" placeholder="Rp 0" required inputmode="numeric">
                </div>
            </div>
            <button class="modal-submit-btn success-btn" id="addSavingSubmitBtn">💰 Tambah Tabungan</button>`;

        openModal('Tambah Tabungan', formHTML);
        setTimeout(() => lucide.createIcons(), 50);
        setTimeout(() => initRupiahFormatter('addSavingAmount'), 100);

        setTimeout(() => {
            document.getElementById('addSavingSubmitBtn').addEventListener('click', async () => {
                const amount = parseRupiah(document.getElementById('addSavingAmount').value);
                if (!amount || amount <= 0) { showToast('Masukkan jumlah yang valid'); return; }

                try {
                    await api('savings.php', {
                        method: 'PUT',
                        body: JSON.stringify({ id, add_amount: amount }),
                    });
                    closeModal();
                    showToast('Tabungan ditambahkan! 💰');
                    loadSavings();
                } catch (err) { showToast(err.message); }
            });
        }, 100);
    }

    // ===== DELETE =====
    async function deleteTransaction(id) {
        if (!confirm('Hapus transaksi ini?')) return;
        try {
            await api(`transactions.php?id=${id}`, { method: 'DELETE' });
            showToast('Transaksi dihapus');
            loadDashboard();
        setTimeout(() => lucide.createIcons(), 50);
        } catch (err) { showToast(err.message); }
    }

    async function deleteSaving(id) {
        if (!confirm('Hapus target nabung ini?')) return;
        try {
            await api(`savings.php?id=${id}`, { method: 'DELETE' });
            showToast('Target dihapus');
            loadSavings();
        } catch (err) { showToast(err.message); }
    }

    // ===== MONTH NAVIGATION =====
    function initMonthNav() {
        document.getElementById('prevMonth').addEventListener('click', () => {
            const d = new Date(currentMonth + '-01');
            d.setMonth(d.getMonth() - 1);
            currentMonth = d.toISOString().slice(0, 7);
            loadAnalytics();
        });
        document.getElementById('nextMonth').addEventListener('click', () => {
            const d = new Date(currentMonth + '-01');
            d.setMonth(d.getMonth() + 1);
            currentMonth = d.toISOString().slice(0, 7);
            loadAnalytics();
        });
    }

    // ===== EXPORT ANALYTICS AS PNG =====
    async function exportAnalyticsAsPng() {
        const btn = document.getElementById('exportReportBtn');
        if (!btn) return;

        if (currentUser && currentUser.subscription_tier === 'free') {
            if (typeof window.showUpgradeModal === 'function') {
                window.showUpgradeModal();
            } else {
                showToast('Export Laporan eksklusif untuk Premium/Pro. Upgrade sekarang!');
            }
            return;
        }

        // ponytail: load html2canvas on demand instead of at page load
        if (typeof html2canvas === 'undefined') {
            await new Promise((resolve, reject) => {
                var s = document.createElement('script');
                s.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
                s.onload = resolve; s.onerror = reject;
                document.head.appendChild(s);
            });
        }

        btn.classList.add('loading');
        btn.querySelector('span').textContent = 'Membuat PNG...';

        try {
            const page = document.getElementById('page-analytics');

            // Temporarily hide the header (export button) and bottom spacer for cleaner output
            const header = page.querySelector('.page-header');
            const spacer = page.querySelector('.bottom-spacer');
            const ptrCont = page.querySelector('.ptr-container');

            // Hide UI-only elements from snapshot
            if (btn) btn.style.visibility = 'hidden';
            if (ptrCont) ptrCont.style.display = 'none';

            // Force fixed-pixel page dimensions for canvas capture
            const origOverflow = page.style.overflow;
            const origMaxH = page.style.maxHeight;
            page.style.overflow = 'visible';
            page.style.maxHeight = 'none';

            const monthLabel = document.getElementById('monthLabel')?.textContent || currentMonth;
            const userName = currentUser?.name || 'SelarasKas';

            // Capture the analytics page
            const canvas = await html2canvas(page, {
                backgroundColor: getComputedStyle(document.documentElement)
                    .getPropertyValue('--bg-primary').trim() || '#0a0e1a',
                scale: 2,
                useCORS: true,
                allowTaint: true,
                logging: false,
                scrollX: 0,
                scrollY: 0,
                width: page.scrollWidth,
                height: page.scrollHeight,
            });

            // Restore hidden elements
            page.style.overflow = origOverflow;
            page.style.maxHeight = origMaxH;
            if (btn) btn.style.visibility = '';
            if (ptrCont) ptrCont.style.display = '';

            // Build final canvas with branded header
            const PADDING = 40;
            const HEADER_H = 90;
            const finalW = canvas.width + PADDING * 2;
            const finalH = canvas.height + HEADER_H + PADDING * 2;

            const finalCanvas = document.createElement('canvas');
            finalCanvas.width = finalW;
            finalCanvas.height = finalH;
            const ctx = finalCanvas.getContext('2d');

            // Background gradient
            const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
            const bgColor = isDark ? '#0a0e1a' : '#f8fafc';
            const accentColor = '#818cf8';

            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, finalW, finalH);

            // Branded header bar
            const headerGrad = ctx.createLinearGradient(0, 0, finalW, 0);
            headerGrad.addColorStop(0, 'rgba(129,140,248,0.15)');
            headerGrad.addColorStop(1, 'rgba(99,102,241,0.05)');
            ctx.fillStyle = headerGrad;
            ctx.fillRect(0, 0, finalW, HEADER_H);

            // Accent border bottom of header
            ctx.fillStyle = accentColor;
            ctx.fillRect(0, HEADER_H - 2, finalW, 2);

            // App name
            ctx.fillStyle = '#e0e7ff';
            ctx.font = `bold ${32}px Inter, sans-serif`;
            ctx.fillText('SelarasKas', PADDING, 44);

            // Subtitle: Laporan Keuangan
            ctx.fillStyle = accentColor;
            ctx.font = `500 ${14}px Inter, sans-serif`;
            ctx.fillText('Laporan Keuangan Bulanan', PADDING, 68);

            // Month label (right-aligned)
            ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
            ctx.font = `600 ${15}px Inter, sans-serif`;
            const mlW = ctx.measureText(monthLabel).width;
            ctx.fillText(monthLabel, finalW - PADDING - mlW, 44);

            // Date generated
            const now = new Date();
            const dateStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            ctx.fillStyle = isDark ? '#64748b' : '#94a3b8';
            ctx.font = `400 ${12}px Inter, sans-serif`;
            const dsW = ctx.measureText(dateStr).width;
            ctx.fillText(dateStr, finalW - PADDING - dsW, 68);

            // Paste the captured analytics content
            ctx.drawImage(canvas, PADDING, HEADER_H + PADDING / 2);

            // Download
            const link = document.createElement('a');
            const safeMonth = monthLabel.replace(/\s+/g, '_');
            link.download = `SelarasKas_Laporan_${safeMonth}.png`;
            link.href = finalCanvas.toDataURL('image/png');
            link.click();

            showToast(`✅ Laporan ${monthLabel} berhasil diexport!`);
        } catch (err) {
            console.error('Export error:', err);
            showToast('Gagal export laporan. Coba lagi.');
            // Restore visibility if error
            const btnEl = document.getElementById('exportReportBtn');
            if (btnEl) btnEl.style.visibility = '';
            const ptrEl = document.getElementById('page-analytics')?.querySelector('.ptr-container');
            if (ptrEl) ptrEl.style.display = '';
        } finally {
            btn.classList.remove('loading');
            btn.querySelector('span').textContent = 'Export PNG';
        }
    }

    // ===== EXPORT ANALYTICS AS PDF =====
    async function exportAnalyticsAsPdf() {
        const btn = document.getElementById('exportReportPdfBtn');
        if (!btn) return;

        if (currentUser && currentUser.subscription_tier !== 'premium') {
            if (typeof window.showUpgradeModal === 'function') {
                window.showUpgradeModal();
            } else {
                showToast('Export Laporan PDF eksklusif untuk Premium. Upgrade sekarang!');
            }
            return;
        }

        // ponytail: load html2canvas + jsPDF on demand
        if (typeof html2canvas === 'undefined') {
            await new Promise((resolve, reject) => {
                var s = document.createElement('script');
                s.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
                s.onload = resolve; s.onerror = reject;
                document.head.appendChild(s);
            });
        }
        if (typeof window.jspdf === 'undefined') {
            await new Promise((resolve, reject) => {
                var s = document.createElement('script');
                s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
                s.onload = resolve; s.onerror = reject;
                document.head.appendChild(s);
            });
        }

        btn.classList.add('loading');
        const span = btn.querySelector('span');
        if (span) span.textContent = 'PDF...';

        try {
            const page = document.getElementById('page-analytics');

            // Temporarily hide the header and bottom spacer for cleaner output
            const pngBtn = document.getElementById('exportReportBtn');
            const ptrCont = page.querySelector('.ptr-container');

            if (btn) btn.style.visibility = 'hidden';
            if (pngBtn) pngBtn.style.visibility = 'hidden';
            if (ptrCont) ptrCont.style.display = 'none';

            const origOverflow = page.style.overflow;
            const origMaxH = page.style.maxHeight;
            page.style.overflow = 'visible';
            page.style.maxHeight = 'none';

            const monthLabel = document.getElementById('monthLabel')?.textContent || currentMonth;
            
            // Capture page
            const canvas = await html2canvas(page, {
                backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim() || '#0a0e1a',
                scale: 2,
                useCORS: true,
                allowTaint: true
            });

            // Restore visibility
            if (btn) btn.style.visibility = '';
            if (pngBtn) pngBtn.style.visibility = '';
            if (ptrCont) ptrCont.style.display = '';
            page.style.overflow = origOverflow;
            page.style.maxHeight = origMaxH;

            // Generate PDF
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = 210; // A4 width in mm
            const pageHeight = 297; // A4 height in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            let heightLeft = imgHeight;
            let position = 0;
            
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
            
            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            const safeMonth = monthLabel.replace(/\s+/g, '_');
            pdf.save(`SelarasKas_Laporan_${safeMonth}.pdf`);
            showToast(`✅ Laporan ${monthLabel} berhasil diexport ke PDF!`);
        } catch (err) {
            console.error('Export PDF error:', err);
            showToast('Gagal export PDF. Coba lagi.');
            
            const pngBtn = document.getElementById('exportReportBtn');
            if (btn) btn.style.visibility = '';
            if (pngBtn) pngBtn.style.visibility = '';
            const ptrEl = document.getElementById('page-analytics')?.querySelector('.ptr-container');
            if (ptrEl) ptrEl.style.display = '';
        } finally {
            btn.classList.remove('loading');
            if (span) span.textContent = 'PDF';
        }
    }

    function updateTime() {
        const now = new Date();
        const el = document.getElementById('statusTime');
        if (el) el.textContent = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
    }

    
    // ===== GOOGLE AUTH =====
    window.handleCredentialResponse = async function(response) {
        try {
            // decode jwt to get email and name locally (for simplicity, usually verify backend)
            const payload = JSON.parse(atob(response.credential.split('.')[1]));
            
            const data = await api('auth.php?action=google_login', {
                method: 'POST',
                body: JSON.stringify({
                    google_id: payload.sub,
                    email: payload.email,
                    name: payload.name,
                    avatar_url: payload.picture
                })
            });
            showApp(data.user);
            showToast('Berhasil login dengan Google! 🚀');
        } catch(e) {
            showToast(e.message);
        }
    };

    function showMockOAuthDialog(provider) {
        const title = provider === 'google' ? 'Simulator Login Google' : 'Simulator Login Facebook';
        const brandColor = provider === 'google' ? '#ea4335' : '#1877f2';
        
        const accounts = [
            { name: 'Budi Santoso', email: 'budi.santoso@gmail.com', avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Budi%20Santoso' },
            { name: 'Rizki Pratama', email: 'rizz@email.com', avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Rizki%20Pratama' },
            { name: 'Siti Aminah', email: 'siti.aminah@gmail.com', avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Siti%20Aminah' }
        ];

        const html = `
            <div class="mock-oauth-container" style="padding: 10px 0;">
                <p style="font-size: 14px; color: var(--text-secondary); margin-bottom: 20px; text-align: center;">
                    Siklus login sosial menggunakan mode simulator di localhost. Silakan pilih akun simulasi untuk masuk:
                </p>
                <div class="mock-oauth-list" style="display: flex; flex-direction: column; gap: 12px;">
                    ${accounts.map(acc => `
                        <div class="mock-oauth-account-item" data-name="${acc.name}" data-email="${acc.email}" data-avatar="${acc.avatar}" style="display: flex; align-items: center; gap: 16px; padding: 12px; background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 12px; cursor: pointer; transition: all 0.2s;">
                            <img src="${acc.avatar}" style="width: 40px; height: 40px; border-radius: 50%;" />
                            <div style="flex: 1; display: flex; flex-direction: column;">
                                <span style="font-size: 14px; font-weight: 600; color: var(--text-primary);">${acc.name}</span>
                                <span style="font-size: 12px; color: var(--text-muted);">${acc.email}</span>
                            </div>
                            <div class="mock-oauth-badge" style="background:${brandColor}15; color:${brandColor}; font-size: 10px; font-weight: 700; padding: 4px 8px; border-radius: 20px; text-transform: uppercase;">
                                ${provider}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        openModal(title, html);

        // Add interactive style dynamically
        const items = document.querySelectorAll('.mock-oauth-account-item');
        items.forEach(item => {
            item.addEventListener('mouseenter', () => {
                item.style.borderColor = brandColor;
                item.style.transform = 'translateY(-2px)';
            });
            item.addEventListener('mouseleave', () => {
                item.style.borderColor = 'var(--border-light)';
                item.style.transform = 'none';
            });

            item.addEventListener('click', async () => {
                const name = item.dataset.name;
                const email = item.dataset.email;
                const avatarUrl = item.dataset.avatar;
                const mockId = `mock_${provider}_` + btoa(email).replace(/=/g, '');

                closeModal();
                showToast(`Menghubungkan ke ${provider}...`);

                try {
                    let data;
                    if (provider === 'google') {
                        data = await api('auth.php?action=google_login', {
                            method: 'POST',
                            body: JSON.stringify({ google_id: mockId, name, email, avatar_url: avatarUrl })
                        });
                    } else {
                        data = await api('auth.php?action=facebook_login', {
                            method: 'POST',
                            body: JSON.stringify({ facebook_id: mockId, name, email, avatar_url: avatarUrl })
                        });
                    }
                    showApp(data.user);
                    showToast(`Berhasil login simulasi dengan ${provider}! 🚀`);
                } catch (err) {
                    showToast(err.message);
                }
            });
        });
    }

    function initGoogleAuth() {
        const isDummy = !authConfig.google_client_id || authConfig.google_client_id.includes('DUMMY');
        const btn1 = document.getElementById('googleAuthBtn');
        const btn2 = document.getElementById('googleAuthBtn2');

        if (isDummy) {
            const mockGoogleLogin = () => showMockOAuthDialog('google');
            if (btn1) btn1.addEventListener('click', mockGoogleLogin);
            if (btn2) btn2.addEventListener('click', mockGoogleLogin);
        } else {
            if (window.google && window.google.accounts && window.google.accounts.oauth2) {
                try {
                    const tokenClient = google.accounts.oauth2.initTokenClient({
                        client_id: authConfig.google_client_id,
                        scope: 'openid profile email',
                        callback: async (tokenResponse) => {
                            if (tokenResponse && tokenResponse.access_token) {
                                try {
                                    showToast('Mengambil profil Google...');
                                    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                                        headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                                    });
                                    if (!userInfoRes.ok) throw new Error('Gagal mengambil data profil Google');
                                    const userInfo = await userInfoRes.json();
                                    
                                    const data = await api('auth.php?action=google_login', {
                                        method: 'POST',
                                        body: JSON.stringify({
                                            google_id: userInfo.sub,
                                            name: userInfo.name,
                                            email: userInfo.email,
                                            avatar_url: userInfo.picture
                                        })
                                    });
                                    showApp(data.user);
                                    showToast('Berhasil login dengan Google! 🚀');
                                } catch (err) {
                                    showToast(err.message);
                                }
                            }
                        }
                    });

                    const triggerGoogleLogin = () => {
                        tokenClient.requestAccessToken({ prompt: 'consent' });
                    };

                    if (btn1) btn1.addEventListener('click', triggerGoogleLogin);
                    if (btn2) btn2.addEventListener('click', triggerGoogleLogin);
                } catch (e) {
                    console.error('Failed to initialize Google token client:', e);
                }
            } else {
                setTimeout(initGoogleAuth, 500); // Retry if SDK not loaded
            }
        }
    }

    // ===== FACEBOOK AUTH =====
    function initFacebookAuth() {
        const isDummy = !authConfig.facebook_app_id || authConfig.facebook_app_id.includes('DUMMY');
        const fbBtn1 = document.getElementById('facebookAuthBtn');
        const fbBtn2 = document.getElementById('facebookAuthBtn2');

        if (isDummy) {
            const mockFBLogin = () => showMockOAuthDialog('facebook');
            if (fbBtn1) fbBtn1.addEventListener('click', mockFBLogin);
            if (fbBtn2) fbBtn2.addEventListener('click', mockFBLogin);
        } else {
            window.fbAsyncInit = function() {
                FB.init({
                    appId      : authConfig.facebook_app_id,
                    cookie     : true,
                    xfbml      : true,
                    version    : 'v18.0'
                });
            };

            // Load SDK dynamically
            (function(d, s, id) {
                var js, fjs = d.getElementsByTagName(s)[0];
                if (d.getElementById(id)) return;
                js = d.createElement(s); js.id = id;
                js.src = "https://connect.facebook.net/en_US/sdk.js";
                fjs.parentNode.insertBefore(js, fjs);
            }(document, 'script', 'facebook-jssdk'));

            const loginWithFB = () => {
                if (!window.FB) {
                    showToast('Facebook SDK sedang memuat, silakan coba lagi...');
                    return;
                }
                FB.login(function(response) {
                    if (response.authResponse) {
                        FB.api('/me', { fields: 'id,name,email,picture.type(large)' }, async function(userData) {
                            try {
                                const data = await api('auth.php?action=facebook_login', {
                                    method: 'POST',
                                    body: JSON.stringify({
                                        facebook_id: userData.id,
                                        name: userData.name,
                                        email: userData.email || (userData.id + '@facebook.com'),
                                        avatar_url: userData.picture?.data?.url || null
                                    })
                                });
                                showApp(data.user);
                                showToast('Berhasil login dengan Facebook! 🚀');
                            } catch (err) {
                                showToast(err.message);
                            }
                        });
                    } else {
                        showToast('Login Facebook dibatalkan');
                    }
                }, { scope: 'public_profile' });
            };

            if (fbBtn1) fbBtn1.addEventListener('click', loginWithFB);
            if (fbBtn2) fbBtn2.addEventListener('click', loginWithFB);
        }
    }

    // ===== PROFILE FEATURES =====
    function initProfileFeatures() {
        // Avatar Upload
        const avatarContainer = document.getElementById('avatarContainer');
        const avatarUpload = document.getElementById('avatarUpload');
        if (avatarContainer && avatarUpload) {
            avatarContainer.addEventListener('click', () => avatarUpload.click());
            
            avatarUpload.addEventListener('change', async (e) => {
                if (!e.target.files.length) return;
                const file = e.target.files[0];
                const formData = new FormData();
                formData.append('avatar', file);
                formData.append('csrf_token', csrfToken);
                
                showToast('Mengupload foto...');
                try {
                    // Bypass API function because we need multipart/form-data
                    const res = await fetch(`${API}/profile.php?action=upload_photo`, {
                        method: 'POST',
                        headers: {
                            'X-CSRF-Token': csrfToken
                        },
                        body: formData
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Upload gagal');
                    
                    currentUser.avatar_url = data.avatar_url;
                    showApp(currentUser); // Refresh UI
                    showToast('Foto berhasil diperbarui!');
                } catch(err) {
                    showToast(err.message);
                }
            });
        }

        // Edit Profile
        const btnEditProfile = document.getElementById('settingEditProfile');
        if (btnEditProfile) {
            btnEditProfile.addEventListener('click', () => {
                const html = `
                    <div class="form-group">
                        <label>Nama Lengkap</label>
                        <input type="text" id="editProfileName" value="${currentUser.name}">
                    </div>
                    <button class="modal-submit-btn success-btn" id="saveProfileBtn">Simpan</button>
                `;
                openModal('Ubah Profil', html);
                setTimeout(() => {
                    document.getElementById('saveProfileBtn').addEventListener('click', async () => {
                        const name = document.getElementById('editProfileName').value;
                        if (!name) return showToast('Nama tidak boleh kosong');
                        try {
                            const data = await api('profile.php?action=update_profile', {
                                method: 'POST',
                                body: JSON.stringify({ name })
                            });
                            currentUser.name = data.name;
                            currentUser.avatar_initial = data.avatar_initial;
                            showApp(currentUser);
                            closeModal();
                            showToast('Profil diperbarui');
                        } catch(e) { showToast(e.message); }
                    });
                }, 100);
            });
        }

        // Change Password
        const btnChangePass = document.getElementById('settingChangePassword');
        if (btnChangePass) {
            btnChangePass.addEventListener('click', () => {
                const html = `
                    <div class="form-group">
                        <label>Password Lama</label>
                        <input type="password" id="oldPass">
                    </div>
                    <div class="form-group">
                        <label>Password Baru</label>
                        <input type="password" id="newPass">
                    </div>
                    <button class="modal-submit-btn success-btn" id="savePassBtn">Ubah Password</button>
                `;
                openModal('Ubah Password', html);
                setTimeout(() => {
                    document.getElementById('savePassBtn').addEventListener('click', async () => {
                        const old_password = document.getElementById('oldPass').value;
                        const new_password = document.getElementById('newPass').value;
                        if (!old_password || !new_password) return showToast('Lengkapi data');
                        try {
                            await api('profile.php?action=change_password', {
                                method: 'POST',
                                body: JSON.stringify({ old_password, new_password })
                            });
                            closeModal();
                            showToast('Password berhasil diubah');
                        } catch(e) { showToast(e.message); }
                    });
                }, 100);
            });
        }

        // Support Modal
        const btnSupport = document.getElementById('settingSupport');
        if (btnSupport) {
            btnSupport.addEventListener('click', () => {
                if (window.Selaraskas && window.Selaraskas.openSupportModal) {
                    window.Selaraskas.openSupportModal();
                }
            });
        }
        
        const supportInput = document.getElementById('supportChatInput');
        if (supportInput) {
            supportInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    if (window.Selaraskas && window.Selaraskas.sendSupportMessage) {
                        window.Selaraskas.sendSupportMessage();
                    }
                }
            });
        }

        // Biometric Settings Toggle & Buttons
        const bioItem = document.getElementById('settingBiometric');
        const bioToggle = document.getElementById('biometricToggleBtn');
        const bioRegister = document.getElementById('biometricRegisterBtn');
        
        async function toggleBiometric() {
            const toggleBtn = document.getElementById('biometricToggleBtn');
            if (!toggleBtn) return;
            const isActive = toggleBtn.classList.contains('active');
            
            if (isActive) {
                if (confirm('Apakah Anda yakin ingin menonaktifkan login Sidik Jari? Semua data sidik jari/Face ID yang terdaftar akan dihapus.')) {
                    try {
                        await api('auth.php?action=webauthn_credentials', {
                            method: 'DELETE',
                            body: JSON.stringify({ all: true })
                        });
                        showToast('Login biometrik dinonaktifkan');
                        loadBiometricSettings();
                    } catch (err) {
                        showToast(err.message || 'Gagal menonaktifkan biometrik');
                    }
                }
            } else {
                registerBiometric();
            }
        }
        
        if (bioItem) {
            bioItem.addEventListener('click', (e) => {
                if (e.target.closest('.biometric-toggle') || e.target.closest('.biometric-register-btn') || e.target.closest('.biometric-cred-delete')) {
                    return;
                }
                toggleBiometric();
            });
        }
        if (bioToggle) {
            bioToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleBiometric();
            });
        }
        if (bioRegister) {
            bioRegister.addEventListener('click', (e) => {
                e.stopPropagation();
                registerBiometric();
            });
        }
    }

    // ===== PUSH NOTIFICATIONS =====

    function urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    function updatePushToggleUI(isActive) {
        const toggleBtn = document.getElementById('pushNotifToggleBtn');
        const label = document.getElementById('pushNotifLabel');
        if (toggleBtn) {
            if (isActive) {
                toggleBtn.classList.add('active');
                toggleBtn.style.background = '#22c55e';
                const knob = toggleBtn.querySelector('.toggle-knob');
                if (knob) knob.style.transform = 'translateX(20px)';
            } else {
                toggleBtn.classList.remove('active');
                toggleBtn.style.background = 'rgba(255,255,255,0.1)';
                const knob = toggleBtn.querySelector('.toggle-knob');
                if (knob) knob.style.transform = 'translateX(0)';
            }
        }
        if (label) {
            label.textContent = isActive ? 'Aktif' : 'Tidak Aktif';
        }
    }

    async function initPushNotification() {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            const item = document.getElementById('settingPushNotif');
            if (item) item.style.display = 'none';
            return;
        }

        try {
            const vapidData = await api('push.php?action=vapid_public_key');
            vapidPublicKey = vapidData.public_key;
        } catch (err) {
            console.error('Failed to fetch VAPID key:', err);
            return;
        }

        try {
            const statusData = await api('push.php?action=status');
            updatePushToggleUI(statusData.subscribed === true);
        } catch (err) {
            console.error('Failed to check push status:', err);
        }

        // Toggle event handler
        const pushItem = document.getElementById('settingPushNotif');
        const pushToggle = document.getElementById('pushNotifToggleBtn');

        async function handlePushToggle() {
            const isActive = pushToggle && pushToggle.classList.contains('active');
            if (isActive) {
                await unsubscribePush();
            } else {
                await subscribePush();
            }
        }

        if (pushItem) {
            pushItem.addEventListener('click', (e) => {
                if (e.target.closest('.push-notif-toggle')) return;
                handlePushToggle();
            });
        }
        if (pushToggle) {
            pushToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                handlePushToggle();
            });
        }
    }

    async function subscribePush() {
        if (!('Notification' in window)) {
            showToast('Browser tidak mendukung notifikasi');
            return;
        }

        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                showToast('Izin notifikasi ditolak');
                return;
            }

            const reg = await navigator.serviceWorker.ready;
            const subscription = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
            });

            const subJSON = subscription.toJSON();
            await api('push.php?action=subscribe', {
                method: 'POST',
                body: JSON.stringify({
                    endpoint: subJSON.endpoint,
                    keys: {
                        p256dh: subJSON.keys.p256dh,
                        auth: subJSON.keys.auth
                    }
                })
            });

            updatePushToggleUI(true);
            showToast('Notifikasi berhasil diaktifkan! \uD83D\uDD14');
        } catch (err) {
            console.error('Push subscribe error:', err);
            showToast(err.message || 'Gagal mengaktifkan notifikasi');
        }
    }

    async function unsubscribePush() {
        try {
            const reg = await navigator.serviceWorker.ready;
            const subscription = await reg.pushManager.getSubscription();
            if (subscription) {
                const endpoint = subscription.endpoint;
                await subscription.unsubscribe();
                await api('push.php?action=unsubscribe', {
                    method: 'POST',
                    body: JSON.stringify({ endpoint: endpoint })
                });
            }

            updatePushToggleUI(false);
            showToast('Notifikasi dinonaktifkan');
        } catch (err) {
            console.error('Push unsubscribe error:', err);
            showToast(err.message || 'Gagal menonaktifkan notifikasi');
        }
    }

    function promptPushNotification() {
        if (localStorage.getItem('pushPromptShown')) return;
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
        if (Notification.permission === 'granted') {
            localStorage.setItem('pushPromptShown', '1');
            return;
        }
        if (Notification.permission === 'denied') {
            localStorage.setItem('pushPromptShown', '1');
            return;
        }

        setTimeout(() => {
            localStorage.setItem('pushPromptShown', '1');
            showToast('\uD83D\uDD14 Aktifkan Push Notifikasi di Profil untuk menerima update transaksi!');
        }, 3000);
    }

    async function loadAuthConfig() {
        try {
            const data = await api('auth.php?action=config');
            authConfig.google_client_id = data.google_client_id;
            authConfig.facebook_app_id = data.facebook_app_id;
        } catch (e) {
            console.error('Failed to load OAuth config:', e);
        }
        initGoogleAuth();
        initFacebookAuth();
    }

    // ===== INIT =====
    function init() {
        updateTime();
        setInterval(updateTime, 30000);

        initAuth();
        initTheme();
        initNavigation();
        initModal();
        initMonthNav();
        
        initPullToRefresh();
        initSwipeToDelete(document.getElementById('transactionsList'));
        initOfflineMode();
        loadAuthConfig();
        initProfileFeatures();
        initPushNotification();
        initAIChat();

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').then(reg => {
                reg.update();
            }).catch(e => console.error('SW init failed:', e));
        }

        // Button handlers
        document.getElementById('addIncomeBtn').addEventListener('click', () => showTransactionForm('income'));
        document.getElementById('addExpenseBtn').addEventListener('click', () => showTransactionForm('expense'));
        document.getElementById('addSavingBtn').addEventListener('click', showSavingsForm);
        
        const scanReceiptBtn = document.getElementById('scanReceiptBtn');
        if (scanReceiptBtn) scanReceiptBtn.addEventListener('click', showScanReceiptForm);

        const exportBtn = document.getElementById('exportReportBtn');
        if (exportBtn) exportBtn.addEventListener('click', exportAnalyticsAsPng);
        
        const exportPdfBtn = document.getElementById('exportReportPdfBtn');
        if (exportPdfBtn) exportPdfBtn.addEventListener('click', exportAnalyticsAsPdf);
        
        const addBudgetBtn = document.getElementById('addBudgetBtn');
        if (addBudgetBtn) addBudgetBtn.addEventListener('click', showBudgetForm);
        
        const pbBtn = document.getElementById('prevBudgetMonth');
        if (pbBtn) pbBtn.addEventListener('click', () => {
            const d = new Date(currentBudgetMonth + '-01'); d.setMonth(d.getMonth() - 1);
            currentBudgetMonth = d.toISOString().slice(0, 7); loadBudgets();
        });
        
        const nbBtn = document.getElementById('nextBudgetMonth');
        if (nbBtn) nbBtn.addEventListener('click', () => {
            const d = new Date(currentBudgetMonth + '-01'); d.setMonth(d.getMonth() + 1);
            currentBudgetMonth = d.toISOString().slice(0, 7); loadBudgets();
        });

        // Expose for inline onclick
        window.Selaraskas = {
        showBudgetForm, deleteTransaction, deleteSaving, deleteBudget, showAddToSaving, showScanReceiptForm, registerBiometric,
        openWalletMembers: async function() {
            const walletId = document.getElementById('walletSwitcher').value;
            if (!walletId) return;
            const html = `
                <div style="display:flex; gap:8px; margin-bottom:16px;">
                    <input type="email" id="inviteEmail" class="form-input" placeholder="Email teman..." style="flex:1">
                    <button class="btn btn-primary" onclick="window.Selaraskas.inviteWalletMember(${walletId})">Undang</button>
                </div>
                <div id="walletMembersList" style="display:flex; flex-direction:column; gap:12px;">
                    <div style="text-align:center; color:var(--text-secondary); padding:20px;">Memuat anggota...</div>
                </div>
            `;
            openModal('Kelola Anggota Dompet', html);
            window.Selaraskas.loadWalletMembers(walletId);
        },
        loadWalletMembers: async function(walletId) {
            const listDiv = document.getElementById('walletMembersList');
            if (!listDiv) return;
            try {
                const res = await api('wallets.php?action=list_members&wallet_id=' + walletId);
                if (res && res.success && res.members) {
                    listDiv.innerHTML = '';
                    res.members.forEach(m => {
                        let roleBadge = m.role === 'owner' ? '<span style="background:var(--color-primary); color:#fff; font-size:10px; padding:2px 6px; border-radius:12px;">Owner</span>' : '<span style="background:rgba(255,255,255,0.1); font-size:10px; padding:2px 6px; border-radius:12px;">' + escapeHTML(m.role) + '</span>';
                        let deleteBtn = (res.my_role === 'owner' && m.id !== window.currentUserId) ? 
                            `<button onclick="window.Selaraskas.removeWalletMember(${parseInt(walletId)}, ${parseInt(m.id)})" style="background:var(--color-danger); color:#fff; border:none; padding:4px 8px; border-radius:4px; font-size:12px; cursor:pointer;">Hapus</button>` : '';
                        
                        listDiv.innerHTML += `
                            <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:10px; border-radius:8px;">
                                <div style="display:flex; align-items:center; gap:12px;">
                                    <div class="avatar" style="width:32px; height:32px; font-size:14px;"><span>${escapeHTML(m.avatar_initial || '?')}</span></div>
                                    <div>
                                        <div style="font-size:14px; font-weight:600;">${escapeHTML(m.name)} ${roleBadge}</div>
                                        <div style="font-size:12px; color:var(--text-secondary);">${escapeHTML(m.email)}</div>
                                    </div>
                                </div>
                                ${deleteBtn}
                            </div>
                        `;
                    });
                }
            } catch (err) {
                listDiv.innerHTML = `<div style="color:var(--color-danger); text-align:center;">Gagal memuat: ${err.message}</div>`;
            }
        },
        inviteWalletMember: async function(walletId) {
            const emailInput = document.getElementById('inviteEmail');
            const email = emailInput.value.trim();
            if (!email) return alert('Masukkan email');
            try {
                const res = await api('wallets.php?action=invite', {
                    method: 'POST',
                    body: JSON.stringify({ wallet_id: walletId, email: email })
                });
                if (res && res.success) {
                    showToast('Berhasil mengundang anggota');
                    emailInput.value = '';
                    window.Selaraskas.loadWalletMembers(walletId);
                } else {
                    alert(res.error || 'Gagal mengundang');
                }
            } catch (err) {
                alert(err.message || 'Gagal mengundang anggota');
            }
        },
        removeWalletMember: async function(walletId, userId) {
            if (!confirm('Yakin ingin mengeluarkan anggota ini dari dompet?')) return;
            try {
                const res = await api('wallets.php?action=remove_member', {
                    method: 'POST',
                    body: JSON.stringify({ wallet_id: walletId, user_id: userId })
                });
                if (res && res.success) {
                    showToast('Anggota dikeluarkan');
                    window.Selaraskas.loadWalletMembers(walletId);
                } else {
                    alert(res.error || 'Gagal mengeluarkan');
                }
            } catch (err) {
                alert(err.message || 'Gagal mengeluarkan anggota');
            }
        },
        deleteBiometricCred: async function(id) {
            if (!confirm('Hapus sidik jari ini?')) return;
            try {
                await api('auth.php?action=webauthn_credentials', {
                    method: 'DELETE',
                    body: JSON.stringify({ id })
                });
                showToast('Credential dihapus');
                loadBiometricSettings();
            } catch (err) {
                showToast(err.message || 'Gagal menghapus');
            }
        },
        openSupportModal: function() {
            document.getElementById('modalSupport').classList.add('active');
            setTimeout(() => {
                document.getElementById('supportChatInput').focus();
            }, 100);
        },
        closeSupportModal: function() {
            document.getElementById('modalSupport').classList.remove('active');
        },
        sendSupportMessage: async function() {
            const input = document.getElementById('supportChatInput');
            const msg = input.value.trim();
            if (!msg) return;

            const chatArea = document.getElementById('supportChatArea');
            chatArea.innerHTML += `
                <div class="chat-message user-message" style="display:flex; gap:10px; align-items:flex-end; justify-content:flex-end;">
                    <div class="chat-bubble" style="background:var(--color-primary); color:white; padding:10px 14px; border-radius:12px 12px 0 12px; font-size:14px; line-height:1.4; box-shadow:0 2px 5px rgba(0,0,0,0.1); max-width:85%;">
                        ${escapeHTML(msg)}
                    </div>
                </div>
            `;
            input.value = '';
            chatArea.scrollTop = chatArea.scrollHeight;

            const typingId = 'typing-' + Date.now();
            chatArea.innerHTML += `
                <div id="${typingId}" class="chat-message ai-message" style="display:flex; gap:10px; align-items:flex-start;">
                    <div class="chat-avatar" style="width:30px; height:30px; border-radius:50%; background:var(--color-primary); display:flex; align-items:center; justify-content:center; color:white; font-size:14px; flex-shrink:0;">🤖</div>
                    <div class="chat-bubble" style="background:var(--bg-card); padding:10px 14px; border-radius:0 12px 12px 12px; font-size:14px; color:var(--text-muted); font-style:italic;">
                        Mengetik...
                    </div>
                </div>
            `;
            chatArea.scrollTop = chatArea.scrollHeight;

            try {
                const res = await api('ai_chat.php?action=support', {
                    method: 'POST',
                    body: JSON.stringify({ message: msg })
                });
                
                const typingEl = document.getElementById(typingId);
                if (typingEl) typingEl.remove();
                if (res.error) throw new Error(res.error);
                
                let replyHtml = escapeHTML(res.reply).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
                
                chatArea.innerHTML += `
                    <div class="chat-message ai-message" style="display:flex; gap:10px; align-items:flex-start;">
                        <div class="chat-avatar" style="width:30px; height:30px; border-radius:50%; background:var(--color-primary); display:flex; align-items:center; justify-content:center; color:white; font-size:14px; flex-shrink:0;">🤖</div>
                        <div class="chat-bubble" style="background:var(--bg-card); padding:10px 14px; border-radius:0 12px 12px 12px; font-size:14px; line-height:1.4; box-shadow:0 2px 5px rgba(0,0,0,0.05); color:var(--text-color);">
                            ${replyHtml}
                        </div>
                    </div>
                `;
            } catch (err) {
                const typingEl = document.getElementById(typingId);
                if (typingEl) typingEl.remove();
                chatArea.innerHTML += `
                    <div class="chat-message ai-message" style="display:flex; gap:10px; align-items:flex-start;">
                        <div class="chat-avatar" style="width:30px; height:30px; border-radius:50%; background:var(--danger-color); display:flex; align-items:center; justify-content:center; color:white; font-size:14px; flex-shrink:0;">⚠️</div>
                        <div class="chat-bubble" style="background:var(--bg-card); padding:10px 14px; border-radius:0 12px 12px 12px; font-size:14px; color:var(--danger-color);">
                            ${escapeHTML(err.message || 'Gagal menghubungi server')}
                        </div>
                    </div>
                `;
            }
            chatArea.scrollTop = chatArea.scrollHeight;
        },
        contactAdmin: function(type) {
            const adminWA = '6281385084327';
            const adminEmail = 'rizkidwisandy1@gmail.com';
            
            if (type === 'wa') {
                const msg = 'Halo Admin SelarasKas, saya butuh bantuan.';
                window.open(`https://wa.me/${adminWA}?text=${encodeURIComponent(msg)}`, '_blank');
            } else if (type === 'email') {
                window.location.href = `mailto:${adminEmail}?subject=Bantuan SelarasKas`;
            }
        }
        };

        // Check session
        checkSession();
    }

    // ===== SKELETONS =====
    function renderSkeletonTransactions(container) {
        if (!container) return;
        container.innerHTML = Array(4).fill(0).map((_,i) => `
            <div class="transaction-item fade-in-up stagger-${i+1}">
                <div class="skeleton sk-avatar"></div>
                <div style="flex:1;margin-left:12px;">
                    <div class="skeleton sk-text w-50"></div>
                    <div class="skeleton sk-text w-30"></div>
                </div>
                <div class="skeleton sk-text w-30"></div>
            </div>`).join('');
    }
    
    function renderSkeletonChart(container) {
        if (!container) return;
        container.innerHTML = '<div class="skeleton sk-circle" style="margin: 0 auto;"></div>';
    }

    // ===== PULL TO REFRESH =====
    function initPullToRefresh() {
        let startY = 0;
        let isPulling = false;
        const threshold = 60;
        
        ['home', 'analytics'].forEach(pageId => {
            const page = document.getElementById('page-' + pageId);
            const ptr = document.getElementById('ptr' + (pageId === 'home' ? 'Home' : 'Analytics'));
            if (!page || !ptr) return;
            const icon = ptr.querySelector('.ptr-icon');
            
            page.addEventListener('touchstart', e => {
                if (page.scrollTop === 0) {
                    startY = e.touches[0].clientY;
                    isPulling = true;
                }
            }, { passive: true });
            
            page.addEventListener('touchmove', e => {
                if (!isPulling) return;
                const y = e.touches[0].clientY;
                const pullDist = y - startY;
                if (pullDist > 0 && page.scrollTop === 0) {
                    ptr.style.transform = `translateY(${Math.min(pullDist - 60, 0)}px)`;
                    icon.style.transform = `rotate(${pullDist * 2}deg)`;
                    if (pullDist > threshold) icon.classList.add('spin');
                    else icon.classList.remove('spin');
                }
            }, { passive: true });
            
            page.addEventListener('touchend', e => {
                if (!isPulling) return;
                isPulling = false;
                const y = e.changedTouches[0].clientY;
                if (y - startY > threshold && page.scrollTop === 0) {
                    ptr.style.transform = 'translateY(0)';
                    icon.classList.add('spin');
                    
                    const p = pageId === 'home' ? loadDashboard() : loadAnalytics();
                    p.then(() => {
                        setTimeout(() => {
                            ptr.style.transform = 'translateY(-100%)';
                            icon.classList.remove('spin');
                        }, 500);
                    });
                } else {
                    ptr.style.transform = 'translateY(-100%)';
                }
            });
        });
    }

    // ===== SWIPE TO DELETE =====
    function initSwipeToDelete(container) {
        let startX = 0;
        let currentX = 0;
        let activeItem = null;
        
        container.addEventListener('touchstart', e => {
            const item = e.target.closest('.transaction-item');
            if (!item) return;
            activeItem = item.querySelector('.transaction-content');
            if (!activeItem) {
                // If it doesn't have .transaction-content, we'll wrap it automatically on render, 
                // but since we modified CSS to use .transaction-content, we'll use that.
                return;
            }
            startX = e.touches[0].clientX;
            activeItem.style.transition = 'none';
        }, { passive: true });
        
        container.addEventListener('touchmove', e => {
            if (!activeItem) return;
            currentX = e.touches[0].clientX;
            const diff = currentX - startX;
            if (diff < 0) {
                activeItem.style.transform = `translateX(${Math.max(diff, -80)}px)`;
            } else {
                activeItem.style.transform = `translateX(0)`;
            }
        }, { passive: true });
        
        container.addEventListener('touchend', e => {
            if (!activeItem) return;
            activeItem.style.transition = 'transform 0.2s ease-out';
            const diff = currentX - startX;
            if (diff < -40) {
                activeItem.style.transform = `translateX(-80px)`;
                const txId = activeItem.parentElement.dataset.id;
                // create delete confirm button underneath
                if (!activeItem.parentElement.querySelector('.transaction-delete-bg')) {
                    const bg = document.createElement('div');
                    bg.className = 'transaction-delete-bg';
                    bg.innerHTML = 'Hapus';
                    bg.onclick = () => window.Selaraskas.deleteTransaction(txId);
                    activeItem.parentElement.insertBefore(bg, activeItem);
                }
            } else {
                activeItem.style.transform = `translateX(0)`;
                setTimeout(() => {
                    const bg = activeItem.parentElement.querySelector('.transaction-delete-bg');
                    if (bg) bg.remove();
                }, 200);
            }
            activeItem = null;
        });
    }

    // ===== BUDGETING =====
    let currentBudgetMonth = currentMonth;
    
    async function loadBudgets() {
        document.getElementById('budgetMonthLabel').textContent = formatMonthLabel(currentBudgetMonth);
        const list = document.getElementById('budgetList');
        list.innerHTML = '<div class="skeleton sk-card fade-in-up"></div><div class="skeleton sk-item fade-in-up"></div>';
        
        try {
            const data = await api(`budget.php?month=${currentBudgetMonth}`);
            renderBudgets(data);
        } catch(err) {
            console.error('Budget error', err);
        }
    }
    
    function renderBudgets(data) {
        document.getElementById('budgetTotalAmount').textContent = formatRp(data.total_budget);
        const remainEl = document.getElementById('budgetTotalRemain');
        const remain = data.total_budget - data.total_spent;
        if (remain < 0) {
            remainEl.innerHTML = 'Melebihi: ' + formatRp(Math.abs(remain)) + ' <span style="font-weight:bold;color:var(--color-danger)">!</span>';
        } else {
            remainEl.textContent = 'Sisa: ' + formatRp(remain);
        }
        
        let pct = data.total_budget > 0 ? (data.total_spent / data.total_budget) * 100 : 0;
        pct = Math.min(100, Math.max(0, pct));
        
        document.getElementById('budgetTotalPct').textContent = pct.toFixed(0) + '%';
        const circle = document.getElementById('budgetTotalProgress');
        const offset = 175 - (175 * pct / 100);
        circle.style.strokeDashoffset = offset;
        
        if (pct >= 100) { circle.style.stroke = 'var(--color-danger)'; remainEl.className = 'budget-total-remain danger'; }
        else if (pct >= 80) { circle.style.stroke = 'var(--color-warning)'; remainEl.className = 'budget-total-remain warning'; }
        else { circle.style.stroke = 'var(--color-success)'; remainEl.className = 'budget-total-remain good'; }
        
        const list = document.getElementById('budgetList');
        if (!data.budgets || !data.budgets.length) {
            list.innerHTML = '<div class="empty-state"><span class="empty-icon">📊</span><span class="empty-text">Belum ada anggaran</span><span class="empty-sub">Tap + untuk buat anggaran</span></div>';
            return;
        }
        
        list.innerHTML = data.budgets.map(b => {
            let itemPct = (b.spent / b.amount) * 100;
            itemPct = Math.min(100, Math.max(0, itemPct));
            let color = 'var(--color-success)';
            if (itemPct >= 100) color = 'var(--color-danger)';
            else if (itemPct >= 80) color = 'var(--color-warning)';
            
            let remainText = 'Sisa ' + formatRp(b.amount - b.spent, true);
            if (b.amount - b.spent < 0) {
                remainText = 'Melebihi ' + formatRp(Math.abs(b.amount - b.spent), true) + ' <span style="font-weight:bold;color:var(--color-danger)">!</span>';
            }
            
            return `
            <div class="budget-item fade-in-up" onclick="window.Selaraskas.showBudgetForm(${b.category_id}, ${b.amount})" style="cursor:pointer">
                <div class="budget-item-top">
                    <div class="budget-item-icon" style="background:${b.category_color}18; display:flex; align-items:center; justify-content:center;">${renderEmojiOrIcon(b.category_emoji, '20px', b.category_color)}</div>
                    <div class="budget-item-info">
                        <span class="budget-item-title">${escapeHTML(b.category_name)}</span>
                        <span class="budget-item-amounts">${formatRp(b.spent, true)} / ${formatRp(b.amount, true)}</span>
                    </div>
                    <button class="budget-item-delete" onclick="event.stopPropagation(); window.Selaraskas.deleteBudget(${b.id})">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </div>
                <div class="budget-progress-bar">
                    <div class="budget-progress-fill" style="width:${itemPct}%;background:${color}"></div>
                </div>
                <div class="budget-progress-row">
                    <span class="budget-progress-text" style="color:${color}">${itemPct.toFixed(0)}%</span>
                    <span class="budget-remain-text">${remainText}</span>
                </div>
            </div>`;
        }).join('');
    }
    
    async function showBudgetForm(existingCatId = null, existingAmount = null) {
        const categories = await loadCategories('expense');

        let catPickerHTML = categories.map(cat => {
            const hasChildren = cat.children && cat.children.length > 0;
            let childrenHTML = '';
            if (hasChildren) {
                childrenHTML = `<div class="category-children" data-parent="${cat.id}">
                    ${cat.children.map(ch => `
                        <div class="category-child" data-id="${ch.id}" data-name="${ch.name}" data-emoji="${ch.emoji || ''}">
                            <span class="category-child-emoji" style="display:flex; align-items:center;">${renderEmojiOrIcon(ch.emoji, '18px')}</span>
                            <span class="category-child-name">${ch.name}</span>
                        </div>
                    `).join('')}
                </div>`;
            }
            return `
                <div class="category-parent" data-id="${cat.id}" data-name="${cat.name}" data-emoji="${cat.emoji || ''}" data-has-children="${hasChildren}">
                    <span class="category-parent-emoji" style="display:flex; align-items:center;">${renderEmojiOrIcon(cat.emoji, '18px')}</span>
                    <span class="category-parent-name">${cat.name}</span>
                    <svg class="category-parent-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
                ${childrenHTML}`;
        }).join('');
        
        const html = `
            <div class="form-group">
                <label>Kategori</label>
                <input type="hidden" id="budgetCategoryId" value="${existingCatId ? existingCatId : ''}">
                <div id="budgetSelectedCategory" class="select-category-trigger" onclick="document.getElementById('budgetCategoryPicker').style.display=document.getElementById('budgetCategoryPicker').style.display==='none'?'flex':'none'">
                    <span class="select-category-icon-wrapper">
                        <span class="input-icon">${renderEmojiOrIcon('tag', '18px')}</span>
                    </span>
                    <span class="select-category-text">Pilih kategori...</span>
                </div>
                <div class="category-picker" id="budgetCategoryPicker" style="display:none;margin-top:8px;max-height:200px;overflow-y:auto;">
                    ${catPickerHTML}
                </div>
            </div>
            <div class="form-group">
                <label>Jumlah Anggaran (Rp)</label>
                <div class="input-with-icon">
                    <span class="input-icon">${renderEmojiOrIcon('wallet', '18px')}</span>
                    <input type="text" id="budgetAmount" placeholder="Rp 0" value="${existingAmount ? 'Rp ' + parseInt(existingAmount).toLocaleString('id-ID') : ''}" required inputmode="numeric">
                </div>
            </div>
            <button class="modal-submit-btn success-btn" id="budgetSubmitBtn">Simpan Anggaran</button>
        `;
        openModal('Atur Anggaran', html);
        setTimeout(() => lucide.createIcons(), 50);
        setTimeout(() => initRupiahFormatter('budgetAmount'), 100);
        
        // Setup existing category name if any
        if (existingCatId) {
            let catName = 'Pilih kategori...';
            let catEmoji = 'tag';
            categories.forEach(c => {
                if (c.id == existingCatId) { catName = c.name; catEmoji = c.emoji; }
                if (c.children) {
                    c.children.forEach(ch => { if (ch.id == existingCatId) { catName = ch.name; catEmoji = ch.emoji; } });
                }
            });
            const wrapper = document.querySelector('#budgetSelectedCategory .select-category-icon-wrapper');
            if (wrapper) wrapper.innerHTML = renderEmojiOrIcon(catEmoji, '18px');
            const text = document.querySelector('#budgetSelectedCategory .select-category-text');
            if (text) text.textContent = catName;
            document.getElementById('budgetSelectedCategory').classList.add('has-value');
        }

        setTimeout(() => {
            document.querySelectorAll('#budgetCategoryPicker .category-parent').forEach(parent => {
                parent.addEventListener('click', () => {
                    const hasChildren = parent.dataset.hasChildren === 'true';
                    if (hasChildren) {
                        const children = parent.nextElementSibling;
                        const isOpen = children.classList.contains('show');
                        document.querySelectorAll('#budgetCategoryPicker .category-children').forEach(c => c.classList.remove('show'));
                        document.querySelectorAll('#budgetCategoryPicker .category-parent').forEach(p => p.classList.remove('expanded'));
                        if (!isOpen) {
                            children.classList.add('show');
                            parent.classList.add('expanded');
                        }
                    } else {
                        document.getElementById('budgetCategoryId').value = parent.dataset.id;
                        const wrapper = document.querySelector('#budgetSelectedCategory .select-category-icon-wrapper');
                        if (wrapper) wrapper.innerHTML = renderEmojiOrIcon(parent.dataset.emoji, '18px');
                        const text = document.querySelector('#budgetSelectedCategory .select-category-text');
                        if (text) text.textContent = parent.dataset.name;
                        document.getElementById('budgetSelectedCategory').classList.add('has-value');
                        document.getElementById('budgetCategoryPicker').style.display = 'none';
                        setTimeout(() => { if (window.lucide) lucide.createIcons(); }, 10);
                    }
                });
            });

            document.querySelectorAll('#budgetCategoryPicker .category-child').forEach(child => {
                child.addEventListener('click', () => {
                    document.getElementById('budgetCategoryId').value = child.dataset.id;
                    const wrapper = document.querySelector('#budgetSelectedCategory .select-category-icon-wrapper');
                    if (wrapper) wrapper.innerHTML = renderEmojiOrIcon(child.dataset.emoji, '18px');
                    const text = document.querySelector('#budgetSelectedCategory .select-category-text');
                    if (text) text.textContent = child.dataset.name;
                    document.getElementById('budgetSelectedCategory').classList.add('has-value');
                    document.getElementById('budgetCategoryPicker').style.display = 'none';
                    setTimeout(() => { if (window.lucide) lucide.createIcons(); }, 10);
                });
            });

            document.getElementById('budgetSubmitBtn').addEventListener('click', async () => {
                const category_id = document.getElementById('budgetCategoryId').value;
                const amount = parseRupiah(document.getElementById('budgetAmount').value);
                
                if (!category_id) return showToast('Pilih kategori!');
                if (!amount) return showToast('Masukkan jumlah!');
                
                try {
                    await api('budget.php', {
                        method: 'POST',
                        body: JSON.stringify({ category_id, amount, month: currentBudgetMonth }),
                    });
                    closeModal();
                    showToast('Anggaran disimpan! 🎯');
                    loadBudgets();
                } catch (err) {
                    alert(err.message);
                }
            });
        }, 150);
    }
    
    async function deleteBudget(id) {
        if(!confirm('Hapus anggaran ini?')) return;
        try {
            await api(`budget.php?id=${id}`, { method: 'DELETE' });
            loadBudgets();
            showToast('Anggaran dihapus');
        } catch(e) { showToast(e.message); }
    }

    // ===== NEW DASHBOARD CHARTS =====
    function renderDashboardCashflowChart(data) {
        const canvas = document.getElementById('dashboardCashflowChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        canvas.width = 350 * dpr; canvas.height = 120 * dpr;
        ctx.scale(dpr, dpr);
        ctx.clearRect(0,0, 350, 120);
        
        if (!data || !data.length) return;
        
        const maxVal = Math.max(...data.map(d => Math.max(d.income, d.expense)), 1);
        const w = 350; const h = 100;
        const stepX = w / (Math.max(data.length - 1, 1));
        
        function drawLine(key, color) {
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.lineJoin = 'round';
            data.forEach((d, i) => {
                const x = i * stepX;
                const y = h - (d[key] / maxVal) * h + 10;
                if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
            });
            ctx.stroke();
        }
        
        drawLine('expense', '#ff6b6b'); // accent-coral
        drawLine('income', '#34d399'); // color-success
    }
    
    function renderTrendChart(data) {
        const canvas = document.getElementById('trendChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        canvas.width = 350 * dpr; canvas.height = 80 * dpr;
        ctx.scale(dpr, dpr);
        ctx.clearRect(0,0, 350, 80);
        
        if (!data || !data.length) return;
        
        const maxVal = Math.max(...data.map(d => d.expense), 1);
        const w = 350; const h = 60;
        const stepX = w / (Math.max(data.length - 1, 1));
        
        ctx.beginPath();
        ctx.strokeStyle = '#818cf8';
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        data.forEach((d, i) => {
            const x = i * stepX;
            const y = h - (d.expense / maxVal) * h + 10;
            if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
        });
        ctx.stroke();
        
        // gradient fill
        const grad = ctx.createLinearGradient(0,0,0,h+10);
        grad.addColorStop(0, 'rgba(129, 140, 248, 0.4)');
        grad.addColorStop(1, 'rgba(129, 140, 248, 0)');
        ctx.lineTo(w, h+20);
        ctx.lineTo(0, h+20);
        ctx.fillStyle = grad;
        ctx.fill();
    }
    
    function renderComparisonCards(data) {
        const el = document.getElementById('comparisonCards');
        if (!el || !data) return;
        
        function makeCard(type, label, rawCurr, rawPrev, colorCls) {
            const curr = parseFloat(rawCurr) || 0;
            const prev = parseFloat(rawPrev) || 0;
            const pct = prev > 0 ? ((curr - prev) / prev) * 100 : (curr > 0 ? 100.0 : 0.0);
            const max = Math.max(curr, prev, 1);
            const cH = Math.max(10, (curr/max)*100);
            const pH = Math.max(10, (prev/max)*100);
            
            return `
            <div class="comparison-card fade-in-up">
                <div class="comparison-icon ${colorCls}">
                    ${type === 'income' ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>' : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>'}
                </div>
                <div class="comparison-info">
                    <span class="comparison-label">${label}</span>
                    <span class="comparison-value">${formatRp(curr, true)}</span>
                    <span style="font-size:10px;color:${pct>0?(type==='income'?'var(--color-success)':'var(--color-danger)'):'var(--text-muted)'}">${pct>0?'+':''}${pct.toFixed(1)}% vs bln lalu</span>
                </div>
                <div class="comparison-bars">
                    <div class="comparison-bar-wrap"><div class="comparison-bar-fill curr" style="width:${cH}%"></div></div>
                    <div class="comparison-bar-wrap"><div class="comparison-bar-fill prev" style="width:${pH}%"></div></div>
                </div>
            </div>`;
        }
        
        el.innerHTML = makeCard('income', 'Pemasukan', data.current_income, data.prev_income, 'income') + 
                       makeCard('expense', 'Pengeluaran', data.current_expense, data.prev_expense, 'expense');
    }

    // ===== CAMERA OCR SCANNER FUNCTIONS =====
    async function showScanReceiptForm() {
        if (currentUser && currentUser.subscription_tier === 'free') {
            if (typeof window.showUpgradeModal === 'function') {
                window.showUpgradeModal();
            } else {
                showToast('Fitur Scan Struk AI eksklusif untuk Pro/Premium. Silakan upgrade!');
            }
            return;
        }

        const categories = await loadCategories('expense');
        
        const html = `
            <div class="ocr-upload-step" id="ocrUploadStep">
                <div class="scanner-container" id="ocrDropzone">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    <p style="font-weight: 700; font-size: 15px; margin: 4px 0 0;">Ambil Foto / Pilih Berkas Struk</p>
                    <span class="scan-instructions">Mendukung kamera langsung atau unggahan PNG/JPG</span>
                    <input type="file" id="ocrFileInput" accept="image/*" capture="environment" style="display:none;">
                </div>
                
                <div class="scan-preview-wrapper" id="scanPreviewWrapper" style="margin-top: 14px;">
                    <button type="button" class="remove-preview-btn" id="removePreviewBtn">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                    <img src="" class="scan-preview" id="scanPreviewImg">
                </div>
                
                <div class="ocr-loading" id="ocrLoading" style="margin-top: 14px;">
                    <div class="ocr-loading-spinner" style="margin: 0 auto;"></div>
                    <span class="ocr-loading-text" style="display:block;margin-top:8px;">AI sedang membaca struk...</span>
                    <span class="ocr-loading-subtext">Menggunakan Gemini AI Vision untuk akurasi maksimal</span>
                </div>
                
                <button class="modal-submit-btn success-btn" id="startOcrBtn" style="display:none; margin-top: 14px;">
                    📷 Mulai Scan
                </button>
            </div>
            
            <div class="ocr-results-container" id="ocrResultsContainer">
                <!-- Diisi otomatis setelah parsing -->
            </div>
        `;
        
        openModal('Scan Struk Belanja', html);
        setTimeout(() => lucide.createIcons(), 50);
        
        const dropzone = document.getElementById('ocrDropzone');
        const fileInput = document.getElementById('ocrFileInput');
        const previewWrapper = document.getElementById('scanPreviewWrapper');
        const previewImg = document.getElementById('scanPreviewImg');
        const removePreviewBtn = document.getElementById('removePreviewBtn');
        const startOcrBtn = document.getElementById('startOcrBtn');
        const ocrLoading = document.getElementById('ocrLoading');
        
        let selectedFile = null;
        
        // Hide loading initially
        ocrLoading.style.display = 'none';
        
        dropzone.addEventListener('click', () => fileInput.click());
        
        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                handleFileSelect(e.target.files[0]);
            }
        });
        
        removePreviewBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            resetUploader();
        });
        
        startOcrBtn.addEventListener('click', () => {
            if (selectedFile) {
                runReceiptOcr(selectedFile, categories);
            }
        });
        
        function handleFileSelect(file) {
            selectedFile = file;
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImg.src = e.target.result;
                previewWrapper.style.display = 'block';
                startOcrBtn.style.display = 'block';
                dropzone.style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
        
        function resetUploader() {
            selectedFile = null;
            fileInput.value = '';
            previewImg.src = '';
            previewWrapper.style.display = 'none';
            startOcrBtn.style.display = 'none';
            dropzone.style.display = 'flex';
        }
    }
    
    // Compress image using Canvas API before sending to Gemini
    function compressImage(file, maxWidth = 1600, quality = 0.85) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;
                
                // Scale down if larger than maxWidth
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                // White background (helps with transparency)
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convert to JPEG base64
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                const base64 = dataUrl.split(',')[1];
                
                console.log(`[OCR] Image compressed: ${file.size} bytes → ~${Math.round(base64.length * 0.75)} bytes (${width}x${height})`);
                resolve({ base64, mimeType: 'image/jpeg' });
            };
            img.onerror = () => reject(new Error('Gagal memuat gambar untuk kompresi'));
            img.src = URL.createObjectURL(file);
        });
    }

    async function runReceiptOcr(file, categories) {
        const ocrLoading = document.getElementById('ocrLoading');
        const startOcrBtn = document.getElementById('startOcrBtn');
        const resultsContainer = document.getElementById('ocrResultsContainer');
        const uploadStep = document.getElementById('ocrUploadStep');
        
        ocrLoading.style.display = 'flex';
        startOcrBtn.style.display = 'none';
        
        // Update loading text for AI processing
        const loadingText = ocrLoading.querySelector('.ocr-loading-text');
        const loadingSubtext = ocrLoading.querySelector('.ocr-loading-subtext');
        if (loadingText) loadingText.textContent = 'AI sedang membaca struk...';
        if (loadingSubtext) loadingSubtext.textContent = 'Mengompres gambar & mengirim ke Gemini AI';
        
        try {
            // Compress image before sending (phone cameras produce 3-12MB photos)
            if (loadingSubtext) loadingSubtext.textContent = 'Mengompres gambar...';
            const { base64, mimeType } = await compressImage(file, 1600, 0.85);
            
            console.log(`[OCR] Sending to Gemini API... (base64 length: ${base64.length})`);
            if (loadingSubtext) loadingSubtext.textContent = 'Gemini AI sedang menganalisis struk...';
            
            // Send to server-side Gemini Vision proxy
            const response = await api('ocr.php', {
                method: 'POST',
                body: JSON.stringify({ image: base64, mime_type: mimeType })
            });
            
            console.log('[OCR] Gemini response:', response);
            
            if (!response.success || !response.items) {
                throw new Error(response.error || 'AI tidak mengembalikan data item');
            }
            
            if (response.items.length === 0) {
                throw new Error('AI tidak menemukan item pada struk. Pastikan foto jelas dan tidak terpotong.');
            }
            
            // Convert Gemini response to parsedData format expected by renderScanResults
            const parsedData = {
                items: response.items.map(item => ({
                    description: item.name,
                    amount: item.price
                })),
                total: response.total || 0,
                storeName: response.store_name || ''
            };
            
            console.log(`[OCR] Parsed ${parsedData.items.length} items, total: Rp ${parsedData.total}`);
            
            ocrLoading.style.display = 'none';
            uploadStep.style.display = 'none';
            resultsContainer.style.display = 'flex';
            
            renderScanResults(parsedData, categories);
            
            // Show store name if detected
            if (parsedData.storeName) {
                showToast(`Struk dari: ${parsedData.storeName}`);
            }
            
        } catch (err) {
            console.error('Gemini OCR Error:', err);
            showToast(err.message || 'Gagal membaca struk. Pastikan foto jelas.');
            ocrLoading.style.display = 'none';
            startOcrBtn.style.display = 'block';
            
            // Reset loading text
            if (loadingText) loadingText.textContent = 'AI sedang membaca struk...';
            if (loadingSubtext) loadingSubtext.textContent = 'Menggunakan Gemini AI Vision';
        }
    }
    
    function parseReceiptText(text) {
        const lines = text.split('\n');
        const items = [];
        let detectedTotal = 0;
        
        // Price regex: matches prices at end of line - requires either "Rp" prefix or 4+ digit number
        // Avoids matching phone numbers, dates, receipt numbers
        const priceWithRpRegex = /rp\.?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*$/i;
        const priceNumberRegex = /(\d{1,3}(?:[.,]\d{3})+)\s*$/;
        const pricePlainRegex = /(\d{4,})\s*$/;
        
        // Quantity × Price pattern: "2 x 15.000", "3x15000", "2 @ 5.000"
        const qtyPriceRegex = /(\d+)\s*[x×@]\s*(?:rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})*|\d+)/i;
        
        // Total/summary keywords - lines containing these are treated as total, not items
        const totalKeywords = [
            'total', 'jumlah', 'grand total', 'subtotal', 'sub total', 'sub-total',
            'net', 'bayar', 'due', 'cash', 'tunai', 'kembali', 'kembalian', 'change',
            'amount', 'pembayaran', 'debit', 'kredit', 'debet', 'transfer', 'qris',
            'gopay', 'ovo', 'dana', 'shopeepay', 'linkaja'
        ];
        
        // Exclude lines that match any of these — tax, bags, service charges, store metadata
        const excludeRegex = /\b(pajak|tax|ppn|pph|service\s*charge|service\s*chg|svc\s*ch(?:g|arge)|tas\s*belanja|shopping\s*bag|paper\s*bag|kantong|plastik|paperbag|tote\s*bag|carrier\s*bag|tas\s*kresek|tas\s*plastik|diskon|discount|disc|potongan|voucher|promo|member|point|poin|rounding|pembulatan)\b/i;
        
        // Skip lines that look like receipt header/footer/metadata
        const metadataRegex = /\b(kasir|cashier|struk|nota|receipt|print|trx|tanggal|tgl|date|waktu|jam|time|no\.?\s*(?:antrian|meja|order|faktur|ref|trx)|outlet|store|toko|alamat|address|telp|telepon|phone|fax|npwp|kode|code|terima\s*kasih|thank|thanks|selamat\s*datang|welcome|www\.|http|\.com|\.id|ig\s*:|fb\s*:)\b/i;
        
        // Price thresholds — filter out unrealistic values
        const MIN_PRICE = 100;       // Minimum Rp 100
        const MAX_PRICE = 50000000;  // Maximum Rp 50,000,000
        
        // Track seen items for duplicate detection
        const seenItems = new Set();
        
        lines.forEach(line => {
            line = line.trim();
            if (!line) return;
            
            // Skip separator lines (----, ====, ****, etc.)
            if (/^[-=_*+~#]{3,}$/.test(line)) return;
            
            // Skip very short lines (likely OCR noise)
            if (line.length < 4) return;
            
            // Skip lines that are mostly numbers/special chars (OCR garbage)
            const alphaCount = (line.match(/[a-zA-Z]/g) || []).length;
            const totalChars = line.replace(/\s/g, '').length;
            if (totalChars > 5 && alphaCount < totalChars * 0.15) return;
            
            // Skip metadata lines (kasir, tanggal, alamat, etc.)
            if (metadataRegex.test(line)) return;
            
            // Try to extract price from line
            let priceVal = 0;
            let priceMatch = null;
            let usedQtyPattern = false;
            
            // First check for quantity × price pattern
            const qtyMatch = line.match(qtyPriceRegex);
            if (qtyMatch) {
                const qty = parseInt(qtyMatch[1]) || 1;
                const unitPrice = parseRupiah(qtyMatch[2]);
                if (qty > 0 && qty <= 999 && unitPrice > 0) {
                    priceVal = qty * unitPrice;
                    usedQtyPattern = true;
                    priceMatch = qtyMatch;
                }
            }
            
            // If no qty pattern, try price-at-end-of-line patterns
            if (!usedQtyPattern) {
                priceMatch = line.match(priceWithRpRegex) || line.match(priceNumberRegex) || line.match(pricePlainRegex);
                if (priceMatch) {
                    priceVal = parseRupiah(priceMatch[1]);
                }
            }
            
            if (!priceMatch || priceVal <= 0) return;
            
            // Apply price threshold
            if (priceVal < MIN_PRICE || priceVal > MAX_PRICE) return;
            
            // Extract description: remove the price part from the line
            let desc;
            if (usedQtyPattern) {
                // For qty patterns, take everything before the qty×price
                desc = line.substring(0, line.indexOf(priceMatch[0])).trim();
                if (!desc) {
                    desc = line.replace(priceMatch[0], '').trim();
                }
            } else {
                desc = line.replace(priceMatch[0], '').trim();
            }
            
            // Clean up leading item numbers, dots, dashes
            desc = desc.replace(/^[\d\s.\-\)#:]+/, '').trim();
            
            // Remove trailing 'x', '@' or quantity indicators
            desc = desc.replace(/\s+\d+\s*[x×@]\s*$/, '').trim();
            
            if (desc.length < 2) return;
            
            const lowerDesc = desc.toLowerCase();
            
            // Exclude tax, bags, discounts, service charges
            if (excludeRegex.test(lowerDesc)) return;
            
            // Check if this is a total/summary line
            const isTotalLine = totalKeywords.some(keyword => lowerDesc.includes(keyword));
            
            if (isTotalLine) {
                if (priceVal > detectedTotal && !lowerDesc.includes('kembali') && !lowerDesc.includes('kembalian') && !lowerDesc.includes('change')) {
                    detectedTotal = priceVal;
                }
            } else {
                // Duplicate detection: skip if we've seen this exact item+price
                const itemKey = `${desc.toLowerCase()}|${priceVal}`;
                if (seenItems.has(itemKey)) return;
                seenItems.add(itemKey);
                
                items.push({
                    description: desc,
                    amount: priceVal
                });
            }
        });
        
        // If no explicit total was found, compute from items
        if (detectedTotal === 0 && items.length > 0) {
            detectedTotal = items.reduce((sum, item) => sum + item.amount, 0);
        }
        
        return { items, total: detectedTotal };
    }
    
    function renderScanResults(parsedData, categories) {
        const container = document.getElementById('ocrResultsContainer');
        
        const flatCategories = [];
        categories.forEach(cat => {
            if (cat.children && cat.children.length > 0) {
                cat.children.forEach(ch => {
                    flatCategories.push({ id: ch.id, name: ch.name, parentName: cat.name });
                });
            } else {
                flatCategories.push({ id: cat.id, name: cat.name, parentName: '' });
            }
        });
        
        function guessCategoryId(desc) {
            const d = desc.toLowerCase();
            
            // Define keyword → target category name mappings (checked in order of specificity)
            const rules = [
                // Kopi/Cafe
                { keywords: ['kopi', 'coffee', 'latte', 'cappuccino', 'americano', 'espresso', 'mocha', 'macchiato', 'cafe', 'starbucks', 'kafe'], target: 'kopi/cafe' },
                // Boba/Minuman
                { keywords: ['boba', 'chatime', 'haus', 'gulu', 'xing fu tang', 'tiger sugar', 'kokumi', 'esteh', 'teh', 'jus', 'juice', 'milkshake', 'smoothie', 'shake'], target: 'boba/minuman' },
                // Street Food
                { keywords: ['nasi goreng', 'mie goreng', 'bakso', 'soto', 'sate', 'siomay', 'batagor', 'gorengan', 'martabak', 'pempek', 'ketoprak', 'gado', 'pecel', 'rawon', 'rendang', 'nasi padang', 'nasi uduk', 'nasi kuning', 'bubur', 'rujak', 'cilok', 'cireng', 'sempol', 'tahu', 'tempe', 'lontong'], target: 'street food' },
                // Restaurant
                { keywords: ['restaurant', 'resto', 'restoran', 'warung', 'makan siang', 'makan malam', 'dining', 'dine'], target: 'restaurant' },
                // Jajan (general snack/food)
                { keywords: ['snack', 'jajan', 'roti', 'biskuit', 'donat', 'cokelat', 'chocolate', 'permen', 'keripik', 'chips', 'mie instan', 'indomie', 'wafer', 'kue', 'ice cream', 'es krim', 'gelato', 'pizza', 'burger', 'ayam', 'chicken', 'mie', 'makan', 'minum', 'soda', 'fanta', 'coca cola', 'sprite', 'pepsi', 'pocari'], target: 'jajan' },
                // Belanja Sayur/Buah
                { keywords: ['sayur', 'sayuran', 'buah', 'apel', 'jeruk', 'pisang', 'mangga', 'tomat', 'wortel', 'kentang', 'bayam', 'kangkung', 'brokoli', 'selada', 'timun', 'terong', 'cabai', 'cabe', 'jagung', 'pepaya', 'semangka', 'melon', 'anggur', 'alpukat', 'bawang'], target: 'belanja sayur/buah' },
                // Daging/Ikan
                { keywords: ['daging', 'ikan', 'ayam', 'sapi', 'kambing', 'udang', 'cumi', 'tuna', 'salmon', 'lele', 'nila', 'patin', 'gurame', 'bandeng', 'tongkol', 'seafood'], target: 'daging/ikan' },
                // Bumbu/Rempah
                { keywords: ['bumbu', 'rempah', 'lada', 'merica', 'kunyit', 'jahe', 'lengkuas', 'sereh', 'daun salam', 'ketumbar', 'pala', 'cengkeh', 'kayu manis', 'kecap', 'saus', 'sambal', 'terasi'], target: 'bumbu/rempah' },
                // Beras/Minyak
                { keywords: ['beras', 'minyak goreng', 'minyak', 'gula', 'garam', 'tepung', 'mentega', 'margarin', 'santan'], target: 'beras/minyak' },
                // Snack/Minuman (Dapur)
                { keywords: ['air mineral', 'aqua', 'galon', 'le minerale'], target: 'snack/minuman' },
                // Dapur (general groceries)
                { keywords: ['telur', 'susu', 'keju', 'yoghurt', 'roti tawar', 'selai', 'sereal', 'oat', 'pasta', 'spaghetti', 'macaroni'], target: 'dapur' },
                // Gas/LPG
                { keywords: ['gas', 'lpg', 'elpiji', 'tabung gas'], target: 'gas/lpg' },
                // Bensin/BBM
                { keywords: ['bensin', 'bbm', 'pertamax', 'pertalite', 'solar', 'dexlite', 'fuel', 'shell', 'pertamina'], target: 'bensin/bbm' },
                // Parkir/Tol
                { keywords: ['parkir', 'tol', 'e-toll', 'etoll'], target: 'parkir/tol' },
                // Ojol/Taksi
                { keywords: ['gojek', 'grab', 'ojek', 'ojol', 'taksi', 'taxi', 'uber', 'maxim', 'gocar', 'grabcar', 'goride', 'grabbike'], target: 'ojol/taksi' },
                // Transport (general)
                { keywords: ['angkot', 'bus', 'kereta', 'krl', 'mrt', 'lrt', 'transjakarta', 'busway', 'commuter', 'tiket'], target: 'angkutan umum' },
                // Obat-obatan
                { keywords: ['obat', 'paracetamol', 'ibuprofen', 'amoxicillin', 'antangin', 'bodrex', 'paramex', 'apotek', 'pharmacy', 'farmasi'], target: 'obat-obatan' },
                // Dokter/RS
                { keywords: ['dokter', 'rumah sakit', 'rs ', 'klinik', 'lab', 'laboratorium', 'cek darah', 'rontgen', 'usg'], target: 'dokter/rs' },
                // Vitamin/Suplemen
                { keywords: ['vitamin', 'suplemen', 'supplement', 'multivitamin', 'omega', 'kalsium', 'zinc'], target: 'vitamin/suplemen' },
                // Laundry
                { keywords: ['laundry', 'cuci', 'dry clean', 'setrika'], target: 'laundry' },
                // Listrik
                { keywords: ['listrik', 'pln', 'token listrik', 'pulsa listrik', 'kwh'], target: 'listrik' },
                // Internet/WiFi
                { keywords: ['internet', 'wifi', 'indihome', 'firstmedia', 'biznet', 'myrepublic', 'cbn'], target: 'internet' },
                // Air PDAM
                { keywords: ['pdam', 'air pam'], target: 'air (pdam)' },
                // Pulsa/Paket Data
                { keywords: ['pulsa', 'paket data', 'kuota', 'telkomsel', 'indosat', 'xl', 'axis', 'tri', 'smartfren'], target: 'internet' },
                // Household cleaning
                { keywords: ['sabun', 'shampoo', 'sampo', 'odol', 'pasta gigi', 'sikat gigi', 'deterjen', 'pewangi', 'pembersih', 'tissue', 'tisu', 'kapas', 'pembalut', 'popok', 'diapers', 'pampers'], target: 'kebersihan' },
                // Pakaian
                { keywords: ['baju', 'celana', 'jaket', 'kaos', 'kemeja', 'dress', 'rok', 'jeans', 'sweater', 'hoodie'], target: 'baju' },
                // Sepatu
                { keywords: ['sepatu', 'sandal', 'sendal', 'sneakers', 'boots'], target: 'sepatu' },
                // Sekolah
                { keywords: ['spp', 'sekolah', 'uang sekolah', 'bimbel', 'les', 'kursus', 'tuition'], target: 'sekolah/spp' },
                // Film/Bioskop
                { keywords: ['bioskop', 'cinema', 'cgv', 'xxi', 'cinepolis', 'film', 'movie', 'nonton'], target: 'film/bioskop' },
                // Game
                { keywords: ['game', 'gaming', 'steam', 'playstation', 'ps4', 'ps5', 'xbox', 'nintendo', 'top up', 'topup'], target: 'game' },
                // Streaming
                { keywords: ['netflix', 'spotify', 'disney', 'youtube premium', 'hbo', 'viu', 'vidio', 'iqiyi', 'wetv'], target: 'streaming' },
            ];
            
            for (const rule of rules) {
                if (rule.keywords.some(k => d.includes(k))) {
                    const found = flatCategories.find(c => c.name.toLowerCase() === rule.target);
                    if (found) return found.id;
                    // Partial match fallback
                    const partial = flatCategories.find(c => c.name.toLowerCase().includes(rule.target) || rule.target.includes(c.name.toLowerCase()));
                    if (partial) return partial.id;
                }
            }
            
            const lainnya = flatCategories.find(c => c.name.toLowerCase().includes('lainnya'));
            return lainnya ? lainnya.id : '';
        }
        
        // Build grouped category options (optgroup for parents with children)
        function buildCategoryOptions(guessedCatId) {
            let html = '<option value="">Kategori...</option>';
            categories.filter(c => c.type === 'expense' || !c.type).forEach(cat => {
                if (cat.children && cat.children.length > 0) {
                    html += `<optgroup label="${cat.name}">`;
                    cat.children.forEach(ch => {
                        html += `<option value="${ch.id}" ${ch.id == guessedCatId ? 'selected' : ''}>${ch.name}</option>`;
                    });
                    html += '</optgroup>';
                } else {
                    html += `<option value="${parseInt(cat.id)}" ${cat.id == guessedCatId ? 'selected' : ''}>${escapeHTML(cat.name)}</option>`;
                }
            });
            return html;
        }
        
        let itemsHTML = '';
        if (parsedData.items.length === 0) {
            itemsHTML = `<div class="empty-state-small">Tidak ada item terdeteksi, silakan ketik manual atau ulangi scan.</div>`;
        } else {
            itemsHTML = parsedData.items.map((item, idx) => {
                const guessedCatId = guessCategoryId(item.description);
                return `
                    <div class="ocr-item-row" data-index="${idx}">
                        <input type="checkbox" class="ocr-item-check" checked id="check_${idx}">
                        <input type="text" class="ocr-item-desc" value="${escapeHTML(item.description)}" placeholder="Nama barang" id="desc_${idx}">
                        <input type="text" class="ocr-item-amount" value="Rp ${item.amount.toLocaleString('id-ID')}" placeholder="Rp 0" id="amount_${idx}">
                        <select class="ocr-item-cat" id="cat_${idx}">
                            ${buildCategoryOptions(guessedCatId)}
                        </select>
                    </div>
                `;
            }).join('');
        }
        
        container.innerHTML = `
            <div class="ocr-total-header" style="width: 100%;">
                <span class="ocr-total-label">Total Terdeteksi</span>
                <span class="ocr-total-value" id="ocrTotalText">Rp ${parsedData.total.toLocaleString('id-ID')}</span>
            </div>
            
            <div class="ocr-items-list-header" style="width: 100%;">Daftar Item Struk</div>
            <div class="ocr-items-list" style="width: 100%;">
                ${itemsHTML}
            </div>
            
            <div class="ocr-actions" style="width: 100%;">
                <button class="modal-submit-btn" id="saveSplitBtn" style="margin-top: 6px;">
                    🛍️ Simpan sebagai Transaksi Terpisah
                </button>
                <button class="modal-submit-btn success-btn" id="saveCombinedBtn">
                    💸 Simpan sebagai Satu Transaksi Gabungan
                </button>
                <button class="modal-submit-btn" style="background:var(--bg-card);color:var(--text-muted);border:1px solid var(--border-light);box-shadow:none;" id="backToUploadBtn">
                    Kembali
                </button>
            </div>
        `;
        
        parsedData.items.forEach((_, idx) => {
            initRupiahFormatter(`amount_${idx}`);
        });
        
        document.getElementById('backToUploadBtn').addEventListener('click', () => {
            document.getElementById('ocrResultsContainer').style.display = 'none';
            const uploadStep = document.getElementById('ocrUploadStep');
            uploadStep.style.display = 'block';
            document.getElementById('ocrDropzone').style.display = 'flex';
            document.getElementById('scanPreviewWrapper').style.display = 'none';
            document.getElementById('startOcrBtn').style.display = 'none';
        });
        
        document.getElementById('saveSplitBtn').addEventListener('click', () => saveTransactions(true, parsedData.items));
        document.getElementById('saveCombinedBtn').addEventListener('click', () => saveTransactions(false, parsedData.items, parsedData.total));
    }
    
    async function saveTransactions(split, parsedItems, detectedTotal = 0) {
        const rows = document.querySelectorAll('.ocr-item-row');
        const transactionsToSave = [];
        
        let combinedAmount = 0;
        const combinedDescriptions = [];
        let combinedCategory = '';
        
        try {
            rows.forEach(row => {
                const idx = row.dataset.index;
                const isChecked = document.getElementById(`check_${idx}`).checked;
                if (!isChecked) return;
                
                const desc = document.getElementById(`desc_${idx}`).value.trim();
                const amount = parseRupiah(document.getElementById(`amount_${idx}`).value);
                const categoryId = document.getElementById(`cat_${idx}`).value;
                
                if (!desc) return;
                if (!amount || amount <= 0) return;
                
                if (split) {
                    if (!categoryId) {
                        showToast(`Pilih kategori untuk item: "${desc}"`);
                        throw new Error('Missing Category');
                    }
                    transactionsToSave.push({
                        category_id: categoryId,
                        amount: amount,
                        type: 'expense',
                        description: desc,
                        transaction_date: new Date().toISOString().slice(0, 10)
                    });
                } else {
                    combinedAmount += amount;
                    combinedDescriptions.push(desc);
                    if (!combinedCategory && categoryId) {
                        combinedCategory = categoryId;
                    }
                }
            });
            
            if (!split) {
                if (combinedAmount === 0) {
                    showToast('Pilih minimal satu item untuk disimpan');
                    return;
                }
                if (!combinedCategory) {
                    showToast('Pilih minimal satu kategori pada item terpilih');
                    return;
                }
                transactionsToSave.push({
                    category_id: combinedCategory,
                    amount: combinedAmount,
                    type: 'expense',
                    description: 'Gabungan Struk: ' + combinedDescriptions.join(', ').slice(0, 200),
                    transaction_date: new Date().toISOString().slice(0, 10)
                });
            }
            
            if (transactionsToSave.length === 0) {
                showToast('Pilih minimal satu item untuk disimpan');
                return;
            }
            
            showToast('Menyimpan transaksi...');
            for (let tx of transactionsToSave) {
                await api('transactions.php', {
                    method: 'POST',
                    body: JSON.stringify(tx)
                });
            }
            closeModal();
            showToast('Semua transaksi berhasil disimpan! 📝');
            loadDashboard();
        } catch (err) {
            if (err.message !== 'Missing Category') {
                showToast(err.message || 'Gagal menyimpan transaksi');
            }
        }
    }

    // ===== OFFLINE / PWA =====
    const OFFLINE_QUEUE_KEY = 'selaraskas_offline_queue';
    
    function initOfflineMode() {
        window.addEventListener('online', () => {
            document.getElementById('offlineBanner').classList.remove('show');
            syncOfflineQueue();
        });
        window.addEventListener('offline', () => {
            document.getElementById('offlineBanner').classList.add('show');
        });
        if (!navigator.onLine) {
            document.getElementById('offlineBanner').classList.add('show');
        }
    }
    
    async function syncOfflineQueue() {
        const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
        if (queue.length === 0) return;
        
        showToast('Menyinkronkan data offline...');
        localStorage.removeItem(OFFLINE_QUEUE_KEY);
        
        for (let task of queue) {
            try {
                await api(task.endpoint, task.options);
            } catch (err) {
                console.error('Failed to sync task', task, err);
            }
        }
        loadDashboard();
        setTimeout(() => lucide.createIcons(), 50);
        showToast('Sinkronisasi selesai');
    }

    // =============================================
    // WebAuthn (Biometric) Functions
    // =============================================
    
    async function checkBiometricAvailability() {
        const btn = document.getElementById('biometricAuthBtn');
        if (!btn) return;
        
        // Check if WebAuthn is supported
        if (!window.PublicKeyCredential) {
            btn.style.display = 'none';
            return;
        }
        
        // Check if platform authenticator is available (fingerprint/Face ID)
        try {
            const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
            if (!available) {
                btn.style.display = 'none';
                return;
            }
        } catch {
            btn.style.display = 'none';
            return;
        }
        
        // Check if we have a saved email with registered credentials
        const savedEmail = localStorage.getItem('selaraskas_last_email');
        if (!savedEmail) {
            btn.style.display = 'none';
            return;
        }
        
        // Check if credentials exist for this email
        try {
            const result = await api('auth.php?action=webauthn_login_options', {
                method: 'POST',
                body: JSON.stringify({ email: savedEmail })
            });
            if (result.allowCredentials && result.allowCredentials.length > 0) {
                btn.style.display = 'flex';
            } else {
                btn.style.display = 'none';
            }
        } catch {
            btn.style.display = 'none';
        }
    }
    
    async function performBiometricLogin() {
        const savedEmail = localStorage.getItem('selaraskas_last_email');
        if (!savedEmail) {
            showToast('Login biasa dulu untuk mengaktifkan sidik jari');
            return;
        }
        
        try {
            // Get login options from server
            const options = await api('auth.php?action=webauthn_login_options', {
                method: 'POST',
                body: JSON.stringify({ email: savedEmail })
            });
            
            // Convert challenge and credential IDs for WebAuthn API
            const allowCredentials = options.allowCredentials.map(c => ({
                type: c.type,
                id: Uint8Array.from(atob(c.id.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)),
            }));
            
            const challengeBytes = Uint8Array.from(
                options.challenge.match(/.{1,2}/g).map(b => parseInt(b, 16))
            );
            
            // Trigger biometric prompt
            const credential = await navigator.credentials.get({
                publicKey: {
                    challenge: challengeBytes,
                    rpId: options.rpId,
                    timeout: options.timeout,
                    userVerification: options.userVerification,
                    allowCredentials: allowCredentials,
                }
            });
            
            // Send credential to server for verification
            const credentialId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
            
            const data = await api('auth.php?action=webauthn_login', {
                method: 'POST',
                body: JSON.stringify({
                    credential_id: credentialId,
                })
            });
            
            if (data.success) {
                showToast('Login berhasil! 🎉');
                showApp(data.user);
            }
        } catch (err) {
            if (err.name === 'NotAllowedError') {
                showToast('Autentikasi dibatalkan');
            } else {
                console.error('Biometric login error:', err);
                showToast(err.message || 'Gagal login dengan biometrik');
            }
        }
    }
    
    async function registerBiometric() {
        if (!window.PublicKeyCredential) {
            showToast('Browser tidak mendukung biometrik');
            return;
        }
        
        try {
            // Get registration options from server
            const options = await api('auth.php?action=webauthn_register_options', {
                method: 'POST',
                body: JSON.stringify({})
            });
            
            // Convert for WebAuthn API
            const challengeBytes = Uint8Array.from(
                options.challenge.match(/.{1,2}/g).map(b => parseInt(b, 16))
            );
            
            const userId = Uint8Array.from(atob(options.user.id), c => c.charCodeAt(0));
            
            const excludeCredentials = (options.excludeCredentials || []).map(c => ({
                type: c.type,
                id: Uint8Array.from(atob(c.id.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)),
            }));
            
            // Trigger biometric registration prompt
            const credential = await navigator.credentials.create({
                publicKey: {
                    challenge: challengeBytes,
                    rp: options.rp,
                    user: {
                        id: userId,
                        name: options.user.name,
                        displayName: options.user.displayName,
                    },
                    pubKeyCredParams: options.pubKeyCredParams,
                    timeout: options.timeout,
                    authenticatorSelection: options.authenticatorSelection,
                    excludeCredentials: excludeCredentials,
                    attestation: options.attestation,
                }
            });
            
            // Encode credential data
            const credentialId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
            const publicKey = btoa(String.fromCharCode(...new Uint8Array(credential.response.getPublicKey ? credential.response.getPublicKey() : credential.response.attestationObject)));
            
            // Detect device name
            const ua = navigator.userAgent;
            let deviceName = 'Perangkat';
            if (/iPhone/.test(ua)) deviceName = 'iPhone';
            else if (/iPad/.test(ua)) deviceName = 'iPad';
            else if (/Android/.test(ua)) deviceName = 'Android';
            else if (/Windows/.test(ua)) deviceName = 'Windows PC';
            else if (/Mac/.test(ua)) deviceName = 'Mac';
            
            // Send to server
            const result = await api('auth.php?action=webauthn_register', {
                method: 'POST',
                body: JSON.stringify({
                    credential_id: credentialId,
                    public_key: publicKey,
                    device_name: deviceName,
                })
            });
            
            showToast(result.message || 'Sidik jari berhasil didaftarkan! 🎉');
            
            // Save email for future biometric login
            if (currentUser?.email) {
                localStorage.setItem('selaraskas_last_email', currentUser.email);
            }
            
            // Reload biometric settings
            loadBiometricSettings();
            
        } catch (err) {
            if (err.name === 'NotAllowedError') {
                showToast('Pendaftaran dibatalkan');
            } else if (err.name === 'InvalidStateError') {
                showToast('Sidik jari sudah terdaftar');
            } else {
                console.error('Biometric register error:', err);
                showToast(err.message || 'Gagal mendaftarkan sidik jari');
            }
        }
    }
    
    async function loadBiometricSettings() {
        const group = document.getElementById('biometricGroup');
        if (!group) return;
        
        // Check if WebAuthn is supported
        if (!window.PublicKeyCredential) {
            group.style.display = 'none';
            return;
        }
        
        // Check platform authenticator availability
        try {
            const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
            if (!available) {
                group.style.display = 'none';
                return;
            }
        } catch {
            group.style.display = 'none';
            return;
        }
        
        group.style.display = 'block';
        
        try {
            const data = await api('auth.php?action=webauthn_credentials');
            const creds = data.credentials || [];
            
            const label = document.getElementById('biometricLabel');
            const toggle = document.getElementById('biometricToggleBtn');
            const section = document.getElementById('biometricCredentialsSection');
            const list = document.getElementById('biometricCredentialsList');
            
            const registerBtn = document.getElementById('biometricRegisterBtn');
            
            if (creds.length > 0) {
                if (label) label.textContent = `Aktif (${creds.length} Perangkat)`;
                if (toggle) toggle.classList.add('active');
                if (section) section.classList.add('has-credentials');
                // Hide register button when credentials exist
                if (registerBtn) registerBtn.style.display = 'none';
                if (list) {
                    list.innerHTML = creds.map(c => `
                        <div class="biometric-cred-item">
                            <div class="biometric-cred-info">
                                <div class="biometric-cred-name">🔑 ${escapeHTML(c.device_name)}</div>
                                <div class="biometric-cred-date">${new Date(c.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                            </div>
                            <button class="biometric-cred-delete" onclick="window.Selaraskas.deleteBiometricCred(${c.id})">Hapus</button>
                        </div>
                    `).join('');
                }
                if (section) {
                    section.style.maxHeight = section.scrollHeight + 'px';
                    section.style.opacity = '1';
                }
            } else {
                if (label) label.textContent = 'Tidak Aktif';
                if (toggle) toggle.classList.remove('active');
                if (section) section.classList.remove('has-credentials');
                // Show register button when no credentials
                if (registerBtn) registerBtn.style.display = '';
                if (list) list.innerHTML = '';
                if (section) {
                    section.style.maxHeight = '0px';
                    section.style.opacity = '0';
                }
            }
        } catch (err) {
            console.error('Error loading biometric settings:', err);
        }
    }
    
    // Expose biometric functions globally
    // Biometric functions exposed via window.Selaraskas in init()

    // Biometric login button handler
    document.getElementById('biometricAuthBtn')?.addEventListener('click', performBiometricLogin);

    // ===== UPGRADE PREMIUM MODAL =====

    let isYearlyBilling = false;
    let selectedUpgradePlan = null;

    const PRICING = {
        pro:     { monthly: 15000, yearly: 119000 },
        premium: { monthly: 29000, yearly: 249000 },
    };

    function formatRupiah(n) {
        return 'Rp ' + n.toLocaleString('id-ID');
    }

    // Open upgrade modal
    window.showUpgradeModal = function(highlightPlan = null) {
        const overlay = document.getElementById('upgradeOverlay');
        if (!overlay) return;

        // Reset to pricing view
        document.getElementById('pricingCards').style.display = '';
        document.getElementById('paymentStep').style.display = 'none';
        document.getElementById('payment-notice') && (document.getElementById('payment-notice').style.display = '');
        const billingWrap = document.querySelector('.billing-toggle-wrap');
        if (billingWrap) billingWrap.style.display = 'flex';
        
        // Update current plan badge
        updateUpgradeModalBadge();
        updatePricingCards();
        updateBillingUI();

        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    function closeUpgradeModal() {
        const overlay = document.getElementById('upgradeOverlay');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
        selectedUpgradePlan = null;
    }

    function updateUpgradeModalBadge() {
        const tier = currentUser?.subscription_tier || 'free';
        const dot  = document.querySelector('.current-plan-badge .plan-dot');
        const label = document.getElementById('currentPlanLabel');
        if (dot) {
            dot.className = 'plan-dot ' + (tier === 'free' ? 'free-dot' : tier === 'premium' ? 'premium-dot' : 'pro-dot');
        }
        if (label) label.textContent = tier.charAt(0).toUpperCase() + tier.slice(1);
    }

    function updatePricingCards() {
        const tier = currentUser?.subscription_tier || 'free';
        
        // Reset all buttons
        const freePlanBtn    = document.getElementById('freePlanBtn');
        const premiumPlanBtn = document.getElementById('premiumPlanBtn');
        const proPlanBtn     = document.getElementById('proPlanBtn');

        // Reset button styles
        if (freePlanBtn)    { freePlanBtn.disabled = tier === 'free';    freePlanBtn.textContent = tier === 'free' ? 'Paket Aktif ✓' : 'Downgrade'; freePlanBtn.className = 'plan-btn free-btn' + (tier === 'free' ? ' current-plan-btn' : ''); }
        if (premiumPlanBtn) { premiumPlanBtn.disabled = tier === 'premium'; premiumPlanBtn.textContent = tier === 'premium' ? '✓ Paket Aktif' : '✨ Pilih Premium'; premiumPlanBtn.className = 'plan-btn premium-btn' + (tier === 'premium' ? ' current-plan-btn' : ''); }
        if (proPlanBtn)     { proPlanBtn.disabled = tier === 'pro';      proPlanBtn.textContent = tier === 'pro' ? '✓ Paket Aktif' : '🚀 Pilih Pro'; proPlanBtn.className = 'plan-btn pro-btn' + (tier === 'pro' ? ' current-plan-btn' : ''); }
    }

    function updateBillingUI() {
        const toggle   = document.getElementById('billingToggle');
        const lblMonth = document.getElementById('lblMonthly');
        const lblYear  = document.getElementById('lblYearly');
        if (toggle) toggle.classList.toggle('yearly', isYearlyBilling);
        if (lblMonth) lblMonth.classList.toggle('active', !isYearlyBilling);
        if (lblYear)  lblYear.classList.toggle('active', isYearlyBilling);

        // Update prices
        const premiumP  = document.getElementById('premiumPrice');
        const premiumPd = document.getElementById('premiumPeriod');
        const proP      = document.getElementById('proPrice');
        const proPd     = document.getElementById('proPeriod');

        if (premiumP)  premiumP.textContent  = formatRupiah(isYearlyBilling ? PRICING.premium.yearly : PRICING.premium.monthly);
        if (premiumPd) premiumPd.textContent  = isYearlyBilling ? '/ tahun' : '/ bulan';
        if (proP)      proP.textContent       = formatRupiah(isYearlyBilling ? PRICING.pro.yearly : PRICING.pro.monthly);
        if (proPd)     proPd.textContent      = isYearlyBilling ? '/ tahun' : '/ bulan';
    }

    function showPaymentStep(plan) {
        selectedUpgradePlan = plan;
        const billing = isYearlyBilling ? 'yearly' : 'monthly';
        const price   = PRICING[plan][billing];
        const planLabel = plan === 'premium' ? 'Premium 💎' : 'Pro 🚀';
        const billingLabel = billing === 'yearly' ? 'Tahunan' : 'Bulanan';

        document.getElementById('paymentSummary').innerHTML = `
            <div class="summary-row"><span>Paket</span><strong>${planLabel}</strong></div>
            <div class="summary-row"><span>Durasi</span><strong>${billingLabel}</strong></div>
            <div class="summary-row"><span>Total Bayar</span><strong>${formatRupiah(price)}</strong></div>
        `;

        document.getElementById('pricingCards').style.display = 'none';
        const payNotice = document.querySelector('.payment-notice');
        if (payNotice) payNotice.style.display = 'none';
        const billingWrap = document.querySelector('.billing-toggle-wrap');
        if (billingWrap) billingWrap.style.display = 'none';
        document.getElementById('paymentStep').style.display = 'flex';
    }

    function confirmPayment() {
        if (!selectedUpgradePlan) return;
        
        const billing = isYearlyBilling ? 'yearly' : 'monthly';
        const planLabel = selectedUpgradePlan === 'premium' ? 'Premium 💎' : 'Pro 🚀';
        const billingLabel = billing === 'yearly' ? 'Tahunan' : 'Bulanan';
        
        const btn = document.getElementById('confirmPayBtn');
        btn.textContent = 'Membuka WhatsApp...';
        btn.classList.add('loading');

        // Nomor WhatsApp Anda (Ganti dengan nomor Anda, format 628...)
        const adminWA = '6281385084327'; 
        
        const msg = `Halo Admin, saya ingin konfirmasi pembayaran upgrade SelarasKas.\n\n` +
                    `Nama: ${currentUser?.name || 'User'}\n` +
                    `Email: ${currentUser?.email || '-'}\n` +
                    `Paket: ${planLabel} (${billingLabel})\n\n` +
                    `Berikut saya lampirkan bukti transfernya. Terima kasih!`;

        const waUrl = `https://wa.me/${adminWA}?text=${encodeURIComponent(msg)}`;
        window.open(waUrl, '_blank');
        
        setTimeout(() => {
            btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-right: 6px; vertical-align: text-bottom;"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg> Konfirmasi ke WhatsApp Admin';
            btn.classList.remove('loading');
            closeUpgradeModal();
        }, 2000);
    }

    function updateSubscriptionStatusCard() {
        const tier = currentUser?.subscription_tier || 'free';
        const card = document.getElementById('subscriptionStatusCard');
        const icon = document.getElementById('subStatusIcon');
        const name = document.getElementById('subStatusName');
        const desc = document.getElementById('subStatusDesc');
        const btn  = document.getElementById('openUpgradeBtn');

        if (!card) return;

        card.className = 'subscription-status-card';
        if (tier === 'premium') {
            card.classList.add('is-premium');
            if (icon) icon.textContent = '💎';
            if (name) name.textContent = 'Paket Premium';
            if (desc) desc.textContent = 'Semua fitur Premium aktif ✓';
            if (btn)  { btn.textContent = 'Lihat Paket'; btn.classList.remove('is-active'); btn.disabled = false; }
        } else if (tier === 'pro') {
            card.classList.add('is-pro');
            if (icon) icon.textContent = '🚀';
            if (name) name.textContent = 'Paket Pro';
            if (desc) desc.textContent = 'Upgrade Premium untuk fitur penuh';
            if (btn)  { btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="18 15 12 9 6 15"/></svg> Upgrade Premium ✨'; btn.classList.remove('is-active'); btn.disabled = false; }
        } else {
            if (icon) icon.textContent = '🆓';
            if (name) name.textContent = 'Paket Free';
            if (desc) desc.textContent = 'Upgrade untuk fitur lengkap';
            if (btn)  { btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="18 15 12 9 6 15"/></svg> Upgrade'; btn.classList.remove('is-active'); btn.disabled = false; }
        }
    }

    // ---- Wire up upgrade modal events ----

    // Open from profile page Upgrade button
    document.getElementById('openUpgradeBtn')?.addEventListener('click', () => window.showUpgradeModal());

    // Close button
    document.getElementById('upgradeCloseBtn')?.addEventListener('click', closeUpgradeModal);

    // Close on overlay click
    document.getElementById('upgradeOverlay')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('upgradeOverlay')) closeUpgradeModal();
    });

    // Billing toggle — handle clicks on toggle, knob, and both labels
    function switchBilling(forceYearly) {
        if (typeof forceYearly === 'boolean') {
            isYearlyBilling = forceYearly;
        } else {
            isYearlyBilling = !isYearlyBilling;
        }
        updateBillingUI();
    }
    document.getElementById('billingToggle')?.addEventListener('click', () => switchBilling());
    document.getElementById('billingKnob')?.addEventListener('click', (e) => { e.stopPropagation(); switchBilling(); });
    document.getElementById('lblMonthly')?.addEventListener('click', () => switchBilling(false));
    document.getElementById('lblYearly')?.addEventListener('click', () => switchBilling(true));
    document.querySelector('.billing-toggle-wrap')?.addEventListener('click', (e) => {
        if (e.target.closest('#billingToggle') || e.target.id === 'lblMonthly' || e.target.id === 'lblYearly') return;
        switchBilling();
    });

    // Plan buttons
    document.getElementById('premiumPlanBtn')?.addEventListener('click', () => {
        const tier = currentUser?.subscription_tier || 'free';
        if (tier === 'premium') return;
        showPaymentStep('premium');
    });

    document.getElementById('proPlanBtn')?.addEventListener('click', () => {
        const tier = currentUser?.subscription_tier || 'free';
        if (tier === 'pro') return;
        showPaymentStep('pro');
    });

    // Back to pricing
    document.getElementById('backToPricingBtn')?.addEventListener('click', () => {
        document.getElementById('pricingCards').style.display = '';
        const payNotice = document.querySelector('.payment-notice');
        if (payNotice) payNotice.style.display = '';
        const billingWrap = document.querySelector('.billing-toggle-wrap');
        if (billingWrap) billingWrap.style.display = 'flex';
        document.getElementById('paymentStep').style.display = 'none';
        selectedUpgradePlan = null;
    });

    // Confirm payment
    document.getElementById('confirmPayBtn')?.addEventListener('click', confirmPayment);

    // Also hook the showToast-based "upgrade" prompts to open modal instead
    // Intercept the AI chat and export "upgrade now" messages to show modal
    const _origShowToast = window.__showToastFn;
    
    // Make modal triggerable from tier-lock messages
    window.openUpgradeModalFromLock = () => window.showUpgradeModal('premium');

    // Update subscription status card on profile page load
    const profileNavItem = document.querySelector('[data-page="profile"]');
    if (profileNavItem) {
        profileNavItem.addEventListener('click', () => {
            setTimeout(updateSubscriptionStatusCard, 100);
        });
    }

    // Initial update on app load (after showApp is called)
    const _origShowApp = showApp;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();


