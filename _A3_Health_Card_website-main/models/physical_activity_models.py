"""
Physical Activity Models for Client Dashboard
Models for workout tracking, exercise database, goals, schedule, and achievements
"""
from datetime import datetime


# These will be populated by create_physical_activity_models function
PhysicalActivityProfile = None
Exercise = None
WorkoutLog = None
WorkoutGoal = None
WorkoutSchedule = None
Achievement = None
FavoriteExercise = None


def create_physical_activity_models(db):
    """Create Physical Activity models with the given database instance"""
    global PhysicalActivityProfile, Exercise, WorkoutLog, WorkoutGoal
    global WorkoutSchedule, Achievement, FavoriteExercise
    
    class PhysicalActivityProfileModel(db.Model):
        """User's physical activity profile and preferences"""
        __tablename__ = 'physical_activity_profile'
        
        id = db.Column(db.Integer, primary_key=True)
        user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
        
        # Fitness Level & Assessment
        fitness_level = db.Column(db.String(30), default='beginner')  # beginner, intermediate, advanced
        fitness_score = db.Column(db.Integer)  # Calculated score 1-100
        
        # Goals
        primary_goal = db.Column(db.String(50))  # weight_loss, muscle_gain, endurance, flexibility, general_fitness, stress_relief
        secondary_goal = db.Column(db.String(50))
        target_weight_kg = db.Column(db.Float)
        target_date = db.Column(db.Date)
        
        # Medical Limitations (linked with health conditions)
        medical_limitations = db.Column(db.JSON)  # ["heart_disease", "knee_problems", "back_pain"]
        injuries = db.Column(db.JSON)  # Current or past injuries
        
        # Preferences
        preferred_activities = db.Column(db.JSON)  # ["running", "yoga", "swimming"]
        avoided_activities = db.Column(db.JSON)  # Activities user wants to avoid
        preferred_workout_time = db.Column(db.String(20))  # morning, afternoon, evening, night
        available_equipment = db.Column(db.JSON)  # ["none", "dumbbells", "resistance_bands", "home_gym", "full_gym"]
        workout_location = db.Column(db.String(30))  # home, gym, outdoor, any
        
        # Weekly Targets
        workout_days_per_week = db.Column(db.Integer, default=3)  # Target days
        workout_duration_minutes = db.Column(db.Integer, default=30)  # Preferred session length
        weekly_calorie_goal = db.Column(db.Integer)  # Weekly calorie burn target
        daily_step_goal = db.Column(db.Integer, default=8000)
        
        # Current Stats
        current_streak = db.Column(db.Integer, default=0)  # Days in a row
        longest_streak = db.Column(db.Integer, default=0)
        total_workouts = db.Column(db.Integer, default=0)
        total_calories_burned = db.Column(db.Integer, default=0)
        total_active_minutes = db.Column(db.Integer, default=0)
        
        # Last Activity
        last_workout_date = db.Column(db.Date)
        last_workout_type = db.Column(db.String(50))
        
        # Timestamps
        created_at = db.Column(db.DateTime, default=datetime.utcnow)
        updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
        
        # Relationship
        user = db.relationship('User', backref=db.backref('physical_activity_profile', uselist=False))
        
        def to_dict(self):
            return {
                'id': self.id,
                'fitness_level': self.fitness_level,
                'fitness_score': self.fitness_score,
                'primary_goal': self.primary_goal,
                'secondary_goal': self.secondary_goal,
                'target_weight_kg': self.target_weight_kg,
                'target_date': self.target_date.isoformat() if self.target_date else None,
                'medical_limitations': self.medical_limitations or [],
                'injuries': self.injuries or [],
                'preferred_activities': self.preferred_activities or [],
                'avoided_activities': self.avoided_activities or [],
                'preferred_workout_time': self.preferred_workout_time,
                'available_equipment': self.available_equipment or [],
                'workout_location': self.workout_location,
                'workout_days_per_week': self.workout_days_per_week,
                'workout_duration_minutes': self.workout_duration_minutes,
                'weekly_calorie_goal': self.weekly_calorie_goal,
                'daily_step_goal': self.daily_step_goal,
                'current_streak': self.current_streak,
                'longest_streak': self.longest_streak,
                'total_workouts': self.total_workouts,
                'total_calories_burned': self.total_calories_burned,
                'total_active_minutes': self.total_active_minutes,
                'last_workout_date': self.last_workout_date.isoformat() if self.last_workout_date else None,
                'last_workout_type': self.last_workout_type,
                'updated_at': self.updated_at.isoformat() if self.updated_at else None
            }
    
    class ExerciseModel(db.Model):
        """Exercise database with MET values and instructions"""
        __tablename__ = 'exercises'
        
        id = db.Column(db.Integer, primary_key=True)
        
        # Basic Info
        name = db.Column(db.String(100), nullable=False)
        name_hindi = db.Column(db.String(100))  # Hindi name for Indian users
        description = db.Column(db.Text)
        
        # Categorization
        category = db.Column(db.String(50), nullable=False)  # cardio, strength, flexibility, balance, sports, hiit, dance
        subcategory = db.Column(db.String(50))  # e.g., upper_body, lower_body, core, full_body
        
        # MET Value for Calorie Calculation
        # MET = Metabolic Equivalent of Task
        # Calories = MET × Weight(kg) × Duration(hours)
        met_value = db.Column(db.Float, nullable=False, default=3.0)
        met_low = db.Column(db.Float)  # MET for low intensity
        met_high = db.Column(db.Float)  # MET for high intensity
        
        # Difficulty & Requirements
        difficulty_level = db.Column(db.String(20), default='medium')  # easy, medium, hard
        equipment_required = db.Column(db.JSON)  # ["dumbbells", "mat", "none"]
        space_required = db.Column(db.String(20), default='small')  # small, medium, large
        
        # Target Areas
        muscle_groups = db.Column(db.JSON)  # ["chest", "triceps", "shoulders"]
        primary_muscles = db.Column(db.JSON)  # Main muscles worked
        secondary_muscles = db.Column(db.JSON)  # Supporting muscles
        
        # Instructions
        instructions = db.Column(db.Text)  # Step-by-step instructions
        tips = db.Column(db.Text)  # Tips for proper form
        common_mistakes = db.Column(db.Text)  # Common mistakes to avoid
        
        # Benefits & Variations
        benefits = db.Column(db.JSON)  # ["cardio_health", "weight_loss", "muscle_building"]
        variations = db.Column(db.JSON)  # Easier/harder variations
        
        # Medical Safety
        contraindications = db.Column(db.JSON)  # ["heart_disease", "knee_problems"]
        suitable_for = db.Column(db.JSON)  # ["seniors", "beginners", "pregnancy_safe"]
        safety_notes = db.Column(db.Text)
        
        # Media
        image_url = db.Column(db.String(255))
        video_url = db.Column(db.String(255))
        thumbnail_url = db.Column(db.String(255))
        
        # Duration Recommendations
        recommended_duration_min = db.Column(db.Integer)  # Minimum duration in minutes
        recommended_duration_max = db.Column(db.Integer)  # Maximum duration in minutes
        recommended_sets = db.Column(db.Integer)  # For strength exercises
        recommended_reps = db.Column(db.String(20))  # e.g., "10-15"
        
        # Metadata
        is_verified = db.Column(db.Boolean, default=True)
        is_custom = db.Column(db.Boolean, default=False)
        created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
        popularity_score = db.Column(db.Integer, default=0)  # Based on usage
        
        created_at = db.Column(db.DateTime, default=datetime.utcnow)
        
        def to_dict(self):
            return {
                'id': self.id,
                'name': self.name,
                'name_hindi': self.name_hindi,
                'description': self.description,
                'category': self.category,
                'subcategory': self.subcategory,
                'met_value': self.met_value,
                'met_low': self.met_low,
                'met_high': self.met_high,
                'difficulty_level': self.difficulty_level,
                'equipment_required': self.equipment_required or [],
                'space_required': self.space_required,
                'muscle_groups': self.muscle_groups or [],
                'primary_muscles': self.primary_muscles or [],
                'secondary_muscles': self.secondary_muscles or [],
                'instructions': self.instructions,
                'tips': self.tips,
                'benefits': self.benefits or [],
                'contraindications': self.contraindications or [],
                'suitable_for': self.suitable_for or [],
                'safety_notes': self.safety_notes,
                'image_url': self.image_url,
                'video_url': self.video_url,
                'recommended_duration_min': self.recommended_duration_min,
                'recommended_duration_max': self.recommended_duration_max,
                'recommended_sets': self.recommended_sets,
                'recommended_reps': self.recommended_reps,
                'is_verified': self.is_verified
            }
    
    class WorkoutLogModel(db.Model):
        """Logged workouts/activities by user"""
        __tablename__ = 'workout_logs'
        
        id = db.Column(db.Integer, primary_key=True)
        user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
        exercise_id = db.Column(db.Integer, db.ForeignKey('exercises.id'))
        
        # Basic Info
        date = db.Column(db.Date, nullable=False)
        start_time = db.Column(db.Time)
        end_time = db.Column(db.Time)
        
        # Exercise Details (denormalized for history)
        exercise_name = db.Column(db.String(100), nullable=False)
        exercise_category = db.Column(db.String(50))
        
        # Duration & Intensity
        duration_minutes = db.Column(db.Integer, nullable=False)
        intensity = db.Column(db.String(20), default='moderate')  # low, moderate, high, very_high
        
        # Calories (auto-calculated using MET formula)
        calories_burned = db.Column(db.Integer)
        met_value_used = db.Column(db.Float)  # MET value used for calculation
        
        # Cardio-specific
        distance_km = db.Column(db.Float)
        pace_min_per_km = db.Column(db.Float)
        average_speed_kmh = db.Column(db.Float)
        
        # Strength-specific
        sets = db.Column(db.Integer)
        reps = db.Column(db.Integer)
        weight_kg = db.Column(db.Float)  # Weight used
        total_volume = db.Column(db.Float)  # sets × reps × weight
        
        # Heart Rate (if available)
        heart_rate_avg = db.Column(db.Integer)
        heart_rate_max = db.Column(db.Integer)
        heart_rate_zones = db.Column(db.JSON)  # Time in each HR zone
        
        # Steps (for walking/running)
        steps = db.Column(db.Integer)
        
        # User Feedback
        perceived_exertion = db.Column(db.Integer)  # 1-10 scale (RPE)
        mood_before = db.Column(db.Integer)  # 1-5
        mood_after = db.Column(db.Integer)  # 1-5
        energy_level = db.Column(db.Integer)  # 1-5
        
        # Location
        location = db.Column(db.String(30))  # indoor, outdoor, gym, home, park
        weather = db.Column(db.String(30))  # sunny, cloudy, rainy, cold, hot
        
        # Notes
        notes = db.Column(db.Text)
        
        # Photo/Proof
        photo_url = db.Column(db.String(255))
        
        # Goal Tracking
        goal_id = db.Column(db.Integer, db.ForeignKey('workout_goals.id'))
        schedule_id = db.Column(db.Integer, db.ForeignKey('workout_schedule.id'))
        
        # Timestamps
        created_at = db.Column(db.DateTime, default=datetime.utcnow)
        updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
        
        # Relationships
        user = db.relationship('User', backref=db.backref('workout_logs', lazy='dynamic'))
        exercise = db.relationship('ExerciseModel', backref='workout_logs')
        
        def to_dict(self):
            return {
                'id': self.id,
                'exercise_id': self.exercise_id,
                'date': self.date.isoformat() if self.date else None,
                'start_time': self.start_time.strftime('%H:%M') if self.start_time else None,
                'end_time': self.end_time.strftime('%H:%M') if self.end_time else None,
                'exercise_name': self.exercise_name,
                'exercise_category': self.exercise_category,
                'duration_minutes': self.duration_minutes,
                'intensity': self.intensity,
                'calories_burned': self.calories_burned,
                'distance_km': self.distance_km,
                'pace_min_per_km': self.pace_min_per_km,
                'sets': self.sets,
                'reps': self.reps,
                'weight_kg': self.weight_kg,
                'total_volume': self.total_volume,
                'heart_rate_avg': self.heart_rate_avg,
                'heart_rate_max': self.heart_rate_max,
                'steps': self.steps,
                'perceived_exertion': self.perceived_exertion,
                'mood_before': self.mood_before,
                'mood_after': self.mood_after,
                'energy_level': self.energy_level,
                'location': self.location,
                'weather': self.weather,
                'notes': self.notes,
                'photo_url': self.photo_url,
                'created_at': self.created_at.isoformat() if self.created_at else None
            }
    
    class WorkoutGoalModel(db.Model):
        """User's workout goals and targets"""
        __tablename__ = 'workout_goals'
        
        id = db.Column(db.Integer, primary_key=True)
        user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
        
        # Goal Definition
        goal_type = db.Column(db.String(50), nullable=False)  # weekly_minutes, weekly_sessions, weekly_calories, daily_steps, specific_exercise
        goal_name = db.Column(db.String(100))  # Custom name for the goal
        description = db.Column(db.Text)
        
        # Target
        target_value = db.Column(db.Float, nullable=False)
        target_unit = db.Column(db.String(30))  # minutes, sessions, calories, steps, km
        
        # For specific exercise goals
        exercise_id = db.Column(db.Integer, db.ForeignKey('exercises.id'))
        target_sets = db.Column(db.Integer)
        target_reps = db.Column(db.Integer)
        target_weight = db.Column(db.Float)
        
        # Period
        period_type = db.Column(db.String(20), default='weekly')  # daily, weekly, monthly, custom
        period_start = db.Column(db.Date)
        period_end = db.Column(db.Date)
        
        # Progress
        current_value = db.Column(db.Float, default=0)
        progress_percentage = db.Column(db.Float, default=0)
        
        # Streak
        streak_current = db.Column(db.Integer, default=0)
        streak_longest = db.Column(db.Integer, default=0)
        
        # Status
        is_active = db.Column(db.Boolean, default=True)
        is_completed = db.Column(db.Boolean, default=False)
        completed_at = db.Column(db.DateTime)
        times_completed = db.Column(db.Integer, default=0)  # How many periods completed
        
        # Notification
        reminder_enabled = db.Column(db.Boolean, default=True)
        reminder_time = db.Column(db.Time)
        
        # Timestamps
        created_at = db.Column(db.DateTime, default=datetime.utcnow)
        updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
        
        # Relationships
        user = db.relationship('User', backref=db.backref('workout_goals', lazy='dynamic'))
        exercise = db.relationship('ExerciseModel', backref='goals')
        workouts = db.relationship('WorkoutLogModel', backref='goal', lazy='dynamic')
        
        def to_dict(self):
            return {
                'id': self.id,
                'goal_type': self.goal_type,
                'goal_name': self.goal_name,
                'description': self.description,
                'target_value': self.target_value,
                'target_unit': self.target_unit,
                'exercise_id': self.exercise_id,
                'period_type': self.period_type,
                'period_start': self.period_start.isoformat() if self.period_start else None,
                'period_end': self.period_end.isoformat() if self.period_end else None,
                'current_value': self.current_value,
                'progress_percentage': self.progress_percentage,
                'streak_current': self.streak_current,
                'streak_longest': self.streak_longest,
                'is_active': self.is_active,
                'is_completed': self.is_completed,
                'times_completed': self.times_completed,
                'reminder_enabled': self.reminder_enabled,
                'created_at': self.created_at.isoformat() if self.created_at else None
            }
    
    class WorkoutScheduleModel(db.Model):
        """Planned workout schedule"""
        __tablename__ = 'workout_schedule'
        
        id = db.Column(db.Integer, primary_key=True)
        user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
        exercise_id = db.Column(db.Integer, db.ForeignKey('exercises.id'))
        
        # Schedule Info
        title = db.Column(db.String(100))  # Custom title for scheduled workout
        exercise_name = db.Column(db.String(100))  # Denormalized
        
        # When
        day_of_week = db.Column(db.Integer)  # 0=Monday, 6=Sunday (for recurring)
        scheduled_date = db.Column(db.Date)  # Specific date (for non-recurring)
        scheduled_time = db.Column(db.Time)
        
        # Duration
        planned_duration_minutes = db.Column(db.Integer, default=30)
        
        # Recurring
        is_recurring = db.Column(db.Boolean, default=True)
        recurrence_pattern = db.Column(db.String(20))  # weekly, biweekly, monthly
        recurrence_end_date = db.Column(db.Date)
        
        # Reminder
        reminder_enabled = db.Column(db.Boolean, default=True)
        reminder_minutes_before = db.Column(db.Integer, default=30)  # Minutes before scheduled time
        
        # Status
        is_completed = db.Column(db.Boolean, default=False)
        completed_at = db.Column(db.DateTime)
        was_skipped = db.Column(db.Boolean, default=False)
        skip_reason = db.Column(db.String(200))
        
        # Notes
        notes = db.Column(db.Text)
        
        # Linked workout
        workout_log_id = db.Column(db.Integer, db.ForeignKey('workout_logs.id'))
        
        # Timestamps
        created_at = db.Column(db.DateTime, default=datetime.utcnow)
        updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
        
        # Relationships
        user = db.relationship('User', backref=db.backref('workout_schedule', lazy='dynamic'))
        exercise = db.relationship('ExerciseModel', backref='scheduled')
        
        def to_dict(self):
            return {
                'id': self.id,
                'exercise_id': self.exercise_id,
                'title': self.title,
                'exercise_name': self.exercise_name,
                'day_of_week': self.day_of_week,
                'scheduled_date': self.scheduled_date.isoformat() if self.scheduled_date else None,
                'scheduled_time': self.scheduled_time.strftime('%H:%M') if self.scheduled_time else None,
                'planned_duration_minutes': self.planned_duration_minutes,
                'is_recurring': self.is_recurring,
                'recurrence_pattern': self.recurrence_pattern,
                'reminder_enabled': self.reminder_enabled,
                'reminder_minutes_before': self.reminder_minutes_before,
                'is_completed': self.is_completed,
                'completed_at': self.completed_at.isoformat() if self.completed_at else None,
                'was_skipped': self.was_skipped,
                'notes': self.notes,
                'created_at': self.created_at.isoformat() if self.created_at else None
            }
    
    class AchievementModel(db.Model):
        """User achievements, badges, and milestones"""
        __tablename__ = 'physical_activity_achievements'
        
        id = db.Column(db.Integer, primary_key=True)
        user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
        
        # Achievement Definition
        achievement_type = db.Column(db.String(30), nullable=False)  # badge, milestone, streak, challenge
        achievement_code = db.Column(db.String(50), nullable=False)  # first_workout, 7_day_streak, 100_workouts
        achievement_name = db.Column(db.String(100), nullable=False)
        description = db.Column(db.Text)
        
        # Visual
        icon = db.Column(db.String(50))  # FontAwesome icon class
        badge_color = db.Column(db.String(20))  # gold, silver, bronze, etc.
        badge_image_url = db.Column(db.String(255))
        
        # Category
        category = db.Column(db.String(50))  # consistency, strength, cardio, overall
        
        # Level/Tier
        tier = db.Column(db.Integer, default=1)  # 1=Bronze, 2=Silver, 3=Gold
        points = db.Column(db.Integer, default=10)  # Points earned
        
        # When earned
        earned_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
        
        # Additional data
        extra_data = db.Column(db.JSON)  # e.g., {"streak_days": 30, "total_calories": 50000}
        
        # Status
        is_displayed = db.Column(db.Boolean, default=True)  # Show in profile
        is_notified = db.Column(db.Boolean, default=False)  # Has user been notified
        
        # Relationships
        user = db.relationship('User', backref=db.backref('physical_activity_achievements', lazy='dynamic'))
        
        def to_dict(self):
            return {
                'id': self.id,
                'achievement_type': self.achievement_type,
                'achievement_code': self.achievement_code,
                'achievement_name': self.achievement_name,
                'description': self.description,
                'icon': self.icon,
                'badge_color': self.badge_color,
                'badge_image_url': self.badge_image_url,
                'category': self.category,
                'tier': self.tier,
                'points': self.points,
                'earned_at': self.earned_at.isoformat() if self.earned_at else None,
                'extra_data': self.extra_data or {},
                'is_displayed': self.is_displayed
            }
    
    class FavoriteExerciseModel(db.Model):
        """User's favorite exercises for quick access"""
        __tablename__ = 'favorite_exercises'
        
        id = db.Column(db.Integer, primary_key=True)
        user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
        exercise_id = db.Column(db.Integer, db.ForeignKey('exercises.id'), nullable=False)
        
        # Custom preferences for this exercise
        preferred_duration = db.Column(db.Integer)  # Minutes
        preferred_intensity = db.Column(db.String(20))
        preferred_sets = db.Column(db.Integer)
        preferred_reps = db.Column(db.Integer)
        preferred_weight = db.Column(db.Float)
        
        # Usage stats
        times_logged = db.Column(db.Integer, default=0)
        last_logged = db.Column(db.DateTime)
        
        notes = db.Column(db.Text)
        
        created_at = db.Column(db.DateTime, default=datetime.utcnow)
        
        # Relationships
        user = db.relationship('User', backref=db.backref('favorite_exercises', lazy='dynamic'))
        exercise = db.relationship('ExerciseModel', backref='favorites')
        
        def to_dict(self):
            return {
                'id': self.id,
                'exercise_id': self.exercise_id,
                'exercise': self.exercise.to_dict() if self.exercise else None,
                'preferred_duration': self.preferred_duration,
                'preferred_intensity': self.preferred_intensity,
                'preferred_sets': self.preferred_sets,
                'preferred_reps': self.preferred_reps,
                'preferred_weight': self.preferred_weight,
                'times_logged': self.times_logged,
                'last_logged': self.last_logged.isoformat() if self.last_logged else None,
                'notes': self.notes
            }
    
    # Assign to global variables
    PhysicalActivityProfile = PhysicalActivityProfileModel
    Exercise = ExerciseModel
    WorkoutLog = WorkoutLogModel
    WorkoutGoal = WorkoutGoalModel
    WorkoutSchedule = WorkoutScheduleModel
    Achievement = AchievementModel
    FavoriteExercise = FavoriteExerciseModel
    
    return {
        'PhysicalActivityProfile': PhysicalActivityProfileModel,
        'Exercise': ExerciseModel,
        'WorkoutLog': WorkoutLogModel,
        'WorkoutGoal': WorkoutGoalModel,
        'WorkoutSchedule': WorkoutScheduleModel,
        'Achievement': AchievementModel,
        'FavoriteExercise': FavoriteExerciseModel
    }
