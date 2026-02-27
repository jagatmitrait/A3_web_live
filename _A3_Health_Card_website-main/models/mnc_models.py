"""
MNC (Multinational Corporation) Models
Models for corporate employer health monitoring and compliance
"""
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

# Import db from main app (will be initialized in app.py)
db = None


def init_db(database):
    """Initialize database reference"""
    global db
    db = database


class MNCEmployee(db.Model):
    """MNC Employee Registration & Linkage Model"""
    __tablename__ = 'mnc_employees'
    
    id = db.Column(db.Integer, primary_key=True)
    mnc_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)  # MNC company
    client_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # Linked A3 Health client
    
    # Employee Details
    employee_id = db.Column(db.String(100), nullable=False)  # Company employee ID
    full_name = db.Column(db.String(200), nullable=False)
    email = db.Column(db.String(120))
    mobile = db.Column(db.String(20))
    department = db.Column(db.String(100))
    job_role = db.Column(db.String(100))
    
    # Verification Status
    verification_status = db.Column(db.String(50), default='Pending')  # Pending, Verified, Rejected
    verification_code = db.Column(db.String(50))  # Code sent to employee for verification
    verified_at = db.Column(db.DateTime)
    
    # Consent Status
    consent_status = db.Column(db.String(50), default='Pending')  # Pending, Active, Revoked, Expired
    consent_date = db.Column(db.DateTime)
    consent_expiry = db.Column(db.DateTime)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    mnc = db.relationship('User', foreign_keys=[mnc_id], backref='employees')
    client = db.relationship('User', foreign_keys=[client_id], backref='mnc_employment')


class MNCConsent(db.Model):
    """Granular Consent Management for MNC Employee Data Sharing"""
    __tablename__ = 'mnc_consents'
    
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('mnc_employees.id'), nullable=False)
    
    # Granular Consent Levels (True = Consented)
    fitness_status = db.Column(db.Boolean, default=False)  # Basic fit/unfit classification
    chronic_conditions = db.Column(db.Boolean, default=False)  # Aggregated chronic health summary
    vaccination_compliance = db.Column(db.Boolean, default=False)  # Vaccination status
    work_limitations = db.Column(db.Boolean, default=False)  # Work restrictions/limitations
    emergency_contact = db.Column(db.Boolean, default=False)  # Emergency contact access
    
    # Time-Bound Access
    access_start_date = db.Column(db.DateTime, nullable=False)
    access_end_date = db.Column(db.DateTime, nullable=False)
    
    # Status
    is_active = db.Column(db.Boolean, default=True)
    revoked_at = db.Column(db.DateTime)
    revocation_reason = db.Column(db.Text)
    
    # Audit Trail
    consented_at = db.Column(db.DateTime, default=datetime.utcnow)
    consented_by_ip = db.Column(db.String(50))
    last_modified_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    employee = db.relationship('MNCEmployee', backref='consents')


class FitnessAssessment(db.Model):
    """Fitness for Duty Assessment Model"""
    __tablename__ = 'fitness_assessments'
    
    id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    facility_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    
    # Assessment Details
    assessment_date = db.Column(db.Date, nullable=False)
    assessment_type = db.Column(db.String(50), nullable=False)  # Pre-employment, Annual, Incident-based, Return-to-work
    
    # Fitness Classification
    fitness_status = db.Column(db.String(50), nullable=False)  # Fit, Fit with Restrictions, Temporarily Unfit, Review Required
    restrictions = db.Column(db.Text)  # JSON list of work restrictions
    
    # Clinical Summary (for MNC - no detailed diagnosis)
    work_capability_summary = db.Column(db.Text)  # General summary without medical details
    recommended_accommodations = db.Column(db.Text)
    
    # Certificate Details
    certificate_number = db.Column(db.String(100), unique=True)
    certificate_issue_date = db.Column(db.Date)
    certificate_expiry_date = db.Column(db.Date)
    certificate_file_path = db.Column(db.String(500))
    
    # Review Requirements
    next_review_date = db.Column(db.Date)
    review_frequency = db.Column(db.String(50))  # Annual, Biannual, Quarterly, Monthly
    
    # Status
    is_valid = db.Column(db.Boolean, default=True)
    invalidated_at = db.Column(db.DateTime)
    invalidation_reason = db.Column(db.Text)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    client = db.relationship('User', foreign_keys=[client_id], backref='fitness_assessments')
    doctor = db.relationship('User', foreign_keys=[doctor_id])
    facility = db.relationship('User', foreign_keys=[facility_id])


