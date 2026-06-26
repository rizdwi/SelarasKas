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
