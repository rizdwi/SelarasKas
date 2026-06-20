#!/bin/bash
# ============================================
# SelarasKas — VPS Auto Setup Script
# Run this on your SumoPod VPS (Ubuntu)
# ============================================

set -e
echo "🚀 Starting SelarasKas VPS Setup..."

# 1. Update system
echo "📦 [1/6] Updating system packages..."
sudo apt-get update -y && sudo apt-get upgrade -y

# 2. Install Apache, PHP 8.2, and required extensions
echo "📦 [2/6] Installing Apache + PHP 8.2..."
sudo apt-get install -y software-properties-common
sudo add-apt-repository -y ppa:ondrej/php
sudo apt-get update -y
sudo apt-get install -y \
    apache2 \
    php8.2 \
    php8.2-mysql \
    php8.2-curl \
    php8.2-gd \
    php8.2-mbstring \
    php8.2-xml \
    php8.2-zip \
    php8.2-intl \
    php8.2-bcmath \
    libapache2-mod-php8.2 \
    git \
    unzip

# 3. Enable Apache modules
echo "⚙️ [3/6] Configuring Apache..."
sudo a2enmod rewrite
sudo a2enmod headers
sudo a2enmod ssl

# Configure Apache to allow .htaccess overrides
sudo tee /etc/apache2/sites-available/000-default.conf > /dev/null <<'VHOST'
<VirtualHost *:80>
    ServerAdmin webmaster@localhost
    DocumentRoot /var/www/html

    <Directory /var/www/html>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/error.log
    CustomLog ${APACHE_LOG_DIR}/access.log combined
</VirtualHost>
VHOST

# 4. Clone the repository
echo "📥 [4/6] Downloading SelarasKas from GitHub..."
sudo rm -rf /var/www/html/*
cd /var/www/html
sudo git clone https://github.com/rizdwi/SelarasKas.git .

# 5. Set permissions
echo "🔐 [5/6] Setting file permissions..."
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html
sudo mkdir -p /var/www/html/uploads
sudo chmod -R 775 /var/www/html/uploads

# 6. Create .htaccess for clean URLs and security
sudo tee /var/www/html/.htaccess > /dev/null <<'HTACCESS'
RewriteEngine On

# Force HTTPS (uncomment when SSL is ready)
# RewriteCond %{HTTPS} off
# RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Security: block access to sensitive files
<FilesMatch "\.(env|gitignore|md|sql|py|sh)$">
    Order allow,deny
    Deny from all
</FilesMatch>

# Block access to .git directory
RedirectMatch 404 /\.git
HTACCESS

sudo chown www-data:www-data /var/www/html/.htaccess

# 7. Restart Apache
echo "🔄 [6/6] Restarting Apache..."
sudo systemctl restart apache2
sudo systemctl enable apache2

# 8. Show status
echo ""
echo "============================================"
echo "✅ SelarasKas VPS Setup Complete!"
echo "============================================"
echo ""
echo "📌 Public IP: $(curl -s ifconfig.me 2>/dev/null || echo 'check manually')"
echo "📌 PHP Version: $(php -v | head -n1)"
echo "📌 Apache Status: $(systemctl is-active apache2)"
echo ""
echo "🌐 Open in browser: http://$(curl -s ifconfig.me 2>/dev/null || echo '43.134.186.22')"
echo ""
echo "📋 Next steps:"
echo "   1. Add your VPS IP to SumoPod Database IP Allowlist"
echo "   2. Open http://YOUR_IP/api/init_db.php to initialize database"
echo "   3. Point your domain DNS to this VPS IP"
echo ""
