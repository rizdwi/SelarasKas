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
