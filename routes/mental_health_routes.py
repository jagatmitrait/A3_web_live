"""
Mental Health Blueprint - Routes for Client Mental Wellness Dashboard
Handles mood tracking, assessments, sleep, journaling, and mindfulness
"""
from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from datetime import datetime, date, timedelta
from sqlalchemy import func

# Blueprint definition
mental_health_bp = Blueprint('mental_health', __name__)

# Models and database - will be initialized from app.py
db = None
User = None
MentalHealthMood = None
MentalHealthAssessment = None
MentalHealthSleep = None
MentalHealthJournal = None
MentalHealthMindfulness = None


def init_blueprint(database, models):
    """Initialize blueprint with database and models"""
    global db, User, MentalHealthMood, MentalHealthAssessment
    global MentalHealthSleep, MentalHealthJournal, MentalHealthMindfulness
    
    db = database
    User = models.get('User')
    MentalHealthMood = models.get('MentalHealthMood')
    MentalHealthAssessment = models.get('MentalHealthAssessment')
    MentalHealthSleep = models.get('MentalHealthSleep')
    MentalHealthJournal = models.get('MentalHealthJournal')
    MentalHealthMindfulness = models.get('MentalHealthMindfulness')


# ==================== DASHBOARD STATS ====================

@mental_health_bp.route('/api/client/mental-health/stats')
@login_required
def api_mental_health_stats():
    """Get mental health dashboard statistics"""
    try:
        user_id = current_user.id
        today = date.today()
        week_ago = today - timedelta(days=7)
        month_start = today.replace(day=1)
        
        # Calculate current mood score (7-day average)
        recent_moods = MentalHealthMood.query.filter(
            MentalHealthMood.user_id == user_id,
            MentalHealthMood.date >= week_ago
        ).all()
        
        if recent_moods:
            mood_scores = [m.mood_score for m in recent_moods if m.mood_score]
            current_mood = round(sum(mood_scores) / len(mood_scores), 1) if mood_scores else 0
        else:
            current_mood = 0
        
        # Calculate tracking streak (consecutive days with mood entries)
        streak = 0
        check_date = today
        while True:
            entry = MentalHealthMood.query.filter(
                MentalHealthMood.user_id == user_id,
                MentalHealthMood.date == check_date
            ).first()
            if entry:
                streak += 1
                check_date -= timedelta(days=1)
            else:
                break
        
        # Count assessments completed this month
        assessments_count = MentalHealthAssessment.query.filter(
            MentalHealthAssessment.user_id == user_id,
            MentalHealthAssessment.date >= month_start
        ).count()
        
        # Calculate mindfulness minutes this week
        mindfulness_sessions = MentalHealthMindfulness.query.filter(
            MentalHealthMindfulness.user_id == user_id,
            MentalHealthMindfulness.date >= week_ago,
            MentalHealthMindfulness.completed == True
        ).all()
        
        mindfulness_minutes = sum(
            (s.duration_seconds or 0) for s in mindfulness_sessions
        ) // 60
        
        # Get last entry dates
        last_mood = MentalHealthMood.query.filter_by(user_id=user_id).order_by(
            MentalHealthMood.created_at.desc()
        ).first()
        
        last_assessment = MentalHealthAssessment.query.filter_by(user_id=user_id).order_by(
            MentalHealthAssessment.created_at.desc()
        ).first()
        
        last_sleep = MentalHealthSleep.query.filter_by(user_id=user_id).order_by(
            MentalHealthSleep.created_at.desc()
        ).first()
        
        # Get total counts
        total_moods = MentalHealthMood.query.filter_by(user_id=user_id).count()
        total_journals = MentalHealthJournal.query.filter_by(user_id=user_id).count()
        total_mindfulness = MentalHealthMindfulness.query.filter_by(user_id=user_id).count()
        
        return jsonify({
            'success': True,
            'stats': {
                'current_mood': current_mood,
                'tracking_streak': streak,
                'assessments_this_month': assessments_count,
                'mindfulness_minutes': mindfulness_minutes,
                'total_mood_entries': total_moods,
                'total_journal_entries': total_journals,
                'total_mindfulness_sessions': total_mindfulness,
                'last_mood_date': last_mood.date.isoformat() if last_mood else None,
                'last_assessment_date': last_assessment.date.isoformat() if last_assessment else None,
                'last_sleep_date': last_sleep.date.isoformat() if last_sleep else None
            }
        })
    except Exception as e:
        print(f"Error getting mental health stats: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== MOOD TRACKING ====================

@mental_health_bp.route('/api/client/mental-health/mood', methods=['POST'])
@login_required
def api_create_mood():
    """Create a new mood entry"""
    try:
        data = request.get_json()
        
        mood_entry = MentalHealthMood(
            user_id=current_user.id,
            date=datetime.strptime(data.get('date', date.today().isoformat()), '%Y-%m-%d').date(),
            time=datetime.strptime(data.get('time', datetime.now().strftime('%H:%M')), '%H:%M').time(),
            mood_score=data.get('mood_score'),
            quick_mood=data.get('quick_mood'),
            emotions=data.get('emotions', []),
            energy_level=data.get('energy_level'),
            triggers=data.get('triggers', []),
            activities=data.get('activities', []),
            notes=data.get('notes')
        )
        
        db.session.add(mood_entry)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Mood entry saved successfully',
            'mood': mood_entry.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        print(f"Error creating mood entry: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@mental_health_bp.route('/api/client/mental-health/mood', methods=['GET'])
@login_required
def api_get_moods():
    """Get mood entries with optional filters"""
    try:
        days = request.args.get('days', 30, type=int)
        start_date = date.today() - timedelta(days=days)
        
        moods = MentalHealthMood.query.filter(
            MentalHealthMood.user_id == current_user.id,
            MentalHealthMood.date >= start_date
        ).order_by(MentalHealthMood.date.desc(), MentalHealthMood.time.desc()).all()
        
        return jsonify({
            'success': True,
            'moods': [m.to_dict() for m in moods],
            'count': len(moods)
        })
    except Exception as e:
        print(f"Error getting mood entries: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@mental_health_bp.route('/api/client/mental-health/mood/<int:mood_id>', methods=['GET'])
@login_required
def api_get_mood(mood_id):
    """Get a single mood entry"""
    try:
        mood = MentalHealthMood.query.filter_by(
            id=mood_id,
            user_id=current_user.id
        ).first()
        
        if not mood:
            return jsonify({'success': False, 'error': 'Mood entry not found'}), 404
        
        return jsonify({'success': True, 'mood': mood.to_dict()})
    except Exception as e:
        print(f"Error getting mood entry: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@mental_health_bp.route('/api/client/mental-health/mood/<int:mood_id>', methods=['PUT'])
@login_required
def api_update_mood(mood_id):
    """Update a mood entry"""
    try:
        mood = MentalHealthMood.query.filter_by(
            id=mood_id,
            user_id=current_user.id
        ).first()
        
        if not mood:
            return jsonify({'success': False, 'error': 'Mood entry not found'}), 404
        
        data = request.get_json()
        
        if 'mood_score' in data:
            mood.mood_score = data['mood_score']
        if 'quick_mood' in data:
            mood.quick_mood = data['quick_mood']
        if 'emotions' in data:
            mood.emotions = data['emotions']
        if 'energy_level' in data:
            mood.energy_level = data['energy_level']
        if 'triggers' in data:
            mood.triggers = data['triggers']
        if 'activities' in data:
            mood.activities = data['activities']
        if 'notes' in data:
            mood.notes = data['notes']
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Mood entry updated',
            'mood': mood.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        print(f"Error updating mood entry: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@mental_health_bp.route('/api/client/mental-health/mood/<int:mood_id>', methods=['DELETE'])
@login_required
def api_delete_mood(mood_id):
    """Delete a mood entry"""
    try:
        mood = MentalHealthMood.query.filter_by(
            id=mood_id,
            user_id=current_user.id
        ).first()
        
        if not mood:
            return jsonify({'success': False, 'error': 'Mood entry not found'}), 404
        
        db.session.delete(mood)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Mood entry deleted'})
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting mood entry: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== MOOD CHART DATA ====================

@mental_health_bp.route('/api/client/mental-health/mood/chart')
@login_required
def api_mood_chart_data():
    """Get mood data formatted for charts"""
    try:
        days = request.args.get('days', 7, type=int)
        start_date = date.today() - timedelta(days=days)
        
        moods = MentalHealthMood.query.filter(
            MentalHealthMood.user_id == current_user.id,
            MentalHealthMood.date >= start_date
        ).order_by(MentalHealthMood.date).all()
        
        # Group by date and calculate daily average
        daily_data = {}
        for mood in moods:
            date_str = mood.date.isoformat()
            if date_str not in daily_data:
                daily_data[date_str] = {'scores': [], 'energy': []}
            if mood.mood_score:
                daily_data[date_str]['scores'].append(mood.mood_score)
            if mood.energy_level:
                daily_data[date_str]['energy'].append(mood.energy_level)
        
        # Calculate averages
        chart_data = []
        for date_str in sorted(daily_data.keys()):
            data = daily_data[date_str]
            chart_data.append({
                'date': date_str,
                'mood_avg': round(sum(data['scores']) / len(data['scores']), 1) if data['scores'] else None,
                'energy_avg': round(sum(data['energy']) / len(data['energy']), 1) if data['energy'] else None
            })
        
        # Emotion distribution
        all_emotions = []
        for mood in moods:
            if mood.emotions:
                all_emotions.extend(mood.emotions)
        
        emotion_counts = {}
        for emotion in all_emotions:
            emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
        
        return jsonify({
            'success': True,
            'chart_data': chart_data,
            'emotion_distribution': emotion_counts
        })
    except Exception as e:
        print(f"Error getting mood chart data: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== ASSESSMENTS ====================

# Assessment scoring definitions
ASSESSMENT_TYPES = {
    'PHQ-9': {
        'name': 'Patient Health Questionnaire-9',
        'description': 'Screens for depression severity',
        'questions': [
            'Little interest or pleasure in doing things',
            'Feeling down, depressed, or hopeless',
            'Trouble falling/staying asleep, or sleeping too much',
            'Feeling tired or having little energy',
            'Poor appetite or overeating',
            'Feeling bad about yourself — or that you are a failure',
            'Trouble concentrating on things',
            'Moving or speaking slowly, or being fidgety/restless',
            'Thoughts of self-harm or being better off dead'
        ],
        'options': [
            {'value': 0, 'label': 'Not at all'},
            {'value': 1, 'label': 'Several days'},
            {'value': 2, 'label': 'More than half the days'},
            {'value': 3, 'label': 'Nearly every day'}
        ],
        'scoring': [
            {'min': 0, 'max': 4, 'severity': 'Minimal', 'color': '#28a745'},
            {'min': 5, 'max': 9, 'severity': 'Mild', 'color': '#ffc107'},
            {'min': 10, 'max': 14, 'severity': 'Moderate', 'color': '#fd7e14'},
            {'min': 15, 'max': 19, 'severity': 'Moderately Severe', 'color': '#dc3545'},
            {'min': 20, 'max': 27, 'severity': 'Severe', 'color': '#721c24'}
        ],
        'max_score': 27
    },
    'GAD-7': {
        'name': 'Generalized Anxiety Disorder-7',
        'description': 'Screens for anxiety severity',
        'questions': [
            'Feeling nervous, anxious, or on edge',
            'Not being able to stop or control worrying',
            'Worrying too much about different things',
            'Trouble relaxing',
            'Being so restless that it is hard to sit still',
            'Becoming easily annoyed or irritable',
            'Feeling afraid as if something awful might happen'
        ],
        'options': [
            {'value': 0, 'label': 'Not at all'},
            {'value': 1, 'label': 'Several days'},
            {'value': 2, 'label': 'More than half the days'},
            {'value': 3, 'label': 'Nearly every day'}
        ],
        'scoring': [
            {'min': 0, 'max': 4, 'severity': 'Minimal', 'color': '#28a745'},
            {'min': 5, 'max': 9, 'severity': 'Mild', 'color': '#ffc107'},
            {'min': 10, 'max': 14, 'severity': 'Moderate', 'color': '#fd7e14'},
            {'min': 15, 'max': 21, 'severity': 'Severe', 'color': '#dc3545'}
        ],
        'max_score': 21
    }
}


@mental_health_bp.route('/api/client/mental-health/assessments/types')
@login_required
def api_assessment_types():
    """Get available assessment types"""
    return jsonify({
        'success': True,
        'types': ASSESSMENT_TYPES
    })


@mental_health_bp.route('/api/client/mental-health/assessments', methods=['POST'])
@login_required
def api_create_assessment():
    """Create/complete a new assessment"""
    try:
        data = request.get_json()
        assessment_type = data.get('assessment_type')
        answers = data.get('answers', [])
        
        if assessment_type not in ASSESSMENT_TYPES:
            return jsonify({'success': False, 'error': 'Invalid assessment type'}), 400
        
        type_info = ASSESSMENT_TYPES[assessment_type]
        
        # Calculate score
        total_score = sum(answers)
        max_score = type_info['max_score']
        
        # Determine severity
        severity = 'Unknown'
        for tier in type_info['scoring']:
            if tier['min'] <= total_score <= tier['max']:
                severity = tier['severity']
                break
        
        # Create assessment record
        assessment = MentalHealthAssessment(
            user_id=current_user.id,
            date=date.today(),
            assessment_type=assessment_type,
            answers=answers,
            total_score=total_score,
            max_score=max_score,
            severity=severity,
            notes=data.get('notes')
        )
        
        db.session.add(assessment)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Assessment completed',
            'assessment': assessment.to_dict(),
            'interpretation': {
                'score': total_score,
                'max_score': max_score,
                'severity': severity,
                'percentage': round((total_score / max_score) * 100, 1)
            }
        })
    except Exception as e:
        db.session.rollback()
        print(f"Error creating assessment: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@mental_health_bp.route('/api/client/mental-health/assessments', methods=['GET'])
@login_required
def api_get_assessments():
    """Get assessment history"""
    try:
        assessment_type = request.args.get('type')
        days = request.args.get('days', 90, type=int)
        start_date = date.today() - timedelta(days=days)
        
        query = MentalHealthAssessment.query.filter(
            MentalHealthAssessment.user_id == current_user.id,
            MentalHealthAssessment.date >= start_date
        )
        
        if assessment_type:
            query = query.filter(MentalHealthAssessment.assessment_type == assessment_type)
        
        assessments = query.order_by(MentalHealthAssessment.date.desc()).all()
        
        return jsonify({
            'success': True,
            'assessments': [a.to_dict() for a in assessments],
            'count': len(assessments)
        })
    except Exception as e:
        print(f"Error getting assessments: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@mental_health_bp.route('/api/client/mental-health/assessments/<int:assessment_id>', methods=['GET'])
@login_required
def api_get_assessment(assessment_id):
    """Get single assessment with full details"""
    try:
        assessment = MentalHealthAssessment.query.filter_by(
            id=assessment_id,
            user_id=current_user.id
        ).first()
        
        if not assessment:
            return jsonify({'success': False, 'error': 'Assessment not found'}), 404
        
        # Include type info for interpretation
        type_info = ASSESSMENT_TYPES.get(assessment.assessment_type, {})
        
        return jsonify({
            'success': True,
            'assessment': assessment.to_dict(),
            'type_info': type_info
        })
    except Exception as e:
        print(f"Error getting assessment: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@mental_health_bp.route('/api/client/mental-health/assessments/<int:assessment_id>', methods=['DELETE'])
@login_required
def api_delete_assessment(assessment_id):
    """Delete an assessment"""
    try:
        assessment = MentalHealthAssessment.query.filter_by(
            id=assessment_id,
            user_id=current_user.id
        ).first()
        
        if not assessment:
            return jsonify({'success': False, 'error': 'Assessment not found'}), 404
        
        db.session.delete(assessment)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Assessment deleted'})
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting assessment: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@mental_health_bp.route('/api/client/mental-health/assessments/chart')
@login_required
def api_assessment_chart():
    """Get assessment trend data for charts"""
    try:
        assessment_type = request.args.get('type', 'PHQ-9')
        days = request.args.get('days', 90, type=int)
        start_date = date.today() - timedelta(days=days)
        
        assessments = MentalHealthAssessment.query.filter(
            MentalHealthAssessment.user_id == current_user.id,
            MentalHealthAssessment.assessment_type == assessment_type,
            MentalHealthAssessment.date >= start_date
        ).order_by(MentalHealthAssessment.date).all()
        
        chart_data = [{
            'date': a.date.isoformat(),
            'score': a.total_score,
            'severity': a.severity
        } for a in assessments]
        
        return jsonify({
            'success': True,
            'chart_data': chart_data,
            'type': assessment_type
        })
    except Exception as e:
        print(f"Error getting assessment chart: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== SLEEP TRACKING ====================

@mental_health_bp.route('/api/client/mental-health/sleep', methods=['POST'])
@login_required
def api_create_sleep():
    """Log a new sleep entry"""
    try:
        data = request.get_json()
        
        # Parse times
        bedtime = None
        wake_time = None
        if data.get('bedtime'):
            bedtime = datetime.strptime(data['bedtime'], '%H:%M').time()
        if data.get('wake_time'):
            wake_time = datetime.strptime(data['wake_time'], '%H:%M').time()
        
        sleep_entry = MentalHealthSleep(
            user_id=current_user.id,
            date=datetime.strptime(data.get('date', date.today().isoformat()), '%Y-%m-%d').date(),
            bedtime=bedtime,
            wake_time=wake_time,
            total_hours=data.get('total_hours'),
            quality_rating=data.get('quality_rating'),
            awakenings=data.get('awakenings', 0),
            dream_recall=data.get('dream_recall', False),
            sleep_aids=data.get('sleep_aids'),
            pre_sleep_activities=data.get('pre_sleep_activities'),
            morning_alertness=data.get('morning_alertness'),
            notes=data.get('notes')
        )
        
        db.session.add(sleep_entry)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Sleep entry saved',
            'sleep': sleep_entry.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        print(f"Error creating sleep entry: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@mental_health_bp.route('/api/client/mental-health/sleep', methods=['GET'])
@login_required
def api_get_sleep_entries():
    """Get sleep entries with optional filters"""
    try:
        days = request.args.get('days', 30, type=int)
        start_date = date.today() - timedelta(days=days)
        
        entries = MentalHealthSleep.query.filter(
            MentalHealthSleep.user_id == current_user.id,
            MentalHealthSleep.date >= start_date
        ).order_by(MentalHealthSleep.date.desc()).all()
        
        return jsonify({
            'success': True,
            'sleep_entries': [e.to_dict() for e in entries],
            'count': len(entries)
        })
    except Exception as e:
        print(f"Error getting sleep entries: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@mental_health_bp.route('/api/client/mental-health/sleep/<int:sleep_id>', methods=['GET'])
@login_required
def api_get_sleep(sleep_id):
    """Get a single sleep entry"""
    try:
        entry = MentalHealthSleep.query.filter_by(
            id=sleep_id,
            user_id=current_user.id
        ).first()
        
        if not entry:
            return jsonify({'success': False, 'error': 'Sleep entry not found'}), 404
        
        return jsonify({'success': True, 'sleep': entry.to_dict()})
    except Exception as e:
        print(f"Error getting sleep entry: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@mental_health_bp.route('/api/client/mental-health/sleep/<int:sleep_id>', methods=['PUT'])
@login_required
def api_update_sleep(sleep_id):
    """Update a sleep entry"""
    try:
        entry = MentalHealthSleep.query.filter_by(
            id=sleep_id,
            user_id=current_user.id
        ).first()
        
        if not entry:
            return jsonify({'success': False, 'error': 'Sleep entry not found'}), 404
        
        data = request.get_json()
        
        if 'bedtime' in data and data['bedtime']:
            entry.bedtime = datetime.strptime(data['bedtime'], '%H:%M').time()
        if 'wake_time' in data and data['wake_time']:
            entry.wake_time = datetime.strptime(data['wake_time'], '%H:%M').time()
        if 'total_hours' in data:
            entry.total_hours = data['total_hours']
        if 'quality_rating' in data:
            entry.quality_rating = data['quality_rating']
        if 'awakenings' in data:
            entry.awakenings = data['awakenings']
        if 'dream_recall' in data:
            entry.dream_recall = data['dream_recall']
        if 'sleep_aids' in data:
            entry.sleep_aids = data['sleep_aids']
        if 'pre_sleep_activities' in data:
            entry.pre_sleep_activities = data['pre_sleep_activities']
        if 'morning_alertness' in data:
            entry.morning_alertness = data['morning_alertness']
        if 'notes' in data:
            entry.notes = data['notes']
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Sleep entry updated',
            'sleep': entry.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        print(f"Error updating sleep entry: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@mental_health_bp.route('/api/client/mental-health/sleep/<int:sleep_id>', methods=['DELETE'])
@login_required
def api_delete_sleep(sleep_id):
    """Delete a sleep entry"""
    try:
        entry = MentalHealthSleep.query.filter_by(
            id=sleep_id,
            user_id=current_user.id
        ).first()
        
        if not entry:
            return jsonify({'success': False, 'error': 'Sleep entry not found'}), 404
        
        db.session.delete(entry)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Sleep entry deleted'})
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting sleep entry: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@mental_health_bp.route('/api/client/mental-health/sleep/stats')
@login_required
def api_sleep_stats():
    """Get sleep statistics"""
    try:
        days = request.args.get('days', 7, type=int)
        start_date = date.today() - timedelta(days=days)
        
        entries = MentalHealthSleep.query.filter(
            MentalHealthSleep.user_id == current_user.id,
            MentalHealthSleep.date >= start_date
        ).all()
        
        if not entries:
            return jsonify({
                'success': True,
                'stats': {
                    'avg_hours': 0,
                    'avg_quality': 0,
                    'avg_alertness': 0,
                    'total_entries': 0,
                    'best_night': None,
                    'worst_night': None
                }
            })
        
        hours = [e.total_hours for e in entries if e.total_hours]
        quality = [e.quality_rating for e in entries if e.quality_rating]
        alertness = [e.morning_alertness for e in entries if e.morning_alertness]
        
        # Find best and worst nights
        sorted_by_quality = sorted([e for e in entries if e.quality_rating], 
                                   key=lambda x: x.quality_rating, reverse=True)
        
        return jsonify({
            'success': True,
            'stats': {
                'avg_hours': round(sum(hours) / len(hours), 1) if hours else 0,
                'avg_quality': round(sum(quality) / len(quality), 1) if quality else 0,
                'avg_alertness': round(sum(alertness) / len(alertness), 1) if alertness else 0,
                'total_entries': len(entries),
                'best_night': sorted_by_quality[0].to_dict() if sorted_by_quality else None,
                'worst_night': sorted_by_quality[-1].to_dict() if sorted_by_quality else None
            }
        })
    except Exception as e:
        print(f"Error getting sleep stats: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@mental_health_bp.route('/api/client/mental-health/sleep/chart')
@login_required
def api_sleep_chart():
    """Get sleep data for charts"""
    try:
        days = request.args.get('days', 14, type=int)
        start_date = date.today() - timedelta(days=days)
        
        entries = MentalHealthSleep.query.filter(
            MentalHealthSleep.user_id == current_user.id,
            MentalHealthSleep.date >= start_date
        ).order_by(MentalHealthSleep.date).all()
        
        chart_data = [{
            'date': e.date.isoformat(),
            'hours': e.total_hours,
            'quality': e.quality_rating,
            'alertness': e.morning_alertness
        } for e in entries]
        
        return jsonify({
            'success': True,
            'chart_data': chart_data
        })
    except Exception as e:
        print(f"Error getting sleep chart: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@mental_health_bp.route('/api/client/mental-health/sleep/mood-correlation')
@login_required
def api_sleep_mood_correlation():
    """Get sleep-mood correlation data"""
    try:
        days = request.args.get('days', 30, type=int)
        start_date = date.today() - timedelta(days=days)
        
        # Get sleep entries
        sleep_entries = MentalHealthSleep.query.filter(
            MentalHealthSleep.user_id == current_user.id,
            MentalHealthSleep.date >= start_date
        ).all()
        
        # Get mood entries
        mood_entries = MentalHealthMood.query.filter(
            MentalHealthMood.user_id == current_user.id,
            MentalHealthMood.date >= start_date
        ).all()
        
        # Create date-indexed maps
        sleep_by_date = {e.date.isoformat(): e for e in sleep_entries}
        
        # Calculate daily mood averages
        mood_by_date = {}
        for m in mood_entries:
            date_str = m.date.isoformat()
            if date_str not in mood_by_date:
                mood_by_date[date_str] = []
            if m.mood_score:
                mood_by_date[date_str].append(m.mood_score)
        
        mood_avg_by_date = {k: sum(v)/len(v) for k, v in mood_by_date.items() if v}
        
        # Build correlation data
        correlation_data = []
        for date_str, sleep in sleep_by_date.items():
            if date_str in mood_avg_by_date and sleep.total_hours and sleep.quality_rating:
                correlation_data.append({
                    'date': date_str,
                    'sleep_hours': sleep.total_hours,
                    'sleep_quality': sleep.quality_rating,
                    'mood_score': round(mood_avg_by_date[date_str], 1)
                })
        
        # Calculate correlation stats
        if len(correlation_data) >= 3:
            hours = [d['sleep_hours'] for d in correlation_data]
            moods = [d['mood_score'] for d in correlation_data]
            
            # Simple correlation direction
            avg_hours = sum(hours) / len(hours)
            above_avg_sleep = [d for d in correlation_data if d['sleep_hours'] >= avg_hours]
            below_avg_sleep = [d for d in correlation_data if d['sleep_hours'] < avg_hours]
            
            avg_mood_above = sum(d['mood_score'] for d in above_avg_sleep) / len(above_avg_sleep) if above_avg_sleep else 0
            avg_mood_below = sum(d['mood_score'] for d in below_avg_sleep) / len(below_avg_sleep) if below_avg_sleep else 0
            
            insight = None
            if avg_mood_above > avg_mood_below + 0.5:
                insight = "You tend to feel better on days when you sleep more."
            elif avg_mood_below > avg_mood_above + 0.5:
                insight = "Interestingly, you seem to feel better with less sleep."
            else:
                insight = "Your mood appears fairly consistent regardless of sleep duration."
        else:
            insight = "Add more sleep and mood entries to see correlations."
        
        return jsonify({
            'success': True,
            'correlation_data': correlation_data,
            'insight': insight
        })
    except Exception as e:
        print(f"Error getting sleep-mood correlation: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== JOURNALING ====================

JOURNAL_TYPES = {
    'free': {
        'name': 'Free Writing',
        'description': 'Express your thoughts freely',
        'icon': 'fa-pen'
    },
    'gratitude': {
        'name': 'Gratitude Log',
        'description': 'Record things you are thankful for',
        'icon': 'fa-heart'
    },
    'cbt': {
        'name': 'CBT Thought Record',
        'description': 'Challenge negative thoughts with evidence',
        'icon': 'fa-brain'
    }
}


@mental_health_bp.route('/api/client/mental-health/journal/types')
@login_required
def api_journal_types():
    """Get available journal types"""
    return jsonify({
        'success': True,
        'types': JOURNAL_TYPES
    })


@mental_health_bp.route('/api/client/mental-health/journal', methods=['POST'])
@login_required
def api_create_journal():
    """Create a new journal entry"""
    try:
        data = request.get_json()
        journal_type = data.get('journal_type', 'free')
        
        if journal_type not in JOURNAL_TYPES:
            return jsonify({'success': False, 'error': 'Invalid journal type'}), 400
        
        entry = MentalHealthJournal(
            user_id=current_user.id,
            date=datetime.strptime(data.get('date', date.today().isoformat()), '%Y-%m-%d').date(),
            journal_type=journal_type,
            title=data.get('title'),
            content=data.get('content'),
            # CBT fields
            situation=data.get('situation'),
            automatic_thoughts=data.get('automatic_thoughts'),
            emotions_before=data.get('emotions_before'),
            evidence_for=data.get('evidence_for'),
            evidence_against=data.get('evidence_against'),
            balanced_thought=data.get('balanced_thought'),
            emotions_after=data.get('emotions_after'),
            # Gratitude fields
            gratitude_items=data.get('gratitude_items'),
            # Common
            mood_tag=data.get('mood_tag'),
            is_private=data.get('is_private', True)
        )
        
        db.session.add(entry)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Journal entry saved',
            'journal': entry.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        print(f"Error creating journal entry: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@mental_health_bp.route('/api/client/mental-health/journal', methods=['GET'])
@login_required
def api_get_journals():
    """Get journal entries with filters"""
    try:
        days = request.args.get('days', 30, type=int)
        journal_type = request.args.get('type')
        search = request.args.get('search', '').strip()
        start_date = date.today() - timedelta(days=days)
        
        query = MentalHealthJournal.query.filter(
            MentalHealthJournal.user_id == current_user.id,
            MentalHealthJournal.date >= start_date
        )
        
        if journal_type:
            query = query.filter(MentalHealthJournal.journal_type == journal_type)
        
        if search:
            search_filter = f"%{search}%"
            query = query.filter(
                db.or_(
                    MentalHealthJournal.title.ilike(search_filter),
                    MentalHealthJournal.content.ilike(search_filter)
                )
            )
        
        entries = query.order_by(MentalHealthJournal.date.desc(), 
                                  MentalHealthJournal.created_at.desc()).all()
        
        return jsonify({
            'success': True,
            'journals': [e.to_dict() for e in entries],
            'count': len(entries)
        })
    except Exception as e:
        print(f"Error getting journals: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@mental_health_bp.route('/api/client/mental-health/journal/<int:journal_id>', methods=['GET'])
@login_required
def api_get_journal(journal_id):
    """Get a single journal entry"""
    try:
        entry = MentalHealthJournal.query.filter_by(
            id=journal_id,
            user_id=current_user.id
        ).first()
        
        if not entry:
            return jsonify({'success': False, 'error': 'Journal not found'}), 404
        
        return jsonify({'success': True, 'journal': entry.to_dict()})
    except Exception as e:
        print(f"Error getting journal: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@mental_health_bp.route('/api/client/mental-health/journal/<int:journal_id>', methods=['PUT'])
@login_required
def api_update_journal(journal_id):
    """Update a journal entry"""
    try:
        entry = MentalHealthJournal.query.filter_by(
            id=journal_id,
            user_id=current_user.id
        ).first()
        
        if not entry:
            return jsonify({'success': False, 'error': 'Journal not found'}), 404
        
        data = request.get_json()
        
        if 'title' in data:
            entry.title = data['title']
        if 'content' in data:
            entry.content = data['content']
        if 'gratitude_items' in data:
            entry.gratitude_items = data['gratitude_items']
        if 'situation' in data:
            entry.situation = data['situation']
        if 'automatic_thoughts' in data:
            entry.automatic_thoughts = data['automatic_thoughts']
        if 'emotions_before' in data:
            entry.emotions_before = data['emotions_before']
        if 'evidence_for' in data:
            entry.evidence_for = data['evidence_for']
        if 'evidence_against' in data:
            entry.evidence_against = data['evidence_against']
        if 'balanced_thought' in data:
            entry.balanced_thought = data['balanced_thought']
        if 'emotions_after' in data:
            entry.emotions_after = data['emotions_after']
        if 'mood_tag' in data:
            entry.mood_tag = data['mood_tag']
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Journal updated',
            'journal': entry.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        print(f"Error updating journal: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@mental_health_bp.route('/api/client/mental-health/journal/<int:journal_id>', methods=['DELETE'])
@login_required
def api_delete_journal(journal_id):
    """Delete a journal entry"""
    try:
        entry = MentalHealthJournal.query.filter_by(
            id=journal_id,
            user_id=current_user.id
        ).first()
        
        if not entry:
            return jsonify({'success': False, 'error': 'Journal not found'}), 404
        
        db.session.delete(entry)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Journal deleted'})
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting journal: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@mental_health_bp.route('/api/client/mental-health/journal/stats')
@login_required
def api_journal_stats():
    """Get journaling statistics"""
    try:
        days = request.args.get('days', 30, type=int)
        start_date = date.today() - timedelta(days=days)
        
        entries = MentalHealthJournal.query.filter(
            MentalHealthJournal.user_id == current_user.id,
            MentalHealthJournal.date >= start_date
        ).all()
        
        # Count by type
        type_counts = {'free': 0, 'gratitude': 0, 'cbt': 0}
        for entry in entries:
            if entry.journal_type in type_counts:
                type_counts[entry.journal_type] += 1
        
        # Calculate streak
        streak = 0
        check_date = date.today()
        dates_with_entries = set(e.date for e in entries)
        
        while check_date in dates_with_entries:
            streak += 1
            check_date -= timedelta(days=1)
        
        return jsonify({
            'success': True,
            'stats': {
                'total_entries': len(entries),
                'by_type': type_counts,
                'streak': streak,
                'this_week': len([e for e in entries if e.date >= date.today() - timedelta(days=7)])
            }
        })
    except Exception as e:
        print(f"Error getting journal stats: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== MINDFULNESS ====================

MINDFULNESS_EXERCISES = {
    'breathing': {
        'box': {
            'name': 'Box Breathing',
            'description': 'Inhale, hold, exhale, hold - each for 4 seconds',
            'steps': [
                {'action': 'Inhale', 'duration': 4},
                {'action': 'Hold', 'duration': 4},
                {'action': 'Exhale', 'duration': 4},
                {'action': 'Hold', 'duration': 4}
            ],
            'cycles': 4,
            'icon': 'fa-square'
        },
        '478': {
            'name': '4-7-8 Breathing',
            'description': 'Calming breath pattern for relaxation',
            'steps': [
                {'action': 'Inhale', 'duration': 4},
                {'action': 'Hold', 'duration': 7},
                {'action': 'Exhale', 'duration': 8}
            ],
            'cycles': 4,
            'icon': 'fa-wind'
        },
        'diaphragmatic': {
            'name': 'Diaphragmatic Breathing',
            'description': 'Deep belly breathing for stress relief',
            'steps': [
                {'action': 'Inhale deeply', 'duration': 5},
                {'action': 'Exhale slowly', 'duration': 5}
            ],
            'cycles': 6,
            'icon': 'fa-lungs'
        }
    },
    'grounding': {
        '54321': {
            'name': '5-4-3-2-1 Technique',
            'description': 'Ground yourself using your senses',
            'steps': [
                'Notice 5 things you can SEE',
                'Notice 4 things you can TOUCH',
                'Notice 3 things you can HEAR',
                'Notice 2 things you can SMELL',
                'Notice 1 thing you can TASTE'
            ],
            'icon': 'fa-hand-paper'
        },
        'body_scan': {
            'name': 'Body Scan',
            'description': 'Mentally scan your body from head to toe',
            'steps': [
                'Focus on the top of your head',
                'Move attention to your forehead and face',
                'Notice your neck and shoulders',
                'Scan your arms and hands',
                'Feel your chest and upper back',
                'Notice your stomach and lower back',
                'Scan your hips and thighs',
                'Feel your calves, ankles, and feet'
            ],
            'icon': 'fa-user'
        }
    },
    'meditation': {
        'mindful': {
            'name': 'Mindful Meditation',
            'description': 'Focus on the present moment',
            'durations': [5, 10, 15, 20],
            'icon': 'fa-om'
        },
        'loving_kindness': {
            'name': 'Loving Kindness',
            'description': 'Cultivate compassion for yourself and others',
            'durations': [5, 10, 15],
            'icon': 'fa-heart'
        }
    }
}


@mental_health_bp.route('/api/client/mental-health/mindfulness/exercises')
@login_required
def api_mindfulness_exercises():
    """Get available mindfulness exercises"""
    return jsonify({
        'success': True,
        'exercises': MINDFULNESS_EXERCISES
    })


@mental_health_bp.route('/api/client/mental-health/mindfulness', methods=['POST'])
@login_required
def api_log_mindfulness():
    """Log a completed mindfulness session"""
    try:
        data = request.get_json()
        
        session = MentalHealthMindfulness(
            user_id=current_user.id,
            date=date.today(),
            exercise_type=data.get('exercise_type'),  # breathing, grounding, meditation
            exercise_name=data.get('exercise_name'),  # box, 478, 54321, etc.
            duration_seconds=data.get('duration_seconds'),
            completed=data.get('completed', True),
            mood_before=data.get('mood_before'),
            mood_after=data.get('mood_after'),
            notes=data.get('notes')
        )
        
        db.session.add(session)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Session logged',
            'session': session.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        print(f"Error logging mindfulness session: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@mental_health_bp.route('/api/client/mental-health/mindfulness', methods=['GET'])
@login_required
def api_get_mindfulness_sessions():
    """Get mindfulness session history"""
    try:
        days = request.args.get('days', 30, type=int)
        exercise_type = request.args.get('type')
        start_date = date.today() - timedelta(days=days)
        
        query = MentalHealthMindfulness.query.filter(
            MentalHealthMindfulness.user_id == current_user.id,
            MentalHealthMindfulness.date >= start_date
        )
        
        if exercise_type:
            query = query.filter(MentalHealthMindfulness.exercise_type == exercise_type)
        
        sessions = query.order_by(MentalHealthMindfulness.created_at.desc()).all()
        
        return jsonify({
            'success': True,
            'sessions': [s.to_dict() for s in sessions],
            'count': len(sessions)
        })
    except Exception as e:
        print(f"Error getting mindfulness sessions: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@mental_health_bp.route('/api/client/mental-health/mindfulness/<int:session_id>', methods=['DELETE'])
@login_required
def api_delete_mindfulness(session_id):
    """Delete a mindfulness session"""
    try:
        session = MentalHealthMindfulness.query.filter_by(
            id=session_id,
            user_id=current_user.id
        ).first()
        
        if not session:
            return jsonify({'success': False, 'error': 'Session not found'}), 404
        
        db.session.delete(session)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Session deleted'})
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting mindfulness session: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@mental_health_bp.route('/api/client/mental-health/mindfulness/stats')
@login_required
def api_mindfulness_stats():
    """Get mindfulness statistics"""
    try:
        days = request.args.get('days', 30, type=int)
        start_date = date.today() - timedelta(days=days)
        
        sessions = MentalHealthMindfulness.query.filter(
            MentalHealthMindfulness.user_id == current_user.id,
            MentalHealthMindfulness.date >= start_date
        ).all()
        
        # Calculate stats
        total_minutes = sum((s.duration_seconds or 0) for s in sessions) // 60
        type_counts = {'breathing': 0, 'grounding': 0, 'meditation': 0}
        mood_improvements = []
        
        for s in sessions:
            if s.exercise_type in type_counts:
                type_counts[s.exercise_type] += 1
            if s.mood_before and s.mood_after:
                mood_improvements.append(s.mood_after - s.mood_before)
        
        avg_mood_change = round(sum(mood_improvements) / len(mood_improvements), 1) if mood_improvements else 0
        
        # Calculate streak
        streak = 0
        check_date = date.today()
        dates_with_sessions = set(s.date for s in sessions)
        
        while check_date in dates_with_sessions:
            streak += 1
            check_date -= timedelta(days=1)
        
        return jsonify({
            'success': True,
            'stats': {
                'total_sessions': len(sessions),
                'total_minutes': total_minutes,
                'by_type': type_counts,
                'avg_mood_change': avg_mood_change,
                'streak': streak
            }
        })
    except Exception as e:
        print(f"Error getting mindfulness stats: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== AI INSIGHTS & REPORTS ====================

@mental_health_bp.route('/api/client/mental-health/insights')
@login_required
def api_get_insights():
    """Get AI-generated insights based on user's mental health data"""
    try:
        days = request.args.get('days', 30, type=int)
        start_date = date.today() - timedelta(days=days)
        
        # Gather all data
        moods = MentalHealthMood.query.filter(
            MentalHealthMood.user_id == current_user.id,
            MentalHealthMood.date >= start_date
        ).order_by(MentalHealthMood.date).all()
        
        sleep_entries = MentalHealthSleep.query.filter(
            MentalHealthSleep.user_id == current_user.id,
            MentalHealthSleep.date >= start_date
        ).all()
        
        assessments = MentalHealthAssessment.query.filter(
            MentalHealthAssessment.user_id == current_user.id,
            MentalHealthAssessment.date >= start_date
        ).all()
        
        mindfulness = MentalHealthMindfulness.query.filter(
            MentalHealthMindfulness.user_id == current_user.id,
            MentalHealthMindfulness.date >= start_date
        ).all()
        
        journals = MentalHealthJournal.query.filter(
            MentalHealthJournal.user_id == current_user.id,
            MentalHealthJournal.date >= start_date
        ).all()
        
        insights = []
        
        # 1. Mood Trend Analysis
        if len(moods) >= 3:
            mood_scores = [m.mood_score for m in moods if m.mood_score]
            avg_mood = sum(mood_scores) / len(mood_scores) if mood_scores else 0
            recent_avg = sum(mood_scores[-7:]) / len(mood_scores[-7:]) if len(mood_scores) >= 7 else avg_mood
            
            if recent_avg > avg_mood + 0.5:
                insights.append({
                    'type': 'positive',
                    'category': 'mood',
                    'icon': 'fa-arrow-up',
                    'title': 'Mood Improving',
                    'message': f'Your mood has been trending upward! Recent average: {round(recent_avg, 1)}/10 vs overall: {round(avg_mood, 1)}/10'
                })
            elif recent_avg < avg_mood - 0.5:
                insights.append({
                    'type': 'warning',
                    'category': 'mood',
                    'icon': 'fa-arrow-down',
                    'title': 'Mood Decreasing',
                    'message': f'Your mood has been lower recently. Consider trying a mindfulness exercise or reaching out to someone.'
                })
            
            # Best/worst days
            day_moods = {}
            for m in moods:
                day_name = m.date.strftime('%A')
                if day_name not in day_moods:
                    day_moods[day_name] = []
                if m.mood_score:
                    day_moods[day_name].append(m.mood_score)
            
            if day_moods:
                day_avgs = {d: sum(s)/len(s) for d, s in day_moods.items() if s}
                if day_avgs:
                    best_day = max(day_avgs, key=day_avgs.get)
                    worst_day = min(day_avgs, key=day_avgs.get)
                    if day_avgs[best_day] - day_avgs[worst_day] > 1:
                        insights.append({
                            'type': 'info',
                            'category': 'pattern',
                            'icon': 'fa-calendar-week',
                            'title': 'Weekly Pattern Detected',
                            'message': f'You tend to feel best on {best_day}s (avg: {round(day_avgs[best_day], 1)}) and lower on {worst_day}s (avg: {round(day_avgs[worst_day], 1)})'
                        })
        
        # 2. Sleep-Mood Correlation
        if sleep_entries and moods:
            sleep_by_date = {s.date: s for s in sleep_entries}
            correlations = []
            for m in moods:
                if m.date in sleep_by_date and m.mood_score and sleep_by_date[m.date].total_hours:
                    correlations.append((sleep_by_date[m.date].total_hours, m.mood_score))
            
            if len(correlations) >= 5:
                good_sleep = [c for c in correlations if c[0] >= 7]
                poor_sleep = [c for c in correlations if c[0] < 6]
                
                if good_sleep and poor_sleep:
                    good_mood_avg = sum(c[1] for c in good_sleep) / len(good_sleep)
                    poor_mood_avg = sum(c[1] for c in poor_sleep) / len(poor_sleep)
                    
                    if good_mood_avg > poor_mood_avg + 1:
                        insights.append({
                            'type': 'info',
                            'category': 'sleep',
                            'icon': 'fa-bed',
                            'title': 'Sleep Impacts Your Mood',
                            'message': f'When you sleep 7+ hours, your mood averages {round(good_mood_avg, 1)}/10. With less than 6 hours, it drops to {round(poor_mood_avg, 1)}/10.'
                        })
        
        # 3. Activity Impact
        if moods:
            activity_moods = {}
            for m in moods:
                if m.activities and m.mood_score:
                    for activity in m.activities:
                        if activity not in activity_moods:
                            activity_moods[activity] = []
                        activity_moods[activity].append(m.mood_score)
            
            if activity_moods:
                activity_avgs = {a: sum(s)/len(s) for a, s in activity_moods.items() if len(s) >= 2}
                if activity_avgs:
                    best_activity = max(activity_avgs, key=activity_avgs.get)
                    insights.append({
                        'type': 'positive',
                        'category': 'activity',
                        'icon': 'fa-star',
                        'title': 'Mood Booster Found',
                        'message': f'When you do "{best_activity}", your mood averages {round(activity_avgs[best_activity], 1)}/10. Keep it up!'
                    })
        
        # 4. Mindfulness Impact
        if mindfulness:
            sessions_with_improvement = [m for m in mindfulness if m.mood_before and m.mood_after and m.mood_after > m.mood_before]
            if len(sessions_with_improvement) >= 3:
                avg_improvement = sum(m.mood_after - m.mood_before for m in sessions_with_improvement) / len(sessions_with_improvement)
                insights.append({
                    'type': 'positive',
                    'category': 'mindfulness',
                    'icon': 'fa-spa',
                    'title': 'Mindfulness Works For You',
                    'message': f'Your mindfulness sessions improve your mood by an average of +{round(avg_improvement, 1)} points!'
                })
        
        # 5. Journaling Streak
        if journals:
            journal_dates = set(j.date for j in journals)
            streak = 0
            check = date.today()
            while check in journal_dates:
                streak += 1
                check -= timedelta(days=1)
            
            if streak >= 3:
                insights.append({
                    'type': 'positive',
                    'category': 'journal',
                    'icon': 'fa-fire',
                    'title': f'{streak}-Day Journal Streak!',
                    'message': 'Great job keeping up with your journaling! Consistency is key to self-reflection.'
                })
        
        # 6. Assessment Trends
        if len(assessments) >= 2:
            phq9 = [a for a in assessments if a.assessment_type == 'PHQ9']
            gad7 = [a for a in assessments if a.assessment_type == 'GAD7']
            
            for name, items in [('PHQ-9', phq9), ('GAD-7', gad7)]:
                if len(items) >= 2:
                    items.sort(key=lambda x: x.date)
                    first = items[0].total_score
                    last = items[-1].total_score
                    if last < first - 3:
                        insights.append({
                            'type': 'positive',
                            'category': 'assessment',
                            'icon': 'fa-chart-line',
                            'title': f'{name} Score Improving',
                            'message': f'Your {name} score dropped from {first} to {last}. That\'s great progress!'
                        })
                    elif last > first + 3:
                        insights.append({
                            'type': 'warning',
                            'category': 'assessment',
                            'icon': 'fa-exclamation-triangle',
                            'title': f'{name} Score Increased',
                            'message': f'Your {name} score went from {first} to {last}. Consider speaking with a professional.'
                        })
        
        # Summary stats
        summary = {
            'total_mood_entries': len(moods),
            'total_sleep_entries': len(sleep_entries),
            'total_journal_entries': len(journals),
            'total_mindfulness_sessions': len(mindfulness),
            'total_assessments': len(assessments),
            'avg_mood': round(sum(m.mood_score for m in moods if m.mood_score) / len([m for m in moods if m.mood_score]), 1) if moods else 0,
            'avg_sleep': round(sum(s.total_hours for s in sleep_entries if s.total_hours) / len([s for s in sleep_entries if s.total_hours]), 1) if sleep_entries else 0
        }
        
        return jsonify({
            'success': True,
            'insights': insights,
            'summary': summary,
            'period_days': days
        })
    except Exception as e:
        print(f"Error generating insights: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@mental_health_bp.route('/api/client/mental-health/report')
@login_required  
def api_generate_report():
    """Generate a mental health report for export"""
    try:
        days = request.args.get('days', 30, type=int)
        start_date = date.today() - timedelta(days=days)
        
        # Gather data
        moods = MentalHealthMood.query.filter(
            MentalHealthMood.user_id == current_user.id,
            MentalHealthMood.date >= start_date
        ).order_by(MentalHealthMood.date).all()
        
        sleep_entries = MentalHealthSleep.query.filter(
            MentalHealthSleep.user_id == current_user.id,
            MentalHealthSleep.date >= start_date
        ).all()
        
        assessments = MentalHealthAssessment.query.filter(
            MentalHealthAssessment.user_id == current_user.id,
            MentalHealthAssessment.date >= start_date
        ).order_by(MentalHealthAssessment.date).all()
        
        mindfulness = MentalHealthMindfulness.query.filter(
            MentalHealthMindfulness.user_id == current_user.id,
            MentalHealthMindfulness.date >= start_date
        ).all()
        
        # Calculate stats
        mood_scores = [m.mood_score for m in moods if m.mood_score]
        sleep_hours = [s.total_hours for s in sleep_entries if s.total_hours]
        
        report = {
            'generated_at': datetime.utcnow().isoformat(),
            'period': {
                'start': start_date.isoformat(),
                'end': date.today().isoformat(),
                'days': days
            },
            'mood': {
                'entries': len(moods),
                'average': round(sum(mood_scores) / len(mood_scores), 1) if mood_scores else 0,
                'highest': max(mood_scores) if mood_scores else 0,
                'lowest': min(mood_scores) if mood_scores else 0,
                'trend': [{'date': m.date.isoformat(), 'score': m.mood_score} for m in moods if m.mood_score]
            },
            'sleep': {
                'entries': len(sleep_entries),
                'average_hours': round(sum(sleep_hours) / len(sleep_hours), 1) if sleep_hours else 0,
                'best': max(sleep_hours) if sleep_hours else 0,
                'worst': min(sleep_hours) if sleep_hours else 0
            },
            'assessments': [
                {
                    'type': a.assessment_type,
                    'date': a.date.isoformat(),
                    'score': a.total_score,
                    'severity': a.severity
                } for a in assessments
            ],
            'mindfulness': {
                'total_sessions': len(mindfulness),
                'total_minutes': sum((m.duration_seconds or 0) for m in mindfulness) // 60,
                'avg_mood_improvement': round(
                    sum(m.mood_after - m.mood_before for m in mindfulness if m.mood_before and m.mood_after) /
                    len([m for m in mindfulness if m.mood_before and m.mood_after]), 1
                ) if [m for m in mindfulness if m.mood_before and m.mood_after] else 0
            }
        }
        
        return jsonify({'success': True, 'report': report})
    except Exception as e:
        print(f"Error generating report: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@mental_health_bp.route('/api/client/mental-health/trends')
@login_required
def api_get_trends():
    """Get trend data for visualization"""
    try:
        days = request.args.get('days', 30, type=int)
        start_date = date.today() - timedelta(days=days)
        
        # Get mood trend
        moods = MentalHealthMood.query.filter(
            MentalHealthMood.user_id == current_user.id,
            MentalHealthMood.date >= start_date
        ).order_by(MentalHealthMood.date).all()
        
        # Get sleep trend  
        sleep = MentalHealthSleep.query.filter(
            MentalHealthSleep.user_id == current_user.id,
            MentalHealthSleep.date >= start_date
        ).order_by(MentalHealthSleep.date).all()
        
        # Build combined dataset
        trends = {}
        for m in moods:
            d = m.date.isoformat()
            if d not in trends:
                trends[d] = {'date': d, 'mood': None, 'sleep': None, 'energy': None}
            trends[d]['mood'] = m.mood_score
            trends[d]['energy'] = m.energy_level
        
        for s in sleep:
            d = s.date.isoformat()
            if d not in trends:
                trends[d] = {'date': d, 'mood': None, 'sleep': None, 'energy': None}
            trends[d]['sleep'] = s.total_hours
        
        trend_list = sorted(trends.values(), key=lambda x: x['date'])
        
        return jsonify({
            'success': True,
            'trends': trend_list,
            'period_days': days
        })
    except Exception as e:
        print(f"Error getting trends: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500
