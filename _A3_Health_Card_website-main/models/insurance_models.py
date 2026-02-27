"""
Insurance Company Dashboard Models
Models for insurance company operations, claims processing, fraud detection, and consent management
"""
from datetime import datetime

def create_insurance_models(db):
    """
    Factory function to create insurance models with the db instance.
    This avoids circular imports.
    """
    
    class InsuranceCompany(db.Model):
        """Insurance Company user type - extends User model"""
        __tablename__ = 'insurance_companies'
        
        id = db.Column(db.Integer, primary_key=True)
        user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
        
        # Company Details
        company_name = db.Column(db.String(200), nullable=False)
        company_type = db.Column(db.String(50))  # Life, Health, General
        license_number = db.Column(db.String(100), unique=True)
        irdai_registration = db.Column(db.String(100))  # IRDAI registration number
        
        # Business Details
        established_year = db.Column(db.Integer)
        pan_number = db.Column(db.String(20))
        gstin = db.Column(db.String(20))
        
        # Contact & Address
        registered_address = db.Column(db.Text)
        city = db.Column(db.String(100))
        state = db.Column(db.String(100))
        country = db.Column(db.String(100))
        pincode = db.Column(db.String(20))
        contact_email = db.Column(db.String(120))
        contact_phone = db.Column(db.String(20))
        helpline_number = db.Column(db.String(20))
        website = db.Column(db.String(200))
        
        # Operational Details
        network_hospitals_count = db.Column(db.Integer, default=0)
        active_policies_count = db.Column(db.Integer, default=0)
        claim_settlement_ratio = db.Column(db.Float)  # Percentage
        
        # System Settings
        auto_approve_limit = db.Column(db.Float, default=5000.0)  # Auto-approve claims below this amount
        fraud_threshold_score = db.Column(db.Float, default=70.0)  # Flag if fraud score exceeds this
        sla_hours = db.Column(db.Integer, default=48)  # Claim processing SLA
        
        # Status
        is_verified = db.Column(db.Boolean, default=False)
        verification_date = db.Column(db.DateTime)
        status = db.Column(db.String(20), default='Pending')  # Pending, Active, Suspended
        
        created_at = db.Column(db.DateTime, default=datetime.utcnow)
        updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
        
        # Relationships
        user = db.relationship('User', backref=db.backref('insurance_company', uselist=False))
        cashless_requests = db.relationship('CashlessPreAuth', backref='insurance_company', lazy='dynamic')
        consents = db.relationship('ConsentManagement', backref='insurance_company', lazy='dynamic')


    class ConsentManagement(db.Model):
        """Patient consent for insurance companies to access medical data"""
        __tablename__ = 'consent_management'
        
        id = db.Column(db.Integer, primary_key=True)
        
        # Parties Involved
        patient_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
        insurance_company_id = db.Column(db.Integer, db.ForeignKey('insurance_companies.id'), nullable=False)
        policy_id = db.Column(db.Integer, db.ForeignKey('insurances.id'))
        
        # Consent Details
        consent_id = db.Column(db.String(50), unique=True, nullable=False)  # Auto-generated
        purpose = db.Column(db.String(200), nullable=False)  # Claim Processing, Policy Verification, etc.
        
        # Data Scope
        data_scope = db.Column(db.JSON)  # {diagnosis: true, lab_reports: false, prescriptions: true, etc.}
        access_level = db.Column(db.String(50), default='Summary')  # Summary, Detailed, Full
        
        # Validity
        consent_given_date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
        consent_start_date = db.Column(db.DateTime, nullable=False)
        consent_expiry_date = db.Column(db.DateTime, nullable=False)
        
        # Status
        status = db.Column(db.String(20), default='Active')  # Active, Revoked, Expired
        revoked_date = db.Column(db.DateTime)
        revoke_reason = db.Column(db.Text)
        
        # Audit
        accessed_count = db.Column(db.Integer, default=0)
        last_accessed = db.Column(db.DateTime)
        
        created_at = db.Column(db.DateTime, default=datetime.utcnow)
        updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
        
        # Relationships
        patient = db.relationship('User', foreign_keys=[patient_id], backref='consent_given')
        policy = db.relationship('Insurance', backref='consents')


    class CashlessPreAuth(db.Model):
        """Cashless pre-authorization requests from hospitals"""
        __tablename__ = 'cashless_pre_auth'
        
        id = db.Column(db.Integer, primary_key=True)
        
        # Reference IDs
        pre_auth_id = db.Column(db.String(50), unique=True, nullable=False)  # Auto-generated
        policy_id = db.Column(db.Integer, db.ForeignKey('insurances.id'), nullable=False)
        patient_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
        hospital_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
        insurance_company_id = db.Column(db.Integer, db.ForeignKey('insurance_companies.id'), nullable=False)
        
        # Request Details
        request_date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
        admission_type = db.Column(db.String(50))  # Planned, Emergency
        admission_date = db.Column(db.DateTime)
        expected_discharge_date = db.Column(db.DateTime)
        
        # Medical Summary (Limited Access)
        diagnosis_category = db.Column(db.String(200))  # ICD-10 category only
        treatment_type = db.Column(db.String(100))  # Medical, Surgical, ICU, Daycare
        is_surgery = db.Column(db.Boolean, default=False)
        surgery_name = db.Column(db.String(200))
        doctor_name = db.Column(db.String(200))
        doctor_notes = db.Column(db.Text)  # Summary only
        
        # Financial Details
        estimated_cost = db.Column(db.Float, nullable=False)
        requested_amount = db.Column(db.Float, nullable=False)
        room_category = db.Column(db.String(50))  # General, Semi-Private, Private, ICU
        room_rent_per_day = db.Column(db.Float)
        
        # Authorization
        approval_status = db.Column(db.String(30), default='Pending')  # Pending, Approved, Rejected, Partial
        approved_amount = db.Column(db.Float)
        approval_notes = db.Column(db.Text)
        approved_by = db.Column(db.String(100))  # Reviewer name
        approved_date = db.Column(db.DateTime)
        
        # Validity
        validity_period_hours = db.Column(db.Integer, default=72)  # Pre-auth valid for X hours
        valid_until = db.Column(db.DateTime)
        
        # Enhancement Request
        enhancement_requested = db.Column(db.Boolean, default=False)
        enhancement_amount = db.Column(db.Float)
        enhancement_reason = db.Column(db.Text)
        
        # SLA Tracking
        sla_breach = db.Column(db.Boolean, default=False)
        response_time_hours = db.Column(db.Float)
        
        notes = db.Column(db.Text)
        created_at = db.Column(db.DateTime, default=datetime.utcnow)
        updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
        
        # Relationships
        policy = db.relationship('Insurance', backref='pre_auth_requests')
        patient = db.relationship('User', foreign_keys=[patient_id], backref='pre_auth_as_patient')
        hospital = db.relationship('User', foreign_keys=[hospital_id], backref='pre_auth_requests')


    class ClaimReview(db.Model):
        """Insurance claim review and decision tracking"""
        __tablename__ = 'claim_reviews'
        
        id = db.Column(db.Integer, primary_key=True)
        claim_id = db.Column(db.Integer, db.ForeignKey('insurance_claims.id'), nullable=False)
        
        # Reviewer Details
        reviewer_name = db.Column(db.String(200), nullable=False)
        reviewer_role = db.Column(db.String(50))  # Claims Analyst, Medical Reviewer, Senior Reviewer
        review_date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
        
        # Review Assessment
        policy_exclusion_flags = db.Column(db.JSON)  # List of exclusions triggered
        previous_claims_count = db.Column(db.Integer, default=0)
        risk_indicators = db.Column(db.JSON)  # List of risk factors
        
        # Medical Review (Category Level Only)
        diagnosis_category_verified = db.Column(db.Boolean, default=False)
        treatment_necessary = db.Column(db.Boolean, default=True)
        hospital_charges_reasonable = db.Column(db.Boolean, default=True)
        
        # Decision
        recommendation = db.Column(db.String(50))  # Approve, Reject, Partial Approve, Need More Info
        recommended_amount = db.Column(db.Float)
        deduction_reason = db.Column(db.Text)
        reviewer_notes = db.Column(db.Text)
        
        # Escalation
        is_escalated = db.Column(db.Boolean, default=False)
        escalation_reason = db.Column(db.Text)
        
        created_at = db.Column(db.DateTime, default=datetime.utcnow)
        
        # Relationships
        claim = db.relationship('InsuranceClaim', backref='reviews')


    class FraudDetection(db.Model):
        """Fraud detection and risk monitoring"""
        __tablename__ = 'fraud_detection'
        
        id = db.Column(db.Integer, primary_key=True)
        
        # Reference
        claim_id = db.Column(db.Integer, db.ForeignKey('insurance_claims.id'), nullable=False)
        pre_auth_id = db.Column(db.Integer, db.ForeignKey('cashless_pre_auth.id'))
        
        # Fraud Score
        fraud_risk_score = db.Column(db.Float, default=0.0)  # 0-100
        risk_level = db.Column(db.String(20), default='Low')  # Low, Medium, High, Critical
        
        # Fraud Indicators Triggered
        indicators = db.Column(db.JSON)  # List of triggered flags
        # Examples: {
        #   'rapid_claims': true,
        #   'unusual_amount': true,
        #   'new_policy': true,
        #   'suspicious_hospital': false,
        #   'diagnosis_mismatch': false
        # }
        
        # Pattern Analysis
        claim_frequency = db.Column(db.Integer)  # Claims in last 6 months
        policy_age_days = db.Column(db.Integer)  # Days since policy start
        hospital_pattern_flag = db.Column(db.Boolean, default=False)
        amount_vs_policy_ratio = db.Column(db.Float)  # Claim amount / sum insured
        
        # Investigation
        investigation_status = db.Column(db.String(30), default='Not Required')  # Not Required, Pending, In Progress, Completed
        investigator_assigned = db.Column(db.String(200))
        investigation_notes = db.Column(db.Text)
        investigation_result = db.Column(db.String(50))  # Genuine, Suspicious, Fraudulent
        
        # Action Taken
        action_taken = db.Column(db.String(100))  # None, Claim Denied, Police Report, Policy Cancelled
        action_date = db.Column(db.DateTime)
        
        flagged_date = db.Column(db.DateTime, default=datetime.utcnow)
        resolved_date = db.Column(db.DateTime)
        
        created_at = db.Column(db.DateTime, default=datetime.utcnow)
        updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
        
        # Relationships
        claim = db.relationship('InsuranceClaim', backref='fraud_checks')
        pre_auth = db.relationship('CashlessPreAuth', backref='fraud_checks')


    class ClaimDocument(db.Model):
        """Documents submitted for insurance claims"""
        __tablename__ = 'claim_documents'
        
        id = db.Column(db.Integer, primary_key=True)
        claim_id = db.Column(db.Integer, db.ForeignKey('insurance_claims.id'), nullable=False)
        
        # Document Details
        document_type = db.Column(db.String(100), nullable=False)  # Hospital Bill, Discharge Summary, Lab Reports, Prescriptions, etc.
        document_name = db.Column(db.String(255), nullable=False)
        document_path = db.Column(db.String(500), nullable=False)
        file_size = db.Column(db.Integer)  # In bytes
        
        # Upload Details
        uploaded_by = db.Column(db.String(50))  # Patient, Hospital, Insurance
        uploaded_date = db.Column(db.DateTime, default=datetime.utcnow)
        
        # Verification
        verification_status = db.Column(db.String(30), default='Pending')  # Pending, Verified, Rejected, Need Clarification
        verified_by = db.Column(db.String(200))
        verified_date = db.Column(db.DateTime)
        verification_notes = db.Column(db.Text)
        
        # Access Control
        access_granted_to = db.Column(db.JSON)  # List of user IDs with access
        download_count = db.Column(db.Integer, default=0)
        
        created_at = db.Column(db.DateTime, default=datetime.utcnow)
        
        # Relationships
        claim = db.relationship('InsuranceClaim', backref='claim_documents')


    class PolicyholderDirectory(db.Model):
        """Directory of policyholders with controlled access"""
        __tablename__ = 'policyholder_directory'
        
        id = db.Column(db.Integer, primary_key=True)
        
        # References
        policy_id = db.Column(db.Integer, db.ForeignKey('insurances.id'), nullable=False, unique=True)
        client_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
        insurance_company_id = db.Column(db.Integer, db.ForeignKey('insurance_companies.id'), nullable=False)
        
        # Limited Policyholder Info (No PHI)
        client_name = db.Column(db.String(200))  # From consent
        age_bracket = db.Column(db.String(20))  # 0-18, 19-30, 31-45, 46-60, 60+
        gender = db.Column(db.String(10))
        
        # Policy Summary
        policy_status_cached = db.Column(db.String(20))
        coverage_amount_cached = db.Column(db.Float)
        
        # Consent Status
        has_active_consent = db.Column(db.Boolean, default=False)
        consent_expiry = db.Column(db.DateTime)
        
        # Activity
        last_claim_date = db.Column(db.Date)
        total_claims_count = db.Column(db.Integer, default=0)
        
        created_at = db.Column(db.DateTime, default=datetime.utcnow)
        updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
        
        # Relationships
        policy = db.relationship('Insurance', backref=db.backref('directory_entry', uselist=False))
        client = db.relationship('User', backref='policyholder_entries')
        insurance_company = db.relationship('InsuranceCompany', backref='policyholders')


    class AuditLog(db.Model):
        """Comprehensive audit log for insurance company actions"""
        __tablename__ = 'insurance_audit_logs'
        
        id = db.Column(db.Integer, primary_key=True)
        
        # Actor
        user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
        user_role = db.Column(db.String(50))
        user_name = db.Column(db.String(200))
        
        # Action
        action_type = db.Column(db.String(100), nullable=False)  # Viewed Claim, Approved Claim, Accessed Medical Data, etc.
        action_category = db.Column(db.String(50))  # Data Access, Claim Processing, Policy Management
        
        # Target
        target_type = db.Column(db.String(50))  # Claim, Policy, Patient Record
        target_id = db.Column(db.Integer)
        patient_id = db.Column(db.Integer, db.ForeignKey('users.id'))
        
        # Consent Usage
        consent_id = db.Column(db.Integer, db.ForeignKey('consent_management.id'))
        consent_valid = db.Column(db.Boolean)
        
        # Details
        action_details = db.Column(db.JSON)
        ip_address = db.Column(db.String(50))
        user_agent = db.Column(db.String(500))
        
        timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
        
        # Relationships
        user = db.relationship('User', foreign_keys=[user_id], backref='insurance_audit_actions')
        patient = db.relationship('User', foreign_keys=[patient_id], backref='insurance_audit_as_patient')
        consent = db.relationship('ConsentManagement', backref='audit_logs')

    # Return all models as a dictionary
    return {
        'InsuranceCompany': InsuranceCompany,
        'ConsentManagement': ConsentManagement,
        'CashlessPreAuth': CashlessPreAuth,
        'ClaimReview': ClaimReview,
        'FraudDetection': FraudDetection,
        'ClaimDocument': ClaimDocument,
        'PolicyholderDirectory': PolicyholderDirectory,
        'AuditLog': AuditLog
    }
