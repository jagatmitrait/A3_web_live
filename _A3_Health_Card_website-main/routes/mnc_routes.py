"""
MNC Blueprint - Routes for Multinational Corporation Health Dashboard
Handles corporate employer health monitoring, compliance, and audit trails
"""
from flask import Blueprint, render_template, jsonify, request, redirect, url_for, flash, send_file
from flask_login import login_required, current_user
from datetime import datetime, date, timedelta
from sqlalchemy import or_
import json
import io
import csv

# Blueprint definition
mnc_bp = Blueprint('mnc', __name__)

# Models and database will be imported from app
db = None
models = None
User = None
MNCEmployee = None
MNCConsent = None
FitnessAssessment = None
WorkplaceIncident = None
MNCAuditLog = None
Vaccination = None
MedicalHistory = None
Allergy = None
Vital = None
MNCVaccinationPolicy = None
EmployeeVaccinationCompliance = None
VaccinationAlert = None
MNCVaccinationRecord = None
Surgery = None


def init_blueprint(database, model_dict):
    """Initialize blueprint with database and models"""
    global db, models, User, MNCEmployee, MNCConsent, FitnessAssessment
    global WorkplaceIncident, MNCAuditLog, Vaccination, MedicalHistory
    global Allergy, Vital, MNCVaccinationPolicy, EmployeeVaccinationCompliance, VaccinationAlert, MNCVaccinationRecord, Surgery
    
    db = database
    models = model_dict
    User = model_dict['User']
    MNCEmployee = model_dict['MNCEmployee']
    MNCConsent = model_dict['MNCConsent']
    FitnessAssessment = model_dict['FitnessAssessment']
    WorkplaceIncident = model_dict['WorkplaceIncident']
    MNCAuditLog = model_dict['MNCAuditLog']
    Vaccination = model_dict['Vaccination']
    MedicalHistory = model_dict['MedicalHistory']
    Allergy = model_dict.get('Allergy')
    Vital = model_dict.get('Vital')
    MNCVaccinationPolicy = models.get('MNCVaccinationPolicy')
    EmployeeVaccinationCompliance = models.get('EmployeeVaccinationCompliance')
    VaccinationAlert = models.get('VaccinationAlert')
    MNCVaccinationRecord = models.get('MNCVaccinationRecord')
    Surgery = model_dict.get('Surgery')


def log_mnc_audit(action_type, resource_type=None, resource_id=None, employee_id=None, 
                  data_fields=None, status='Success', failure_reason=None):
    """Helper function to log MNC audit trail"""
    try:
        audit = MNCAuditLog(
            mnc_id=current_user.id,
            user_id=current_user.id,
            action_type=action_type,
            resource_type=resource_type,
            resource_id=resource_id,
            employee_id=employee_id,
            data_fields_accessed=json.dumps(data_fields) if data_fields else None,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent', '')[:200],
            action_status=status,
            failure_reason=failure_reason
        )
        db.session.add(audit)
        db.session.commit()
    except Exception as e:
        print(f"Audit logging failed: {e}")


# ==================== DASHBOARD ROUTE ====================

@mnc_bp.route('/mnc-dashboard')
@login_required
def mnc_dashboard():
    """MNC Dashboard for corporate employer health monitoring"""
    if current_user.user_type != 'mnc':
        flash('Access denied. This dashboard is only for MNC users.', 'danger')
        return redirect(url_for('dashboard'))
    
    return render_template('mnc_dashboard.html', user=current_user)


# ==================== API ENDPOINTS ====================

@mnc_bp.route('/api/mnc/dashboard-stats')
@login_required
def api_mnc_dashboard_stats():
    """Get MNC dashboard statistics"""
    if current_user.user_type != 'mnc':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    try:
        # Get MNC employees
        mnc_employees = MNCEmployee.query.filter_by(
            mnc_id=current_user.id,
            verification_status='Verified'
        ).all()
        
        total_enrolled = len(mnc_employees)
        
        # Get fitness statistics from linked clients
        fit_for_duty = 0
        under_review = 0
        temporarily_unfit = 0
        fit_with_restrictions = 0
        
        for mnc_emp in mnc_employees:
            if mnc_emp.client_id:
                # Get latest fitness assessment
                fitness = FitnessAssessment.query.filter_by(
                    client_id=mnc_emp.client_id,
                    is_valid=True
                ).order_by(FitnessAssessment.assessment_date.desc()).first()
                
                if fitness:
                    if fitness.fitness_status == 'Fit':
                        fit_for_duty += 1
                    elif fitness.fitness_status == 'Fit with Restrictions':
                        fit_with_restrictions += 1
                    elif fitness.fitness_status == 'Review Required':
                        under_review += 1
                    elif fitness.fitness_status == 'Temporarily Unfit':
                        temporarily_unfit += 1
                else:
                    # No assessment = needs review
                    under_review += 1
            else:
                # Not linked to client = needs review
                under_review += 1
        
        # Count pending verifications
        pending_verifications = MNCEmployee.query.filter_by(
            mnc_id=current_user.id,
            verification_status='Pending'
        ).count()
        
        # Count consent expiring in 30 days
        expiry_date = datetime.utcnow() + timedelta(days=30)
        consent_expiring = MNCEmployee.query.filter(
            MNCEmployee.mnc_id == current_user.id,
            MNCEmployee.consent_status == 'Active',
            MNCEmployee.consent_expiry <= expiry_date,
            MNCEmployee.consent_expiry > datetime.utcnow()
        ).count()
        
        return jsonify({
            'success': True,
            'stats': {
                'total_enrolled': total_enrolled,
                'fit_for_duty': fit_for_duty + fit_with_restrictions,
                'under_review': under_review,
                'temporarily_unfit': temporarily_unfit,
                'pending_verifications': pending_verifications,
                'consent_expiring': consent_expiring
            }
        })
    except Exception as e:
        print(f"Error in dashboard stats: {e}")
        return jsonify({'success': False, 'message': 'Error loading stats'}), 500


@mnc_bp.route('/api/mnc/employees')
@login_required
def api_mnc_employees():
    """Get employee directory with controlled data (consent-based)"""
    if current_user.user_type != 'mnc':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    try:
        search = request.args.get('search', '').strip()
        department = request.args.get('department', '')
        fitness_filter = request.args.get('fitness_status', '')
        
        # Get MNC employees
        query = MNCEmployee.query.filter_by(
            mnc_id=current_user.id,
            verification_status='Verified'
        )
        
        # Apply search filter
        if search:
            query = query.filter(
                or_(
                    MNCEmployee.employee_id.ilike(f'%{search}%'),
                    MNCEmployee.full_name.ilike(f'%{search}%'),
                    MNCEmployee.email.ilike(f'%{search}%')
                )
            )
        
        # Apply department filter
        if department:
            query = query.filter_by(department=department)
        
        mnc_employees = query.all()
        
        result = []
        for mnc_emp in mnc_employees:
            # Get client data if linked
            emp_data = {
                'id': mnc_emp.id,
                'employee_id': mnc_emp.employee_id,
                'uid': None,
                'name': mnc_emp.full_name,
                'age': None,
                'gender': None,
                'department': mnc_emp.department or 'Not Assigned',
                'job_role': mnc_emp.job_role or 'Employee',
                'fitness_status': 'Review Required',
                'last_health_review': None,
                'vaccination_compliance': 0  # Add vaccination compliance percentage
            }
            
            # Get vaccination compliance - calculate percentage based on policies
            vaccination_compliance = 0
            if EmployeeVaccinationCompliance and MNCVaccinationPolicy:
                try:
                    # Get all active policies
                    active_policies = MNCVaccinationPolicy.query.filter_by(
                        mnc_id=current_user.id,
                        is_active=True
                    ).all()
                    
                    if active_policies:
                        # Get compliance records for this employee
                        compliance_records = EmployeeVaccinationCompliance.query.filter_by(
                            employee_id=mnc_emp.id
                        ).all()
                        
                        # Count how many policies are compliant
                        compliant_count = sum(1 for c in compliance_records if c.compliance_status == 'Compliant')
                        total_policies = len(active_policies)
                        
                        # Calculate percentage
                        vaccination_compliance = round((compliant_count / total_policies * 100), 1) if total_policies > 0 else 0
                except Exception as e:
                    print(f"Error calculating vaccination compliance: {e}")
                    pass
            
            emp_data['vaccination_compliance'] = vaccination_compliance
            
            if mnc_emp.client_id:
                client = User.query.get(mnc_emp.client_id)
                if client:
                    emp_data['uid'] = client.uid
                    emp_data['gender'] = client.gender
                    
                    # Calculate age
                    if client.dob:
                        today = date.today()
                        emp_data['age'] = today.year - client.dob.year - (
                            (today.month, today.day) < (client.dob.month, client.dob.day)
                        )
                    
                    # Get latest fitness assessment
                    fitness = FitnessAssessment.query.filter_by(
                        client_id=client.id,
                        is_valid=True
                    ).order_by(FitnessAssessment.assessment_date.desc()).first()
                    
                    if fitness:
                        emp_data['fitness_status'] = fitness.fitness_status
                        emp_data['last_health_review'] = fitness.assessment_date.strftime('%Y-%m-%d')
            
            # Apply fitness filter
            if fitness_filter and emp_data['fitness_status'] != fitness_filter:
                continue
            
            result.append(emp_data)
        
        return jsonify({
            'success': True,
            'employees': result,
            'total': len(result)
        })
    except Exception as e:
        print(f"Error loading employees: {e}")
        return jsonify({'success': False, 'message': 'Error loading employees'}), 500


@mnc_bp.route('/api/mnc/employees/fetch-by-uid')
@login_required
def api_mnc_fetch_employee_by_uid():
    """Fetch employee details by UID"""
    if current_user.user_type != 'mnc':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    try:
        uid = request.args.get('uid', '').strip()
        
        if not uid:
            return jsonify({'success': False, 'message': 'UID is required'}), 400
        
        # Find client by UID
        client = User.query.filter_by(uid=uid, user_type='client').first()
        
        if not client:
            return jsonify({'success': False, 'message': 'No A3 Health Card found with this UID'}), 404
        
        # Check if already registered
        existing = MNCEmployee.query.filter_by(
            mnc_id=current_user.id,
            client_id=client.id
        ).first()
        
        if existing:
            return jsonify({'success': False, 'message': 'This employee is already registered in your organization'}), 400
        
        return jsonify({
            'success': True,
            'employee': {
                'uid': client.uid,
                'full_name': client.full_name,
                'email': client.email,
                'mobile': client.mobile,
                'gender': client.gender,
                'dob': client.dob.strftime('%Y-%m-%d') if client.dob else None
            }
        })
    
    except Exception as e:
        print(f"Error fetching employee: {e}")
        return jsonify({'success': False, 'message': 'Error fetching employee details'}), 500


@mnc_bp.route('/api/mnc/employees/register', methods=['POST'])
@login_required
def api_mnc_register_employee():
    """Register a new employee using their UID"""
    if current_user.user_type != 'mnc':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    try:
        data = request.get_json()
        
        # Validate required field
        if not data.get('uid'):
            return jsonify({'success': False, 'message': 'UID is required'}), 400
        
        # Find client by UID
        client = User.query.filter_by(uid=data['uid'], user_type='client').first()
        
        if not client:
            return jsonify({'success': False, 'message': 'No A3 Health Card found with this UID'}), 404
        
        # Check if already registered
        existing = MNCEmployee.query.filter_by(
            mnc_id=current_user.id,
            client_id=client.id
        ).first()
        
        if existing:
            return jsonify({'success': False, 'message': 'This employee is already registered'}), 400
        
        # Validate employee_id uniqueness (if provided)
        if data.get('employee_id'):
            dup = MNCEmployee.query.filter_by(mnc_id=current_user.id, employee_id=data.get('employee_id')).first()
            if dup:
                return jsonify({'success': False, 'message': 'Employee ID already in use in your organization'}), 400

        # Create employee record with auto-fetched details
        employee = MNCEmployee(
            mnc_id=current_user.id,
            client_id=client.id,
            employee_id=data.get('employee_id') or client.uid,
            full_name=client.full_name,
            email=client.email,
            mobile=client.mobile,
            department=data.get('department'),
            job_role=data.get('job_role'),
            verification_status='Verified',
            verified_at=datetime.utcnow(),
            consent_status='Active',
            consent_date=datetime.utcnow()
        )
        
        db.session.add(employee)
        db.session.commit()
        
        log_mnc_audit('employee_register', resource_type='employee', 
                     resource_id=employee.id, status='Success')
        
        return jsonify({
            'success': True,
            'message': 'Employee registered successfully and added to your directory!',
            'employee_id': employee.id,
            'employee_name': client.full_name
        })
    
    except Exception as e:
        print(f"Error registering employee: {e}")
        db.session.rollback()
        return jsonify({'success': False, 'message': 'Error registering employee'}), 500


