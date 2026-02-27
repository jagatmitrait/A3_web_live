"""
Insurance Company Dashboard Routes
Handles all insurance company operations including claims, pre-auth, fraud detection, and consent management
"""
from flask import Blueprint, render_template, request, jsonify, session, redirect, url_for, current_app, flash
from flask_login import login_required, current_user
from functools import wraps
from datetime import datetime, timedelta
from sqlalchemy import func, and_, or_
import uuid

insurance_bp = Blueprint('insurance', __name__, url_prefix='/insurance')

# Models and db will be set via init function
_models = {}
_db = None
User = None
Insurance = None
InsuranceClaim = None

def init_blueprint(db, models):
    """Initialize blueprint with db and models"""
    global _models, _db, User, Insurance, InsuranceClaim
    _models = models
    _db = db
    User = models.get('User')
    Insurance = models.get('Insurance')
    InsuranceClaim = models.get('InsuranceClaim')

# Decorator for insurance company authentication
def insurance_required(f):
    @wraps(f)
    @login_required
    def decorated_function(*args, **kwargs):
        # Check if user is insurance company
        if not current_user.is_authenticated or current_user.user_type != 'insurance_company':
            flash('Access denied. Insurance company access only.', 'danger')
            return redirect(url_for('index'))
        
        return f(*args, **kwargs)
    return decorated_function


def log_audit(action_type, action_category, target_type=None, target_id=None, patient_id=None, consent_id=None, details=None):
    """Helper function to log insurance company actions"""
    AuditLog = _models.get('AuditLog')
    audit = AuditLog(
        user_id=current_user.id,
        user_role=current_user.user_type,
        user_name=current_user.full_name,
        action_type=action_type,
        action_category=action_category,
        target_type=target_type,
        target_id=target_id,
        patient_id=patient_id,
        consent_id=consent_id,
        consent_valid=True if consent_id else None,
        action_details=details,
        ip_address=request.remote_addr,
        user_agent=request.user_agent.string
    )
    _db.session.add(audit)
    _db.session.commit()


def check_consent(patient_id, insurance_company_id):
    """Check if valid consent exists"""
    ConsentManagement = _models.get('ConsentManagement')
    consent = _db.session.query(ConsentManagement).filter_by(
        patient_id=patient_id,
        insurance_company_id=insurance_company_id,
        status='Active'
    ).filter(
        ConsentManagement.consent_expiry_date > datetime.utcnow()
    ).first()
    
    return consent


# ==================== DASHBOARD ROUTES ====================

@insurance_bp.route('/dashboard')
@insurance_required
def dashboard():
    """Insurance company dashboard - main view"""
    InsuranceCompany = _models.get('InsuranceCompany')
    insurance_company = _db.session.query(InsuranceCompany).filter_by(user_id=current_user.id).first()
    
    log_audit('Dashboard Accessed', 'Dashboard')
    
    return render_template('insurance_dashboard.html', user=current_user, company=insurance_company)


