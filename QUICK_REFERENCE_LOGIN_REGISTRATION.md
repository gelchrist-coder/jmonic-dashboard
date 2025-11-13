# 🚀 GEL-STOCK Login & Registration Quick Reference

## Login Page
```
URL: http://localhost:9000/index.html

Two Options:
├─ LOGIN: Email + Password
└─ DEMO: No login required → Instant access

Features:
✓ Beautiful animated gradient background
✓ Glassmorphism card design
✓ "Remember me" option
✓ Error messages with animations
✓ Link to registration: "Create one"
```

## Registration Page
```
Access: Click "Create one" on login page

5 Required Fields:
1. Business Name      [📦 Store]
2. Owner Name         [👤 User]
3. Phone Number       [📱 Phone] ← Ghana format: 0... or +233...
4. Password           [🔐 Lock] ← Min 6 characters
5. Confirm Password   [🔐 Lock] ← Must match

Plus:
✓ Terms agreement checkbox (required)
✓ Real-time validation
✓ Error messages
✓ Success animation
```

## Phone Number Format

### Accepted Formats (Ghana)
```
✅ 0241234567          → Stored as: +233241234567
✅ 024 123 4567        → Stored as: +233241234567
✅ +233241234567       → Stored as: +233241234567
✅ +233 241 234 567    → Stored as: +233241234567

❌ Invalid:
❌ 241234567 (missing 0 or +233)
❌ 0361234567 (wrong range)
❌ +2341234567 (wrong country code)
```

## Registration Flow (4 Steps)

### Step 1: Fill Form
```
Business Name: "John's Hair Salon"
Owner Name: "John Mensah"
Phone: "0241234567"
Password: "SecurePass123"
Confirm: "SecurePass123"
```

### Step 2: Validate
```
System checks:
✓ All fields filled
✓ Phone valid Ghana format
✓ Passwords match (6+ chars)
✓ Terms agreed
```

### Step 3: Success
```
✓ Account created
✓ Button turns green
✓ Shows "Account Created!"
```

### Step 4: Dashboard
```
Dashboard loads automatically
Profile shows:
- Name: "John Mensah"
- Phone: "+233241234567"
- Business: "John's Hair Salon"
- Role: "Owner"
```

## Error Messages Quick Reference

| Error | Cause | Fix |
|-------|-------|-----|
| "Please enter your business name" | Empty field | Type business name |
| "Please enter your full name" | Empty field | Type your name |
| "Please enter your phone number" | Empty field | Type phone number |
| "Please enter a valid Ghana phone number" | Invalid format | Use 0XXXXXXXXX or +233XXXXXXXXX |
| "Password must be at least 6 characters long" | Too short | Use 6+ character password |
| "Passwords do not match" | Mismatch | Make sure both passwords are identical |
| "Please agree to the Terms" | Not checked | Check terms checkbox |

## Navigation

### Login → Registration
```
Click: "Create one" link
Result: Registration form appears
```

### Registration → Login
```
Click: "Sign in" link
Result: Login form appears
```

## After Registration

### What You Can Do
✅ Add products to inventory
✅ Record sales transactions
✅ Check stock levels
✅ View revenue analytics
✅ Generate reports
✅ Manage inventory
✅ Track customers
✅ View business metrics

### Access Profile Menu
```
Click: [👤 Your Name ▼] in header-right
Shows:
├─ Your Name
├─ Your Phone (+233...)
├─ Your Role (Owner)
├─ Settings link
└─ Logout link
```

## Demo Mode (Quick Start)

```
Click: "Try Demo (No Login Required)"
Result: Instant access with:
✓ Sample products loaded
✓ Sample sales data
✓ All features enabled
✓ No login needed
✓ Perfect for exploration
```

## Browser Storage

### After Login
```
sessionStorage.gel_user = {
    businessName: "...",
    name: "...",
    phone: "+233...",
    role: "owner",
    registrationTime: "..."
}
```

### Auto-Clear
Session clears automatically when:
- Browser tab closed
- Browser closed
- User logs out
- 24 hours pass (optional)

## Feature Comparison

| Feature | Login | Registration | Demo |
|---------|-------|--------------|------|
| Email needed | Yes | No (uses phone) | No |
| Phone needed | No | Yes | No |
| Create account | No | Yes | No |
| Instant access | No | Yes | Yes |
| Sample data | No | No | Yes |
| Real data | Yes (if existing) | Yes | No |
| Password | Optional | Required | No |

## Support & Troubleshooting