@mnc_bp.route('/api/mnc/employees/create-with-uid', methods=['POST'])
@login_required
def api_mnc_create_employee_with_uid():
    """Create a new employee account and generate UID"""
    if current_user.user_type != 'mnc':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    try:
        import random
        import string
        
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['full_name', 'email', 'mobile', 'gender', 'dob']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'message': f'{field.replace("_", " ").title()} is required'}), 400
        
        # Check if email already exists
        existing_user = User.query.filter_by(email=data['email']).first()
        if existing_user:
            return jsonify({'success': False, 'message': 'An account with this email already exists'}), 400
        
        # Check if mobile already exists
        existing_mobile = User.query.filter_by(mobile=data['mobile']).first()
        if existing_mobile:
            return jsonify({'success': False, 'message': 'An account with this mobile number already exists'}), 400
        
        # Generate 16-digit UID
        def generate_uid():
            while True:
                # Generate 16-digit UID (numeric)
                uid = ''.join(random.choices(string.digits, k=16))
                # Check if UID already exists
                if not User.query.filter_by(uid=uid).first():
                    return uid
        
        new_uid = generate_uid()
        
        # Generate a random password for the new account
        temp_password = ''.join(random.choices(string.ascii_letters + string.digits, k=12))
        
        # Parse DOB
        from datetime import datetime
        dob_date = datetime.strptime(data['dob'], '%Y-%m-%d').date()
        
        # Validate employee_id uniqueness (if provided)
        if data.get('employee_id'):
            dup = MNCEmployee.query.filter_by(mnc_id=current_user.id, employee_id=data.get('employee_id')).first()
            if dup:
                return jsonify({'success': False, 'message': 'Employee ID already in use in your organization'}), 400

        # Create new client user account
        new_client = User(
            uid=new_uid,
            full_name=data['full_name'],
            email=data['email'],
            mobile=data['mobile'],
            gender=data['gender'],
            dob=dob_date,
            blood_group=data.get('blood_group'),
            user_type='client',
            is_active=True
        )
        new_client.set_password(temp_password)  # Set temporary password
        
        db.session.add(new_client)
        db.session.flush()  # Flush to get the client ID
        
        # Create MNC employee record
        employee = MNCEmployee(
            mnc_id=current_user.id,
            client_id=new_client.id,
            employee_id=data.get('employee_id') or new_uid,
            full_name=data['full_name'],
            email=data['email'],
            mobile=data['mobile'],
            department=data.get('department'),
            job_role=data.get('job_role'),
            verification_status='Verified',
            verified_at=datetime.utcnow(),
            consent_status='Active',
            consent_date=datetime.utcnow()
        )
        
        db.session.add(employee)
        db.session.commit()
        
        log_mnc_audit('employee_create_with_uid', resource_type='employee', 
                     resource_id=employee.id, status='Success')
        
        return jsonify({
            'success': True,
            'message': 'Employee account created and registered successfully!',
            'uid': new_uid,
            'employee_id': employee.id,
            'employee_name': data['full_name'],
            'temp_password': temp_password  # Send this securely in production
        })
    
    except Exception as e:
        print(f"Error creating employee with UID: {e}")
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Error creating employee: {str(e)}'}), 500


@mnc_bp.route('/api/mnc/employees/pending')
@login_required
def api_mnc_pending_employees():
    """Get pending employees awaiting verification"""
    if current_user.user_type != 'mnc':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    try:
        pending = MNCEmployee.query.filter_by(
            mnc_id=current_user.id,
            verification_status='Pending'
        ).all()
        
        result = []
        for emp in pending:
            result.append({
                'id': emp.id,
                'employee_id': emp.employee_id,
                'full_name': emp.full_name,
                'email': emp.email,
                'mobile': emp.mobile,
                'department': emp.department,
                'job_role': emp.job_role,
                'verification_code': emp.verification_code,
                'created_at': emp.created_at.strftime('%Y-%m-%d %H:%M')
            })
        
        return jsonify({
            'success': True,
            'employees': result,
            'total': len(result)
        })
    except Exception as e:
        print(f"Error loading pending employees: {e}")
        return jsonify({'success': False, 'message': 'Error loading employees'}), 500


@mnc_bp.route('/api/mnc/employees/<int:employee_id>', methods=['GET', 'DELETE'])
@login_required
def api_mnc_employee_detail(employee_id):
    """Get detailed employee health summary or delete employee"""
    if current_user.user_type != 'mnc':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    # Handle DELETE request
    if request.method == 'DELETE':
        try:
            # Get MNC employee
            mnc_emp = MNCEmployee.query.filter_by(
                id=employee_id,
                mnc_id=current_user.id
            ).first_or_404()
            
            employee_name = mnc_emp.full_name
            
            # Delete related vaccination compliance records
            if EmployeeVaccinationCompliance:
                EmployeeVaccinationCompliance.query.filter_by(
                    employee_id=employee_id
                ).delete()
            
            # Delete related vaccination records uploaded by MNC
            if MNCVaccinationRecord:
                MNCVaccinationRecord.query.filter_by(
                    employee_id=employee_id
                ).delete()
            
            # Delete related vaccination alerts
            if VaccinationAlert:
                VaccinationAlert.query.filter_by(
                    employee_id=employee_id
                ).delete()
            
            # Delete consent records
            MNCConsent.query.filter_by(
                employee_id=employee_id
            ).delete()
            
            # Log the deletion
            log_mnc_audit(
                action_type='Delete Employee',
                resource_type='MNCEmployee',
                resource_id=employee_id,
                data_fields=f'Deleted employee: {employee_name}',
                status='Success'
            )
            
            # Delete the employee record
            db.session.delete(mnc_emp)
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': f'Employee {employee_name} deleted successfully'
            })
            
        except Exception as e:
            db.session.rollback()
            print(f"Error deleting employee: {e}")
            return jsonify({'success': False, 'message': 'Error deleting employee'}), 500
    
    # Handle GET request (existing code)
    try:
        # Get MNC employee
        mnc_emp = MNCEmployee.query.filter_by(
            id=employee_id,
            mnc_id=current_user.id
        ).first_or_404()
        
        profile = {
            'id': mnc_emp.id,
            'employee_id': mnc_emp.employee_id,
            'uid': None,
            'name': mnc_emp.full_name,
            'age': None,
            'gender': None,
            'department': mnc_emp.department,
            'job_role': mnc_emp.job_role,
            'fitness_status': 'Review Required',
            'fitness_restrictions': [],
            'work_restrictions': [],
            'vaccination_status': 'Unknown',
            'chronic_conditions_summary': [],
            'last_health_check': None,
            'next_health_check': None
        }
        
        if mnc_emp.client_id:
            client = User.query.get(mnc_emp.client_id)
            if client:
                profile['uid'] = client.uid
                profile['gender'] = client.gender
                
                if client.dob:
                    today = date.today()
                    profile['age'] = today.year - client.dob.year - (
                        (today.month, today.day) < (client.dob.month, client.dob.day)
                    )
                
                # Get fitness data
                fitness = FitnessAssessment.query.filter_by(
                    client_id=client.id,
                    is_valid=True
                ).order_by(FitnessAssessment.assessment_date.desc()).first()
                
                if fitness:
                    profile['fitness_status'] = fitness.fitness_status
                    profile['last_health_check'] = fitness.assessment_date.strftime('%Y-%m-%d')
                    profile['next_health_check'] = fitness.next_review_date.strftime('%Y-%m-%d') if fitness.next_review_date else None
                    
                    if fitness.restrictions:
                        try:
                            profile['fitness_restrictions'] = json.loads(fitness.restrictions)
                        except:
                            profile['fitness_restrictions'] = [fitness.restrictions] if fitness.restrictions else []
                
                # Vaccination compliance
                vac_count = Vaccination.query.filter_by(
                    user_id=client.id,
                    status='Completed'
                ).count()
                profile['vaccination_status'] = 'Compliant' if vac_count > 0 else 'Incomplete'
                
                # Chronic conditions summary (aggregated)
                chronic_conditions = MedicalHistory.query.filter_by(
                    user_id=client.id,
                    record_type='chronic',
                    is_active=True
                ).all()
                # Only provide categories, not details
                profile['chronic_conditions_summary'] = [
                    {'category': 'Chronic', 'count': len(chronic_conditions)}
                ]
        
        return jsonify({
            'success': True,
            'employee': profile
        })
    except Exception as e:
        print(f"Error loading employee detail: {e}")
        return jsonify({'success': False, 'message': 'Error loading employee'}), 500


@mnc_bp.route('/api/mnc/employees/<int:employee_id>/department', methods=['PUT'])
@login_required
def api_mnc_employee_update_department(employee_id):
    """Update employee department"""
    if current_user.user_type != 'mnc':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    try:
        data = request.get_json()
        new_department = data.get('department', '').strip()
        
        if not new_department:
            return jsonify({'success': False, 'message': 'Department cannot be empty'}), 400
        
        # Get MNC employee
        mnc_emp = MNCEmployee.query.filter_by(
            id=employee_id,
            mnc_id=current_user.id
        ).first_or_404()
        
        old_department = mnc_emp.department
        mnc_emp.department = new_department
        mnc_emp.updated_at = datetime.utcnow()
        
        # Log the update
        log_mnc_audit(
            action_type='Update Employee Department',
            resource_type='MNCEmployee',
            resource_id=employee_id,
            data_fields=f'Changed department from "{old_department}" to "{new_department}" for {mnc_emp.full_name}',
            status='Success'
        )
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Department updated successfully',
            'department': new_department
        })
        
    except Exception as e:
        db.session.rollback()
        print(f"Error updating department: {e}")
        return jsonify({'success': False, 'message': 'Error updating department'}), 500


@mnc_bp.route('/api/mnc/employees/<int:employee_id>/employee-id', methods=['PUT'])
@login_required
def api_mnc_employee_update_employee_id(employee_id):
    """Update the MNC employee's employee_id (HR identifier)"""
    if current_user.user_type != 'mnc':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403

    try:
        data = request.get_json()
        new_eid = (data.get('employee_id') or '').strip()

        if not new_eid:
            return jsonify({'success': False, 'message': 'Employee ID cannot be empty'}), 400

        # Ensure uniqueness within this MNC
        existing = MNCEmployee.query.filter_by(mnc_id=current_user.id, employee_id=new_eid).first()
        if existing and existing.id != employee_id:
            return jsonify({'success': False, 'message': 'Employee ID already in use by another employee'}), 400

        # Get MNC employee
        mnc_emp = MNCEmployee.query.filter_by(
            id=employee_id,
            mnc_id=current_user.id
        ).first_or_404()

        old_eid = mnc_emp.employee_id
        mnc_emp.employee_id = new_eid
        mnc_emp.updated_at = datetime.utcnow()

        # Log the update
        log_mnc_audit(
            action_type='Update Employee ID',
            resource_type='MNCEmployee',
            resource_id=employee_id,
            data_fields=f'Changed employee_id from "{old_eid}" to "{new_eid}" for {mnc_emp.full_name}',
            status='Success'
        )

        db.session.commit()

        return jsonify({'success': True, 'message': 'Employee ID updated successfully', 'employee_id': new_eid})

    except Exception as e:
        db.session.rollback()
        print(f"Error updating employee ID: {e}")
        return jsonify({'success': False, 'message': 'Error updating employee ID'}), 500



@mnc_bp.route('/api/mnc/employees/check-employee-id')
@login_required
def api_mnc_check_employee_id():
    """Check if an employee_id is available within the current MNC (optionally exclude an employee record)."""
    if current_user.user_type != 'mnc':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403

    eid = request.args.get('employee_id', '').strip()
    exclude_id = request.args.get('exclude_id', type=int)

    if not eid:
        return jsonify({'success': True, 'available': False, 'message': 'Empty employee id provided'})

    try:
        query = MNCEmployee.query.filter_by(mnc_id=current_user.id, employee_id=eid)
        if exclude_id:
            query = query.filter(MNCEmployee.id != exclude_id)

        exists = query.first() is not None
        return jsonify({'success': True, 'available': not exists})
    except Exception as e:
        print(f"Error checking employee id: {e}")
        return jsonify({'success': False, 'available': False, 'message': 'Error checking employee id'}), 500


