# J'MONIC ENTERPRISE - Offline Deployment Guide

## System Requirements
Your office computer needs:
- Web browser (Chrome, Firefox, Safari, or Edge)
- PHP 7.4+ (for backend API functionality)
- MySQL/MariaDB server

## Files Structure
```
J'MONIC ENTERPRISE/
├── public/
│   ├── index.html              # Main dashboard
│   ├── styles.css              # Styling
│   ├── script.js               # Business logic
│   ├── assets/
│   │   ├── js/
│   │   │   └── chart.min.js    # Chart.js library (offline)
│   │   ├── css/
│   │   │   └── fontawesome.min.css  # Font Awesome CSS (offline)
│   │   └── fonts/
│   │       ├── fa-solid-900.woff2   # Font Awesome solid icons
│   │       └── fa-regular-400.woff2 # Font Awesome regular icons
│   └── api/
│       ├── config.php          # Database configuration
│       ├── products.php        # Product management API
│       ├── sales.php           # Sales management API
│       ├── customers.php       # Customer management API
│       ├── suppliers.php       # Supplier management API
│       └── dashboard.php       # Dashboard data API
└── database_setup.sql          # MySQL database schema
```

## Installation Steps

### 1. Copy Files
Copy the entire "J'MONIC ENTERPRISE" folder to your office computer.

### 2. Set Up Database
1. Install MySQL/MariaDB on your office computer
2. Import the database schema:
   ```sql
   mysql -u root -p < database_setup.sql
   ```
3. Update database credentials in `public/api/config.php`

### 3. Set Up Web Server
Choose one of these options:

#### Option A: Using PHP Built-in Server (Simplest)
```bash
cd "public"
php -S localhost:8080
```
Then open: http://localhost:8080

#### Option B: Using XAMPP/WAMP (Recommended for Windows)
1. Install XAMPP or WAMP
2. Copy the "public" folder to htdocs/www directory
3. Start Apache and MySQL services
4. Open: http://localhost/public

#### Option C: Using Apache/Nginx (Advanced)
Configure your web server to serve the "public" directory.

## Offline Features Confirmed ✅
- **Font Awesome Icons**: All icons work offline (downloaded locally)
- **Chart.js Library**: Charts and graphs work offline (downloaded locally)
- **CSS Styling**: Complete responsive design works offline
- **JavaScript Functionality**: All business logic works offline
- **No Internet Required**: System works completely without internet connection

## Database Features
- Products management (add, edit, delete hair products)
- Sales tracking and reporting
- Purchase order management
- Customer and supplier management
- Inventory tracking with automatic stock updates
- Dashboard with real-time analytics

## Browser Compatibility
✅ Chrome 90+
✅ Firefox 88+
✅ Safari 14+
✅ Edge 90+

## Security Notes
- System is designed for local office network use
- Database credentials should be secured
- Consider firewall rules if accessing from multiple computers
- Regular database backups recommended

## Troubleshooting

### Icons not showing?
- Check that `assets/fonts/` folder contains the font files
- Verify `assets/css/fontawesome.min.css` is loading

### Charts not working?
- Ensure `assets/js/chart.min.js` is loading
- Check browser console for JavaScript errors

### Database connection failed?
- Verify MySQL is running
- Check credentials in `api/config.php`
- Ensure database was imported correctly

### API errors?
- Make sure PHP is running on the server
- Check PHP error logs
- Verify all API files are in `public/api/` folder

## Support
This system is fully self-contained and ready for offline use in your office environment. All external dependencies have been downloaded and included locally.