@insurance_bp.route('/api/dashboard/stats')
@insurance_required
def get_dashboard_stats():
    """Get overview statistics for dashboard"""
    # Use current_user instead
    InsuranceCompany = _models.get('InsuranceCompany')
    insurance_company = _db.session.query(InsuranceCompany).filter_by(user_id=current_user.id).first()
    
    # Get total active policies
    total_policies = _db.session.query(Insurance).filter_by(
        provider_name=insurance_company.company_name,
        status='Active'
    ).count()
    
    # Get active policyholders
    active_policyholders = _db.session.query(func.count(func.distinct(Insurance.user_id))).filter_by(
        provider_name=insurance_company.company_name,
        status='Active'
    ).scalar()
    
    # Claims statistics
    today = datetime.utcnow().date()
    month_start = datetime.utcnow().replace(day=1).date()
    
    claims_today = _db.session.query(InsuranceClaim).join(Insurance).filter(
        Insurance.provider_name == insurance_company.company_name,
        func.date(InsuranceClaim.claim_date) == today
    ).count()
    
    claims_month = _db.session.query(InsuranceClaim).join(Insurance).filter(
        Insurance.provider_name == insurance_company.company_name,
        func.date(InsuranceClaim.claim_date) >= month_start
    ).count()
    
    claims_approved = _db.session.query(InsuranceClaim).join(Insurance).filter(
        Insurance.provider_name == insurance_company.company_name,
        InsuranceClaim.status.in_(['Approved', 'Settled'])
    ).count()
    
    claims_rejected = _db.session.query(InsuranceClaim).join(Insurance).filter(
        Insurance.provider_name == insurance_company.company_name,
        InsuranceClaim.status == 'Rejected'
    ).count()
    
    claims_under_review = _db.session.query(InsuranceClaim).join(Insurance).filter(
        Insurance.provider_name == insurance_company.company_name,
        InsuranceClaim.status.in_(['Submitted', 'Under Review'])
    ).count()
    
    # Cashless requests
    CashlessPreAuth = _models.get('CashlessPreAuth')
    cashless_pending = _db.session.query(CashlessPreAuth).filter_by(
        insurance_company_id=insurance_company.id,
        approval_status='Pending'
    ).count()
    
    # Fraud flags
    FraudDetection = _models.get('FraudDetection')
    fraud_flags = _db.session.query(FraudDetection).filter(
        FraudDetection.risk_level.in_(['High', 'Critical']),
        FraudDetection.investigation_status != 'Completed'
    ).count()
    
    # Alerts
    alerts = []
    
    # Missing documents
    missing_docs = _db.session.query(InsuranceClaim).join(Insurance).filter(
        Insurance.provider_name == insurance_company.company_name,
        InsuranceClaim.status == 'Under Review',
        ~InsuranceClaim.claim_documents.any()
    ).count()
    if missing_docs > 0:
        alerts.append({
            'type': 'warning',
            'message': f'{missing_docs} claims have missing documents',
            'action': 'View Claims'
        })
    
    # Policies expiring soon (within 30 days)
    expiring_soon = _db.session.query(Insurance).filter(
        Insurance.provider_name == insurance_company.company_name,
        Insurance.status == 'Active',
        Insurance.end_date <= (datetime.utcnow().date() + timedelta(days=30))
    ).count()
    if expiring_soon > 0:
        alerts.append({
            'type': 'info',
            'message': f'{expiring_soon} policies expiring within 30 days',
            'action': 'View Policies'
        })
    
    # High-value claims (>1 lakh)
    high_value_claims = _db.session.query(InsuranceClaim).join(Insurance).filter(
        Insurance.provider_name == insurance_company.company_name,
        InsuranceClaim.claimed_amount > 100000,
        InsuranceClaim.status == 'Submitted'
    ).count()
    if high_value_claims > 0:
        alerts.append({
            'type': 'warning',
            'message': f'{high_value_claims} high-value claims need review (>₹1L)',
            'action': 'Review Claims'
        })
    
    # SLA breaches
    sla_breach = _db.session.query(CashlessPreAuth).filter_by(
        insurance_company_id=insurance_company.id,
        sla_breach=True,
        approval_status='Pending'
    ).count()
    if sla_breach > 0:
        alerts.append({
            'type': 'danger',
            'message': f'{sla_breach} pre-auth requests exceeded SLA',
            'action': 'View Pre-Auth'
        })
    
    return jsonify({
        'total_policies': total_policies,
        'active_policyholders': active_policyholders,
        'claims_today': claims_today,
        'claims_month': claims_month,
        'claims_approved': claims_approved,
        'claims_rejected': claims_rejected,
        'claims_under_review': claims_under_review,
        'cashless_pending': cashless_pending,
        'fraud_flags': fraud_flags,
        'alerts': alerts
    })


# ==================== POLICYHOLDER DIRECTORY ====================

@insurance_bp.route('/api/policyholders')
@insurance_required
def get_policyholders():
    """Get policyholder directory with controlled access"""
    # Use current_user instead
    InsuranceCompany = _models.get('InsuranceCompany')
    insurance_company = _db.session.query(InsuranceCompany).filter_by(user_id=current_user.id).first()
    
    # Get filter parameters
    status = request.args.get('status', 'Active')
    search = request.args.get('search', '')
    
    # Query policies
    query = _db.session.query(Insurance).filter_by(
        provider_name=insurance_company.company_name
    )
    
    if status and status != 'All':
        query = query.filter_by(status=status)
    
    if search:
        query = query.filter(
            or_(
                Insurance.policy_number.ilike(f'%{search}%'),
                Insurance.user_id.in_(
                    _db.session.query(current_user.id).filter(
                        User.full_name.ilike(f'%{search}%')
                    )
                )
            )
        )
    
    policies = query.all()
    
    # Build response with limited info
    policyholders = []
    for policy in policies:
        # Check consent
        consent = check_consent(policy.user_id, insurance_company.id)
        
        # Only include basic info
        user_obj = _db.session.query(User).get(policy.user_id)
        
        policyholders.append({
            'policy_number': policy.policy_number,
            'client_id': user_obj.uid,
            'client_name': user_obj.full_name if consent else 'Consent Required',
            'policy_type': policy.coverage_type,
            'policy_status': policy.status,
            'coverage_amount': policy.sum_insured,
            'validity_from': policy.start_date.strftime('%Y-%m-%d'),
            'validity_to': policy.end_date.strftime('%Y-%m-%d'),
            'consent_status': 'Active' if consent else 'Not Granted',
            'last_claim_date': policy.claims[0].claim_date.strftime('%Y-%m-%d') if policy.claims else None
        })
    
    log_audit('Viewed Policyholder Directory', 'Data Access')
    
    return jsonify({'policyholders': policyholders})