class JobRoleRequirement(db.Model):
    """Job Role Health Requirements Mapping"""
    __tablename__ = 'job_role_requirements'
    
    id = db.Column(db.Integer, primary_key=True)
    mnc_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Job Role Details
    role_name = db.Column(db.String(100), nullable=False)
    role_category = db.Column(db.String(100))  # Office, Field, Manufacturing, Night Shift, etc.
    
    # Health Requirements (JSON)
    required_screenings = db.Column(db.Text)  # JSON list: ["Cardiovascular", "Vision", "Hearing", etc.]
    contraindications = db.Column(db.Text)  # JSON list of medical conditions that disqualify
    recommended_vaccinations = db.Column(db.Text)  # JSON list
    
    # Physical Requirements
    physical_demands = db.Column(db.Text)  # Heavy lifting, Standing, etc.
    mental_demands = db.Column(db.Text)  # High stress, Decision making, etc.
    
    # Environmental Hazards
    hazard_exposure = db.Column(db.Text)  # JSON: chemicals, noise, dust, radiation, etc.
    ppe_required = db.Column(db.Text)  # Personal Protective Equipment
    
    # Fitness Criteria
    minimum_fitness_level = db.Column(db.String(50))  # Fit, Moderate, Any
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    mnc = db.relationship('User', backref='job_requirements')


class WorkplaceIncident(db.Model):
    """Workplace Health & Safety Incident Reporting"""
    __tablename__ = 'workplace_incidents'
    
    id = db.Column(db.Integer, primary_key=True)
    incident_id = db.Column(db.String(100), unique=True, nullable=False)  # Auto-generated
    mnc_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    employee_id = db.Column(db.Integer, db.ForeignKey('mnc_employees.id'), nullable=True)
    reported_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Incident Details
    incident_date = db.Column(db.DateTime, nullable=False)
    incident_type = db.Column(db.String(50), nullable=False)  # injury, exposure, illness, accident, other
    severity = db.Column(db.String(30))  # Minor, Moderate, Severe, Critical, Fatal
    location = db.Column(db.String(200))  # Building, floor, area
    
    # Description
    description = db.Column(db.Text, nullable=False)
    immediate_action = db.Column(db.Text)  # First aid, evacuation, etc.
    root_cause = db.Column(db.Text)
    
    # Medical Response
    medical_attention_required = db.Column(db.Boolean, default=False)
    medical_facility = db.Column(db.String(200))
    medical_outcome = db.Column(db.Text)
    
    # Recovery Tracking
    recovery_status = db.Column(db.String(50), default='Reported')  # Reported, Under Treatment, Recovered, Ongoing
    return_to_work_date = db.Column(db.Date)
    work_restrictions_post_incident = db.Column(db.Text)
    
    # Follow-up
    follow_up_required = db.Column(db.Boolean, default=False)
    next_follow_up_date = db.Column(db.Date)
    follow_up_notes = db.Column(db.Text)
    
    # Status
    status = db.Column(db.String(50), default='Open')  # Open, Under Investigation, Resolved, Closed
    investigation_notes = db.Column(db.Text)
    preventive_measures = db.Column(db.Text)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    closed_at = db.Column(db.DateTime)
    
    # Relationships
    mnc = db.relationship('User', foreign_keys=[mnc_id], backref='incidents')
    employee = db.relationship('MNCEmployee', backref='incidents')
    reported_by = db.relationship('User', foreign_keys=[reported_by_id])