### Phone Number Not Accepted?
```
❌ "0361234567" → Wrong range
✅ Try: "0241234567" (valid Ghana number)
```

### Password Error?
```
❌ "MyPass" (5 chars) → Too short
✅ Try: "MyPass123" (9 chars)
```

### Can't Register?
```
1. Check all 5 fields are filled
2. Check phone format is valid Ghana number
3. Check passwords match exactly
4. Check terms checkbox is marked
5. Try refreshing page
```

### Forgot Account Info?
```
Options:
1. Register new account with different phone
2. Use Demo mode to explore
3. Contact support via phone
```

## Color Scheme

### Login Page
```
Background: Purple → Pink → Blue → Cyan
Logo gradient: Purple (#667eea) → Dark Purple (#764ba2)
Button: Purple gradient
Demo button: Pink gradient
```

### Registration Page
```
Background: Pink → Red → Blue → Cyan → Purple
Logo gradient: Red (#f5576c) → Pink (#f093fb)
Button: Pink gradient
Error: Red background
```

## Keyboard Shortcuts

```
Tab       → Jump between fields
Enter     → Submit form
Shift+Tab → Jump backwards
Escape    → Close dropdown menu
```

## File Locations

```
Frontend Files:
├─ index.html      (Login & Registration HTML)
├─ styles.css      (All styling)
└─ script.js       (All JavaScript logic)

API Files (Backend):
├─ api/products.php
├─ api/sales.php
├─ api/customers.php
└─ api/dashboard.php

Documentation:
├─ REGISTRATION_SYSTEM.md (Technical)
├─ REGISTRATION_VISUAL_GUIDE.md (Visual examples)
└─ REGISTRATION_COMPLETE.md (Full summary)
```

## Functions Quick Reference

### Validation
```javascript
validateGhanaPhone(phone)          // Check if valid
formatGhanaPhone(phone)            // Format to standard
```

### Navigation
```javascript
switchToRegistration(event)        // Show registration
switchToLogin(event)               // Show login
```

### Form Handling
```javascript
handleRegistration(event)          // Submit registration
handleLogin(event)                 // Submit login
enterDemoMode()                    // Start demo
```

### User Menu
```javascript
updateUserHeaderInfo()             // Update profile display
toggleUserMenu()                   // Open/close dropdown
logoutUser()                       // Logout
```

## Quick Start (30 seconds)

### Try Demo
```
1. Open: http://localhost:9000/index.html
2. Click: "Try Demo (No Login Required)"
3. See: Dashboard with sample data
4. Done! ✓
```

### Create Account
```
1. Click: "Create one"
2. Fill: 5 fields (2 min)
3. Click: "Create Account"
4. See: Dashboard with your info
5. Done! ✓
```

## Tips & Tricks

### Phone Format
- System accepts any spacing/dashes and removes them
- Local (0) format auto-converts to international (+233)
- Display always shows: "+233 XXX XXX XXX"

### Password Security
- Min 6 characters required
- No special characters needed
- Use mix of letters and numbers for security
- Not stored anywhere (demo mode)

### Dashboard After Registration
- Your name appears in top-right
- Business name shows in header subtitle
- All features immediately available
- Sample data provided for testing

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Login page keeps showing | Demo or register first |
| Registration button disabled | Fill all 5 fields first |
| Phone shows as invalid | Use Ghana format (0... or +233...) |
| Can't switch screens | Close error message first |
| Lost my account | Register again with new phone |
| Want to use demo data | Click "Try Demo" instead of registering |

## Production Considerations

### When Deploying
- [ ] Connect to backend API
- [ ] Implement SMS verification
- [ ] Add password reset
- [ ] Enable HTTPS
- [ ] Add rate limiting
- [ ] Implement audit logging
- [ ] Add spam protection
- [ ] Set up monitoring

### Security Checklist
- [ ] Hash passwords server-side
- [ ] Validate on server (not just client)
- [ ] Implement JWT tokens
- [ ] Add CSRF protection
- [ ] Rate limit login attempts
- [ ] Log security events
- [ ] Monitor for abuse
- [ ] Keep dependencies updated

---

## 📞 Contact & Support

**For Customization:**
- Edit phone validation in script.js
- Modify CSS in styles.css
- Change HTML in index.html

**For Backend Integration:**
- Connect handleRegistration() to API
- Implement user authentication
- Set up database storage

**For Features:**
- Add SMS verification
- Implement password reset
- Add two-factor auth
- Create admin dashboard

---

**Last Updated**: November 13, 2025
**Status**: ✅ Ready to Use
**Server**: http://localhost:9000