@insurance_bp.route('/api/policy/<policy_number>')
@insurance_required
def get_policy_details(policy_number):
    """Get policy details with coverage information"""
    # Use current_user instead
    InsuranceCompany = _models.get('InsuranceCompany')
    insurance_company = _db.session.query(InsuranceCompany).filter_by(user_id=current_user.id).first()
    
    policy = _db.session.query(Insurance).filter_by(
        policy_number=policy_number,
        provider_name=insurance_company.company_name
    ).first()
    
    if not policy:
        return jsonify({'error': 'Policy not found'}), 404
    
    # Check consent
    consent = check_consent(policy.user_id, insurance_company.id)
    policyholder = _db.session.query(User).get(policy.user_id)
    
    import json
    coverage_details = json.loads(policy.coverage_details) if policy.coverage_details else {}
    nominated_members = json.loads(policy.nominated_members) if policy.nominated_members else []
    
    log_audit('Viewed Policy Details', 'Data Access', 'Policy', policy.id, policy.user_id, consent.id if consent else None)
    
    return jsonify({
        'policy_number': policy.policy_number,
        'policyholder_name': policyholder.full_name if consent else 'Consent Required',
        'policy_type': policy.policy_type,
        'policy_name': policy.policy_name,
        'sum_insured': policy.sum_insured,
        'coverage_type': policy.coverage_type,
        'coverage_details': coverage_details,
        'room_rent_limit': policy.room_rent_limit,
        'copay_percentage': policy.copay_percentage,
        'deductible': policy.deductible,
        'start_date': policy.start_date.strftime('%Y-%m-%d'),
        'end_date': policy.end_date.strftime('%Y-%m-%d'),
        'status': policy.status,
        'nominated_members': nominated_members if consent else [],
        'consent_status': 'Active' if consent else 'Not Granted'
    })


# ==================== ADD POLICY FOR CLIENT ====================

@insurance_bp.route('/api/search-client')
@insurance_required
def search_client_by_id():
    """Search for a client by their A3 Health Card ID"""
    health_card_id = request.args.get('health_card_id', '').strip()
    
    if not health_card_id:
        return jsonify({'success': False, 'message': 'Health Card ID is required'}), 400
    
    # Search for client
    client = _db.session.query(User).filter(
        User.user_type == 'client',
        or_(
            User.health_card_id == health_card_id,
            User.health_id == health_card_id,
            User.id == health_card_id.replace('A3HC-', '') if health_card_id.startswith('A3HC-') else None
        )
    ).first()
    
    if not client:
        return jsonify({'success': False, 'message': 'Client not found'}), 404
    
    return jsonify({
        'success': True,
        'client': {
            'id': client.id,
            'name': client.full_name,
            'health_card_id': client.health_card_id or client.health_id or f'A3HC-{client.id}',
            'email': client.email[:3] + '***' + client.email[-10:] if client.email and len(client.email) > 13 else '***',
            'dob': client.dob.strftime('%Y-%m-%d') if client.dob else None
        }
    })


@insurance_bp.route('/api/add-policy-for-client', methods=['POST'])
@insurance_required
def add_policy_for_client():
    """Add a new insurance policy for a client (by insurance company)"""
    InsuranceCompany = _models.get('InsuranceCompany')
    insurance_company = _db.session.query(InsuranceCompany).filter_by(user_id=current_user.id).first()
    
    if not insurance_company:
        return jsonify({'success': False, 'message': 'Insurance company profile not found'}), 400
    
    data = request.get_json()
    client_id = data.get('client_id')
    
    if not client_id:
        return jsonify({'success': False, 'message': 'Client ID is required'}), 400
    
    # Verify client exists
    client = _db.session.query(User).filter_by(id=client_id, user_type='client').first()
    if not client:
        return jsonify({'success': False, 'message': 'Client not found'}), 404
    
    # Check for duplicate policy
    policy_number = data.get('policy_number')
    existing = _db.session.query(Insurance).filter_by(
        user_id=client_id,
        policy_number=policy_number
    ).first()
    
    if existing:
        return jsonify({'success': False, 'message': 'A policy with this number already exists for this client'}), 400
    
    try:
        # Create the policy
        policy = Insurance(
            user_id=client_id,
            provider_name=insurance_company.company_name,
            provider_type='Private',
            policy_number=policy_number,
            policy_name=data.get('policy_name'),
            policy_type=data.get('policy_type', 'Health'),
            sum_insured=float(data.get('sum_insured') or 0),
            start_date=datetime.strptime(data['start_date'], '%Y-%m-%d').date() if data.get('start_date') else None,
            end_date=datetime.strptime(data['end_date'], '%Y-%m-%d').date() if data.get('end_date') else None,
            premium_amount=float(data.get('premium_amount') or 0),
            coverage_type=data.get('coverage_type', 'Individual'),
            status='Active'
        )
        
        _db.session.add(policy)
        _db.session.commit()
        
        log_audit('Added Policy for Client', 'Policy Management', 'Policy', policy.id, client_id)
        
        return jsonify({
            'success': True,
            'message': f'Policy {policy_number} added successfully for {client.full_name}',
            'policy_id': policy.id
        })
        
    except Exception as e:
        _db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


