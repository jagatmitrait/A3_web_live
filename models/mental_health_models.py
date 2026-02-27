"""
Mental Health Models for Client Dashboard
Models for mood tracking, assessments, sleep, journaling, and mindfulness
"""
from datetime import datetime


# These will be populated by create_mental_health_models function
MentalHealthMood = None
MentalHealthAssessment = None
MentalHealthSleep = None
MentalHealthJournal = None
MentalHealthMindfulness = None


def create_mental_health_models(db):
    """Create Mental Health models with the given database instance"""
    global MentalHealthMood, MentalHealthAssessment, MentalHealthSleep
    global MentalHealthJournal, MentalHealthMindfulness
    
    class MentalHealthMoodModel(db.Model):
        """Mood tracking entries with emotions and triggers"""
        __tablename__ = 'mental_health_mood'
        
        id = db.Column(db.Integer, primary_key=True)
        user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
        date = db.Column(db.Date, nullable=False)
        time = db.Column(db.Time, nullable=False)
        mood_score = db.Column(db.Float)  # 1.0 - 10.0
        quick_mood = db.Column(db.String(20))  # emoji category: great, good, okay, bad, awful
        emotions = db.Column(db.JSON)  # ["happy", "excited", "grateful"]
        energy_level = db.Column(db.Integer)  # 1-10
        triggers = db.Column(db.JSON)  # ["work", "sleep", "family"]
        activities = db.Column(db.JSON)  # ["exercise", "meditation", "social"]
        notes = db.Column(db.Text)
        created_at = db.Column(db.DateTime, default=datetime.utcnow)
        updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
        
        # Relationship
        user = db.relationship('User', backref=db.backref('mental_health_moods', lazy='dynamic'))
        
        def to_dict(self):
            return {
                'id': self.id,
                'date': self.date.isoformat() if self.date else None,
                'time': self.time.strftime('%H:%M') if self.time else None,
                'mood_score': self.mood_score,
                'quick_mood': self.quick_mood,
                'emotions': self.emotions or [],
                'energy_level': self.energy_level,
                'triggers': self.triggers or [],
                'activities': self.activities or [],
                'notes': self.notes,
                'created_at': self.created_at.isoformat() if self.created_at else None
            }
    
    
    class MentalHealthAssessmentModel(db.Model):
        """Standardized mental health assessments (PHQ-9, GAD-7)"""
        __tablename__ = 'mental_health_assessments'
        
        id = db.Column(db.Integer, primary_key=True)
        user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
        assessment_type = db.Column(db.String(20), nullable=False)  # PHQ9, GAD7
        date = db.Column(db.Date, nullable=False)
        answers = db.Column(db.JSON)  # [0, 1, 2, 3, 1, 2, ...]
        total_score = db.Column(db.Integer)
        max_score = db.Column(db.Integer)
        severity = db.Column(db.String(30))  # Minimal, Mild, Moderate, Moderately Severe, Severe
        notes = db.Column(db.Text)
        created_at = db.Column(db.DateTime, default=datetime.utcnow)
        
        # Relationship
        user = db.relationship('User', backref=db.backref('mental_health_assessments', lazy='dynamic'))
        
        def to_dict(self):
            return {
                'id': self.id,
                'assessment_type': self.assessment_type,
                'date': self.date.isoformat() if self.date else None,
                'answers': self.answers or [],
                'total_score': self.total_score,
                'max_score': self.max_score,
                'severity': self.severity,
                'notes': self.notes,
                'created_at': self.created_at.isoformat() if self.created_at else None
            }
    
    
    class MentalHealthSleepModel(db.Model):
        """Sleep tracking entries"""
        __tablename__ = 'mental_health_sleep'
        
        id = db.Column(db.Integer, primary_key=True)
        user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
        date = db.Column(db.Date, nullable=False)
        bedtime = db.Column(db.Time)
        wake_time = db.Column(db.Time)
        total_hours = db.Column(db.Float)
        quality_rating = db.Column(db.Integer)  # 1-10
        awakenings = db.Column(db.Integer)
        dream_recall = db.Column(db.Boolean, default=False)
        sleep_aids = db.Column(db.String(200))
        pre_sleep_activities = db.Column(db.String(200))
        morning_alertness = db.Column(db.Integer)  # 1-10
        notes = db.Column(db.Text)
        created_at = db.Column(db.DateTime, default=datetime.utcnow)
        updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
        
        # Relationship
        user = db.relationship('User', backref=db.backref('mental_health_sleeps', lazy='dynamic'))
        
        def to_dict(self):
            return {
                'id': self.id,
                'date': self.date.isoformat() if self.date else None,
                'bedtime': self.bedtime.strftime('%H:%M') if self.bedtime else None,
                'wake_time': self.wake_time.strftime('%H:%M') if self.wake_time else None,
                'total_hours': self.total_hours,
                'quality_rating': self.quality_rating,
                'awakenings': self.awakenings,
                'dream_recall': self.dream_recall,
                'sleep_aids': self.sleep_aids,
                'pre_sleep_activities': self.pre_sleep_activities,
                'morning_alertness': self.morning_alertness,
                'notes': self.notes,
                'created_at': self.created_at.isoformat() if self.created_at else None
            }
    
    
    class MentalHealthJournalModel(db.Model):
        """Multi-type journal entries (free, gratitude, CBT)"""
        __tablename__ = 'mental_health_journals'
        
        id = db.Column(db.Integer, primary_key=True)
        user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
        date = db.Column(db.Date, nullable=False)
        journal_type = db.Column(db.String(30), nullable=False)  # free, gratitude, cbt
        title = db.Column(db.String(200))
        content = db.Column(db.Text)
        
        # CBT-specific fields
        situation = db.Column(db.Text)
        automatic_thoughts = db.Column(db.Text)
        emotions_before = db.Column(db.JSON)  # [{emotion: "anxious", intensity: 80}]
        evidence_for = db.Column(db.Text)
        evidence_against = db.Column(db.Text)
        balanced_thought = db.Column(db.Text)
        emotions_after = db.Column(db.JSON)  # [{emotion: "anxious", intensity: 40}]
        
        # Gratitude-specific
        gratitude_items = db.Column(db.JSON)  # ["item1", "item2", "item3"]
        
        # Common
        mood_tag = db.Column(db.Integer)  # 1-10
        is_private = db.Column(db.Boolean, default=True)
        created_at = db.Column(db.DateTime, default=datetime.utcnow)
        updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
        
        # Relationship
        user = db.relationship('User', backref=db.backref('mental_health_journals', lazy='dynamic'))
        
        def to_dict(self):
            return {
                'id': self.id,
                'date': self.date.isoformat() if self.date else None,
                'journal_type': self.journal_type,
                'title': self.title,
                'content': self.content,
                'situation': self.situation,
                'automatic_thoughts': self.automatic_thoughts,
                'emotions_before': self.emotions_before,
                'evidence_for': self.evidence_for,
                'evidence_against': self.evidence_against,
                'balanced_thought': self.balanced_thought,
                'emotions_after': self.emotions_after,
                'gratitude_items': self.gratitude_items or [],
                'mood_tag': self.mood_tag,
                'is_private': self.is_private,
                'created_at': self.created_at.isoformat() if self.created_at else None
            }
    
    
    class MentalHealthMindfulnessModel(db.Model):
        """Mindfulness session tracking (breathing, meditation, grounding)"""
        __tablename__ = 'mental_health_mindfulness'
        
        id = db.Column(db.Integer, primary_key=True)
        user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
        date = db.Column(db.Date, nullable=False)
        exercise_type = db.Column(db.String(50), nullable=False)  # breathing, meditation, grounding
        exercise_name = db.Column(db.String(100))  # Box Breathing, 4-7-8, etc.
        duration_seconds = db.Column(db.Integer)
        completed = db.Column(db.Boolean, default=True)
        mood_before = db.Column(db.Integer)  # 1-10
        mood_after = db.Column(db.Integer)  # 1-10
        notes = db.Column(db.Text)
        created_at = db.Column(db.DateTime, default=datetime.utcnow)
        
        # Relationship
        user = db.relationship('User', backref=db.backref('mental_health_mindfulness', lazy='dynamic'))
        
        def to_dict(self):
            return {
                'id': self.id,
                'date': self.date.isoformat() if self.date else None,
                'exercise_type': self.exercise_type,
                'exercise_name': self.exercise_name,
                'duration_seconds': self.duration_seconds,
                'completed': self.completed,
                'mood_before': self.mood_before,
                'mood_after': self.mood_after,
                'notes': self.notes,
                'created_at': self.created_at.isoformat() if self.created_at else None
            }
    
    # Assign to global variables
    MentalHealthMood = MentalHealthMoodModel
    MentalHealthAssessment = MentalHealthAssessmentModel
    MentalHealthSleep = MentalHealthSleepModel
    MentalHealthJournal = MentalHealthJournalModel
    MentalHealthMindfulness = MentalHealthMindfulnessModel
    
    return {
        'MentalHealthMood': MentalHealthMood,
        'MentalHealthAssessment': MentalHealthAssessment,
        'MentalHealthSleep': MentalHealthSleep,
        'MentalHealthJournal': MentalHealthJournal,
        'MentalHealthMindfulness': MentalHealthMindfulness
    }