@mnc_bp.route('/api/mnc/employees/<int:employee_id>/medical-details')
@login_required
def api_mnc_employee_medical_details(employee_id):
    """Get comprehensive medical details for an employee"""
    if current_user.user_type != 'mnc':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    try:
        # Get MNC employee
        mnc_emp = MNCEmployee.query.filter_by(
            id=employee_id,
            mnc_id=current_user.id
        ).first_or_404()
        
        # Check consent status
        if mnc_emp.consent_status != 'Active':
            return jsonify({
                'success': False, 
                'message': 'Employee has not provided active consent for medical data access'
            }), 403
        
        medical_details = {
            'employee_name': mnc_emp.full_name,
            'uid': None,
            'age': None,
            'gender': None,
            'mobile': mnc_emp.mobile,
            'blood_group': None,
            'fitness_assessment': None,
            'vaccinations': [],
            'medical_history': [],
            'allergies': [],
            'surgeries': [],
            'recent_vitals': None
        }
        
        if mnc_emp.client_id:
            client = User.query.get(mnc_emp.client_id)
            if client:
                medical_details['uid'] = client.uid
                medical_details['gender'] = client.gender
                medical_details['blood_group'] = client.blood_group
                
                # Calculate age
                if client.dob:
                    today = date.today()
                    medical_details['age'] = today.year - client.dob.year - (
                        (today.month, today.day) < (client.dob.month, client.dob.day)
                    )
                
                # Get latest fitness assessment
                fitness = FitnessAssessment.query.filter_by(
                    client_id=client.id,
                    is_valid=True
                ).order_by(FitnessAssessment.assessment_date.desc()).first()
                
                if fitness:
                    medical_details['fitness_assessment'] = {
                        'status': fitness.fitness_status,
                        'assessment_date': fitness.assessment_date.strftime('%Y-%m-%d'),
                        'restrictions': fitness.restrictions,
                        'notes': fitness.work_capability_summary,
                        'assessed_by': fitness.doctor.full_name if fitness.doctor_id and fitness.doctor else 'Medical Professional',
                        'next_review_date': fitness.next_review_date.strftime('%Y-%m-%d') if fitness.next_review_date else None
                    }
                
                # Get vaccinations
                vaccinations = Vaccination.query.filter_by(
                    user_id=client.id
                ).order_by(Vaccination.vaccination_date.desc()).all()
                
                for vac in vaccinations:
                    medical_details['vaccinations'].append({
                        'vaccine_name': vac.vaccine_name,
                        'date_given': vac.vaccination_date.strftime('%Y-%m-%d') if vac.vaccination_date else None,
                        'dose_number': vac.dose_number,
                        'next_due_date': vac.next_due_date.strftime('%Y-%m-%d') if vac.next_due_date else None,
                        'facility': vac.hospital_clinic_name
                    })
                
                # Get medical history
                medical_history = MedicalHistory.query.filter_by(
                    user_id=client.id
                ).order_by(MedicalHistory.diagnosis_date.desc()).all()
                
                for record in medical_history:
                    medical_details['medical_history'].append({
                        'condition': record.condition_name,
                        'diagnosis_date': record.diagnosis_date.strftime('%Y-%m-%d') if record.diagnosis_date else None,
                        'description': record.notes,
                        'treatment': record.treatment,
                        'status': 'Active' if record.is_active else 'Resolved',
                        'record_type': record.record_type
                    })
                
                # Get allergies
                if Allergy:
                    try:
                        allergies = Allergy.query.filter_by(
                            user_id=client.id,
                            active=True
                        ).all()
                        
                        for allergy in allergies:
                            medical_details['allergies'].append({
                                'allergen': allergy.allergen,
                                'reaction': allergy.reactions,
                                'severity': allergy.severity,
                                'diagnosed_date': allergy.first_reaction_date.strftime('%Y-%m-%d') if allergy.first_reaction_date else None
                            })
                    except Exception as e:
                        print(f"Error loading allergies: {e}")

                # Get surgeries
                if Surgery:
                    try:
                        surgeries = Surgery.query.filter_by(
                            user_id=client.id
                        ).order_by(Surgery.surgery_date.desc()).all()

                        for s in surgeries:
                            medical_details['surgeries'].append({
                                'surgery_name': s.surgery_name,
                                'surgery_date': s.surgery_date.strftime('%Y-%m-%d') if s.surgery_date else None,
                                'surgery_type': s.surgery_type,
                                'category': s.category,
                                'hospital': s.hospital,
                                'surgeon_name': s.surgeon_name,
                                'reason': s.reason,
                                'outcome': s.outcome,
                                'follow_up_date': s.follow_up_date.strftime('%Y-%m-%d') if s.follow_up_date else None,
                                'implants_used': s.implants_used
                            })
                    except Exception as e:
                        print(f"Error loading surgeries: {e}")
                
                # Get recent vitals
                if Vital:
                    try:
                        recent_vital = Vital.query.filter_by(
                            user_id=client.id
                        ).order_by(Vital.recorded_at.desc()).first()
                        
                        if recent_vital:
                            medical_details['recent_vitals'] = {
                                'blood_pressure': f"{recent_vital.blood_pressure_systolic}/{recent_vital.blood_pressure_diastolic}" if recent_vital.blood_pressure_systolic else None,
                                'temperature': recent_vital.temperature,
                                'heart_rate': recent_vital.heart_rate,
                                'recorded_date': recent_vital.recorded_at.strftime('%Y-%m-%d')
                            }
                    except Exception as e:
                        print(f"Error loading vitals: {e}")
        
        # Log the access
        log_mnc_audit(
            'view_medical_details', 
            resource_type='employee',
            resource_id=employee_id,
            employee_id=mnc_emp.client_id,
            data_fields=['fitness', 'vaccinations', 'medical_history', 'allergies', 'vitals'],
            status='Success'
        )
        
        return jsonify({
            'success': True,
            'medical_details': medical_details
        })
    
    except Exception as e:
        print(f"Error loading medical details: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': f'Error loading medical details: {str(e)}'}), 500


@mnc_bp.route('/api/mnc/analytics/health-trends')
@login_required
def api_mnc_health_trends():
    """Aggregated health analytics (no personal data)"""
    if current_user.user_type != 'mnc':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    try:
        # Get all verified employees
        mnc_employees = MNCEmployee.query.filter_by(
            mnc_id=current_user.id,
            verification_status='Verified'
        ).all()
        
        total_count = len(mnc_employees)
        
        health_trends = {
            'fitness_distribution': {
                'Fit': 0,
                'Fit with Restrictions': 0,
                'Temporarily Unfit': 0,
                'Review Required': 0
            },
            'age_distribution': {
                '18-25': 0,
                '26-35': 0,
                '36-45': 0,
                '46-55': 0,
                '56+': 0
            },
            'vaccination_coverage': {
                'compliant': 0,
                'partial': 0,
                'non_compliant': 0
            },
            'department_distribution': {}
        }
        
        for mnc_emp in mnc_employees:
            # Department distribution
            dept = mnc_emp.department or 'Unassigned'
            health_trends['department_distribution'][dept] = health_trends['department_distribution'].get(dept, 0) + 1
            
            if mnc_emp.client_id:
                client = User.query.get(mnc_emp.client_id)
                if client:
                    # Age distribution
                    if client.dob:
                        age = date.today().year - client.dob.year
                        if 18 <= age <= 25:
                            health_trends['age_distribution']['18-25'] += 1
                        elif 26 <= age <= 35:
                            health_trends['age_distribution']['26-35'] += 1
                        elif 36 <= age <= 45:
                            health_trends['age_distribution']['36-45'] += 1
                        elif 46 <= age <= 55:
                            health_trends['age_distribution']['46-55'] += 1
                        else:
                            health_trends['age_distribution']['56+'] += 1
                    
                    # Fitness distribution
                    fitness = FitnessAssessment.query.filter_by(
                        client_id=client.id,
                        is_valid=True
                    ).order_by(FitnessAssessment.assessment_date.desc()).first()
                    
                    if fitness:
                        status = fitness.fitness_status
                        if status in health_trends['fitness_distribution']:
                            health_trends['fitness_distribution'][status] += 1
                        else:
                            health_trends['fitness_distribution']['Review Required'] += 1
                    else:
                        health_trends['fitness_distribution']['Review Required'] += 1
                    
                    # Vaccination coverage - using new compliance system with ACTIVE policies only
                    active_policies = MNCVaccinationPolicy.query.filter_by(
                        mnc_id=current_user.id,
                        is_active=True
                    ).all()
                    active_policy_ids = [p.id for p in active_policies]
                    
                    if active_policy_ids:
                        employee_compliance = EmployeeVaccinationCompliance.query.filter(
                            EmployeeVaccinationCompliance.employee_id == mnc_emp.id,
                            EmployeeVaccinationCompliance.policy_id.in_(active_policy_ids)
                        ).all()
                        
                        if employee_compliance:
                            compliant_count = sum(1 for c in employee_compliance if c.compliance_status == 'Compliant')
                            partial_count = sum(1 for c in employee_compliance if c.compliance_status == 'Partially Compliant')
                            applicable_policies = len([p for p in active_policies if is_policy_applicable(p, mnc_emp)])
                            
                            if compliant_count == applicable_policies and applicable_policies > 0:
                                health_trends['vaccination_coverage']['compliant'] += 1
                            elif compliant_count > 0 or partial_count > 0:
                                health_trends['vaccination_coverage']['partial'] += 1
                            else:
                                health_trends['vaccination_coverage']['non_compliant'] += 1
                        else:
                            health_trends['vaccination_coverage']['non_compliant'] += 1
                    else:
                        # Fallback to simple vaccination count if no active policies
                        vac_count = Vaccination.query.filter_by(
                            user_id=client.id,
                            status='Completed'
                        ).count()
                        
                        # Check MNC-uploaded verified records
                        mnc_vac_count = MNCVaccinationRecord.query.filter_by(
                            employee_id=mnc_emp.id,
                            verification_status='Verified'
                        ).count()
                        
                        total_vac = vac_count + mnc_vac_count
                        
                        if total_vac >= 3:
                            health_trends['vaccination_coverage']['compliant'] += 1
                        elif total_vac > 0:
                            health_trends['vaccination_coverage']['partial'] += 1
                        else:
                            health_trends['vaccination_coverage']['non_compliant'] += 1
        
        return jsonify({
            'success': True,
            'total_employees': total_count,
            'health_trends': health_trends
        })
    except Exception as e:
        print(f"Error loading health trends: {e}")
        return jsonify({'success': False, 'message': 'Error loading analytics'}), 500


@mnc_bp.route('/api/mnc/incidents', methods=['GET'])
@login_required
def api_mnc_incidents():
    """Get workplace health incidents"""
    if current_user.user_type != 'mnc':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    try:
        incidents = WorkplaceIncident.query.filter_by(
            mnc_id=current_user.id
        ).order_by(WorkplaceIncident.incident_date.desc()).all()
        
        result = []
        for incident in incidents:
            # Get employee name if linked
            employee_name = None
            if incident.employee_id:
                mnc_emp = MNCEmployee.query.get(incident.employee_id)
                if mnc_emp:
                    employee_name = mnc_emp.full_name
            
            # Extract GPS coordinates if stored
            latitude = None
            longitude = None
            if incident.root_cause:
                try:
                    coords = json.loads(incident.root_cause)
                    latitude = coords.get('latitude')
                    longitude = coords.get('longitude')
                except:
                    pass
            
            result.append({
                'id': incident.id,
                'incident_id': incident.incident_id,
                'incident_date': incident.incident_date.strftime('%Y-%m-%d %H:%M'),
                'incident_type': incident.incident_type,
                'severity': incident.severity,
                'location': incident.location,
                'description': incident.description,
                'status': incident.status,
                'recovery_status': incident.recovery_status,
                'employee_name': employee_name,
                'latitude': latitude,
                'longitude': longitude
            })
        
        return jsonify({
            'success': True,
            'incidents': result,
            'total': len(result)
        })
    except Exception as e:
        print(f"Error loading incidents: {e}")
        return jsonify({'success': False, 'message': 'Error loading incidents'}), 500


@mnc_bp.route('/api/mnc/incidents', methods=['POST'])
@login_required
def api_mnc_create_incident():
    """Report a new workplace incident"""
    if current_user.user_type != 'mnc':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    try:
        data = request.get_json()
        
        # Generate incident ID
        incident_count = WorkplaceIncident.query.filter_by(mnc_id=current_user.id).count()
        incident_id = f"INC-{current_user.mnc_name[:3].upper()}-{datetime.now().year}-{incident_count + 1:04d}"
        
        # Parse datetime
        incident_datetime = datetime.strptime(
            f"{data['date']} {data['time']}", 
            '%Y-%m-%d %H:%M'
        )
        
        # Find employee if UID provided
        employee_id = None
        if data.get('uid'):
            mnc_emp = MNCEmployee.query.filter_by(
                mnc_id=current_user.id
            ).join(User, MNCEmployee.client_id == User.id).filter(
                User.uid == data['uid']
            ).first()
            if mnc_emp:
                employee_id = mnc_emp.id
        
        incident = WorkplaceIncident(
            incident_id=incident_id,
            mnc_id=current_user.id,
            employee_id=employee_id,
            reported_by_id=current_user.id,
            incident_date=incident_datetime,
            incident_type=data['type'],
            location=data['location'],
            description=data['description'],
            immediate_action=data.get('action', ''),
            medical_attention_required=data['type'] in ['injury', 'illness'],
            status='Open'
        )
        
        # Add GPS coordinates if provided
        if data.get('latitude') and data.get('longitude'):
            # Store in root_cause field temporarily (or add new fields to model)
            incident.root_cause = json.dumps({
                'latitude': data['latitude'],
                'longitude': data['longitude']
            })
        
        db.session.add(incident)
        db.session.commit()
        
        log_mnc_audit('incident_create', resource_type='incident', 
                     resource_id=incident.id, status='Success')
        
        return jsonify({
            'success': True,
            'message': 'Incident reported successfully',
            'incident_id': incident_id
        })
    except Exception as e:
        print(f"Error creating incident: {e}")
        db.session.rollback()
        return jsonify({'success': False, 'message': 'Error reporting incident'}), 500


@mnc_bp.route('/api/mnc/incidents/<int:incident_id>', methods=['GET'])
@login_required
def api_mnc_incident_detail(incident_id):
    """Get detailed incident information"""
    if current_user.user_type != 'mnc':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    try:
        incident = WorkplaceIncident.query.filter_by(
            id=incident_id,
            mnc_id=current_user.id
        ).first_or_404()
        
        # Get employee name if linked
        employee_name = None
        if incident.employee_id:
            mnc_emp = MNCEmployee.query.get(incident.employee_id)
            if mnc_emp:
                employee_name = mnc_emp.full_name
        
        # Extract GPS coordinates if stored
        latitude = None
        longitude = None
        if incident.root_cause:
            try:
                coords = json.loads(incident.root_cause)
                latitude = coords.get('latitude')
                longitude = coords.get('longitude')
            except:
                pass
        
        incident_data = {
            'id': incident.id,
            'incident_id': incident.incident_id,
            'incident_date': incident.incident_date.strftime('%Y-%m-%d %H:%M'),
            'incident_type': incident.incident_type,
            'severity': incident.severity,
            'location': incident.location,
            'description': incident.description,
            'immediate_action': incident.immediate_action,
            'status': incident.status,
            'recovery_status': incident.recovery_status,
            'employee_name': employee_name,
            'latitude': latitude,
            'longitude': longitude
        }
        
        return jsonify({
            'success': True,
            'incident': incident_data
        })
    except Exception as e:
        print(f"Error loading incident detail: {e}")
        return jsonify({'success': False, 'message': 'Error loading incident'}), 500


@mnc_bp.route('/api/mnc/incidents/<int:incident_id>/close', methods=['POST'])
@login_required
def api_mnc_close_incident(incident_id):
    """Close/Resolve an incident"""
    if current_user.user_type != 'mnc':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    try:
        incident = WorkplaceIncident.query.filter_by(
            id=incident_id,
            mnc_id=current_user.id
        ).first_or_404()
        
        if incident.status in ['Closed', 'Resolved']:
            return jsonify({'success': False, 'message': 'Incident already closed'}), 400
        
        incident.status = 'Resolved'
        incident.closed_at = datetime.utcnow()
        incident.recovery_status = 'Recovered'
        
        db.session.commit()
        
        log_mnc_audit('incident_close', resource_type='incident', 
                     resource_id=incident_id, status='Success')
        
        return jsonify({
            'success': True,
            'message': 'Incident closed successfully'
        })
    except Exception as e:
        print(f"Error closing incident: {e}")
        db.session.rollback()
        return jsonify({'success': False, 'message': 'Error closing incident'}), 500


@mnc_bp.route('/api/mnc/compliance-report')
@login_required
def api_mnc_compliance_report():
    """Generate compliance summary report"""
    if current_user.user_type != 'mnc':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    try:
        mnc_employees = MNCEmployee.query.filter_by(
            mnc_id=current_user.id,
            verification_status='Verified'
        ).all()
        
        total = len(mnc_employees)
        
        fitness_certified = 0
        certifications_expiring = 0
        vaccination_compliant = 0
        health_check_overdue = 0
        
        thirty_days_from_now = date.today() + timedelta(days=30)
        
        for mnc_emp in mnc_employees:
            if mnc_emp.client_id:
                # Check fitness certification
                fitness = FitnessAssessment.query.filter_by(
                    client_id=mnc_emp.client_id,
                    is_valid=True
                ).order_by(FitnessAssessment.assessment_date.desc()).first()
                
                if fitness:
                    if fitness.certificate_expiry_date and fitness.certificate_expiry_date > date.today():
                        fitness_certified += 1
                        
                        # Check if expiring in 30 days
                        if fitness.certificate_expiry_date <= thirty_days_from_now:
                            certifications_expiring += 1
                    
                    # Check if review is overdue
                    if fitness.next_review_date and fitness.next_review_date < date.today():
                        health_check_overdue += 1
                
                # Check vaccination compliance using new compliance system
                employee_compliance = EmployeeVaccinationCompliance.query.filter_by(
                    employee_id=mnc_emp.id,
                    compliance_status='Compliant'
                ).first()
                
                if employee_compliance:
                    vaccination_compliant += 1
                else:
                    # Fallback to basic check if no compliance record exists
                    vac_count = Vaccination.query.filter_by(
                        user_id=mnc_emp.client_id,
                        status='Completed'
                    ).count()
                    
                    if vac_count >= 2:  # Basic compliance threshold
                        vaccination_compliant += 1
        
        report = {
            'generated_at': datetime.utcnow().isoformat(),
            'company_name': current_user.mnc_name,
            'total_employees': total,
            'fitness_certified': fitness_certified,
            'pending_certification': total - fitness_certified,
            'certifications_expiring_30_days': certifications_expiring,
            'vaccination_compliant': vaccination_compliant,
            'health_check_overdue': health_check_overdue
        }
        
        return jsonify({
            'success': True,
            'report': report
        })
    except Exception as e:
        print(f"Error generating compliance report: {e}")
        return jsonify({'success': False, 'message': 'Error generating report'}), 500


@mnc_bp.route('/api/mnc/audit-logs')
@login_required
def api_mnc_audit_logs():
    """Get MNC audit logs"""
    if current_user.user_type != 'mnc':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    try:
        logs = MNCAuditLog.query.filter_by(
            mnc_id=current_user.id
        ).order_by(MNCAuditLog.created_at.desc()).limit(100).all()
        
        result = []
        for log in logs:
            user = User.query.get(log.user_id)
            result.append({
                'timestamp': log.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                'user': user.full_name if user else 'Unknown',
                'action': log.action_type,
                'resource': log.resource_type or 'N/A',
                'status': log.action_status
            })
        
        return jsonify({
            'success': True,
            'logs': result
        })
    except Exception as e:
        print(f"Error loading audit logs: {e}")
        return jsonify({'success': False, 'message': 'Error loading logs'}), 500


@mnc_bp.route('/api/mnc/export-report/<report_type>')
@login_required
def api_mnc_export_report(report_type):
    """Export compliance/analytics reports"""
    if current_user.user_type != 'mnc':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    try:
        if report_type == 'pdf':
            # Generate PDF report
            return jsonify({
                'success': True,
                'message': 'PDF report generation initiated',
                'download_url': '/api/mnc/download-report/compliance.pdf'
            })
        
        elif report_type == 'excel':
            # Generate Excel report
            return jsonify({
                'success': True,
                'message': 'Excel report generation initiated',
                'download_url': '/api/mnc/download-report/compliance.xlsx'
            })
        
        elif report_type == 'audit':
            # Generate audit log report
            return jsonify({
                'success': True,
                'message': 'Audit report generation initiated',
                'download_url': '/api/mnc/download-report/audit_log.pdf'
            })
        
        else:
            return jsonify({'success': False, 'message': 'Invalid report type'}), 400
    
    except Exception as e:
        print(f"Error exporting report: {e}")
        return jsonify({'success': False, 'message': 'Error exporting report'}), 500


@mnc_bp.route('/api/mnc/download-report/<report_type>')
@login_required
def api_mnc_download_report(report_type):
    """Generate and download reports"""
    if current_user.user_type != 'mnc':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    try:
        if report_type == 'compliance.pdf':
            # Generate PDF compliance report
            return generate_compliance_pdf()
        
        elif report_type == 'compliance.xlsx':
            # Generate Excel compliance report
            return generate_compliance_excel()
        
        elif report_type == 'vaccination.xlsx':
            # Generate vaccination report
            return generate_vaccination_excel()
        
        elif report_type == 'fitness.xlsx':
            # Generate fitness assessment report
            return generate_fitness_excel()
        
        elif report_type == 'audit_log.pdf':
            # Generate audit log PDF
            return generate_audit_pdf()
        
        else:
            return jsonify({'success': False, 'message': 'Invalid report type'}), 400
    
    except Exception as e:
        print(f"Error downloading report: {e}")
        return jsonify({'success': False, 'message': 'Error generating report'}), 500


def generate_compliance_pdf():
    """Generate compliance report as PDF"""
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas as pdf_canvas
    
    buffer = io.BytesIO()
    c = pdf_canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    
    # Header
    c.setFont('Helvetica-Bold', 20)
    c.drawString(50, height - 50, f'{current_user.mnc_name} - Compliance Report')
    
    # Date
    c.setFont('Helvetica', 10)
    c.drawString(50, height - 70, f'Generated: {datetime.now().strftime("%Y-%m-%d %H:%M")}')
    
    # Get compliance data
    mnc_employees = MNCEmployee.query.filter_by(
        mnc_id=current_user.id,
        verification_status='Verified'
    ).all()
    
    EmployeeVaccinationCompliance = models.get('EmployeeVaccinationCompliance')
    
    total = len(mnc_employees)
    fitness_certified = 0
    vaccination_compliant = 0
    
    for mnc_emp in mnc_employees:
        if mnc_emp.client_id:
            fitness = FitnessAssessment.query.filter_by(
                client_id=mnc_emp.client_id,
                is_valid=True
            ).order_by(FitnessAssessment.assessment_date.desc()).first()
            
            if fitness and fitness.certificate_expiry_date and fitness.certificate_expiry_date > date.today():
                fitness_certified += 1
            
            # Check vaccination compliance using new system (with error handling)
            try:
                if EmployeeVaccinationCompliance:
                    compliance = EmployeeVaccinationCompliance.query.filter_by(
                        employee_id=mnc_emp.id,
                        status='Compliant'
                    ).first()
                    if compliance:
                        vaccination_compliant += 1
            except Exception as e:
                # Fallback to old vaccination count if new tables don't exist
                vac_count = Vaccination.query.filter_by(
                    user_id=mnc_emp.client_id,
                    status='Completed'
                ).count()
                if vac_count >= 2:
                    vaccination_compliant += 1
    
    # Report content
    y = height - 120
    c.setFont('Helvetica-Bold', 14)
    c.drawString(50, y, 'Compliance Summary')
    
    y -= 30
    c.setFont('Helvetica', 11)
    c.drawString(50, y, f'Total Employees: {total}')
    y -= 20
    c.drawString(50, y, f'Fitness Certified: {fitness_certified} ({(fitness_certified/total*100 if total > 0 else 0):.1f}%)')
    y -= 20
    c.drawString(50, y, f'Vaccination Compliant: {vaccination_compliant} ({(vaccination_compliant/total*100 if total > 0 else 0):.1f}%)')
    y -= 20
    c.drawString(50, y, f'Pending Certification: {total - fitness_certified}')
    y -= 20
    c.drawString(50, y, f'Vaccination Non-Compliant: {total - vaccination_compliant}')
    
    # Footer
    c.setFont('Helvetica', 8)
    c.drawString(50, 30, 'A3 Health Card - Corporate Health Management System')
    c.drawString(width - 150, 30, f'Page 1 of 1')
    
    c.showPage()
    c.save()
    
    buffer.seek(0)
    return send_file(
        buffer,
        mimetype='application/pdf',
        as_attachment=True,
        download_name=f'compliance_report_{datetime.now().strftime("%Y%m%d")}.pdf'
    )


def generate_compliance_excel():
    """Generate compliance report as CSV (Excel-compatible)"""
    output = io.StringIO()
    writer = csv.writer(output)
    
    EmployeeVaccinationCompliance = models.get('EmployeeVaccinationCompliance')
    
    # Header
    writer.writerow(['Employee Health Data Report'])
    writer.writerow([f'Company: {current_user.mnc_name}'])
    writer.writerow([f'Generated: {datetime.now().strftime("%Y-%m-%d %H:%M")}'])
    writer.writerow([])
    
    # Employee data
    writer.writerow(['Employee ID', 'Name', 'Department', 'Job Role', 'Fitness Status', 'Last Review', 'Certification Expiry', 'Vaccination Status', 'Compliance %'])
    
    mnc_employees = MNCEmployee.query.filter_by(
        mnc_id=current_user.id,
        verification_status='Verified'
    ).all()
    
    for mnc_emp in mnc_employees:
        fitness_status = 'Unknown'
        last_review = 'N/A'
        cert_expiry = 'N/A'
        vac_status = 'Unknown'
        compliance_pct = 'N/A'
        
        if mnc_emp.client_id:
            fitness = FitnessAssessment.query.filter_by(
                client_id=mnc_emp.client_id,
                is_valid=True
            ).order_by(FitnessAssessment.assessment_date.desc()).first()
            
            if fitness:
                fitness_status = fitness.fitness_status
                last_review = fitness.assessment_date.strftime('%Y-%m-%d')
                if fitness.certificate_expiry_date:
                    cert_expiry = fitness.certificate_expiry_date.strftime('%Y-%m-%d')
            
            # Use new vaccination compliance system (with error handling)
            try:
                if EmployeeVaccinationCompliance:
                    compliance = EmployeeVaccinationCompliance.query.filter_by(
                        employee_id=mnc_emp.id
                    ).first()
                    if compliance:
                        vac_status = compliance.status
                        compliance_pct = f'{compliance.compliance_percentage:.1f}%'
            except Exception:
                # Fallback to old system if tables don't exist
                vac_count = Vaccination.query.filter_by(
                    user_id=mnc_emp.client_id,
                    status='Completed'
                ).count()
                vac_status = 'Compliant' if vac_count >= 2 else 'Incomplete'
        
        writer.writerow([
            mnc_emp.employee_id,
            mnc_emp.full_name,
            mnc_emp.department or 'N/A',
            mnc_emp.job_role or 'N/A',
            fitness_status,
            last_review,
            cert_expiry,
            vac_status,
            compliance_pct
        ])
    
    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8')),
        mimetype='text/csv',
        as_attachment=True,
        download_name=f'employee_health_data_{datetime.now().strftime("%Y%m%d")}.csv'
    )