# ==================== CLAIM MANAGEMENT ====================

@insurance_bp.route('/api/claims')
@insurance_required
def get_claims():
    """Get all claims for the insurance company"""
    # Use current_user instead
    InsuranceCompany = _models.get('InsuranceCompany')
    insurance_company = _db.session.query(InsuranceCompany).filter_by(user_id=current_user.id).first()
    
    # Check if insurance company record exists
    if not insurance_company:
        return jsonify({'claims': [], 'message': 'Insurance company profile not found'})
    
    # Get filters
    status = request.args.get('status', 'All')
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')
    
    # Query claims - use company name or current user's company_name
    company_name = insurance_company.company_name or current_user.company_name
    query = _db.session.query(InsuranceClaim).join(Insurance).filter(
        Insurance.provider_name == company_name
    )
    
    if status and status != 'All':
        query = query.filter(InsuranceClaim.status == status)
    
    if date_from:
        query = query.filter(InsuranceClaim.claim_date >= datetime.strptime(date_from, '%Y-%m-%d'))
    
    if date_to:
        query = query.filter(InsuranceClaim.claim_date <= datetime.strptime(date_to, '%Y-%m-%d'))
    
    claims = query.order_by(InsuranceClaim.submitted_date.desc()).all()
    
    # Build response
    claims_list = []
    for claim in claims:
        user_obj = _db.session.query(User).get(claim.user_id)
        
        # Calculate SLA countdown - handle date vs datetime
        sla_hours = insurance_company.sla_hours if insurance_company.sla_hours else 48
        sla_remaining = None
        if claim.submitted_date and claim.status in ['Submitted', 'Under Review']:
            try:
                # Convert date to datetime if needed
                if hasattr(claim.submitted_date, 'hour'):
                    submitted_dt = claim.submitted_date
                else:
                    submitted_dt = datetime.combine(claim.submitted_date, datetime.min.time())
                hours_elapsed = (datetime.utcnow() - submitted_dt).total_seconds() / 3600
                sla_remaining = sla_hours - hours_elapsed
            except Exception:
                sla_remaining = None
        
        # Format submission date safely
        submission_date_str = None
        if claim.submitted_date:
            try:
                if hasattr(claim.submitted_date, 'strftime'):
                    submission_date_str = claim.submitted_date.strftime('%Y-%m-%d')
            except Exception:
                submission_date_str = str(claim.submitted_date)
        
        claims_list.append({
            'claim_id': claim.claim_id,
            'policy_number': claim.insurance.policy_number,
            'client_name': user_obj.full_name if user_obj else 'Unknown',
            'hospital_name': claim.hospital_name,
            'claim_type': claim.claim_type,
            'claimed_amount': claim.claimed_amount,
            'approved_amount': claim.approved_amount,
            'status': claim.status,
            'submission_date': submission_date_str,
            'assigned_reviewer': None,  # Reviews feature not implemented yet
            'sla_remaining_hours': round(sla_remaining, 1) if sla_remaining else None
        })
    
    log_audit('Viewed Claims List', 'Claim Processing')
    
    return jsonify({'claims': claims_list})


