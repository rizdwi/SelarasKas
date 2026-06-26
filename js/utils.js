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