def generate_audit_pdf():
    """Generate audit log report as PDF"""
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas as pdf_canvas
    
    buffer = io.BytesIO()
    c = pdf_canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    
    # Header
    c.setFont('Helvetica-Bold', 20)
    c.drawString(50, height - 50, f'{current_user.mnc_name} - Audit Log')
    
    c.setFont('Helvetica', 10)
    c.drawString(50, height - 70, f'Generated: {datetime.now().strftime("%Y-%m-%d %H:%M")}')
    
    # Get audit logs
    logs = MNCAuditLog.query.filter_by(
        mnc_id=current_user.id
    ).order_by(MNCAuditLog.created_at.desc()).limit(50).all()
    
    y = height - 120
    c.setFont('Helvetica-Bold', 14)
    c.drawString(50, y, 'Recent Audit Activities')
    
    y -= 30
    c.setFont('Helvetica', 9)
    
    for log in logs:
        if y < 100:
            c.showPage()
            y = height - 50
            c.setFont('Helvetica', 9)
        
        user = User.query.get(log.user_id)
        log_line = f'{log.created_at.strftime("%Y-%m-%d %H:%M")} | {user.full_name if user else "Unknown"} | {log.action_type} | {log.action_status}'
        c.drawString(50, y, log_line[:90])
        y -= 15
    
    # Footer
    c.setFont('Helvetica', 8)
    c.drawString(50, 30, 'A3 Health Card - Corporate Health Management System')
    
    c.showPage()
    c.save()
    
    buffer.seek(0)
    return send_file(
        buffer,
        mimetype='application/pdf',
        as_attachment=True,
        download_name=f'audit_log_{datetime.now().strftime("%Y%m%d")}.pdf'
    )