@insurance_bp.route('/api/claim/<claim_id>')
@insurance_required
def get_claim_details(claim_id):
    """Get detailed claim information with medical summary"""
    # Use current_user instead
    InsuranceCompany = _models.get('InsuranceCompany')
    insurance_company = _db.session.query(InsuranceCompany).filter_by(user_id=current_user.id).first()
    
    claim = _db.session.query(InsuranceClaim).filter_by(claim_id=claim_id).first()
    
    if not claim:
        return jsonify({'error': 'Claim not found'}), 404
    
    # Check consent
    consent = check_consent(claim.user_id, insurance_company.id)
    
    if not consent:
        return jsonify({'error': 'No active consent from patient'}), 403
    
    patient = _db.session.query(User).get(claim.user_id)
    
    # Get claim documents
    ClaimDocument = _models.get('ClaimDocument')
    documents = _db.session.query(ClaimDocument).filter_by(claim_id=claim.id).all()
    docs_list = [{
        'id': doc.id,
        'type': doc.document_type,
        'name': doc.document_name,
        'uploaded_date': doc.uploaded_date.strftime('%Y-%m-%d'),
        'verification_status': doc.verification_status
    } for doc in documents]
    
    # Get reviews
    ClaimReview = _models.get('ClaimReview')
    reviews = _db.session.query(ClaimReview).filter_by(claim_id=claim.id).all()
    reviews_list = [{
        'reviewer_name': review.reviewer_name,
        'review_date': review.review_date.strftime('%Y-%m-%d %H:%M'),
        'recommendation': review.recommendation,
        'recommended_amount': review.recommended_amount,
        'notes': review.reviewer_notes
    } for review in reviews]
    
    # Get fraud check
    FraudDetection = _models.get('FraudDetection')
    fraud_check = _db.session.query(FraudDetection).filter_by(claim_id=claim.id).first()
    
    log_audit('Viewed Claim Details', 'Claim Processing', 'Claim', claim.id, claim.user_id, consent.id)
    
    # Return limited medical summary only
    return jsonify({
        'claim_id': claim.claim_id,
        'client_id': claim.user_id,
        'policy_number': claim.insurance.policy_number,
        'client_name': patient.full_name,
        'admission_date': claim.admission_date.strftime('%Y-%m-%d') if claim.admission_date else None,
        'discharge_date': claim.discharge_date.strftime('%Y-%m-%d') if claim.discharge_date else None,
        'hospital_name': claim.hospital_name,
        'hospital_type': 'Network' if 'Network' in claim.hospital_name else 'Non-Network',
        'length_of_stay': (claim.discharge_date - claim.admission_date).days if claim.admission_date and claim.discharge_date else None,
        'diagnosis_category': claim.diagnosis[:50] if claim.diagnosis else None,  # Limited info
        'treatment_type': claim.treatment_type,
        'total_bill_amount': claim.total_bill_amount,
        'claimed_amount': claim.claimed_amount,
        'approved_amount': claim.approved_amount,
        'deduction_amount': claim.deduction_amount,
        'deduction_reason': claim.deduction_reason,
        'status': claim.status,
        'submitted_date': claim.submitted_date.strftime('%Y-%m-%d') if claim.submitted_date else None,
        'processed_date': claim.processed_date.strftime('%Y-%m-%d') if claim.processed_date else None,
        'rejection_reason': claim.rejection_reason,
        'documents': docs_list,
        'reviews': reviews_list,
        'fraud_risk_score': fraud_check.fraud_risk_score if fraud_check else 0
    })


@insurance_bp.route('/api/claim/<claim_id>/review', methods=['POST'])
@insurance_required
def review_claim(claim_id):
    """Submit claim review decision"""
    # Use current_user instead
    InsuranceCompany = _models.get('InsuranceCompany')
    insurance_company = _db.session.query(InsuranceCompany).filter_by(user_id=current_user.id).first()
    
    claim = _db.session.query(InsuranceClaim).filter_by(claim_id=claim_id).first()
    
    if not claim:
        return jsonify({'success': False, 'error': 'Claim not found'}), 404
    
    data = request.get_json()
    
    # Map frontend field names to backend field names
    decision = data.get('decision') or data.get('recommendation')
    approved_amount = float(data.get('approved_amount') or data.get('recommended_amount') or 0)
    deduction_amount = float(data.get('deduction_amount') or 0)
    remarks = data.get('remarks') or data.get('reviewer_notes') or data.get('deduction_reason')
    
    # Map decision values
    decision_map = {
        'Approved': 'Approve',
        'Rejected': 'Reject', 
        'Partially Approved': 'Partial Approve',
        'Request More Info': 'Need More Info'
    }
    recommendation = decision_map.get(decision, decision)
    
    try:
        # Create review record
        ClaimReview = _models.get('ClaimReview')
        if ClaimReview:
            review = ClaimReview(
                claim_id=claim.id,
                reviewer_name=current_user.full_name or current_user.company_name or 'Insurance Reviewer',
                reviewer_role='Claims Analyst',
                recommendation=recommendation,
                recommended_amount=approved_amount,
                deduction_reason=remarks,
                reviewer_notes=remarks
            )
            _db.session.add(review)
        
        # Update claim status based on decision
        if decision in ['Approved', 'Approve']:
            claim.status = 'Approved'
            claim.approved_amount = approved_amount or claim.claimed_amount
        elif decision in ['Rejected', 'Reject']:
            claim.status = 'Rejected'
            claim.rejection_reason = remarks
        elif decision in ['Partially Approved', 'Partial Approve']:
            claim.status = 'Partially Approved'
            claim.approved_amount = approved_amount
            claim.deduction_amount = deduction_amount or (claim.claimed_amount - approved_amount)
            claim.deduction_reason = remarks
        elif decision in ['Request More Info', 'Need More Info']:
            claim.status = 'Under Review'
            claim.notes = (claim.notes or '') + f"\n[Info Requested]: {remarks}"
        else:
            claim.status = 'Under Review'
        
        claim.processed_date = datetime.utcnow().date()
        
        _db.session.commit()
        
        log_audit('Reviewed Claim', 'Claim Processing', 'Claim', claim.id, claim.user_id, 
                  details={'decision': decision, 'amount': approved_amount})
        
        return jsonify({
            'success': True, 
            'message': f'Claim {decision.lower()} successfully',
            'new_status': claim.status
        })
        
    except Exception as e:
        _db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== CASHLESS PRE-AUTHORIZATION ====================

