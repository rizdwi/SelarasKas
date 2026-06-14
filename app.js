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
        'house': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-house"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`,
        'zap': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-zap"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>`,
        'droplets': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-droplets"><path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"/><path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"/></svg>`,
        'wifi': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-wifi"><path d="M12 20h.01"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.859a10 10 0 0 1 14 0"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/></svg>`,
        'key': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-key"><path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/><path d="m21 2-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/></svg>`,
        'trash-2': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
        'wrench': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-wrench"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z"/></svg>`,
        'hammer': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-hammer"><path d="m15 12-9.373 9.373a1 1 0 0 1-3.001-3L12 9"/><path d="m18 15 4-4"/><path d="m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172v-.344a2 2 0 0 0-.586-1.414l-1.657-1.657A6 6 0 0 0 12.516 3H9l1.243 1.243A6 6 0 0 1 12 8.485V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5"/></svg>`,
        'baby': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-baby"><path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5"/><path d="M15 12h.01"/><path d="M19.38 6.813A9 9 0 0 1 20.8 10.2a2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1"/><path d="M9 12h.01"/></svg>`,
        'book-open': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-book-open"><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></svg>`,
        'pen-tool': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pen-tool"><path d="M15.707 21.293a1 1 0 0 1-1.414 0l-1.586-1.586a1 1 0 0 1 0-1.414l5.586-5.586a1 1 0 0 1 1.414 0l1.586 1.586a1 1 0 0 1 0 1.414z"/><path d="m18 13-1.375-6.874a1 1 0 0 0-.746-.776L3.235 2.028a1 1 0 0 0-1.207 1.207L5.35 15.879a1 1 0 0 0 .776.746L13 18"/><path d="m2.3 2.3 7.286 7.286"/><circle cx="11" cy="11" r="2"/></svg>`,
        'book': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-book"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/></svg>`,
        'shirt': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shirt"><path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/></svg>`,
        'toy-brick': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-toy-brick"><rect width="18" height="12" x="3" y="8" rx="1"/><path d="M10 8V5c0-.6-.4-1-1-1H6a1 1 0 0 0-1 1v3"/><path d="M19 8V5c0-.6-.4-1-1-1h-3a1 1 0 0 0-1 1v3"/></svg>`,
        'stethoscope': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-stethoscope"><path d="M11 2v2"/><path d="M5 2v2"/><path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1"/><path d="M8 15a6 6 0 0 0 12 0v-3"/><circle cx="20" cy="10" r="2"/></svg>`,
        'utensils-crossed': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-utensils-crossed"><path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8"/><path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7"/><path d="m2.1 21.8 6.4-6.3"/><path d="m19 5-7 7"/></svg>`,
        'carrot': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-carrot"><path d="M2.27 21.7s9.87-3.5 12.73-6.36a4.5 4.5 0 0 0-6.36-6.37C5.77 11.84 2.27 21.7 2.27 21.7zM8.64 14l-2.05-2.04M15.34 15l-2.46-2.46"/><path d="M22 9s-1.33-2-3.5-2C16.86 7 15 9 15 9s1.33 2 3.5 2S22 9 22 9z"/><path d="M15 2s-2 1.33-2 3.5S15 9 15 9s2-1.84 2-3.5C17 3.33 15 2 15 2z"/></svg>`,
        'drumstick': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-drumstick"><path d="M15.4 15.63a7.875 6 135 1 1 6.23-6.23 4.5 3.43 135 0 0-6.23 6.23"/><path d="m8.29 12.71-2.6 2.6a2.5 2.5 0 1 0-1.65 4.65A2.5 2.5 0 1 0 8.7 18.3l2.59-2.59"/></svg>`,
        'flame': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-flame"><path d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4"/></svg>`,
        'wheat': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-wheat"><path d="M2 22 16 8"/><path d="M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"/><path d="M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"/><path d="M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"/><path d="M20 2h2v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4Z"/><path d="M11.47 17.47 13 19l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L5 19l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z"/><path d="M15.47 13.47 17 15l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L9 15l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z"/><path d="M19.47 9.47 21 11l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L13 11l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z"/></svg>`,
        'cup-soda': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-cup-soda"><path d="m6 8 1.75 12.28a2 2 0 0 0 2 1.72h4.54a2 2 0 0 0 2-1.72L18 8"/><path d="M5 8h14"/><path d="M7 15a6.47 6.47 0 0 1 5 0 6.47 6.47 0 0 0 5 0"/><path d="m12 8 1-6h2"/></svg>`,
        'car': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-car"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>`,
        'fuel': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-fuel"><path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 4 0v-6.998a2 2 0 0 0-.59-1.42L18 5"/><path d="M14 21V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v16"/><path d="M2 21h13"/><path d="M3 9h11"/></svg>`,
        'circle-parking': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-parking"><circle cx="12" cy="12" r="10"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/></svg>`,
        'navigation': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-navigation"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>`,
        'bus': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bus"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/></svg>`,
        'pizza': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pizza"><path d="m12 14-1 1"/><path d="m13.75 18.25-1.25 1.42"/><path d="M17.775 5.654a15.68 15.68 0 0 0-12.121 12.12"/><path d="M18.8 9.3a1 1 0 0 0 2.1 7.7"/><path d="M21.964 20.732a1 1 0 0 1-1.232 1.232l-18-5a1 1 0 0 1-.695-1.232A19.68 19.68 0 0 1 15.732 2.037a1 1 0 0 1 1.232.695z"/></svg>`,
        'coffee': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-coffee"><path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/><path d="M6 2v2"/></svg>`,
        'soup': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-soup"><path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z"/><path d="M7 21h10"/><path d="M19.5 12 22 6"/><path d="M16.25 3c.27.1.8.53.75 1.36-.06.83-.93 1.2-1 2.02-.05.78.34 1.24.73 1.62"/><path d="M11.25 3c.27.1.8.53.74 1.36-.05.83-.93 1.2-.98 2.02-.06.78.33 1.24.72 1.62"/><path d="M6.25 3c.27.1.8.53.75 1.36-.06.83-.93 1.2-1 2.02-.05.78.34 1.24.74 1.62"/></svg>`,
        'utensils': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-utensils"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>`,
        'glass-water': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-glass-water"><path d="M5.116 4.104A1 1 0 0 1 6.11 3h11.78a1 1 0 0 1 .994 1.105L17.19 20.21A2 2 0 0 1 15.2 22H8.8a2 2 0 0 1-2-1.79z"/><path d="M6 12a5 5 0 0 1 6 0 5 5 0 0 0 6 0"/></svg>`,
        'cookie': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-cookie"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/><path d="M8.5 8.5v.01"/><path d="M16 15.5v.01"/><path d="M12 12v.01"/><path d="M11 17v.01"/><path d="M7 14v.01"/></svg>`,
        'heart-pulse': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-heart-pulse"><path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"/><path d="M3.22 13H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/></svg>`,
        'hospital': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-hospital"><path d="M12 7v4"/><path d="M14 21v-3a2 2 0 0 0-4 0v3"/><path d="M14 9h-4"/><path d="M18 11h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h2"/><path d="M18 21V5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16"/></svg>`,
        'pill': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pill"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>`,
        'activity': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-activity"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/></svg>`,
        'landmark': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-landmark"><path d="M10 18v-7"/><path d="M11.119 2.205a2 2 0 0 1 1.762 0l7.84 3.846A.5.5 0 0 1 20.5 7h-17a.5.5 0 0 1-.22-.949z"/><path d="M14 18v-7"/><path d="M18 18v-7"/><path d="M3 22h18"/><path d="M6 18v-7"/></svg>`,
        'dumbbell': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-dumbbell"><path d="M17.596 12.768a2 2 0 1 0 2.829-2.829l-1.768-1.767a2 2 0 0 0 2.828-2.829l-2.828-2.828a2 2 0 0 0-2.829 2.828l-1.767-1.768a2 2 0 1 0-2.829 2.829z"/><path d="m2.5 21.5 1.4-1.4"/><path d="m20.1 3.9 1.4-1.4"/><path d="M5.343 21.485a2 2 0 1 0 2.829-2.828l1.767 1.768a2 2 0 1 0 2.829-2.829l-6.364-6.364a2 2 0 1 0-2.829 2.829l1.768 1.767a2 2 0 0 0-2.828 2.829z"/><path d="m9.6 14.4 4.8-4.8"/></svg>`,
        'party-popper': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-party-popper"><path d="M5.8 11.3 2 22l10.7-3.79"/><path d="M4 3h.01"/><path d="M22 8h.01"/><path d="M15 2h.01"/><path d="M22 20h.01"/><path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10"/><path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11c-.11.7-.72 1.22-1.43 1.22H17"/><path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98C9.52 4.9 9 5.52 9 6.23V7"/><path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z"/></svg>`,
        'film': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-film"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M3 7.5h4"/><path d="M3 12h18"/><path d="M3 16.5h4"/><path d="M17 3v18"/><path d="M17 7.5h4"/><path d="M17 16.5h4"/></svg>`,
        'tv': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-tv"><path d="m17 2-5 5-5-5"/><rect width="20" height="15" x="2" y="7" rx="2"/></svg>`,
        'gamepad-2': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-gamepad-2"><line x1="6" x2="10" y1="11" y2="11"/><line x1="8" x2="8" y1="9" y2="13"/><line x1="15" x2="15.01" y1="12" y2="12"/><line x1="18" x2="18.01" y1="10" y2="10"/><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"/></svg>`,
        'plane': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plane"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>`,
        'palette': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-palette"><path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z"/><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/></svg>`,
        'footprints': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-footprints"><path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z"/><path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z"/><path d="M16 17h4"/><path d="M4 13h4"/></svg>`,
        'watch': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-watch"><path d="M12 10v2.2l1.6 1"/><path d="m16.13 7.66-.81-4.05a2 2 0 0 0-2-1.61h-2.68a2 2 0 0 0-2 1.61l-.78 4.05"/><path d="m7.88 16.36.8 4a2 2 0 0 0 2 1.61h2.72a2 2 0 0 0 2-1.61l.81-4.05"/><circle cx="12" cy="12" r="6"/></svg>`,
        'washing-machine': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-washing-machine"><path d="M3 6h3"/><path d="M17 6h.01"/><rect width="18" height="20" x="3" y="2" rx="2"/><circle cx="12" cy="13" r="5"/><path d="M12 18a2.5 2.5 0 0 0 0-5 2.5 2.5 0 0 1 0-5"/></svg>`,
        'box': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-box"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`,
        'heart-handshake': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-heart-handshake"><path d="M19.414 14.414C21 12.828 22 11.5 22 9.5a5.5 5.5 0 0 0-9.591-3.676.6.6 0 0 1-.818.001A5.5 5.5 0 0 0 2 9.5c0 2.3 1.5 4 3 5.5l5.535 5.362a2 2 0 0 0 2.879.052 2.12 2.12 0 0 0-.004-3 2.124 2.124 0 1 0 3-3 2.124 2.124 0 0 0 3.004 0 2 2 0 0 0 0-2.828l-1.881-1.882a2.41 2.41 0 0 0-3.409 0l-1.71 1.71a2 2 0 0 1-2.828 0 2 2 0 0 1 0-2.828l2.823-2.762"/></svg>`,
        'gift': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-gift"><path d="M12 7v14"/><path d="M20 11v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8"/><path d="M7.5 7a1 1 0 0 1 0-5A4.8 8 0 0 1 12 7a4.8 8 0 0 1 4.5-5 1 1 0 0 1 0 5"/><rect x="3" y="7" width="18" height="4" rx="1"/></svg>`,
        'help-circle': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-help"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>`,
        'wallet': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-wallet"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>`,
        'coins': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-coins"><path d="M13.744 17.736a6 6 0 1 1-7.48-7.48"/><path d="M15 6h1v4"/><path d="m6.134 14.768.866-.5 2 3.464"/><circle cx="16" cy="8" r="6"/></svg>`,
        'laptop': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-laptop"><path d="M18 5a2 2 0 0 1 2 2v8.526a2 2 0 0 0 .212.897l1.068 2.127a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45l1.068-2.127A2 2 0 0 0 4 15.526V7a2 2 0 0 1 2-2z"/><path d="M20.054 15.987H3.946"/></svg>`,
        'trending-up': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trending-up"><path d="M16 7h6v6"/><path d="m22 7-8.5 8.5-5-5L2 17"/></svg>`,
        'target': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-target"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
        'trophy': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trophy"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34"/><path d="M12 2a6 6 0 0 1 6 6v3a6 6 0 0 1-6 6 6 6 0 0 1-6-6V8a6 6 0 0 1 6-6z"/></svg>`,
        'smartphone': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-smartphone"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>`,
        'heart': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-heart"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`,
        'banknote': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-banknote"><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>`,
        'tag': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-tag"><path d="M12.586 3h1.172a2 2 0 0 1 1.414.586l6.242 6.242a2 2 0 0 1 0 2.828l-6.242 6.242a2 2 0 0 1-2.828 0L6.002 12.65a2 2 0 0 1-.586-1.414V10.06a8 8 0 0 1 8-8z"/><circle cx="10" cy="10" r="1"/></svg>`,
        'file-text': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-text"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>`,
        'calendar': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>`,
        'flag': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-flag"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>`,
        'plus-circle': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus-circle"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>`,
        'eye': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z"/><circle cx="12" cy="12" r="3"/></svg>`,
        'eye-off': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye-off"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>`,
        'piggy-bank': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-piggy-bank"><path d="M19 5c-1.5 0-2.8 1.4-3 2-1-.6-2.5-.5-3-1l-1.5 1.5c.5.5.4 2 .9 3-.6.2-2 1.5-2 3"/><path d="M9 19c-.5 0-1-.5-1-1v-2c0-.5.5-1 1-1h2v3Z"/><path d="M15 19c-.5 0-1-.5-1-1v-2c0-.5.5-1 1-1h2v3Z"/><path d="M20 9v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V9a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4Z"/><path d="M6 10h.01"/></svg>`
    };

    // Aliases
    LUCIDE_SVGs['home'] = LUCIDE_SVGs['house'];
    LUCIDE_SVGs['Rumah Tangga'] = LUCIDE_SVGs['house'];

    // Emoji Fallback Mappings for Maximum DB Compatibility
    LUCIDE_SVGs['🏠'] = LUCIDE_SVGs['house'];
    LUCIDE_SVGs['💡'] = LUCIDE_SVGs['zap'];
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

    function showApp(user) {
        currentUser = user;
        document.getElementById('authScreen').classList.remove('active');
        document.getElementById('mainApp').classList.add('active');
        
        updateUserUI();
        
        applyTheme(user.theme || 'dark');

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

    // ===== DASHBOARD =====
    async function loadDashboard() {
        try {
            renderSkeletonTransactions(document.getElementById('transactionsList'));
            renderSkeletonChart(document.getElementById('spendingCategories'));
            
            const data = await api(`transactions.php?action=dashboard&month=${currentMonth}&limit=20`);

            renderBalance(data.summary);
            renderSpendingChart(data.chart);
            renderTransactions(document.getElementById('transactionsList'), data.transactions);
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
            const catName = tx.parent_category_name ? tx.parent_category_name : tx.category_name;
            const iconName = tx.emoji || 'box';
            const iconColor = tx.color || '#94a3b8';
            const bg = tx.color ? tx.color + '18' : 'rgba(148,163,184,0.1)';

            html += `
                <div class="transaction-item fade-in-up" data-id="${tx.id}">
                    <div class="transaction-content">
                        <div class="transaction-icon" style="background:${bg}; display:flex; align-items:center; justify-content:center;">${renderEmojiOrIcon(iconName, '20px', iconColor)}</div>
                        <div class="transaction-details">
                            <span class="transaction-name">${escapeHTML(tx.description || tx.category_name)}</span>
                            <span class="transaction-category">${escapeHTML(catName)}</span>
                        </div>
                        <div class="transaction-amount-col">
                            <span class="transaction-amount ${isIncome ? 'income' : 'expense'}">
                                ${isIncome ? '+' : '-'}${formatRp(tx.amount)}
                            </span>
                        </div>
                        <button class="transaction-delete" onclick="event.stopPropagation(); window.Selaraskas.deleteTransaction(${tx.id})">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
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
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            </button>
                            <button class="savings-action-delete" onclick="event.stopPropagation(); window.Selaraskas.deleteSaving(${g.id})">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
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
                    <svg class="category-parent-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
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

        if (typeof html2canvas === 'undefined') {
            showToast('Library export belum termuat. Coba refresh halaman.');
            return;
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
                
                showToast('Mengupload foto...');
                try {
                    // Bypass API function because we need multipart/form-data
                    const res = await fetch(`${API}/profile.php?action=upload_photo`, {
                        method: 'POST',
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
        remainEl.textContent = 'Sisa: ' + formatRp(remain);
        
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
            
            return `
            <div class="budget-item fade-in-up" onclick="window.Selaraskas.showBudgetForm(${b.category_id}, ${b.amount})" style="cursor:pointer">
                <div class="budget-item-top">
                    <div class="budget-item-icon" style="background:${b.category_color}18; display:flex; align-items:center; justify-content:center;">${renderEmojiOrIcon(b.category_emoji, '20px', b.category_color)}</div>
                    <div class="budget-item-info">
                        <span class="budget-item-title">${b.category_name}</span>
                        <span class="budget-item-amounts">${formatRp(b.spent, true)} / ${formatRp(b.amount, true)}</span>
                    </div>
                    <button class="budget-item-delete" onclick="event.stopPropagation(); window.Selaraskas.deleteBudget(${b.id})">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </div>
                <div class="budget-progress-bar">
                    <div class="budget-progress-fill" style="width:${itemPct}%;background:${color}"></div>
                </div>
                <div class="budget-progress-row">
                    <span class="budget-progress-text" style="color:${color}">${itemPct.toFixed(0)}%</span>
                    <span class="budget-remain-text">Sisa ${formatRp(b.amount - b.spent, true)}</span>
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
                    <svg class="category-parent-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
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
                    ${type === 'income' ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>' : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>'}
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
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
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
                    html += `<option value="${cat.id}" ${cat.id == guessedCatId ? 'selected' : ''}>${cat.name}</option>`;
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
                        <input type="text" class="ocr-item-desc" value="${item.description}" placeholder="Nama barang" id="desc_${idx}">
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
                                <div class="biometric-cred-name">🔑 ${c.device_name}</div>
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

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