def generate_vaccination_excel():
    """Generate vaccination compliance report as CSV"""
    output = io.StringIO()
    writer = csv.writer(output)
    
    MNCVaccinationPolicy = models.get('MNCVaccinationPolicy')
    EmployeeVaccinationCompliance = models.get('EmployeeVaccinationCompliance')
    MNCVaccinationRecord = models.get('MNCVaccinationRecord')
    
    # Header
    writer.writerow(['Vaccination Compliance Report'])
    writer.writerow([f'Company: {current_user.mnc_name}'])
    writer.writerow([f'Generated: {datetime.now().strftime("%Y-%m-%d %H:%M")}'])
    writer.writerow([])
    
    # Try to use new system, but handle gracefully if tables don't exist
    try:
        # Get active policies first
        active_policies = []
        if MNCVaccinationPolicy:
            active_policies = MNCVaccinationPolicy.query.filter_by(
                mnc_id=current_user.id,
                is_active=True
            ).all()
        
        # Policies section
        writer.writerow(['Active Vaccination Policies'])
        writer.writerow(['Policy Name', 'Vaccine Name', 'Required Doses', 'Mandatory', 'Booster Frequency', 'Grace Period', 'Compliance Deadline', 'Target Departments'])
        
        if active_policies:
            for policy in active_policies:
                writer.writerow([
                    policy.policy_name,
                    policy.vaccine_name,
                    policy.required_doses,
                    'Yes' if policy.is_mandatory else 'No',
                    f'{policy.booster_frequency_months} months' if policy.booster_frequency_months else 'N/A',
                    f'{policy.grace_period_days} days' if policy.grace_period_days else 'N/A',
                    policy.compliance_deadline.strftime('%Y-%m-%d') if policy.compliance_deadline else 'N/A',
                    policy.specific_departments or 'All Departments'
                ])
        else:
            writer.writerow(['No active policies configured'])
        
        writer.writerow([])
        writer.writerow([])
        
        # Employee compliance section
        writer.writerow(['Employee Vaccination Compliance'])
        writer.writerow(['Employee ID', 'Name', 'Department', 'Job Role', 'Compliance %', 'Compliant Vaccines', 'Total Required', 'MNC Uploaded', 'Has Exemption', 'Status'])
        
        mnc_employees = MNCEmployee.query.filter_by(
            mnc_id=current_user.id,
            verification_status='Verified'
        ).all()
        
        if mnc_employees:
            for emp in mnc_employees:
                # Get compliance records for ACTIVE policies only
                compliance_records = []
                active_policy_ids = [p.id for p in active_policies]
                
                if EmployeeVaccinationCompliance and active_policy_ids:
                    compliance_records = EmployeeVaccinationCompliance.query.filter(
                        EmployeeVaccinationCompliance.employee_id == emp.id,
                        EmployeeVaccinationCompliance.policy_id.in_(active_policy_ids)
                    ).all()
                
                # Calculate compliance based on active policies
                compliant_count = sum(1 for c in compliance_records if c.compliance_status == 'Compliant')
                total_policies = len(active_policies) if active_policies else 0
                compliance_pct = round((compliant_count / total_policies * 100), 1) if total_policies > 0 else 0
                
                # Check exemptions
                has_exemption = any(c.has_exemption for c in compliance_records) if compliance_records else False
                
                # Get MNC uploaded records count
                uploaded_count = 0
                if MNCVaccinationRecord:
                    uploaded_count = MNCVaccinationRecord.query.filter_by(
                        employee_id=emp.id,
                        verification_status='Verified'
                    ).count()
                
                # Determine status
                if has_exemption:
                    status = 'Exempted'
                elif compliance_pct >= 100:
                    status = 'Fully Compliant'
                elif compliance_pct > 0:
                    status = 'Partially Compliant'
                else:
                    status = 'Non-Compliant'
                
                writer.writerow([
                    emp.employee_id,
                    emp.full_name,
                    emp.department or 'N/A',
                    emp.job_role or 'N/A',
                    f'{compliance_pct}%',
                    compliant_count,
                    total_policies,
                    uploaded_count,
                    'Yes' if has_exemption else 'No',
                    status
                ])
        else:
            writer.writerow(['No verified employees found'])
    
    except Exception as e:
        # Fallback if tables don't exist
        writer.writerow(['Vaccination system not yet configured'])
        writer.writerow([f'Note: {str(e)}'])
        writer.writerow([])
        writer.writerow(['Using basic vaccination data from existing records'])
        writer.writerow([])
        
        # Use basic vaccination data from existing tables
        writer.writerow(['Employee Vaccination Records'])
        writer.writerow(['Employee ID', 'Name', 'Department', 'Total Vaccinations', 'Completed', 'Pending', 'Status'])
        
        mnc_employees = MNCEmployee.query.filter_by(
            mnc_id=current_user.id,
            verification_status='Verified'
        ).all()
        
        for mnc_emp in mnc_employees:
            if mnc_emp.client_id:
                total_vac = Vaccination.query.filter_by(user_id=mnc_emp.client_id).count()
                completed_vac = Vaccination.query.filter_by(user_id=mnc_emp.client_id, status='Completed').count()
                pending_vac = Vaccination.query.filter_by(user_id=mnc_emp.client_id, status='Pending').count()
                status = 'Compliant' if completed_vac >= 2 else 'Incomplete'
            else:
                total_vac = 0
                completed_vac = 0
                pending_vac = 0
                status = 'Unknown'
            
            writer.writerow([
                mnc_emp.employee_id,
                mnc_emp.full_name,
                mnc_emp.department or 'N/A',
                total_vac,
                completed_vac,
                pending_vac,
                status
            ])
    
    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8')),
        mimetype='text/csv',
        as_attachment=True,
        download_name=f'vaccination_report_{datetime.now().strftime("%Y%m%d")}.csv'
    )


def generate_fitness_excel():
    """Generate fitness assessment report as CSV"""
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow(['Fitness Assessment Report'])
    writer.writerow([f'Company: {current_user.mnc_name}'])
    writer.writerow([f'Generated: {datetime.now().strftime("%Y-%m-%d %H:%M")}'])
    writer.writerow([])
    
    # Assessment data
    writer.writerow(['Employee ID', 'Name', 'Department', 'Assessment Date', 'Type', 'Status', 'Restrictions', 'Certificate #', 'Expiry Date', 'Next Review', 'Re-assessment Reason', 'Valid'])
    
    mnc_employees = MNCEmployee.query.filter_by(
        mnc_id=current_user.id,
        verification_status='Verified'
    ).all()
    
    employee_ids = [emp.client_id for emp in mnc_employees if emp.client_id]
    
    if employee_ids:
        assessments = FitnessAssessment.query.filter(
            FitnessAssessment.client_id.in_(employee_ids)
        ).order_by(FitnessAssessment.assessment_date.desc()).all()
        
        for assessment in assessments:
            employee = MNCEmployee.query.filter_by(
                client_id=assessment.client_id,
                mnc_id=current_user.id
            ).first()
            
            if employee:
                writer.writerow([
                    employee.employee_id,
                    employee.full_name,
                    employee.department or 'N/A',
                    assessment.assessment_date.strftime('%Y-%m-%d'),
                    assessment.assessment_type or 'N/A',
                    assessment.fitness_status,
                    assessment.restrictions or 'None',
                    assessment.certificate_number or 'N/A',
                    assessment.certificate_expiry_date.strftime('%Y-%m-%d') if assessment.certificate_expiry_date else 'N/A',
                    assessment.next_review_date.strftime('%Y-%m-%d') if assessment.next_review_date else 'N/A',
                    assessment.invalidation_reason or 'N/A',
                    'Yes' if assessment.is_valid else 'No (Re-assessed)'
                ])
    else:
        writer.writerow(['No fitness assessments found for registered employees'])
    
    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8')),
        mimetype='text/csv',
        as_attachment=True,
        download_name=f'fitness_assessment_report_{datetime.now().strftime("%Y%m%d")}.csv'
    )


# ==================== FITNESS ASSESSMENT ROUTES ====================