class MNCAuditLog(db.Model):
    """Comprehensive Audit Trail for MNC Data Access"""
    __tablename__ = 'mnc_audit_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    mnc_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)  # MNC user who performed action
    
    # Action Details
    action_type = db.Column(db.String(50), nullable=False)  # view, export, consent_request, fitness_check, etc.
    resource_type = db.Column(db.String(50))  # employee, report, incident, etc.
    resource_id = db.Column(db.Integer)  # ID of the resource accessed
    
    # Employee Data Access (if applicable)
    employee_id = db.Column(db.Integer, db.ForeignKey('mnc_employees.id'), nullable=True)
    data_fields_accessed = db.Column(db.Text)  # JSON list of fields accessed
    
    # Request Details
    ip_address = db.Column(db.String(50))
    user_agent = db.Column(db.String(200))
    
    # Result
    action_status = db.Column(db.String(30))  # Success, Failed, Denied
    failure_reason = db.Column(db.Text)
    
    # Consent Verification
    consent_verified = db.Column(db.Boolean, default=False)
    consent_id = db.Column(db.Integer, db.ForeignKey('mnc_consents.id'), nullable=True)
    
    # Timestamp
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    mnc = db.relationship('User', foreign_keys=[mnc_id])
    user = db.relationship('User', foreign_keys=[user_id])
    employee = db.relationship('MNCEmployee', backref='audit_logs')
    consent = db.relationship('MNCConsent')


class MNCVaccinationPolicy(db.Model):
    """MNC Vaccination Requirements and Policies"""
    __tablename__ = 'mnc_vaccination_policies'
    
    id = db.Column(db.Integer, primary_key=True)
    mnc_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Policy Details
    policy_name = db.Column(db.String(200), nullable=False)
    policy_description = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    
    # Vaccine Requirements
    vaccine_name = db.Column(db.String(200), nullable=False)  # COVID-19, Flu, Hepatitis B, etc.
    vaccine_category = db.Column(db.String(50))  # COVID, Childhood, Adult, Travel, Flu
    is_mandatory = db.Column(db.Boolean, default=True)
    priority_level = db.Column(db.String(20), default='Medium')  # Critical, High, Medium, Low
    
    # Applicability
    applies_to_all = db.Column(db.Boolean, default=True)
    specific_departments = db.Column(db.Text)  # JSON list of departments
    specific_roles = db.Column(db.Text)  # JSON list of job roles
    
    # Dose Requirements
    required_doses = db.Column(db.Integer, default=1)
    booster_required = db.Column(db.Boolean, default=False)
    booster_frequency_months = db.Column(db.Integer)  # e.g., 12 for annual
    
    # Compliance Deadlines
    compliance_deadline = db.Column(db.Date)  # Date by which employees must be compliant
    grace_period_days = db.Column(db.Integer, default=0)
    
    # Exemptions
    allow_medical_exemption = db.Column(db.Boolean, default=True)
    allow_religious_exemption = db.Column(db.Boolean, default=False)
    exemption_requires_documentation = db.Column(db.Boolean, default=True)
    
    # Enforcement
    enforcement_action = db.Column(db.String(100))  # Warning, Restriction, Mandatory Leave, etc.
    notification_before_days = db.Column(db.Integer, default=30)  # Days before deadline to notify
    
    # Timestamps
    effective_from = db.Column(db.Date, nullable=False)
    effective_until = db.Column(db.Date)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # Relationships
    mnc = db.relationship('User', foreign_keys=[mnc_id], backref='vaccination_policies')
    created_by = db.relationship('User', foreign_keys=[created_by_id])


class EmployeeVaccinationCompliance(db.Model):
    """Track Employee Vaccination Compliance Status"""
    __tablename__ = 'employee_vaccination_compliance'
    
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('mnc_employees.id'), nullable=False)
    policy_id = db.Column(db.Integer, db.ForeignKey('mnc_vaccination_policies.id'), nullable=False)
    
    # Compliance Status
    compliance_status = db.Column(db.String(50), nullable=False)  # Compliant, Partially Compliant, Non-Compliant, Expired, Exempted
    
    # Vaccination Details
    doses_completed = db.Column(db.Integer, default=0)
    doses_required = db.Column(db.Integer, nullable=False)
    last_dose_date = db.Column(db.Date)
    next_dose_due_date = db.Column(db.Date)
    booster_due_date = db.Column(db.Date)
    
    # Compliance Tracking
    became_compliant_at = db.Column(db.DateTime)
    compliance_expiry_date = db.Column(db.Date)  # When booster/renewal is needed
    days_until_due = db.Column(db.Integer)  # Calculated field
    is_overdue = db.Column(db.Boolean, default=False)
    
    # Exemption Details
    has_exemption = db.Column(db.Boolean, default=False)
    exemption_type = db.Column(db.String(50))  # Medical, Religious, Other
    exemption_granted_date = db.Column(db.Date)
    exemption_expiry_date = db.Column(db.Date)
    exemption_document_path = db.Column(db.String(500))
    exemption_notes = db.Column(db.Text)
    
    # Notification Tracking
    last_notification_sent = db.Column(db.DateTime)
    notification_count = db.Column(db.Integer, default=0)
    
    # Action Required
    action_required = db.Column(db.Boolean, default=False)
    action_description = db.Column(db.Text)
    action_deadline = db.Column(db.Date)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_checked_at = db.Column(db.DateTime)
    
    # Relationships
    employee = db.relationship('MNCEmployee', backref='vaccination_compliance')
    policy = db.relationship('MNCVaccinationPolicy', backref='employee_compliance')


