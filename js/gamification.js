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