@insurance_bp.route('/api/cashless-requests')
@insurance_required
def get_cashless_requests():
    """Get all cashless pre-authorization requests"""
    # Use current_user instead
    InsuranceCompany = _models.get('InsuranceCompany')
    insurance_company = _db.session.query(InsuranceCompany).filter_by(user_id=current_user.id).first()
    
    status = request.args.get('status', 'Pending')
    
    CashlessPreAuth = _models.get('CashlessPreAuth')
    query = _db.session.query(CashlessPreAuth).filter_by(insurance_company_id=insurance_company.id)
    
    if status and status != 'All':
        query = query.filter_by(approval_status=status)
    
    requests = query.order_by(CashlessPreAuth.request_date.desc()).all()
    
    requests_list = []
    for req in requests:
        patient = _db.session.query(User).get(req.patient_id)
        hospital = _db.session.query(User).get(req.hospital_id)
        
        requests_list.append({
            'pre_auth_id': req.pre_auth_id,
            'policy_number': req.policy.policy_number,
            'patient_name': patient.full_name,
            'hospital_name': hospital.full_name,
            'diagnosis_category': req.diagnosis_category,
            'estimated_cost': req.estimated_cost,
            'requested_amount': req.requested_amount,
            'approved_amount': req.approved_amount,
            'approval_status': req.approval_status,
            'request_date': req.request_date.strftime('%Y-%m-%d %H:%M'),
            'sla_breach': req.sla_breach
        })
    
    log_audit('Viewed Pre-Auth Requests', 'Claim Processing')
    
    return jsonify({'requests': requests_list})


@insurance_bp.route('/api/cashless-request/<pre_auth_id>')
@insurance_required
def get_cashless_request_details(pre_auth_id):
    """Get detailed cashless pre-auth request"""
    # Use current_user instead
    InsuranceCompany = _models.get('InsuranceCompany')
    insurance_company = _db.session.query(InsuranceCompany).filter_by(user_id=current_user.id).first()
    
    CashlessPreAuth = _models.get('CashlessPreAuth')
    request_obj = _db.session.query(CashlessPreAuth).filter_by(
        pre_auth_id=pre_auth_id,
        insurance_company_id=insurance_company.id
    ).first()
    
    if not request_obj:
        return jsonify({'error': 'Request not found'}), 404
    
    # Check consent
    consent = check_consent(request_obj.patient_id, insurance_company.id)
    
    patient = _db.session.query(User).get(request_obj.patient_id)
    hospital = _db.session.query(User).get(request_obj.hospital_id)
    
    log_audit('Viewed Pre-Auth Details', 'Claim Processing', 'PreAuth', request_obj.id, request_obj.patient_id, consent.id if consent else None)
    
    return jsonify({
        'pre_auth_id': request_obj.pre_auth_id,
        'policy_number': request_obj.policy.policy_number,
        'patient_name': patient.full_name if consent else 'Consent Required',
        'hospital_name': hospital.full_name,
        'admission_type': request_obj.admission_type,
        'admission_date': request_obj.admission_date.strftime('%Y-%m-%d %H:%M') if request_obj.admission_date else None,
        'diagnosis_category': request_obj.diagnosis_category,
        'treatment_type': request_obj.treatment_type,
        'is_surgery': request_obj.is_surgery,
        'surgery_name': request_obj.surgery_name,
        'doctor_name': request_obj.doctor_name,
        'doctor_notes': request_obj.doctor_notes,
        'estimated_cost': request_obj.estimated_cost,
        'requested_amount': request_obj.requested_amount,
        'room_category': request_obj.room_category,
        'room_rent_per_day': request_obj.room_rent_per_day,
        'approval_status': request_obj.approval_status,
        'approved_amount': request_obj.approved_amount,
        'approval_notes': request_obj.approval_notes,
        'validity_period_hours': request_obj.validity_period_hours,
        'request_date': request_obj.request_date.strftime('%Y-%m-%d %H:%M')
    })