@mnc_bp.route('/api/mnc/fitness-assessments', methods=['GET'])
@login_required
def api_mnc_fitness_assessments():
    """Get all fitness assessments for MNC employees"""
    try:
        # Get all employees for this MNC
        employees = MNCEmployee.query.filter_by(
            mnc_id=current_user.id,
            verification_status='Verified'
        ).all()
        
        employee_ids = [emp.client_id for emp in employees]
        
        # Get fitness assessments for these employees
        assessments = FitnessAssessment.query.filter(
            FitnessAssessment.client_id.in_(employee_ids),
            FitnessAssessment.is_valid == True
        ).order_by(FitnessAssessment.assessment_date.desc()).all()
        
        assessment_list = []
        for assessment in assessments:
            # Get employee details
            employee = MNCEmployee.query.filter_by(
                client_id=assessment.client_id,
                mnc_id=current_user.id
            ).first()
            
            client = User.query.get(assessment.client_id)
            doctor = User.query.get(assessment.doctor_id) if assessment.doctor_id else None
            facility = User.query.get(assessment.facility_id) if assessment.facility_id else None
            
            assessment_list.append({
                'id': assessment.id,
                'employee_name': client.full_name if client else 'Unknown',
                'employee_id': employee.employee_id if employee else None,
                'department': employee.department if employee else None,
                'assessment_date': assessment.assessment_date.strftime('%Y-%m-%d'),
                'assessment_type': assessment.assessment_type,
                'fitness_status': assessment.fitness_status,
                'restrictions': assessment.restrictions,
                'work_capability_summary': assessment.work_capability_summary,
                'recommended_accommodations': assessment.recommended_accommodations,
                'certificate_number': assessment.certificate_number,
                'certificate_expiry_date': assessment.certificate_expiry_date.strftime('%Y-%m-%d') if assessment.certificate_expiry_date else None,
                'next_review_date': assessment.next_review_date.strftime('%Y-%m-%d') if assessment.next_review_date else None,
                'doctor_name': doctor.full_name if doctor else 'Not Assigned',
                'facility_name': facility.full_name if facility else 'Not Assigned',
                'is_valid': assessment.is_valid
            })
        
        log_mnc_audit(
            action_type='View Fitness Assessments',
            resource_type='FitnessAssessment',
            data_fields='List View'
        )
        
        return jsonify({
            'success': True,
            'assessments': assessment_list,
            'total': len(assessment_list)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@mnc_bp.route('/api/mnc/fitness-assessments/<int:assessment_id>', methods=['GET'])
@login_required
def api_mnc_fitness_assessment_detail(assessment_id):
    """Get detailed fitness assessment"""
    try:
        assessment = FitnessAssessment.query.get_or_404(assessment_id)
        
        # Verify this assessment belongs to an employee of this MNC
        employee = MNCEmployee.query.filter_by(
            client_id=assessment.client_id,
            mnc_id=current_user.id
        ).first()
        
        if not employee:
            return jsonify({'success': False, 'error': 'Unauthorized access'}), 403
        
        client = User.query.get(assessment.client_id)
        doctor = User.query.get(assessment.doctor_id) if assessment.doctor_id else None
        facility = User.query.get(assessment.facility_id) if assessment.facility_id else None
        
        assessment_data = {
            'id': assessment.id,
            'employee_name': client.full_name if client else 'Unknown',
            'employee_id': employee.employee_id,
            'department': employee.department,
            'job_role': employee.job_role,
            'assessment_date': assessment.assessment_date.strftime('%Y-%m-%d'),
            'assessment_type': assessment.assessment_type,
            'fitness_status': assessment.fitness_status,
            'restrictions': assessment.restrictions,
            'work_capability_summary': assessment.work_capability_summary,
            'recommended_accommodations': assessment.recommended_accommodations,
            'certificate_number': assessment.certificate_number,
            'certificate_issue_date': assessment.certificate_issue_date.strftime('%Y-%m-%d') if assessment.certificate_issue_date else None,
            'certificate_expiry_date': assessment.certificate_expiry_date.strftime('%Y-%m-%d') if assessment.certificate_expiry_date else None,
            'next_review_date': assessment.next_review_date.strftime('%Y-%m-%d') if assessment.next_review_date else None,
            'review_frequency': assessment.review_frequency,
            'doctor_name': doctor.full_name if doctor else 'Not Assigned',
            'facility_name': facility.full_name if facility else 'Not Assigned',
            'is_valid': assessment.is_valid,
            'created_at': assessment.created_at.strftime('%Y-%m-%d %H:%M') if assessment.created_at else None,
            'updated_at': assessment.updated_at.strftime('%Y-%m-%d %H:%M') if assessment.updated_at else None
        }
        
        log_mnc_audit(
            action_type='View Fitness Assessment Detail',
            resource_type='FitnessAssessment',
            resource_id=assessment_id,
            employee_id=employee.id
        )
        
        return jsonify({
            'success': True,
            'assessment': assessment_data
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@mnc_bp.route('/api/mnc/fitness-assessments/create', methods=['POST'])
@login_required
def api_mnc_create_fitness_assessment():
    """Create a new fitness assessment for an employee"""
    try:
        data = request.get_json()
        
        # Validate employee belongs to this MNC
        employee = MNCEmployee.query.filter_by(
            id=data.get('employee_id'),
            mnc_id=current_user.id,
            verification_status='Verified'
        ).first()
        
        if not employee:
            return jsonify({'success': False, 'error': 'Employee not found'}), 404
        
        # Generate certificate number
        cert_number = f"FIT-{current_user.id}-{employee.id}-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Calculate expiry and review dates based on assessment type
        assessment_date = datetime.strptime(data.get('assessment_date'), '%Y-%m-%d').date()
        
        # Default: annual review
        review_frequency = data.get('review_frequency', 'Annual')
        if review_frequency == 'Annual':
            next_review_date = assessment_date.replace(year=assessment_date.year + 1)
            certificate_expiry = assessment_date.replace(year=assessment_date.year + 1)
        elif review_frequency == 'Biannual':
            next_review_date = assessment_date.replace(month=assessment_date.month + 6) if assessment_date.month <= 6 else assessment_date.replace(year=assessment_date.year + 1, month=assessment_date.month - 6)
            certificate_expiry = next_review_date
        elif review_frequency == 'Quarterly':
            next_review_date = assessment_date.replace(month=assessment_date.month + 3) if assessment_date.month <= 9 else assessment_date.replace(year=assessment_date.year + 1, month=assessment_date.month - 9)
            certificate_expiry = next_review_date
        else:
            next_review_date = assessment_date.replace(month=assessment_date.month + 1) if assessment_date.month < 12 else assessment_date.replace(year=assessment_date.year + 1, month=1)
            certificate_expiry = next_review_date
        
        # Create fitness assessment
        assessment = FitnessAssessment(
            client_id=employee.client_id,
            doctor_id=data.get('doctor_id'),
            facility_id=data.get('facility_id'),
            assessment_date=assessment_date,
            assessment_type=data.get('assessment_type'),
            fitness_status=data.get('fitness_status'),
            restrictions=data.get('restrictions'),
            work_capability_summary=data.get('work_capability_summary'),
            recommended_accommodations=data.get('recommended_accommodations'),
            certificate_number=cert_number,
            certificate_issue_date=assessment_date,
            certificate_expiry_date=certificate_expiry,
            next_review_date=next_review_date,
            review_frequency=review_frequency,
            is_valid=True
        )
        
        db.session.add(assessment)
        db.session.commit()
        
        log_mnc_audit(
            action_type='Create Fitness Assessment',
            resource_type='FitnessAssessment',
            resource_id=assessment.id,
            employee_id=employee.id,
            data_fields=f'Type: {assessment.assessment_type}, Status: {assessment.fitness_status}'
        )
        
        return jsonify({
            'success': True,
            'message': 'Fitness assessment created successfully',
            'assessment_id': assessment.id,
            'certificate_number': cert_number
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@mnc_bp.route('/api/mnc/fitness-assessments/<int:assessment_id>/invalidate', methods=['POST'])
@login_required
def api_mnc_invalidate_fitness_assessment(assessment_id):
    """Invalidate a fitness assessment"""
    try:
        assessment = FitnessAssessment.query.get_or_404(assessment_id)
        
        # Verify this assessment belongs to an employee of this MNC
        employee = MNCEmployee.query.filter_by(
            client_id=assessment.client_id,
            mnc_id=current_user.id
        ).first()
        
        if not employee:
            return jsonify({'success': False, 'error': 'Unauthorized access'}), 403
        
        data = request.get_json()
        
        assessment.is_valid = False
        assessment.invalidated_at = datetime.utcnow()
        assessment.invalidation_reason = data.get('reason', 'No reason provided')
        
        db.session.commit()
        
        log_mnc_audit(
            action_type='Invalidate Fitness Assessment',
            resource_type='FitnessAssessment',
            resource_id=assessment_id,
            employee_id=employee.id,
            data_fields=f'Reason: {assessment.invalidation_reason}'
        )
        
        return jsonify({
            'success': True,
            'message': 'Fitness assessment invalidated successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@mnc_bp.route('/api/mnc/fitness-stats', methods=['GET'])
@login_required
def api_mnc_fitness_stats():
    """Get fitness assessment statistics"""
    try:
        # Get all employees for this MNC
        employees = MNCEmployee.query.filter_by(
            mnc_id=current_user.id,
            verification_status='Verified'
        ).all()
        
        employee_ids = [emp.client_id for emp in employees]
        
        # Get valid assessments
        assessments = FitnessAssessment.query.filter(
            FitnessAssessment.client_id.in_(employee_ids),
            FitnessAssessment.is_valid == True
        ).all()
        
        # Get assessed employee IDs
        assessed_employee_ids = set(a.client_id for a in assessments)
        
        # Calculate statistics
        total_assessments = len(assessments)
        fit_count = sum(1 for a in assessments if a.fitness_status == 'Fit')
        fit_restricted_count = sum(1 for a in assessments if a.fitness_status == 'Fit with Restrictions')
        unfit_count = sum(1 for a in assessments if a.fitness_status == 'Temporarily Unfit')
        review_count = sum(1 for a in assessments if a.fitness_status == 'Review Required')
        
        # Add employees without assessments to review_count
        unassessed_count = sum(1 for emp in employees if emp.client_id and emp.client_id not in assessed_employee_ids)
        review_count += unassessed_count
        
        # Upcoming reviews (next 30 days)
        today = date.today()
        thirty_days = today + timedelta(days=30)
        upcoming_reviews = sum(1 for a in assessments if a.next_review_date and today <= a.next_review_date <= thirty_days)
        
        # Overdue reviews
        overdue_reviews = sum(1 for a in assessments if a.next_review_date and a.next_review_date < today)
        
        return jsonify({
            'success': True,
            'stats': {
                'total_assessments': total_assessments,
                'fit': fit_count,
                'fit_restricted': fit_restricted_count,
                'unfit': unfit_count,
                'review_required': review_count,
                'upcoming_reviews': upcoming_reviews,
                'overdue_reviews': overdue_reviews,
                'total_employees': len(employees),
                'assessed_employees': len(assessed_employee_ids)
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== VACCINATION COMPLIANCE API ENDPOINTS ====================

@mnc_bp.route('/api/mnc/vaccination-policies', methods=['GET'])
@login_required
def api_get_vaccination_policies():
    """Get all vaccination policies for the MNC"""
    if current_user.user_type != 'mnc':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    try:
        policies = MNCVaccinationPolicy.query.filter_by(
            mnc_id=current_user.id,
            is_active=True
        ).order_by(MNCVaccinationPolicy.priority_level.desc(), MNCVaccinationPolicy.created_at.desc()).all()
        
        result = []
        for policy in policies:
            result.append({
                'id': policy.id,
                'policy_name': policy.policy_name,
                'vaccine_name': policy.vaccine_name,
                'vaccine_category': policy.vaccine_category,
                'is_mandatory': policy.is_mandatory,
                'priority_level': policy.priority_level,
                'applies_to_all': policy.applies_to_all,
                'specific_departments': json.loads(policy.specific_departments) if policy.specific_departments else [],
                'required_doses': policy.required_doses,
                'booster_required': policy.booster_required,
                'booster_frequency_months': policy.booster_frequency_months,
                'compliance_deadline': policy.compliance_deadline.strftime('%Y-%m-%d') if policy.compliance_deadline else None,
                'effective_from': policy.effective_from.strftime('%Y-%m-%d'),
                'effective_until': policy.effective_until.strftime('%Y-%m-%d') if policy.effective_until else None
            })
        
        return jsonify({'success': True, 'policies': result})
    except Exception as e:
        print(f"Error loading policies: {e}")
        return jsonify({'success': False, 'message': 'Error loading policies'}), 500


@mnc_bp.route('/api/mnc/vaccination-policies', methods=['POST'])
@login_required
def api_create_vaccination_policy():
    """Create a new vaccination policy"""
    if current_user.user_type != 'mnc':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    try:
        data = request.get_json()
        
        # Validate required fields
        required = ['policy_name', 'vaccine_name', 'required_doses', 'effective_from']
        for field in required:
            if not data.get(field):
                return jsonify({'success': False, 'message': f'{field} is required'}), 400
        
        policy = MNCVaccinationPolicy(
            mnc_id=current_user.id,
            policy_name=data['policy_name'],
            policy_description=data.get('policy_description'),
            vaccine_name=data['vaccine_name'],
            vaccine_category=data.get('vaccine_category'),
            is_mandatory=data.get('is_mandatory', True),
            priority_level=data.get('priority_level', 'Medium'),
            applies_to_all=data.get('applies_to_all', True),
            specific_departments=json.dumps(data.get('specific_departments', [])),
            specific_roles=json.dumps(data.get('specific_roles', [])),
            required_doses=data['required_doses'],
            booster_required=data.get('booster_required', False),
            booster_frequency_months=data.get('booster_frequency_months'),
            compliance_deadline=datetime.strptime(data['compliance_deadline'], '%Y-%m-%d').date() if data.get('compliance_deadline') else None,
            grace_period_days=data.get('grace_period_days', 0),
            allow_medical_exemption=data.get('allow_medical_exemption', True),
            allow_religious_exemption=data.get('allow_religious_exemption', False),
            exemption_requires_documentation=data.get('exemption_requires_documentation', True),
            enforcement_action=data.get('enforcement_action'),
            notification_before_days=data.get('notification_before_days', 30),
            effective_from=datetime.strptime(data['effective_from'], '%Y-%m-%d').date(),
            effective_until=datetime.strptime(data['effective_until'], '%Y-%m-%d').date() if data.get('effective_until') else None,
            created_by_id=current_user.id
        )
        
        db.session.add(policy)
        db.session.commit()
        
        # Calculate compliance for all employees
        calculate_compliance_for_policy(policy.id)
        
        log_mnc_audit('create_vaccination_policy', resource_type='policy', resource_id=policy.id, status='Success')
        
        return jsonify({
            'success': True,
            'message': 'Vaccination policy created successfully',
            'policy_id': policy.id
        })
    except Exception as e:
        db.session.rollback()
        print(f"Error creating policy: {e}")
        return jsonify({'success': False, 'message': f'Error creating policy: {str(e)}'}), 500


@mnc_bp.route('/api/mnc/vaccination-policies/<int:policy_id>', methods=['GET'])
@login_required
def api_get_vaccination_policy(policy_id):
    """Get a single vaccination policy by id"""
    if current_user.user_type != 'mnc':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403

    try:
        policy = MNCVaccinationPolicy.query.filter_by(id=policy_id, mnc_id=current_user.id, is_active=True).first()
        if not policy:
            return jsonify({'success': False, 'message': 'Policy not found'}), 404

        result = {
            'id': policy.id,
            'policy_name': policy.policy_name,
            'policy_description': policy.policy_description,
            'vaccine_name': policy.vaccine_name,
            'vaccine_category': policy.vaccine_category,
            'is_mandatory': policy.is_mandatory,
            'priority_level': policy.priority_level,
            'applies_to_all': policy.applies_to_all,
            'specific_departments': json.loads(policy.specific_departments) if policy.specific_departments else [],
            'specific_roles': json.loads(policy.specific_roles) if policy.specific_roles else [],
            'required_doses': policy.required_doses,
            'booster_required': policy.booster_required,
            'booster_frequency_months': policy.booster_frequency_months,
            'compliance_deadline': policy.compliance_deadline.strftime('%Y-%m-%d') if policy.compliance_deadline else None,
            'effective_from': policy.effective_from.strftime('%Y-%m-%d') if policy.effective_from else None,
            'effective_until': policy.effective_until.strftime('%Y-%m-%d') if policy.effective_until else None,
            'grace_period_days': policy.grace_period_days,
            'allow_medical_exemption': policy.allow_medical_exemption,
            'allow_religious_exemption': policy.allow_religious_exemption,
            'exemption_requires_documentation': policy.exemption_requires_documentation,
            'enforcement_action': policy.enforcement_action,
            'notification_before_days': policy.notification_before_days
        }

        return jsonify({'success': True, 'policy': result})
    except Exception as e:
        print(f"Error loading policy {policy_id}: {e}")
        return jsonify({'success': False, 'message': 'Error loading policy'}), 500


@mnc_bp.route('/api/mnc/vaccination-policies/<int:policy_id>', methods=['PUT'])
@login_required
def api_update_vaccination_policy(policy_id):
    """Update an existing vaccination policy"""
    if current_user.user_type != 'mnc':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403

    try:
        policy = MNCVaccinationPolicy.query.filter_by(id=policy_id, mnc_id=current_user.id, is_active=True).first()
        if not policy:
            return jsonify({'success': False, 'message': 'Policy not found'}), 404

        data = request.get_json()

        # Update allowed fields
        for field in ['policy_name', 'policy_description', 'vaccine_name', 'vaccine_category', 'is_mandatory',
                      'priority_level', 'applies_to_all', 'required_doses', 'booster_required',
                      'booster_frequency_months', 'grace_period_days', 'allow_medical_exemption',
                      'allow_religious_exemption', 'exemption_requires_documentation', 'enforcement_action',
                      'notification_before_days']:
            if field in data:
                setattr(policy, field, data.get(field))

        # JSON fields
        if 'specific_departments' in data:
            policy.specific_departments = json.dumps(data.get('specific_departments', []))
        if 'specific_roles' in data:
            policy.specific_roles = json.dumps(data.get('specific_roles', []))

        # Dates
        if data.get('compliance_deadline') is not None:
            policy.compliance_deadline = datetime.strptime(data['compliance_deadline'], '%Y-%m-%d').date() if data['compliance_deadline'] else None
        if data.get('effective_from'):
            policy.effective_from = datetime.strptime(data['effective_from'], '%Y-%m-%d').date()
        if data.get('effective_until') is not None:
            policy.effective_until = datetime.strptime(data['effective_until'], '%Y-%m-%d').date() if data['effective_until'] else None

        policy.updated_by_id = current_user.id
        policy.updated_at = datetime.utcnow()

        db.session.commit()

        # Recalculate compliance for this policy
        calculate_compliance_for_policy(policy.id)

        # Regenerate alerts to reflect updated requirements and due dates
        generate_vaccination_alerts(current_user.id)

        log_mnc_audit('update_vaccination_policy', resource_type='policy', resource_id=policy.id, status='Success')

        return jsonify({'success': True, 'message': 'Vaccination policy updated successfully'})
    except Exception as e:
        db.session.rollback()
        print(f"Error updating policy {policy_id}: {e}")
        return jsonify({'success': False, 'message': f'Error updating policy: {str(e)}'}), 500


@mnc_bp.route('/api/mnc/vaccination-policies/<int:policy_id>', methods=['DELETE'])
@login_required
def api_delete_vaccination_policy(policy_id):
    """Soft-delete (deactivate) a vaccination policy"""
    if current_user.user_type != 'mnc':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403

    try:
        policy = MNCVaccinationPolicy.query.filter_by(id=policy_id, mnc_id=current_user.id, is_active=True).first()
        if not policy:
            return jsonify({'success': False, 'message': 'Policy not found'}), 404

        # Soft delete
        policy.is_active = False
        policy.updated_by_id = current_user.id
        policy.updated_at = datetime.utcnow()

        # Remove compliance records for this policy since it's no longer active
        if EmployeeVaccinationCompliance:
            EmployeeVaccinationCompliance.query.filter_by(policy_id=policy.id).delete()

        # Remove alerts related to this policy
        if VaccinationAlert:
            VaccinationAlert.query.filter_by(policy_id=policy_id).delete()

        db.session.commit()

        # Recalculate compliance for remaining active policies since this policy was removed
        active_policies = MNCVaccinationPolicy.query.filter_by(mnc_id=current_user.id, is_active=True).all()
        for p in active_policies:
            calculate_compliance_for_policy(p.id)

        # Regenerate alerts for remaining policies
        generate_vaccination_alerts(current_user.id)

        log_mnc_audit('delete_vaccination_policy', resource_type='policy', resource_id=policy.id, status='Success')

        return jsonify({'success': True, 'message': 'Vaccination policy deleted'})
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting policy {policy_id}: {e}")
        return jsonify({'success': False, 'message': f'Error deleting policy: {str(e)}'}), 500


@mnc_bp.route('/api/mnc/vaccination-compliance')
@login_required
def api_get_vaccination_compliance():
    """Get vaccination compliance dashboard data"""
    if current_user.user_type != 'mnc':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    try:
        # Get all employees
        employees = MNCEmployee.query.filter_by(
            mnc_id=current_user.id,
            verification_status='Verified'
        ).all()
        
        # Get all active policies
        policies = MNCVaccinationPolicy.query.filter_by(
            mnc_id=current_user.id,
            is_active=True
        ).all()
        
        # Calculate overall compliance
        total_employees = len(employees)
        fully_compliant = 0
        partially_compliant = 0
        non_compliant = 0
        exempted = 0
        
        employee_compliance_data = []
        
        for emp in employees:
            # Get compliance records for this employee - ONLY for active policies
            active_policy_ids = [p.id for p in policies]
            compliance_records = EmployeeVaccinationCompliance.query.filter(
                EmployeeVaccinationCompliance.employee_id == emp.id,
                EmployeeVaccinationCompliance.policy_id.in_(active_policy_ids)
            ).all() if active_policy_ids else []
            
            # Determine applicable policies for this employee
            total_policies = len([p for p in policies if is_policy_applicable(p, emp)])
            
            if not compliance_records or total_policies == 0:
                if total_policies > 0:
                    non_compliant += 1
                    employee_compliance_data.append({
                        'employee_id': emp.id,
                        'employee_name': emp.full_name,
                        'department': emp.department,
                        'compliance_percentage': 0,
                        'compliant_policies': 0,
                        'total_policies': total_policies,
                        'has_exemption': False,
                        'overdue_vaccinations': 0
                    })
                continue
            
            # Check if employee has exemptions
            if any(c.has_exemption for c in compliance_records):
                exempted += 1
                continue
            
            # Count compliance statuses
            compliant_count = sum(1 for c in compliance_records if c.compliance_status == 'Compliant')
            overdue_count = sum(1 for c in compliance_records if c.is_overdue)
            
            if compliant_count == total_policies and total_policies > 0:
                fully_compliant += 1
            elif compliant_count > 0:
                partially_compliant += 1
            else:
                non_compliant += 1
            
            # Build employee compliance detail
            employee_compliance_data.append({
                'employee_id': emp.id,
                'employee_name': emp.full_name,
                'department': emp.department,
                'compliance_percentage': round((compliant_count / total_policies * 100), 1) if total_policies > 0 else 0,
                'compliant_policies': compliant_count,
                'total_policies': total_policies,
                'has_exemption': any(c.has_exemption for c in compliance_records),
                'overdue_vaccinations': overdue_count
            })
        
        # Get recent alerts
        alerts = VaccinationAlert.query.filter_by(
            mnc_id=current_user.id,
            is_active=True,
            is_resolved=False
        ).order_by(VaccinationAlert.created_at.desc()).limit(10).all()
        
        alert_data = []
        for alert in alerts:
            alert_data.append({
                'id': alert.id,
                'employee_name': alert.employee.full_name,
                'vaccine_name': alert.vaccine_name,
                'alert_type': alert.alert_type,
                'severity': alert.severity,
                'message': alert.alert_message,
                'due_date': alert.due_date.strftime('%Y-%m-%d') if alert.due_date else None,
                'days_overdue': alert.days_overdue
            })
        
        return jsonify({
            'success': True,
            'compliance_summary': {
                'total_employees': total_employees,
                'fully_compliant': fully_compliant,
                'partially_compliant': partially_compliant,
                'non_compliant': non_compliant,
                'exempted': exempted,
                'compliance_rate': round((fully_compliant / total_employees * 100), 1) if total_employees > 0 else 0
            },
            'employee_compliance': employee_compliance_data,
            'recent_alerts': alert_data,
            'total_policies': len(policies)
        })
    except Exception as e:
        print(f"Error loading compliance data: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': f'Error loading compliance data: {str(e)}'}), 500


@mnc_bp.route('/api/mnc/vaccination-compliance/<int:employee_id>')
@login_required
def api_get_employee_vaccination_compliance(employee_id):
    """Get detailed vaccination compliance for a specific employee"""
    if current_user.user_type != 'mnc':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    try:
        # Verify employee belongs to this MNC
        employee = MNCEmployee.query.filter_by(
            id=employee_id,
            mnc_id=current_user.id
        ).first_or_404()
        
        # Get all active policies for this MNC
        active_policies = MNCVaccinationPolicy.query.filter_by(
            mnc_id=current_user.id,
            is_active=True
        ).all()
        active_policy_ids = [p.id for p in active_policies]
        
        # Get compliance records ONLY for active policies
        compliance_records = EmployeeVaccinationCompliance.query.filter(
            EmployeeVaccinationCompliance.employee_id == employee_id,
            EmployeeVaccinationCompliance.policy_id.in_(active_policy_ids)
        ).all() if active_policy_ids else []
        
        compliance_details = []
        for record in compliance_records:
            policy = record.policy
            # Double check policy is active
            if not policy.is_active:
                continue
            compliance_details.append({
                'policy_id': policy.id,
                'vaccine_name': policy.vaccine_name,
                'vaccine_category': policy.vaccine_category,
                'is_mandatory': policy.is_mandatory,
                'compliance_status': record.compliance_status,
                'doses_completed': record.doses_completed,
                'doses_required': record.doses_required,
                'last_dose_date': record.last_dose_date.strftime('%Y-%m-%d') if record.last_dose_date else None,
                'next_dose_due_date': record.next_dose_due_date.strftime('%Y-%m-%d') if record.next_dose_due_date else None,
                'booster_due_date': record.booster_due_date.strftime('%Y-%m-%d') if record.booster_due_date else None,
                'is_overdue': record.is_overdue,
                'days_until_due': record.days_until_due,
                'has_exemption': record.has_exemption,
                'exemption_type': record.exemption_type,
                'action_required': record.action_required,
                'action_description': record.action_description
            })
        
        # Get employee's actual vaccination records
        if employee.client_id:
            vaccinations = Vaccination.query.filter_by(
                user_id=employee.client_id
            ).order_by(Vaccination.vaccination_date.desc()).all()
            
            vaccination_history = []
            for vac in vaccinations:
                vaccination_history.append({
                    'vaccine_name': vac.vaccine_name,
                    'category': vac.category,
                    'dose_number': vac.dose_number,
                    'vaccination_date': vac.vaccination_date.strftime('%Y-%m-%d'),
                    'next_due_date': vac.next_due_date.strftime('%Y-%m-%d') if vac.next_due_date else None,
                    'status': vac.status
                })
        else:
            vaccination_history = []
        
        return jsonify({
            'success': True,
            'employee': {
                'id': employee.id,
                'name': employee.full_name,
                'department': employee.department,
                'job_role': employee.job_role
            },
            'compliance_details': compliance_details,
            'vaccination_history': vaccination_history
        })
    except Exception as e:
        print(f"Error loading employee compliance: {e}")
        return jsonify({'success': False, 'message': 'Error loading compliance details'}), 500


@mnc_bp.route('/api/mnc/vaccination-compliance/calculate', methods=['POST'])
@login_required
def api_calculate_all_compliance():
    """Recalculate vaccination compliance for all employees"""
    if current_user.user_type != 'mnc':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    try:
        employees = MNCEmployee.query.filter_by(
            mnc_id=current_user.id,
            verification_status='Verified'
        ).all()
        
        policies = MNCVaccinationPolicy.query.filter_by(
            mnc_id=current_user.id,
            is_active=True
        ).all()
        
        updated_count = 0
        for employee in employees:
            for policy in policies:
                if is_policy_applicable(policy, employee):
                    update_employee_compliance(employee, policy)
                    updated_count += 1
        
        # Generate new alerts
        generate_vaccination_alerts(current_user.id)
        
        return jsonify({
            'success': True,
            'message': f'Compliance recalculated for {len(employees)} employees across {len(policies)} policies',
            'records_updated': updated_count
        })
    except Exception as e:
        print(f"Error calculating compliance: {e}")
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500


# ==================== HELPER FUNCTIONS ====================

def is_policy_applicable(policy, employee):
    """Check if a vaccination policy applies to an employee"""
    if policy.applies_to_all:
        return True
    
    # Check department-specific policies
    if policy.specific_departments:
        departments = json.loads(policy.specific_departments)
        if employee.department in departments:
            return True
    
    # Check role-specific policies
    if policy.specific_roles:
        roles = json.loads(policy.specific_roles)
        if employee.job_role in roles:
            return True
    
    return False


def calculate_compliance_for_policy(policy_id):
    """Calculate compliance for all applicable employees for a specific policy"""
    policy = MNCVaccinationPolicy.query.get(policy_id)
    if not policy:
        return
    
    employees = MNCEmployee.query.filter_by(
        mnc_id=policy.mnc_id,
        verification_status='Verified'
    ).all()
    
    for employee in employees:
        if is_policy_applicable(policy, employee):
            update_employee_compliance(employee, policy)


def update_employee_compliance(employee, policy):
    """Update or create compliance record for an employee and policy"""
    try:
        # Check if compliance record exists
        compliance = EmployeeVaccinationCompliance.query.filter_by(
            employee_id=employee.id,
            policy_id=policy.id
        ).first()
        
        # Get employee's vaccination records from system
        doses_completed = 0
        last_dose_date = None
        next_dose_due = None
        
        if employee.client_id:
            vaccinations = Vaccination.query.filter_by(
                user_id=employee.client_id
            ).filter(
                Vaccination.vaccine_name.ilike(f'%{policy.vaccine_name}%')
            ).order_by(Vaccination.vaccination_date.desc()).all()
            
            doses_completed = len([v for v in vaccinations if v.status == 'Completed'])
            if vaccinations:
                last_dose_date = vaccinations[0].vaccination_date
                if vaccinations[0].next_due_date:
                    next_dose_due = vaccinations[0].next_due_date
        
        # Also check MNC-uploaded verified records
        mnc_records = MNCVaccinationRecord.query.filter_by(
            employee_id=employee.id,
            verification_status='Verified'
        ).filter(
            MNCVaccinationRecord.vaccine_name.ilike(f'%{policy.vaccine_name}%')
        ).order_by(MNCVaccinationRecord.vaccination_date.desc()).all()
        
        if mnc_records:
            doses_completed += len(mnc_records)
            # Use the most recent date between system and MNC records
            if mnc_records[0].vaccination_date:
                if not last_dose_date or mnc_records[0].vaccination_date > last_dose_date:
                    last_dose_date = mnc_records[0].vaccination_date
            if mnc_records[0].next_dose_due:
                if not next_dose_due or mnc_records[0].next_dose_due < next_dose_due:
                    next_dose_due = mnc_records[0].next_dose_due
        
        # Determine compliance status
        compliance_status = 'Non-Compliant'
        if doses_completed >= policy.required_doses:
            compliance_status = 'Compliant'
        elif doses_completed > 0:
            compliance_status = 'Partially Compliant'
        
        # Check if overdue
        is_overdue = False
        days_until_due = None
        if next_dose_due:
            days_until_due = (next_dose_due - date.today()).days
            is_overdue = days_until_due < 0
        elif policy.compliance_deadline:
            days_until_due = (policy.compliance_deadline - date.today()).days
            is_overdue = days_until_due < 0 and compliance_status != 'Compliant'
        
        if compliance:
            # Update existing record
            compliance.compliance_status = compliance_status
            compliance.doses_completed = doses_completed
            compliance.doses_required = policy.required_doses
            compliance.last_dose_date = last_dose_date
            compliance.next_dose_due_date = next_dose_due
            compliance.is_overdue = is_overdue
            compliance.days_until_due = days_until_due
            compliance.last_checked_at = datetime.utcnow()
            compliance.updated_at = datetime.utcnow()
        else:
            # Create new record
            compliance = EmployeeVaccinationCompliance(
                employee_id=employee.id,
                policy_id=policy.id,
                compliance_status=compliance_status,
                doses_completed=doses_completed,
                doses_required=policy.required_doses,
                last_dose_date=last_dose_date,
                next_dose_due_date=next_dose_due,
                is_overdue=is_overdue,
                days_until_due=days_until_due,
                last_checked_at=datetime.utcnow()
            )
            db.session.add(compliance)
        
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Error updating compliance: {e}")


def generate_vaccination_alerts(mnc_id):
    """Generate alerts for due/overdue vaccinations"""
    try:
        # Get all non-compliant records
        compliance_records = EmployeeVaccinationCompliance.query.join(MNCEmployee).filter(
            MNCEmployee.mnc_id == mnc_id,
            EmployeeVaccinationCompliance.compliance_status.in_(['Non-Compliant', 'Partially Compliant']),
            EmployeeVaccinationCompliance.has_exemption == False
        ).all()
        
        for record in compliance_records:
            # Check if alert already exists
            existing_alert = VaccinationAlert.query.filter_by(
                compliance_id=record.id,
                is_active=True,
                is_resolved=False
            ).first()
            
            if existing_alert:
                continue  # Skip if alert already exists
            
            # Determine alert type and severity
            alert_type = 'Due Soon'
            severity = 'Info'
            message = f"{record.employee.full_name} needs to complete {record.policy.vaccine_name} vaccination"
            
            if record.is_overdue:
                alert_type = 'Overdue'
                severity = 'Critical'
                message = f"{record.employee.full_name} is overdue for {record.policy.vaccine_name} vaccination"
            elif record.days_until_due and record.days_until_due <= 7:
                severity = 'Warning'
                message = f"{record.employee.full_name}'s {record.policy.vaccine_name} vaccination is due in {record.days_until_due} days"
            elif record.days_until_due and record.days_until_due <= 30:
                severity = 'Info'
            
            # Create alert
            alert = VaccinationAlert(
                mnc_id=mnc_id,
                employee_id=record.employee_id,
                compliance_id=record.id,
                alert_type=alert_type,
                severity=severity,
                vaccine_name=record.policy.vaccine_name,
                alert_message=message,
                due_date=record.next_dose_due_date,
                days_overdue=abs(record.days_until_due) if record.is_overdue and record.days_until_due else None
            )
            db.session.add(alert)
        
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Error generating alerts: {e}")


# ==================== MNC VACCINATION RECORD UPLOAD ====================

@mnc_bp.route('/api/mnc/employees/<int:employee_id>/upload-vaccination', methods=['POST'])
@login_required
def upload_employee_vaccination(employee_id):
    """MNC uploads vaccination record on behalf of employee"""
    if current_user.user_type != 'mnc':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    try:
        # Verify employee belongs to this MNC
        employee = MNCEmployee.query.filter_by(
            id=employee_id,
            mnc_id=current_user.id
        ).first()
        
        if not employee:
            return jsonify({'success': False, 'message': 'Employee not found'}), 404
        
        # Get form data
        vaccine_name = request.form.get('vaccine_name')
        vaccination_date = request.form.get('vaccination_date')
        dose_number = request.form.get('dose_number', type=int)
        
        if not vaccine_name or not vaccination_date or not dose_number:
            return jsonify({'success': False, 'message': 'Missing required fields'}), 400
        
        # Handle file upload
        document_path = None
        document_filename = None
        if 'vaccination_document' in request.files:
            file = request.files['vaccination_document']
            if file and file.filename:
                import os
                from werkzeug.utils import secure_filename
                
                filename = secure_filename(file.filename)
                upload_folder = os.path.join('uploads', 'vaccination_records')
                os.makedirs(upload_folder, exist_ok=True)
                
                # Create unique filename
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                unique_filename = f"{employee_id}_{timestamp}_{filename}"
                file_path = os.path.join(upload_folder, unique_filename)
                
                file.save(file_path)
                document_path = file_path
                document_filename = filename
        
        # Create vaccination record
        vaccination_record = MNCVaccinationRecord(
            mnc_id=current_user.id,
            employee_id=employee_id,
            policy_id=request.form.get('policy_id', type=int) if request.form.get('policy_id') else None,
            vaccine_name=vaccine_name,
            vaccine_category=request.form.get('vaccine_category'),
            manufacturer=request.form.get('manufacturer'),
            batch_number=request.form.get('batch_number'),
            dose_number=dose_number,
            vaccination_date=datetime.strptime(vaccination_date, '%Y-%m-%d').date(),
            next_dose_due=datetime.strptime(request.form.get('next_dose_due'), '%Y-%m-%d').date() if request.form.get('next_dose_due') else None,
            administered_at=request.form.get('administered_at'),
            administered_by=request.form.get('administered_by'),
            document_path=document_path,
            document_filename=document_filename,
            verification_status='Pending',
            uploaded_by_id=current_user.id,
            upload_source='MNC',
            notes=request.form.get('notes')
        )
        
        db.session.add(vaccination_record)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Vaccination record uploaded successfully',
            'record_id': vaccination_record.id
        })
        
    except Exception as e:
        db.session.rollback()
        print(f"Error uploading vaccination record: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@mnc_bp.route('/api/mnc/vaccination-records/<int:record_id>/download')
@login_required
def download_vaccination_document(record_id):
    """Download vaccination document"""
    if current_user.user_type != 'mnc':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    try:
        record = MNCVaccinationRecord.query.filter_by(
            id=record_id,
            mnc_id=current_user.id
        ).first()
        
        if not record or not record.document_path:
            return jsonify({'success': False, 'message': 'Document not found'}), 404
        
        import os
        from flask import send_file
        
        # Check if file exists
        if not os.path.exists(record.document_path):
            return jsonify({'success': False, 'message': 'Document file not found on server'}), 404
        
        return send_file(
            record.document_path,
            as_attachment=True,
            download_name=record.document_filename or 'vaccination_document'
        )
        
    except Exception as e:
        print(f"Error downloading document: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@mnc_bp.route('/api/mnc/vaccination-records/pending')
@login_required
def get_pending_vaccination_records():
    """Get all pending verification records for MNC"""
    if current_user.user_type != 'mnc':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    try:
        pending_records = MNCVaccinationRecord.query.join(
            MNCEmployee, MNCVaccinationRecord.employee_id == MNCEmployee.id
        ).filter(
            MNCVaccinationRecord.mnc_id == current_user.id,
            MNCVaccinationRecord.verification_status == 'Pending'
        ).order_by(MNCVaccinationRecord.created_at.desc()).all()
        
        records_data = []
        for record in pending_records:
            # Calculate time ago
            time_diff = datetime.utcnow() - record.created_at
            if time_diff.days > 0:
                uploaded_ago = f"{time_diff.days} day{'s' if time_diff.days > 1 else ''} ago"
            else:
                hours = time_diff.seconds // 3600
                uploaded_ago = f"{hours} hour{'s' if hours != 1 else ''} ago"
            
            records_data.append({
                'id': record.id,
                'employee_id': record.employee_id,
                'employee_name': record.employee.full_name,
                'vaccine_name': record.vaccine_name,
                'vaccination_date': record.vaccination_date.isoformat(),
                'dose_number': record.dose_number,
                'uploaded_ago': uploaded_ago,
                'document_filename': record.document_filename,
                'has_document': bool(record.document_path),
                'document_path': record.document_path
            })
        
        return jsonify({
            'success': True,
            'pending_records': records_data
        })
        
    except Exception as e:
        print(f"Error fetching pending records: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@mnc_bp.route('/api/mnc/vaccination-records/<int:employee_id>')
@login_required
def get_employee_vaccination_records(employee_id):
    """Get all vaccination records for an employee (both system and MNC-uploaded)"""
    if current_user.user_type != 'mnc':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    try:
        employee = MNCEmployee.query.filter_by(
            id=employee_id,
            mnc_id=current_user.id
        ).first()
        
        if not employee:
            return jsonify({'success': False, 'message': 'Employee not found'}), 404
        
        # Get MNC-uploaded records
        mnc_records = MNCVaccinationRecord.query.filter_by(
            employee_id=employee_id
        ).order_by(MNCVaccinationRecord.vaccination_date.desc()).all()
        
        records_data = []
        for record in mnc_records:
            records_data.append({
                'id': record.id,
                'vaccine_name': record.vaccine_name,
                'vaccine_category': record.vaccine_category,
                'manufacturer': record.manufacturer,
                'batch_number': record.batch_number,
                'dose_number': record.dose_number,
                'vaccination_date': record.vaccination_date.isoformat(),
                'next_dose_due': record.next_dose_due.isoformat() if record.next_dose_due else None,
                'administered_at': record.administered_at,
                'administered_by': record.administered_by,
                'verification_status': record.verification_status,
                'upload_source': record.upload_source,
                'document_filename': record.document_filename,
                'has_document': bool(record.document_path),
                'notes': record.notes,
                'created_at': record.created_at.isoformat()
            })
        
        # Get system vaccination records if employee is linked
        system_records = []
        if employee.client_id:
            vaccinations = Vaccination.query.filter_by(
                user_id=employee.client_id
            ).order_by(Vaccination.vaccination_date.desc()).all()
            
            for vac in vaccinations:
                system_records.append({
                    'vaccine_name': vac.vaccine_name,
                    'dose_number': vac.dose_number,
                    'vaccination_date': vac.vaccination_date.isoformat(),
                    'hospital_clinic_name': vac.hospital_clinic_name,
                    'status': vac.status,
                    'source': 'Employee System'
                })
        
        return jsonify({
            'success': True,
            'mnc_uploaded_records': records_data,
            'system_records': system_records
        })
        
    except Exception as e:
        print(f"Error fetching vaccination records: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@mnc_bp.route('/api/mnc/vaccination-records/<int:record_id>/verify', methods=['POST'])
@login_required
def verify_vaccination_record(record_id):
    """Verify or reject an uploaded vaccination record"""
    if current_user.user_type != 'mnc':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    try:
        data = request.get_json()
        action = data.get('action')  # 'verify' or 'reject'
        notes = data.get('notes', '')
        
        record = MNCVaccinationRecord.query.get(record_id)
        if not record or record.mnc_id != current_user.id:
            return jsonify({'success': False, 'message': 'Record not found'}), 404
        
        if action == 'verify':
            record.verification_status = 'Verified'
        elif action == 'reject':
            record.verification_status = 'Rejected'
        else:
            return jsonify({'success': False, 'message': 'Invalid action'}), 400
        
        record.verified_by_id = current_user.id
        record.verified_at = datetime.utcnow()
        record.verification_notes = notes
        
        db.session.commit()
        
        # Recalculate compliance if verified
        if action == 'verify':
            update_employee_compliance(record.employee_id, current_user.id)
        
        return jsonify({
            'success': True,
            'message': f'Record {action}ed successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        print(f"Error verifying record: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500
