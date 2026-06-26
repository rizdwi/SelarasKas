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