@insurance_bp.route('/api/cashless-request/<pre_auth_id>/approve', methods=['POST'])
@insurance_required
def approve_cashless_request(pre_auth_id):
    """Approve or reject cashless pre-auth request"""
    # Use current_user instead
    InsuranceCompany = _models.get('InsuranceCompany')
    insurance_company = _db.session.query(InsuranceCompany).filter_by(user_id=current_user.id).first()
    
    CashlessPreAuth = _models.get('CashlessPreAuth')
    request_obj = _db.session.query(CashlessPreAuth).filter_by(
        pre_auth_id=pre_auth_id,
        insurance_company_id=insurance_company.id
    ).first()
    
    if not request_obj:
        return jsonify({'error': 'Request not found'}), 404
    
    data = request.get_json()
    
    request_obj.approval_status = data.get('decision')
    request_obj.approved_amount = data.get('approved_amount')
    request_obj.approval_notes = data.get('notes')
    request_obj.approved_by = data.get('approved_by')
    request_obj.approved_date = datetime.utcnow()
    
    if data.get('decision') == 'Approved':
        request_obj.valid_until = datetime.utcnow() + timedelta(hours=request_obj.validity_period_hours)
    
    # Calculate response time
    response_time = (datetime.utcnow() - request_obj.request_date).total_seconds() / 3600
    request_obj.response_time_hours = response_time
    
    _db.session.commit()
    
    log_audit('Approved Pre-Auth', 'Claim Processing', 'PreAuth', request_obj.id, request_obj.patient_id,
              details={'decision': data.get('decision'), 'amount': data.get('approved_amount')})
    
    return jsonify({'success': True, 'message': 'Pre-authorization decision submitted'})


# ==================== FRAUD DETECTION ====================

@insurance_bp.route('/api/fraud/monitor')
@insurance_required
def get_fraud_cases():
    """Get fraud detection cases"""
    risk_level = request.args.get('risk_level', 'All')
    
    FraudDetection = _models.get('FraudDetection')
    query = _db.session.query(FraudDetection)
    
    if risk_level and risk_level != 'All':
        query = query.filter_by(risk_level=risk_level)
    
    query = query.filter(FraudDetection.investigation_status != 'Completed')
    
    cases = query.order_by(FraudDetection.fraud_risk_score.desc()).all()
    
    cases_list = []
    for case in cases:
        claim = _db.session.query(InsuranceClaim).get(case.claim_id)
        
        cases_list.append({
            'claim_id': claim.claim_id,
            'fraud_risk_score': case.fraud_risk_score,
            'risk_level': case.risk_level,
            'indicators': case.indicators,
            'claim_frequency': case.claim_frequency,
            'policy_age_days': case.policy_age_days,
            'investigation_status': case.investigation_status,
            'flagged_date': case.flagged_date.strftime('%Y-%m-%d')
        })
    
    log_audit('Viewed Fraud Monitor', 'Fraud Detection')
    
    return jsonify({'cases': cases_list})


# ==================== ANALYTICS & REPORTS ====================

@insurance_bp.route('/api/analytics/claims')
@insurance_required
def get_claims_analytics():
    """Get claims analytics and reports"""
    # Use current_user instead
    InsuranceCompany = _models.get('InsuranceCompany')
    insurance_company = _db.session.query(InsuranceCompany).filter_by(user_id=current_user.id).first()
    
    # Claims by disease category
    claims_by_category = _db.session.query(
        InsuranceClaim.diagnosis,
        func.count(InsuranceClaim.id).label('count'),
        func.sum(InsuranceClaim.claimed_amount).label('total_amount')
    ).join(Insurance).filter(
        Insurance.provider_name == insurance_company.company_name
    ).group_by(InsuranceClaim.diagnosis).all()
    
    # Average settlement time
    avg_settlement = _db.session.query(
        func.avg(
            func.julianday(InsuranceClaim.settled_date) - func.julianday(InsuranceClaim.submitted_date)
        )
    ).join(Insurance).filter(
        Insurance.provider_name == insurance_company.company_name,
        InsuranceClaim.settled_date.isnot(None)
    ).scalar() or 0
    
    # Approval vs rejection ratio
    total_processed = _db.session.query(InsuranceClaim).join(Insurance).filter(
        Insurance.provider_name == insurance_company.company_name,
        InsuranceClaim.status.in_(['Approved', 'Rejected', 'Settled'])
    ).count()
    
    approved_count = _db.session.query(InsuranceClaim).join(Insurance).filter(
        Insurance.provider_name == insurance_company.company_name,
        InsuranceClaim.status.in_(['Approved', 'Settled'])
    ).count()
    
    approval_ratio = (approved_count / total_processed * 100) if total_processed > 0 else 0
    
    return jsonify({
        'claims_by_category': [
            {'category': c[0], 'count': c[1], 'total_amount': c[2]} 
            for c in claims_by_category
        ],
        'avg_settlement_days': round(avg_settlement, 1),
        'approval_ratio': round(approval_ratio, 2),
        'rejection_ratio': round(100 - approval_ratio, 2)
    })


