# Insurance Dashboard - Quick Start Guide

## 🚀 Getting Started

### 1. Database Setup
```bash
# Ensure PostgreSQL is running
# Run database creation
python init_postgresql.py
```

### 2. Start the Application
```bash
python app.py
```

### 3. Register an Insurance Company
1. Navigate to: `http://127.0.0.1:5000/signup/insurance_company`
2. Fill in company details:
   - Company Name
   - License Number
   - IRDAI Registration
   - Contact Details
3. Submit registration

### 4. Login
1. Go to: `http://127.0.0.1:5000/login/insurance_company`
2. Enter credentials
3. Access dashboard

---

## 📋 Dashboard Navigation

### Main Sections:

1. **Dashboard Overview** - Real-time stats and alerts
2. **Policyholder Directory** - View all policies
3. **Policy Details** - Check coverage details
4. **Claim Management** - Process claims
5. **Cashless Pre-Auth** - Approve hospital requests
6. **Medical Review** - Review claim decisions
7. **Fraud Monitoring** - Check suspicious claims
8. **Documents** - Access claim documents
9. **Settlement** - Track payments
10. **Analytics** - View reports and trends
11. **Consent Management** - Monitor data access permissions
12. **Audit & Compliance** - Export activity logs

---

## 🔑 Key Features

### Claim Processing Workflow:
1. **View Claims** → Claims Management page
2. **Apply Filters** → Status, date range
3. **Click Claim ID** → View details
4. **Review & Decide** → Approve/Reject/Partial Approve
5. **Submit Decision** → Updates claim status

### Pre-Authorization Workflow:
1. **View Requests** → Cashless Pre-Auth page
2. **Filter by Status** → Pending, Approved, etc.
3. **Click Request ID** → View details
4. **Approve/Reject** → Enter amount and notes
5. **Submit** → Hospital receives approval

### Fraud Monitoring:
1. **View Cases** → Fraud Monitoring page
2. **Filter by Risk** → High, Critical, Medium, Low
3. **Check Indicators** → Automatic flags
4. **Investigate** → Mark for investigation
5. **Take Action** → Approve, deny, or report

---

## 🔒 Privacy Features

### Consent-Based Access:
- ✅ All patient data requires active consent
- ✅ Consent must be current (not expired)
- ✅ Purpose-specific data access
- ✅ Every access is logged

### Data Visibility:
**What You CAN See:**
- Diagnosis category (ICD-10 group)
- Treatment type (Medical/Surgical/ICU)
- Hospital name and dates
- Bill amounts and claim details
- Policy coverage information

**What You CANNOT See:**
- Raw diagnosis details
- Lab report values
- Prescription details
- Doctor's detailed notes
- Personal medical history

---

## 📊 Analytics & Reports

### Available Metrics:
- Claims by disease category
- Approval vs rejection ratio
- Average settlement time
- Fraud incidence rate
- SLA performance
- High-cost hospitals

### Export Options:
- Audit logs (CSV format)
- Claim reports
- Settlement records
- Compliance evidence

---

## ⚠️ Important Alerts

### Dashboard Alerts Include:
- 🔴 **Missing Documents** - Claims without supporting docs
- 🟡 **Policy Expiring Soon** - Within 30 days
- 🟠 **High-Value Claims** - Over ₹1 lakh
- 🔴 **SLA Breaches** - Response time exceeded
- ⚠️ **Fraud Flags** - Suspicious patterns detected

---

## 🔍 Search & Filter Options

### Policyholder Directory:
- Filter by: Active, Lapsed, Suspended, Expired
- Search: Policy number or client name
- Consent status filter

### Claims Management:
- Filter by: Status (Submitted, Under Review, Approved, Rejected)
- Date range: From - To
- SLA status indicator

### Cashless Requests:
- Filter by: Pending, Approved, Rejected, Partial
- SLA breach only filter

### Fraud Cases:
- Risk level: Critical, High, Medium, Low
- Investigation status

---

## 🛠️ Common Tasks

### Task 1: Approve a Claim
```
1. Click "Claim Management"
2. Find the claim → Click "View"
3. Review details
4. Click "Review & Decide"
5. Select "Approve"
6. Enter approved amount
7. Add notes (optional)
8. Submit
```

### Task 2: Check Policy Coverage
```
1. Click "Policy Details"
2. Enter policy number
3. Click "Load Policy Details"
4. Review sum insured, limits, exclusions
```

### Task 3: Investigate Fraud
```
1. Click "Fraud Monitoring"
2. Filter by "High" or "Critical"
3. Click fraud case
4. Review indicators
5. Mark for investigation
6. Add notes
```

### Task 4: Export Audit Logs
```
1. Click "Audit & Compliance"
2. Set date range
3. Apply filters (optional)
4. Click "Export" button
5. Download CSV file
```

---

## 🆘 Error Messages & Solutions

### "Policy not found"
**Solution**: Verify policy number belongs to your company

### "No active consent from patient"
**Solution**: Patient needs to grant consent via their dashboard

### "Claim not found or no consent"
**Solution**: Check consent status in Consent Management page

### "SLA breach detected"
**Solution**: Prioritize immediate review

---

## 📞 Support Contacts

### Technical Issues:
- Check logs in console
- Review audit logs for errors
- Verify database connection

### Data Access Issues:
- Confirm consent is active
- Check policy status
- Verify user authentication

---

## 🎯 Best Practices

1. **Review claims within SLA** - Default 48 hours
2. **Check fraud scores** - For claims > ₹50,000
3. **Verify documents** - Before approval
4. **Monitor consent expiry** - Renew as needed
5. **Regular audit reviews** - Monthly compliance checks
6. **Update company settings** - Auto-approve limits, SLA hours

---

## 🔧 Configuration Options

### Company Settings (Editable):
- **Auto-approve limit**: Claims below this amount auto-approved
- **Fraud threshold score**: Flag claims above this score
- **SLA hours**: Standard response time
- **Network hospitals**: Update count periodically

---

## 📈 Performance Metrics

### Track Your Performance:
- Claim settlement ratio
- Average processing time
- SLA compliance rate
- Fraud detection accuracy
- Customer satisfaction

---

## 💡 Tips & Tricks

1. **Use keyboard shortcuts**: Tab to navigate forms faster
2. **Bookmark frequent pages**: Policy Details, Claims, Pre-Auth
3. **Set up filters**: Save time on repeat searches
4. **Check alerts first**: Priority items on dashboard
5. **Export regularly**: Keep compliance records updated

---

## 🔄 Workflow Integration

### With Client Dashboard:
- Clients submit claims → You process
- Clients grant consent → You access data
- Clients view status → Real-time updates

### With Hospital Dashboard:
- Hospitals request pre-auth → You approve
- Hospitals submit claims → You verify
- Hospitals check eligibility → Real-time response

---

## 📚 Additional Resources

- **Full Implementation Guide**: See `INSURANCE_IMPLEMENTATION.md`
- **Database Models**: See `models/insurance_models.py`
- **API Endpoints**: See `routes/insurance_routes.py`
- **UI Components**: See `templates/insurance_dashboard.html`

---

**Last Updated**: January 12, 2026
**Version**: 1.0
**Status**: Production Ready ✅
