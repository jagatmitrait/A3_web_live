# MNC Employee Management Features

## Overview
Added complete employee registration, verification, and consent management system for MNC dashboard.

## New Features

### 1. Employee Registration (MNC Side)
**Location:** MNC Dashboard > Employee Directory > "Register Employee" button

**Process:**
1. MNC clicks "Register Employee"
2. Fills in form:
   - Employee ID (required)
   - Full Name (required)
   - Email (required)
   - Mobile (required)
   - Department (optional)
   - Job Role (optional)
3. System generates 6-character verification code
4. Code displayed in modal (can be copied)
5. MNC shares code with employee via email/SMS

**API Endpoint:** `POST /api/mnc/employees/register`

### 2. Pending Verifications
**Location:** MNC Dashboard > "Pending Verification" button

**Features:**
- Shows all employees awaiting verification
- Displays verification codes
- Copy code button for easy sharing
- Shows registration timestamp
- Auto-updates count badge

**API Endpoint:** `GET /api/mnc/employees/pending`

### 3. Employee Verification & Consent
**Location:** Public page at `/employee/verify`

**3-Step Process:**

**Step 1: Verification**
- Employee enters their A3 Health Card UID
- Employee enters verification code from employer
- System links employee record to client account

**Step 2: Consent Management**
- Employee selects what data to share:
  - ✅ Fitness for Duty Status (recommended)
  - ✅ Vaccination Compliance (recommended)
  - ✅ Work Limitations/Restrictions (recommended)
  - ✅ Emergency Contact Information (recommended)
  - ⬜ Chronic Conditions (optional)
- Consent valid for 1 year
- Can be revoked anytime

**Step 3: Confirmation**
- Success message
- Instructions for next steps
- Link to dashboard

**API Endpoints:**
- `POST /api/employee/verify-link`
- `POST /api/employee/consent`

## Database Changes
No schema changes required - all routes use existing MNC models:
- `MNCEmployee` - stores employee info and verification status
- `MNCConsent` - stores granular consent permissions

## UI Components Added

### MNC Dashboard (mnc_dashboard.html)
1. **Register Employee Button** - Opens registration modal
2. **Pending Verification Button** - Shows pending employees with badge count
3. **Register Employee Modal** - Form for adding new employees
4. **Verification Code Modal** - Displays generated code with copy functionality
5. **Pending Employees Modal** - Table showing all unverified employees

### Employee Verification Page (employee_verification.html)
- Beautiful gradient design
- 3-step wizard interface
- Step indicators
- Granular consent controls
- Mobile-responsive

## JavaScript Functions Added (mnc_dashboard.js)

```javascript
loadPendingCount()           // Updates pending badge count
showRegisterEmployeeModal()  // Opens registration form
registerEmployee()           // Submits registration to API
copyVerificationCode()       // Copies code to clipboard
showPendingEmployees()       // Opens pending list modal
copyCodeToClipboard(code)    // Copies specific code
```

## Backend Routes Added (routes/mnc_routes.py)

```python
@mnc_bp.route('/api/mnc/employees/register', methods=['POST'])
# Register new employee and generate verification code

@mnc_bp.route('/api/mnc/employees/pending')
# Get list of pending verifications

@mnc_bp.route('/api/employee/verify-link', methods=['POST'])
# Employee links UID to company record (public endpoint)

@mnc_bp.route('/api/employee/consent', methods=['POST'])
# Employee grants consent for data sharing (public endpoint)
```

## Usage Flow

### For MNC/Employer:
1. Go to MNC Dashboard > Employee Directory
2. Click "Register Employee"
3. Fill in employee details
4. Copy generated verification code
5. Share code with employee via email/SMS
6. Monitor "Pending Verification" button for status
7. Once verified, employee appears in main directory

### For Employee:
1. Receive verification code from employer
2. Visit: `https://yourapp.com/employee/verify`
3. Enter A3 Health Card UID + verification code
4. Select which health data to share
5. Grant consent
6. Done! Employer can now see consented data

## Security Features
- ✅ Verification code required (6 characters, random)
- ✅ Must match UID to employee record
- ✅ Consent-based data access only
- ✅ Granular permission control
- ✅ 1-year consent expiry (auto-renew option)
- ✅ Public endpoints have no authentication (safe for employees)
- ✅ MNC endpoints require login + user_type='mnc' check

## Testing
1. Login as MNC user
2. Register test employee
3. Note verification code
4. Open `/employee/verify` in incognito/new browser
5. Enter client UID + verification code
6. Grant consent
7. Check MNC dashboard - employee should appear

## Benefits
- ✅ No manual database work needed
- ✅ Self-service employee onboarding
- ✅ Privacy-first design (explicit consent)
- ✅ Easy to use for both MNC and employees
- ✅ Professional UI/UX
- ✅ Mobile-friendly verification page