class VaccinationAlert(db.Model):
    """Vaccination Due/Overdue Alerts and Notifications"""
    __tablename__ = 'vaccination_alerts'
    
    id = db.Column(db.Integer, primary_key=True)
    mnc_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    employee_id = db.Column(db.Integer, db.ForeignKey('mnc_employees.id'), nullable=False)
    compliance_id = db.Column(db.Integer, db.ForeignKey('employee_vaccination_compliance.id'), nullable=False)
    
    # Alert Details
    alert_type = db.Column(db.String(50), nullable=False)  # Due Soon, Overdue, Expired, Booster Required
    severity = db.Column(db.String(20), nullable=False)  # Info, Warning, Critical
    vaccine_name = db.Column(db.String(200), nullable=False)
    
    # Message
    alert_message = db.Column(db.Text, nullable=False)
    due_date = db.Column(db.Date)
    days_overdue = db.Column(db.Integer)
    
    # Status
    is_active = db.Column(db.Boolean, default=True)
    is_acknowledged = db.Column(db.Boolean, default=False)
    acknowledged_at = db.Column(db.DateTime)
    acknowledged_by_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # Resolution
    is_resolved = db.Column(db.Boolean, default=False)
    resolved_at = db.Column(db.DateTime)
    resolution_notes = db.Column(db.Text)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    mnc = db.relationship('User', foreign_keys=[mnc_id])
    employee = db.relationship('MNCEmployee', backref='vaccination_alerts')
    compliance = db.relationship('EmployeeVaccinationCompliance', backref='alerts')
    acknowledged_by = db.relationship('User', foreign_keys=[acknowledged_by_id])


class MNCVaccinationRecord(db.Model):
    """MNC-uploaded vaccination records for employees"""
    __tablename__ = 'mnc_vaccination_records'
    
    id = db.Column(db.Integer, primary_key=True)
    mnc_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    employee_id = db.Column(db.Integer, db.ForeignKey('mnc_employees.id'), nullable=False)
    policy_id = db.Column(db.Integer, db.ForeignKey('mnc_vaccination_policies.id'), nullable=True)
    
    # Vaccination Details
    vaccine_name = db.Column(db.String(200), nullable=False)
    vaccine_category = db.Column(db.String(100))
    manufacturer = db.Column(db.String(200))
    batch_number = db.Column(db.String(100))
    dose_number = db.Column(db.Integer, nullable=False)
    
    # Date Information
    vaccination_date = db.Column(db.Date, nullable=False)
    next_dose_due = db.Column(db.Date)
    
    # Location
    administered_at = db.Column(db.String(300))  # Hospital/clinic name
    administered_by = db.Column(db.String(200))  # Healthcare provider
    
    # Document Upload
    document_path = db.Column(db.String(500))  # Path to uploaded certificate/record
    document_filename = db.Column(db.String(300))
    
    # Verification Status
    verification_status = db.Column(db.String(50), default='Pending')  # Pending, Verified, Rejected
    verified_by_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    verified_at = db.Column(db.DateTime)
    verification_notes = db.Column(db.Text)
    
    # Upload Information
    uploaded_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    upload_source = db.Column(db.String(50), default='MNC')  # MNC, Employee, System
    
    # Notes
    notes = db.Column(db.Text)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    mnc = db.relationship('User', foreign_keys=[mnc_id])
    employee = db.relationship('MNCEmployee', backref='mnc_vaccination_records')
    policy = db.relationship('MNCVaccinationPolicy', backref='uploaded_records')
    uploaded_by = db.relationship('User', foreign_keys=[uploaded_by_id])
    verified_by = db.relationship('User', foreign_keys=[verified_by_id])