# ==================== AUDIT & COMPLIANCE ====================

@insurance_bp.route('/api/audit/logs')
@insurance_required
def get_audit_logs():
    """Get audit logs for compliance"""
    # Use current_user instead
    InsuranceCompany = _models.get('InsuranceCompany')
    insurance_company = _db.session.query(InsuranceCompany).filter_by(user_id=current_user.id).first()
    
    # Get filters
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')
    action_type = request.args.get('action_type')
    
    AuditLog = _models.get('AuditLog')
    query = _db.session.query(AuditLog).filter(
        AuditLog.user_id == current_user.id
    )
    
    if date_from:
        query = query.filter(AuditLog.timestamp >= datetime.strptime(date_from, '%Y-%m-%d'))
    
    if date_to:
        query = query.filter(AuditLog.timestamp <= datetime.strptime(date_to, '%Y-%m-%d'))
    
    if action_type:
        query = query.filter(AuditLog.action_type.ilike(f'%{action_type}%'))
    
    logs = query.order_by(AuditLog.timestamp.desc()).limit(1000).all()
    
    logs_list = [{
        'id': log.id,
        'user_name': log.user_name,
        'user_role': log.user_role,
        'action_type': log.action_type,
        'action_category': log.action_category,
        'target_type': log.target_type,
        'consent_used': 'Yes' if log.consent_id else 'No',
        'timestamp': log.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
        'ip_address': log.ip_address
    } for log in logs]
    
    return jsonify({'logs': logs_list})


@insurance_bp.route('/api/audit/log-action', methods=['POST'])
@insurance_required
def log_action():
    """Log an action performed by insurance company user"""
    data = request.get_json()
    action = data.get('action', 'Unknown')
    category = data.get('category', 'General')
    
    log_audit(action, category)
    
    return jsonify({'success': True})


# ==================== CONSENT MANAGEMENT (for insurance company view) ====================

@insurance_bp.route('/api/consents')
@insurance_required
def get_consents():
    """Get all consents granted to this insurance company"""
    # Use current_user instead
    InsuranceCompany = _models.get('InsuranceCompany')
    insurance_company = _db.session.query(InsuranceCompany).filter_by(user_id=current_user.id).first()
    
    ConsentManagement = _models.get('ConsentManagement')
    consents = _db.session.query(ConsentManagement).filter_by(
        insurance_company_id=insurance_company.id
    ).order_by(ConsentManagement.consent_given_date.desc()).all()
    
    consents_list = []
    for consent in consents:
        patient = _db.session.query(User).get(consent.patient_id)
        
        consents_list.append({
            'consent_id': consent.consent_id,
            'patient_name': patient.full_name,
            'patient_uid': patient.uid,
            'purpose': consent.purpose,
            'access_level': consent.access_level,
            'consent_start': consent.consent_start_date.strftime('%Y-%m-%d'),
            'consent_expiry': consent.consent_expiry_date.strftime('%Y-%m-%d'),
            'status': consent.status,
            'accessed_count': consent.accessed_count,
            'last_accessed': consent.last_accessed.strftime('%Y-%m-%d %H:%M') if consent.last_accessed else None
        })
    
    return jsonify({'consents': consents_list})


@insurance_bp.route('/api/client/<int:client_id>/medical-bills')
@insurance_required
def get_client_medical_bills(client_id):
    """Get medical bills for a client - requires active consent"""
    InsuranceCompany = _models.get('InsuranceCompany')
    insurance_company = _db.session.query(InsuranceCompany).filter_by(user_id=current_user.id).first()
    
    if not insurance_company:
        return jsonify({'success': False, 'error': 'Insurance company not found'}), 404
    
    # Check consent
    consent = check_consent(client_id, insurance_company.id)
    if not consent:
        return jsonify({'success': False, 'error': 'No active consent from patient'}), 403
    
    # Get medical bills
    MedicalBill = _models.get('MedicalBill')
    bills = _db.session.query(MedicalBill).filter_by(user_id=client_id).order_by(MedicalBill.bill_date.desc()).all()
    
    bills_list = [{
        'id': b.id,
        'bill_number': b.bill_number,
        'bill_date': b.bill_date.strftime('%Y-%m-%d') if b.bill_date else None,
        'facility_name': b.facility_name,
        'service_type': b.service_type,
        'total_amount': b.total_amount,
        'net_amount': b.net_amount,
        'payment_status': b.payment_status,
        'document_path': b.bill_document_path
    } for b in bills]
    
    log_audit('Viewed Client Medical Bills', 'Data Access', 'MedicalBill', None, client_id, consent.id)
    
    return jsonify({'success': True, 'bills': bills_list})
