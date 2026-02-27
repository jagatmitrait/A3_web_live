"""
Physical Activity Blueprint - Routes for Client Physical Activity Dashboard
Handles workouts, exercises, goals, schedule, and achievements
"""
from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from datetime import datetime, date, timedelta
from sqlalchemy import func, or_

# Blueprint definition
physical_activity_bp = Blueprint('physical_activity', __name__)

# Models and database - will be initialized from app.py
db = None
User = None
PhysicalActivityProfile = None
Exercise = None
WorkoutLog = None
WorkoutGoal = None
WorkoutSchedule = None
Achievement = None
FavoriteExercise = None


def init_blueprint(database, models):
    """Initialize blueprint with database and models"""
    global db, User, PhysicalActivityProfile, Exercise, WorkoutLog
    global WorkoutGoal, WorkoutSchedule, Achievement, FavoriteExercise
    
    db = database
    User = models.get('User')
    PhysicalActivityProfile = models.get('PhysicalActivityProfile')
    Exercise = models.get('Exercise')
    WorkoutLog = models.get('WorkoutLog')
    WorkoutGoal = models.get('WorkoutGoal')
    WorkoutSchedule = models.get('WorkoutSchedule')
    Achievement = models.get('Achievement')
    FavoriteExercise = models.get('FavoriteExercise')
    
    # Auto-seed exercise database on first run
    try:
        seed_exercise_database_if_empty(database, Exercise)
    except Exception as e:
        print(f"Note: Could not auto-seed exercise database: {e}")


def seed_exercise_database_if_empty(database, ExerciseModel):
    """Automatically seed exercise database if empty - runs once on app startup"""
    if not ExerciseModel:
        return
    
    try:
        count = ExerciseModel.query.count()
        if count > 0:
            return  # Already has data
        
        print("Auto-seeding exercise database...")
        
        # Exercise data format:
        # [name, name_hindi, category, subcategory, met_value, difficulty, equipment, muscle_groups, description, contraindications]
        EXERCISES = [
            # ==================== CARDIO ====================
            ["Walking (Leisurely)", "टहलना", "cardio", "low_impact", 2.5, "easy", ["none"], ["legs", "core"], "Light walking at comfortable pace", []],
            ["Walking (Brisk)", "तेज चलना", "cardio", "low_impact", 4.3, "easy", ["none"], ["legs", "core"], "Fast-paced walking for cardio benefits", []],
            ["Running (Jogging)", "दौड़ना", "cardio", "high_impact", 7.0, "medium", ["none"], ["legs", "core", "glutes"], "Moderate pace jogging", ["knee_problems", "heart_disease"]],
            ["Running (Fast)", "तेज दौड़", "cardio", "high_impact", 11.5, "hard", ["none"], ["legs", "core", "glutes"], "High-intensity running", ["knee_problems", "heart_disease", "hypertension"]],
            ["Cycling (Leisurely)", "साइकिल चलाना", "cardio", "low_impact", 4.0, "easy", ["bicycle"], ["legs", "glutes"], "Relaxed cycling for fitness", []],
            ["Cycling (Moderate)", "साइकिल (मध्यम)", "cardio", "low_impact", 6.8, "medium", ["bicycle"], ["legs", "glutes", "core"], "Moderate intensity cycling", []],
            ["Cycling (Vigorous)", "साइकिल (तेज)", "cardio", "low_impact", 10.0, "hard", ["bicycle"], ["legs", "glutes", "core"], "High-intensity cycling", ["heart_disease"]],
            ["Swimming (Leisurely)", "तैराकी (आराम)", "cardio", "low_impact", 6.0, "medium", ["pool"], ["full_body"], "Relaxed swimming", []],
            ["Swimming (Laps)", "तैराकी (लैप्स)", "cardio", "low_impact", 8.0, "hard", ["pool"], ["full_body"], "Lap swimming for cardio", []],
            ["Jump Rope", "रस्सी कूदना", "cardio", "high_impact", 11.0, "hard", ["jump_rope"], ["legs", "shoulders", "core"], "Skipping rope exercise", ["knee_problems", "ankle_problems"]],
            ["Stair Climbing", "सीढ़ी चढ़ना", "cardio", "moderate_impact", 8.0, "medium", ["stairs"], ["legs", "glutes"], "Walking or running up stairs", ["knee_problems"]],
            ["Rowing Machine", "रोइंग मशीन", "cardio", "low_impact", 7.0, "medium", ["rowing_machine"], ["back", "arms", "legs"], "Indoor rowing exercise", []],
            ["Elliptical Trainer", "एलिप्टिकल", "cardio", "low_impact", 5.0, "medium", ["elliptical"], ["legs", "arms"], "Low-impact cardio machine", []],
            ["Treadmill Walking", "ट्रेडमिल वॉक", "cardio", "low_impact", 3.5, "easy", ["treadmill"], ["legs"], "Walking on treadmill", []],
            ["Treadmill Running", "ट्रेडमिल दौड़", "cardio", "moderate_impact", 9.0, "hard", ["treadmill"], ["legs", "core"], "Running on treadmill", ["knee_problems"]],
            
            # ==================== STRENGTH - UPPER BODY ====================
            ["Push-ups", "पुश-अप्स", "strength", "upper_body", 3.8, "medium", ["none"], ["chest", "triceps", "shoulders"], "Classic bodyweight chest exercise", ["shoulder_injury", "wrist_problems"]],
            ["Push-ups (Modified/Knee)", "घुटने पुश-अप्स", "strength", "upper_body", 3.0, "easy", ["none"], ["chest", "triceps"], "Beginner-friendly push-up variation", []],
            ["Diamond Push-ups", "डायमंड पुश-अप्स", "strength", "upper_body", 4.0, "hard", ["none"], ["triceps", "chest"], "Close-grip push-ups for triceps", ["wrist_problems"]],
            ["Pull-ups", "पुल-अप्स", "strength", "upper_body", 8.0, "hard", ["pull_up_bar"], ["back", "biceps", "forearms"], "Classic upper body pull exercise", ["shoulder_injury"]],
            ["Chin-ups", "चिन-अप्स", "strength", "upper_body", 8.0, "hard", ["pull_up_bar"], ["biceps", "back"], "Underhand grip pull-ups", ["shoulder_injury"]],
            ["Dumbbell Bicep Curls", "डंबल बाइसेप कर्ल", "strength", "upper_body", 3.0, "easy", ["dumbbells"], ["biceps"], "Isolation exercise for biceps", []],
            ["Dumbbell Shoulder Press", "शोल्डर प्रेस", "strength", "upper_body", 5.0, "medium", ["dumbbells"], ["shoulders", "triceps"], "Overhead pressing movement", ["shoulder_injury"]],
            ["Dumbbell Rows", "डंबल रो", "strength", "upper_body", 4.5, "medium", ["dumbbells"], ["back", "biceps"], "Single-arm rowing movement", []],
            ["Tricep Dips", "ट्राइसेप डिप्स", "strength", "upper_body", 4.0, "medium", ["chair", "bench"], ["triceps", "chest", "shoulders"], "Bodyweight tricep exercise", ["shoulder_injury"]],
            ["Bench Press", "बेंच प्रेस", "strength", "upper_body", 5.0, "medium", ["barbell", "bench"], ["chest", "triceps", "shoulders"], "Classic chest pressing exercise", ["shoulder_injury"]],
            ["Lat Pulldown", "लैट पुलडाउन", "strength", "upper_body", 4.5, "medium", ["cable_machine"], ["back", "biceps"], "Machine back exercise", []],
            ["Overhead Tricep Extension", "ओवरहेड ट्राइसेप", "strength", "upper_body", 3.5, "easy", ["dumbbells"], ["triceps"], "Tricep isolation exercise", []],
            ["Lateral Raises", "लेटरल रेज़", "strength", "upper_body", 3.0, "easy", ["dumbbells"], ["shoulders"], "Shoulder width exercise", ["shoulder_injury"]],
            ["Front Raises", "फ्रंट रेज़", "strength", "upper_body", 3.0, "easy", ["dumbbells"], ["shoulders"], "Front deltoid exercise", []],
            ["Plank Shoulder Taps", "प्लैंक शोल्डर टैप्स", "strength", "upper_body", 4.0, "medium", ["none"], ["core", "shoulders"], "Dynamic plank variation", []],
            
            # ==================== STRENGTH - LOWER BODY ====================
            ["Squats (Bodyweight)", "स्क्वॉट्स", "strength", "lower_body", 5.0, "medium", ["none"], ["quads", "glutes", "hamstrings"], "Fundamental lower body exercise", ["knee_problems"]],
            ["Squats (Goblet)", "गॉब्लेट स्क्वॉट", "strength", "lower_body", 5.5, "medium", ["dumbbells"], ["quads", "glutes"], "Front-loaded squat variation", ["knee_problems"]],
            ["Squats (Barbell)", "बारबेल स्क्वॉट", "strength", "lower_body", 6.0, "hard", ["barbell", "squat_rack"], ["quads", "glutes", "core"], "Heavy squat variation", ["knee_problems", "back_pain"]],
            ["Lunges (Walking)", "वॉकिंग लंजेस", "strength", "lower_body", 5.0, "medium", ["none"], ["quads", "glutes", "hamstrings"], "Dynamic lunge exercise", ["knee_problems"]],
            ["Lunges (Stationary)", "स्टेशनरी लंजेस", "strength", "lower_body", 4.5, "medium", ["none"], ["quads", "glutes"], "Static lunge position", ["knee_problems"]],
            ["Deadlift (Romanian)", "रोमानियन डेडलिफ्ट", "strength", "lower_body", 6.0, "medium", ["dumbbells", "barbell"], ["hamstrings", "glutes", "back"], "Hip hinge movement", ["back_pain"]],
            ["Deadlift (Conventional)", "डेडलिफ्ट", "strength", "lower_body", 6.5, "hard", ["barbell"], ["back", "glutes", "hamstrings"], "Full deadlift movement", ["back_pain"]],
            ["Calf Raises", "काफ रेज़", "strength", "lower_body", 3.0, "easy", ["none"], ["calves"], "Calf strengthening exercise", []],
            ["Glute Bridges", "ग्लूट ब्रिज", "strength", "lower_body", 3.5, "easy", ["none"], ["glutes", "hamstrings"], "Hip extension exercise", []],
            ["Hip Thrusts", "हिप थ्रस्ट्स", "strength", "lower_body", 4.5, "medium", ["bench", "barbell"], ["glutes"], "Glute-focused exercise", []],
            ["Step-ups", "स्टेप-अप्स", "strength", "lower_body", 5.0, "medium", ["step", "bench"], ["quads", "glutes"], "Single-leg stepping exercise", ["knee_problems"]],
            ["Wall Sit", "वॉल सिट", "strength", "lower_body", 3.0, "medium", ["wall"], ["quads"], "Isometric leg exercise", ["knee_problems"]],
            ["Sumo Squats", "सूमो स्क्वॉट", "strength", "lower_body", 5.0, "medium", ["none"], ["inner_thighs", "glutes", "quads"], "Wide-stance squat", []],
            ["Box Jumps", "बॉक्स जंप्स", "strength", "lower_body", 8.0, "hard", ["box", "step"], ["quads", "glutes", "calves"], "Plyometric jumping", ["knee_problems", "ankle_problems"]],
            
            # ==================== STRENGTH - CORE ====================
            ["Plank", "प्लैंक", "strength", "core", 4.0, "medium", ["none"], ["core", "shoulders"], "Isometric core exercise", []],
            ["Side Plank", "साइड प्लैंक", "strength", "core", 4.0, "medium", ["none"], ["obliques", "core"], "Lateral core stability", []],
            ["Crunches", "क्रंचेस", "strength", "core", 3.5, "easy", ["none"], ["abs"], "Basic ab exercise", ["back_pain"]],
            ["Bicycle Crunches", "बाइसिकल क्रंचेस", "strength", "core", 4.0, "medium", ["none"], ["abs", "obliques"], "Rotational ab exercise", ["back_pain"]],
            ["Russian Twists", "रशियन ट्विस्ट्स", "strength", "core", 4.0, "medium", ["none", "dumbbells"], ["obliques", "core"], "Rotational core exercise", ["back_pain"]],
            ["Leg Raises", "लेग रेज़", "strength", "core", 4.5, "medium", ["none"], ["lower_abs", "hip_flexors"], "Lower ab exercise", ["back_pain"]],
            ["Mountain Climbers", "माउंटेन क्लाइम्बर्स", "strength", "core", 8.0, "hard", ["none"], ["core", "shoulders", "hip_flexors"], "Dynamic core cardio exercise", []],
            ["Dead Bug", "डेड बग", "strength", "core", 3.0, "easy", ["none"], ["core"], "Core stability exercise", []],
            ["Bird Dog", "बर्ड डॉग", "strength", "core", 3.0, "easy", ["none"], ["core", "back"], "Core and back stability", []],
            ["Flutter Kicks", "फ्लटर किक्स", "strength", "core", 4.5, "medium", ["none"], ["lower_abs"], "Leg flutter exercise", ["back_pain"]],
            ["V-Ups", "वी-अप्स", "strength", "core", 5.0, "hard", ["none"], ["abs", "hip_flexors"], "Advanced ab exercise", ["back_pain"]],
            ["Hollow Body Hold", "होलो बॉडी होल्ड", "strength", "core", 4.0, "hard", ["none"], ["core"], "Gymnastics core hold", []],
            
            # ==================== FLEXIBILITY & YOGA ====================
            ["Sun Salutation (Surya Namaskar)", "सूर्य नमस्कार", "yoga", "full_body", 4.0, "medium", ["mat"], ["full_body"], "Classic yoga flow sequence", []],
            ["Warrior I (Virabhadrasana I)", "वीरभद्रासन I", "yoga", "standing", 3.0, "easy", ["mat"], ["legs", "hips", "core"], "Standing yoga pose", []],
            ["Warrior II (Virabhadrasana II)", "वीरभद्रासन II", "yoga", "standing", 3.0, "easy", ["mat"], ["legs", "hips"], "Hip opening yoga pose", []],
            ["Downward Dog (Adho Mukha Svanasana)", "अधोमुख श्वानासन", "yoga", "inversion", 3.5, "easy", ["mat"], ["shoulders", "hamstrings", "calves"], "Classic yoga inversion", ["high_blood_pressure"]],
            ["Tree Pose (Vrksasana)", "वृक्षासन", "yoga", "balance", 2.5, "easy", ["mat"], ["legs", "core"], "Single-leg balance pose", []],
            ["Triangle Pose (Trikonasana)", "त्रिकोणासन", "yoga", "standing", 3.0, "easy", ["mat"], ["legs", "obliques"], "Side stretch pose", []],
            ["Child's Pose (Balasana)", "बालासन", "yoga", "restorative", 2.0, "easy", ["mat"], ["back", "hips"], "Relaxation pose", []],
            ["Cobra Pose (Bhujangasana)", "भुजंगासन", "yoga", "backbend", 2.5, "easy", ["mat"], ["back", "chest"], "Back extension pose", ["back_injury"]],
            ["Cat-Cow Stretch", "मार्जारी-गौ आसन", "flexibility", "spine", 2.0, "easy", ["mat"], ["spine", "core"], "Spinal mobility exercise", []],
            ["Pigeon Pose", "कपोतासन", "yoga", "hip_opener", 2.5, "medium", ["mat"], ["hips", "glutes"], "Deep hip stretch", ["knee_problems"]],
            ["Seated Forward Bend", "पश्चिमोत्तानासन", "flexibility", "hamstrings", 2.5, "easy", ["mat"], ["hamstrings", "back"], "Hamstring stretch", []],
            ["Supine Spinal Twist", "सुप्त मत्स्येन्द्रासन", "flexibility", "spine", 2.0, "easy", ["mat"], ["spine", "hips"], "Lying twist stretch", []],
            ["Standing Quad Stretch", "क्वाड स्ट्रेच", "flexibility", "quads", 2.0, "easy", ["none"], ["quads"], "Basic quad stretch", []],
            ["Hip Flexor Stretch", "हिप फ्लेक्सर स्ट्रेच", "flexibility", "hips", 2.0, "easy", ["mat"], ["hip_flexors"], "Kneeling hip stretch", []],
            ["Shoulder Stretch", "कंधे की स्ट्रेच", "flexibility", "shoulders", 2.0, "easy", ["none"], ["shoulders"], "Cross-body shoulder stretch", []],
            
            # ==================== SPORTS ====================
            ["Cricket Batting Practice", "क्रिकेट बैटिंग", "sports", "bat_sports", 5.0, "medium", ["cricket_bat", "ball"], ["arms", "core", "legs"], "Cricket batting drills", []],
            ["Cricket Bowling Practice", "क्रिकेट बॉलिंग", "sports", "bat_sports", 5.5, "medium", ["cricket_ball"], ["shoulders", "back", "legs"], "Cricket bowling practice", ["shoulder_injury"]],
            ["Badminton", "बैडमिंटन", "sports", "racquet", 6.5, "medium", ["badminton_racquet", "shuttlecock"], ["legs", "arms", "core"], "Singles or doubles badminton", []],
            ["Tennis", "टेनिस", "sports", "racquet", 7.0, "medium", ["tennis_racquet", "ball"], ["legs", "arms", "core"], "Singles tennis match", []],
            ["Table Tennis", "टेबल टेनिस", "sports", "racquet", 4.0, "easy", ["table_tennis_paddle"], ["arms", "core"], "Ping pong game", []],
            ["Football/Soccer", "फुटबॉल", "sports", "team", 7.0, "hard", ["football"], ["legs", "core"], "Football match or practice", ["knee_problems"]],
            ["Basketball", "बास्केटबॉल", "sports", "team", 8.0, "hard", ["basketball"], ["full_body"], "Basketball game", ["knee_problems", "ankle_problems"]],
            ["Volleyball", "वॉलीबॉल", "sports", "team", 4.0, "medium", ["volleyball"], ["arms", "legs", "core"], "Volleyball game", []],
            ["Kabaddi", "कबड्डी", "sports", "traditional", 7.0, "hard", ["none"], ["full_body"], "Traditional Indian sport", ["heart_disease"]],
            ["Kho-Kho", "खो-खो", "sports", "traditional", 6.5, "hard", ["none"], ["legs", "core"], "Traditional Indian chasing game", []],
            
            # ==================== HIIT ====================
            ["Burpees", "बर्पीज़", "hiit", "full_body", 10.0, "hard", ["none"], ["full_body"], "Full body explosive exercise", ["knee_problems", "heart_disease"]],
            ["High Knees", "हाई नीज़", "hiit", "cardio", 8.0, "medium", ["none"], ["legs", "core"], "Running in place with high knees", []],
            ["Jumping Jacks", "जंपिंग जैक्स", "hiit", "cardio", 7.0, "easy", ["none"], ["full_body"], "Classic cardio exercise", []],
            ["Squat Jumps", "स्क्वॉट जंप्स", "hiit", "lower_body", 8.0, "hard", ["none"], ["legs", "glutes"], "Explosive squat movement", ["knee_problems"]],
            ["Tuck Jumps", "टक जंप्स", "hiit", "full_body", 9.0, "hard", ["none"], ["legs", "core"], "Knee-to-chest jumps", ["knee_problems"]],
            ["Speed Skaters", "स्पीड स्केटर्स", "hiit", "lower_body", 7.5, "medium", ["none"], ["legs", "glutes"], "Lateral jumping exercise", []],
            ["Plyo Lunges", "प्लायो लंजेस", "hiit", "lower_body", 8.5, "hard", ["none"], ["legs", "glutes"], "Jumping lunge", ["knee_problems"]],
            ["Push-up to Shoulder Tap", "पुश-अप शोल्डर टैप", "hiit", "upper_body", 6.0, "medium", ["none"], ["chest", "core", "shoulders"], "Dynamic push-up variation", []],
            ["Inchworm", "इंचवर्म", "hiit", "full_body", 5.0, "medium", ["none"], ["core", "hamstrings", "shoulders"], "Walking plank exercise", []],
            ["Bear Crawl", "बेयर क्रॉल", "hiit", "full_body", 8.0, "hard", ["none"], ["full_body"], "Crawling movement pattern", []],
            
            # ==================== DANCE & AEROBICS ====================
            ["Zumba", "ज़ुम्बा", "dance", "dance_fitness", 6.5, "medium", ["none"], ["full_body"], "Latin-inspired dance workout", []],
            ["Bollywood Dance", "बॉलीवुड डांस", "dance", "dance_fitness", 5.5, "medium", ["none"], ["full_body"], "High-energy Bollywood dance", []],
            ["Bhangra Dance", "भांगड़ा", "dance", "traditional_dance", 7.0, "hard", ["none"], ["legs", "arms", "core"], "Punjabi folk dance workout", []],
            ["Aerobics (Low Impact)", "एरोबिक्स (लो इंपैक्ट)", "dance", "aerobics", 4.5, "easy", ["none"], ["full_body"], "Basic aerobic movements", []],
            ["Aerobics (High Impact)", "एरोबिक्स (हाई इंपैक्ट)", "dance", "aerobics", 7.0, "hard", ["none"], ["full_body"], "High-intensity aerobics", ["knee_problems"]],
            ["Step Aerobics", "स्टेप एरोबिक्स", "dance", "aerobics", 6.5, "medium", ["step"], ["legs", "glutes"], "Aerobics with step platform", []],
            ["Salsa Dance", "सालसा", "dance", "partner_dance", 5.5, "medium", ["none"], ["legs", "hips", "core"], "Latin partner dance", []],
            ["Hip Hop Dance", "हिप हॉप", "dance", "dance_fitness", 6.0, "medium", ["none"], ["full_body"], "Urban street dance workout", []],
            ["Classical Indian Dance (Bharatanatyam)", "भारतनाट्यम", "dance", "traditional_dance", 5.0, "hard", ["none"], ["legs", "core", "arms"], "Classical Indian dance form", []],
            ["Garba", "गरबा", "dance", "traditional_dance", 6.5, "medium", ["none"], ["legs", "arms"], "Gujarati folk dance", []],
            
            # ==================== MIND-BODY ====================
            ["Tai Chi", "ताई ची", "balance", "mind_body", 3.0, "easy", ["none"], ["full_body"], "Slow meditative movement", []],
            ["Pilates (Mat)", "पिलाटस", "flexibility", "core", 3.5, "medium", ["mat"], ["core", "back"], "Core-focused exercise method", []],
            ["Pilates (Reformer)", "पिलाटस रिफॉर्मर", "flexibility", "full_body", 4.0, "medium", ["reformer"], ["full_body"], "Machine-based Pilates", []],
            ["Meditation Walking", "ध्यान चलना", "balance", "mind_body", 2.5, "easy", ["none"], ["legs"], "Slow mindful walking", []],
            ["Breathing Exercises (Pranayama)", "प्राणायाम", "yoga", "breathing", 1.5, "easy", ["mat"], ["respiratory"], "Yogic breathing techniques", []],
        ]
        
        for ex in EXERCISES:
            new_exercise = ExerciseModel(
                name=ex[0],
                name_hindi=ex[1],
                category=ex[2],
                subcategory=ex[3],
                met_value=ex[4],
                difficulty_level=ex[5],
                equipment_required=ex[6],
                muscle_groups=ex[7],
                description=ex[8],
                contraindications=ex[9],
                is_verified=True,
                is_custom=False,
                popularity_score=0
            )
            database.session.add(new_exercise)
        
        database.session.commit()
        print(f"Auto-seeded {len(EXERCISES)} exercises to database!")
    except Exception as e:
        database.session.rollback()
        print(f"Exercise seeding skipped: {e}")


# ==================== HELPER FUNCTIONS ====================

def calculate_calories(met_value, weight_kg, duration_minutes):
    """Calculate calories burned using MET formula
    Calories = MET × Weight(kg) × Duration(hours)
    """
    if not all([met_value, weight_kg, duration_minutes]):
        return 0
    duration_hours = duration_minutes / 60
    return round(met_value * weight_kg * duration_hours)


def get_user_weight(user_id):
    """Get user's weight from their profile or diet profile"""
    profile = PhysicalActivityProfile.query.filter_by(user_id=user_id).first()
    if profile and profile.target_weight_kg:
        return profile.target_weight_kg
    
    # Try to get from user record or default
    user = User.query.get(user_id)
    if user:
        # Check if user has weight in any related profile
        # Default to 70kg if not found
        return 70
    return 70


def update_profile_stats(user_id, calories=0, duration=0, workout_type=None):
    """Update user's profile statistics after logging a workout"""
    profile = PhysicalActivityProfile.query.filter_by(user_id=user_id).first()
    
    # Create profile if it doesn't exist
    if not profile:
        profile = PhysicalActivityProfile(
            user_id=user_id,
            total_workouts=0,
            total_calories_burned=0,
            total_active_minutes=0,
            current_streak=0,
            longest_streak=0
        )
        db.session.add(profile)
    
    # Update totals
    profile.total_workouts = (profile.total_workouts or 0) + 1
    profile.total_calories_burned = (profile.total_calories_burned or 0) + calories
    profile.total_active_minutes = (profile.total_active_minutes or 0) + duration
    
    # Update streak logic
    yesterday = date.today() - timedelta(days=1)
    last_workout = profile.last_workout_date
    
    if last_workout is None:
        # First workout ever
        profile.current_streak = 1
    elif last_workout == date.today():
        # Already worked out today, don't increment streak again
        pass
    elif last_workout == yesterday:
        # Consecutive day
        profile.current_streak = (profile.current_streak or 0) + 1
    else:
        # Streak broken
        profile.current_streak = 1
    
    profile.last_workout_date = date.today()
    profile.last_workout_type = workout_type
    
    if profile.current_streak > (profile.longest_streak or 0):
        profile.longest_streak = profile.current_streak


def update_goal_progress(user_id):
    """Update progress for active goals"""
    today = date.today()
    
    goals = WorkoutGoal.query.filter_by(
        user_id=user_id,
        is_active=True,
        is_completed=False
    ).all()
    
    for goal in goals:
        # Determine period start based on goal type
        if goal.period_type == 'daily':
            period_start = today
        elif goal.period_type == 'weekly':
            period_start = today - timedelta(days=today.weekday())
        elif goal.period_type == 'monthly':
            period_start = today.replace(day=1)
        else:
            period_start = goal.period_start or today
        
        # Calculate current progress based on goal type
        if goal.goal_type == 'weekly_minutes':
            result = db.session.query(func.sum(WorkoutLog.duration_minutes)).filter(
                WorkoutLog.user_id == user_id,
                WorkoutLog.date >= period_start
            ).scalar() or 0
            goal.current_value = float(result)
        
        elif goal.goal_type == 'weekly_sessions':
            result = WorkoutLog.query.filter(
                WorkoutLog.user_id == user_id,
                WorkoutLog.date >= period_start
            ).count()
            goal.current_value = float(result)
        
        elif goal.goal_type == 'weekly_calories':
            result = db.session.query(func.sum(WorkoutLog.calories_burned)).filter(
                WorkoutLog.user_id == user_id,
                WorkoutLog.date >= period_start
            ).scalar() or 0
            goal.current_value = float(result)
        
        elif goal.goal_type == 'daily_steps':
            result = db.session.query(func.sum(WorkoutLog.steps)).filter(
                WorkoutLog.user_id == user_id,
                WorkoutLog.date == today
            ).scalar() or 0
            goal.current_value = float(result)
        
        # Calculate percentage
        if goal.target_value > 0:
            goal.progress_percentage = round((goal.current_value / goal.target_value) * 100, 1)
            
            # Check if goal is completed
            if goal.progress_percentage >= 100:
                goal.is_completed = True
                goal.completed_at = datetime.utcnow()
                goal.times_completed = (goal.times_completed or 0) + 1


def check_and_award_achievements(user_id):
    """Check milestones and award achievements"""
    try:
        today = date.today()
        week_start = today - timedelta(days=today.weekday())
        
        # Get user's profile
        profile = PhysicalActivityProfile.query.filter_by(user_id=user_id).first()
        if not profile:
            return
        
        # Get all earned achievement names to avoid duplicates
        earned = set(a.achievement_name for a in Achievement.query.filter_by(user_id=user_id).all())
        
        # Achievement definitions
        achievements_to_check = [
            {
                'name': 'First Workout',
                'description': 'Log your first workout',
                'icon': '🏆',
                'points': 50,
                'category': 'milestone',
                'check': lambda: profile.total_workouts >= 1
            },
            {
                'name': '3-Day Streak',
                'description': 'Workout 3 days in a row',
                'icon': '🔥',
                'points': 100,
                'category': 'streak',
                'check': lambda: profile.current_streak >= 3
            },
            {
                'name': 'Week Warrior',
                'description': 'Complete 5 workouts in a week',
                'icon': '💪',
                'points': 150,
                'category': 'weekly',
                'check': lambda: WorkoutLog.query.filter(
                    WorkoutLog.user_id == user_id,
                    WorkoutLog.date >= week_start
                ).count() >= 5
            },
            {
                'name': '150 Minutes',
                'description': 'Hit WHO weekly goal of 150 active minutes',
                'icon': '⏱️',
                'points': 200,
                'category': 'weekly',
                'check': lambda: (db.session.query(func.sum(WorkoutLog.duration_minutes)).filter(
                    WorkoutLog.user_id == user_id,
                    WorkoutLog.date >= week_start
                ).scalar() or 0) >= 150
            },
            {
                'name': '7-Day Streak',
                'description': 'Workout 7 days in a row',
                'icon': '🌟',
                'points': 300,
                'category': 'streak',
                'check': lambda: profile.current_streak >= 7
            },
            {
                'name': 'Calorie Crusher',
                'description': 'Burn 1000 calories in total',
                'icon': '🔥',
                'points': 250,
                'category': 'milestone',
                'check': lambda: profile.total_calories_burned >= 1000
            },
            {
                'name': 'Fitness Enthusiast',
                'description': 'Complete 10 workouts',
                'icon': '💪',
                'points': 200,
                'category': 'milestone',
                'check': lambda: profile.total_workouts >= 10
            },
            {
                'name': 'Dedicated Athlete',
                'description': 'Complete 25 workouts',
                'icon': '🏅',
                'points': 400,
                'category': 'milestone',
                'check': lambda: profile.total_workouts >= 25
            },
            {
                'name': 'Hour of Power',
                'description': 'Complete 60 minutes of total exercise',
                'icon': '⚡',
                'points': 100,
                'category': 'milestone',
                'check': lambda: profile.total_active_minutes >= 60
            },
            {
                'name': 'Marathon Mindset',
                'description': 'Complete 300 minutes of total exercise',
                'icon': '🏃',
                'points': 350,
                'category': 'milestone',
                'check': lambda: profile.total_active_minutes >= 300
            }
        ]
        
        # Check and award
        for ach_def in achievements_to_check:
            if ach_def['name'] not in earned:
                try:
                    if ach_def['check']():
                        new_achievement = Achievement(
                            user_id=user_id,
                            achievement_name=ach_def['name'],
                            description=ach_def['description'],
                            icon=ach_def['icon'],
                            category=ach_def['category'],
                            points=ach_def['points'],
                            earned_at=datetime.utcnow()
                        )
                        db.session.add(new_achievement)
                        print(f"Awarded achievement: {ach_def['name']} to user {user_id}")
                except Exception as e:
                    print(f"Error checking achievement {ach_def['name']}: {e}")
        
        db.session.commit()
    except Exception as e:
        print(f"Error in check_and_award_achievements: {e}")
        db.session.rollback()


# ==================== DASHBOARD STATS ====================

@physical_activity_bp.route('/api/client/physical-activity/stats')
@login_required
def api_get_stats():
    """Get physical activity dashboard statistics"""
    try:
        user_id = current_user.id
        today = date.today()
        week_start = today - timedelta(days=today.weekday())
        month_start = today.replace(day=1)
        
        # Get profile
        profile = PhysicalActivityProfile.query.filter_by(user_id=user_id).first()
        
        # Today's workouts
        today_workouts = WorkoutLog.query.filter(
            WorkoutLog.user_id == user_id,
            WorkoutLog.date == today
        ).all()
        
        today_calories = sum(w.calories_burned or 0 for w in today_workouts)
        today_minutes = sum(w.duration_minutes or 0 for w in today_workouts)
        
        # This week's stats
        week_workouts = WorkoutLog.query.filter(
            WorkoutLog.user_id == user_id,
            WorkoutLog.date >= week_start
        ).all()
        
        week_calories = sum(w.calories_burned or 0 for w in week_workouts)
        week_minutes = sum(w.duration_minutes or 0 for w in week_workouts)
        week_sessions = len(week_workouts)
        
        # Active goals count
        active_goals = WorkoutGoal.query.filter_by(
            user_id=user_id,
            is_active=True,
            is_completed=False
        ).count()
        
        # Upcoming scheduled workouts (next 7 days)
        upcoming_schedules = WorkoutSchedule.query.filter(
            WorkoutSchedule.user_id == user_id,
            WorkoutSchedule.is_completed == False,
            or_(
                WorkoutSchedule.scheduled_date >= today,
                WorkoutSchedule.is_recurring == True
            )
        ).count()
        
        # Recent achievements (last 30 days)
        recent_achievements = Achievement.query.filter(
            Achievement.user_id == user_id,
            Achievement.earned_at >= today - timedelta(days=30)
        ).count()
        
        return jsonify({
            'success': True,
            'stats': {
                'today': {
                    'workouts': len(today_workouts),
                    'calories': today_calories,
                    'minutes': today_minutes
                },
                'week': {
                    'sessions': week_sessions,
                    'calories': week_calories,
                    'minutes': week_minutes,
                    'target_minutes': 150  # WHO recommendation
                },
                'profile': {
                    'current_streak': profile.current_streak if profile else 0,
                    'longest_streak': profile.longest_streak if profile else 0,
                    'total_workouts': profile.total_workouts if profile else 0,
                    'total_calories': profile.total_calories_burned if profile else 0,
                    'fitness_level': profile.fitness_level if profile else 'beginner',
                    'primary_goal': profile.primary_goal if profile else None
                },
                'active_goals': active_goals,
                'upcoming_schedules': upcoming_schedules,
                'recent_achievements': recent_achievements,
                'has_profile': profile is not None
            }
        })
    except Exception as e:
        print(f"Error getting physical activity stats: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== PROFILE ENDPOINTS ====================

@physical_activity_bp.route('/api/client/physical-activity/profile', methods=['GET'])
@login_required
def api_get_profile():
    """Get user's physical activity profile"""
    try:
        profile = PhysicalActivityProfile.query.filter_by(
            user_id=current_user.id
        ).first()
        
        return jsonify({
            'success': True,
            'profile': profile.to_dict() if profile else None
        })
    except Exception as e:
        print(f"Error getting profile: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@physical_activity_bp.route('/api/client/physical-activity/profile', methods=['POST'])
@login_required
def api_save_profile():
    """Save or update user's physical activity profile"""
    try:
        data = request.get_json()
        
        profile = PhysicalActivityProfile.query.filter_by(
            user_id=current_user.id
        ).first()
        
        if not profile:
            profile = PhysicalActivityProfile(user_id=current_user.id)
            db.session.add(profile)
        
        # Update fields
        profile.fitness_level = data.get('fitness_level', profile.fitness_level)
        profile.primary_goal = data.get('primary_goal', profile.primary_goal)
        profile.secondary_goal = data.get('secondary_goal', profile.secondary_goal)
        profile.target_weight_kg = data.get('target_weight_kg', profile.target_weight_kg)
        profile.medical_limitations = data.get('medical_limitations', profile.medical_limitations)
        profile.injuries = data.get('injuries', profile.injuries)
        profile.preferred_activities = data.get('preferred_activities', profile.preferred_activities)
        profile.avoided_activities = data.get('avoided_activities', profile.avoided_activities)
        profile.preferred_workout_time = data.get('preferred_workout_time', profile.preferred_workout_time)
        profile.available_equipment = data.get('available_equipment', profile.available_equipment)
        profile.workout_location = data.get('workout_location', profile.workout_location)
        profile.workout_days_per_week = data.get('workout_days_per_week', profile.workout_days_per_week)
        profile.workout_duration_minutes = data.get('workout_duration_minutes', profile.workout_duration_minutes)
        profile.weekly_calorie_goal = data.get('weekly_calorie_goal', profile.weekly_calorie_goal)
        profile.daily_step_goal = data.get('daily_step_goal', profile.daily_step_goal)
        
        if data.get('target_date'):
            profile.target_date = datetime.strptime(data.get('target_date'), '%Y-%m-%d').date()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Profile saved successfully',
            'profile': profile.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        print(f"Error saving profile: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== WORKOUT ENDPOINTS ====================

@physical_activity_bp.route('/api/client/physical-activity/workouts', methods=['POST'])
@login_required
def api_log_workout():
    """Log a new workout"""
    try:
        data = request.get_json()
        
        # Get exercise MET value if exercise_id is provided
        met_value = data.get('met_value', 3.0)  # Default MET
        exercise = None
        if data.get('exercise_id'):
            exercise = Exercise.query.get(data.get('exercise_id'))
            if exercise:
                met_value = exercise.met_value
        
        # Get user weight for calorie calculation
        weight_kg = data.get('weight_kg') or get_user_weight(current_user.id)
        duration_minutes = data.get('duration_minutes', 30)
        
        # Calculate calories if not provided
        calories = data.get('calories_burned')
        if calories is None:
            calories = calculate_calories(met_value, weight_kg, duration_minutes)
        
        # Parse date and times
        workout_date = date.today()
        if data.get('date'):
            workout_date = datetime.strptime(data.get('date'), '%Y-%m-%d').date()
        
        start_time = None
        end_time = None
        if data.get('start_time'):
            start_time = datetime.strptime(data.get('start_time'), '%H:%M').time()
        if data.get('end_time'):
            end_time = datetime.strptime(data.get('end_time'), '%H:%M').time()
        
        workout = WorkoutLog(
            user_id=current_user.id,
            exercise_id=data.get('exercise_id'),
            date=workout_date,
            start_time=start_time,
            end_time=end_time,
            exercise_name=data.get('exercise_name') or (exercise.name if exercise else 'Unknown'),
            exercise_category=data.get('exercise_category') or (exercise.category if exercise else None),
            duration_minutes=duration_minutes,
            intensity=data.get('intensity', 'moderate'),
            calories_burned=calories,
            met_value_used=met_value,
            distance_km=data.get('distance_km'),
            pace_min_per_km=data.get('pace_min_per_km'),
            average_speed_kmh=data.get('average_speed_kmh'),
            sets=data.get('sets'),
            reps=data.get('reps'),
            weight_kg=data.get('weight_used_kg'),
            heart_rate_avg=data.get('heart_rate_avg'),
            heart_rate_max=data.get('heart_rate_max'),
            steps=data.get('steps'),
            perceived_exertion=data.get('perceived_exertion'),
            mood_before=data.get('mood_before'),
            mood_after=data.get('mood_after'),
            energy_level=data.get('energy_level'),
            location=data.get('location'),
            weather=data.get('weather'),
            notes=data.get('notes'),
            goal_id=data.get('goal_id'),
            schedule_id=data.get('schedule_id')
        )
        
        # Calculate total volume for strength exercises
        if workout.sets and workout.reps and workout.weight_kg:
            workout.total_volume = workout.sets * workout.reps * workout.weight_kg
        
        db.session.add(workout)
        db.session.flush()
        
        # Update profile stats
        update_profile_stats(
            current_user.id,
            calories=calories,
            duration=duration_minutes,
            workout_type=workout.exercise_category
        )
        db.session.flush()  # Persist profile changes before checking achievements
        
        # Update goal progress
        update_goal_progress(current_user.id)
        
        # Check and award achievements
        check_and_award_achievements(current_user.id)
        
        # Mark schedule as completed if linked
        if data.get('schedule_id'):
            schedule = WorkoutSchedule.query.get(data.get('schedule_id'))
            if schedule and schedule.user_id == current_user.id:
                schedule.is_completed = True
                schedule.completed_at = datetime.utcnow()
                schedule.workout_log_id = workout.id
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Workout logged successfully',
            'workout': workout.to_dict(),
            'calories_burned': calories
        })
    except Exception as e:
        db.session.rollback()
        print(f"Error logging workout: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@physical_activity_bp.route('/api/client/physical-activity/workouts', methods=['GET'])
@login_required
def api_get_workouts():
    """Get workout history"""
    try:
        # Filter parameters
        days = request.args.get('days', 7, type=int)
        category = request.args.get('category')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        limit = request.args.get('limit', 50, type=int)
        
        query = WorkoutLog.query.filter(WorkoutLog.user_id == current_user.id)
        
        # Date filtering
        if start_date:
            query = query.filter(WorkoutLog.date >= datetime.strptime(start_date, '%Y-%m-%d').date())
        elif not end_date:
            # Default to last N days if no specific dates
            query = query.filter(WorkoutLog.date >= date.today() - timedelta(days=days))
        
        if end_date:
            query = query.filter(WorkoutLog.date <= datetime.strptime(end_date, '%Y-%m-%d').date())
        
        # Category filter
        if category:
            query = query.filter(WorkoutLog.exercise_category == category)
        
        workouts = query.order_by(WorkoutLog.date.desc(), WorkoutLog.created_at.desc()).limit(limit).all()
        
        return jsonify({
            'success': True,
            'workouts': [w.to_dict() for w in workouts],
            'count': len(workouts)
        })
    except Exception as e:
        print(f"Error getting workouts: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@physical_activity_bp.route('/api/client/physical-activity/workouts/<int:workout_id>', methods=['DELETE'])
@login_required
def api_delete_workout(workout_id):
    """Delete a workout log"""
    try:
        workout = WorkoutLog.query.filter_by(
            id=workout_id,
            user_id=current_user.id
        ).first()
        
        if not workout:
            return jsonify({'success': False, 'error': 'Workout not found'}), 404
        
        # Update profile stats (subtract)
        profile = PhysicalActivityProfile.query.filter_by(user_id=current_user.id).first()
        if profile:
            profile.total_workouts = max(0, (profile.total_workouts or 0) - 1)
            profile.total_calories_burned = max(0, (profile.total_calories_burned or 0) - (workout.calories_burned or 0))
            profile.total_active_minutes = max(0, (profile.total_active_minutes or 0) - (workout.duration_minutes or 0))
        
        db.session.delete(workout)
        db.session.commit()
        
        # Update goal progress
        update_goal_progress(current_user.id)
        
        return jsonify({'success': True, 'message': 'Workout deleted'})
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting workout: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== EXERCISE ENDPOINTS ====================

@physical_activity_bp.route('/api/client/physical-activity/exercises', methods=['GET'])
@login_required
def api_get_exercises():
    """Search and filter exercises"""
    try:
        # Search and filter parameters
        search = request.args.get('search', '').strip()
        category = request.args.get('category')
        difficulty = request.args.get('difficulty')
        equipment = request.args.get('equipment')
        muscle_group = request.args.get('muscle_group')
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)
        
        query = Exercise.query.filter(Exercise.is_verified == True)
        
        # Apply filters
        if search:
            search_term = f'%{search}%'
            query = query.filter(or_(
                Exercise.name.ilike(search_term),
                Exercise.name_hindi.ilike(search_term),
                Exercise.description.ilike(search_term)
            ))
        
        if category:
            query = query.filter(Exercise.category == category)
        
        if difficulty:
            query = query.filter(Exercise.difficulty_level == difficulty)
        
        if equipment:
            # Search in JSON array
            query = query.filter(Exercise.equipment_required.contains([equipment]))
        
        if muscle_group:
            query = query.filter(or_(
                Exercise.muscle_groups.contains([muscle_group]),
                Exercise.primary_muscles.contains([muscle_group])
            ))
        
        # Get total count before pagination
        total_count = query.count()
        
        # Apply pagination and ordering
        exercises = query.order_by(
            Exercise.popularity_score.desc(),
            Exercise.name
        ).offset(offset).limit(limit).all()
        
        return jsonify({
            'success': True,
            'exercises': [e.to_dict() for e in exercises],
            'total': total_count,
            'limit': limit,
            'offset': offset
        })
    except Exception as e:
        print(f"Error getting exercises: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@physical_activity_bp.route('/api/client/physical-activity/exercises/<int:exercise_id>', methods=['GET'])
@login_required
def api_get_exercise(exercise_id):
    """Get single exercise details"""
    try:
        exercise = Exercise.query.get(exercise_id)
        
        if not exercise:
            return jsonify({'success': False, 'error': 'Exercise not found'}), 404
        
        return jsonify({
            'success': True,
            'exercise': exercise.to_dict()
        })
    except Exception as e:
        print(f"Error getting exercise: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@physical_activity_bp.route('/api/client/physical-activity/exercises/categories', methods=['GET'])
@login_required
def api_get_exercise_categories():
    """Get exercise categories with counts"""
    try:
        categories = db.session.query(
            Exercise.category,
            func.count(Exercise.id).label('count')
        ).filter(
            Exercise.is_verified == True
        ).group_by(Exercise.category).all()
        
        # Category metadata
        category_info = {
            'cardio': {'icon': 'fa-heartbeat', 'color': '#e74c3c'},
            'strength': {'icon': 'fa-dumbbell', 'color': '#3498db'},
            'flexibility': {'icon': 'fa-child', 'color': '#9b59b6'},
            'balance': {'icon': 'fa-balance-scale', 'color': '#1abc9c'},
            'sports': {'icon': 'fa-futbol', 'color': '#f39c12'},
            'hiit': {'icon': 'fa-fire', 'color': '#e67e22'},
            'dance': {'icon': 'fa-music', 'color': '#e91e63'},
            'yoga': {'icon': 'fa-spa', 'color': '#2ecc71'},
            'other': {'icon': 'fa-running', 'color': '#95a5a6'}
        }
        
        result = []
        for cat, count in categories:
            info = category_info.get(cat, category_info['other'])
            result.append({
                'name': cat,
                'count': count,
                'icon': info['icon'],
                'color': info['color']
            })
        
        return jsonify({
            'success': True,
            'categories': result
        })
    except Exception as e:
        print(f"Error getting categories: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@physical_activity_bp.route('/api/client/physical-activity/exercises', methods=['POST'])
@login_required
def api_add_exercise():
    """Add a custom exercise to the database"""
    try:
        data = request.get_json()
        
        name = data.get('name', '').strip()
        if not name:
            return jsonify({'success': False, 'error': 'Exercise name is required'}), 400
        
        # Check if exercise already exists
        existing = Exercise.query.filter(
            func.lower(Exercise.name) == name.lower()
        ).first()
        
        if existing:
            return jsonify({'success': False, 'error': 'Exercise with this name already exists'}), 400
        
        # Create new exercise
        new_exercise = Exercise(
            name=name,
            name_hindi=data.get('name_hindi'),
            category=data.get('category', 'other'),
            subcategory=data.get('subcategory'),
            met_value=float(data.get('met_value', 5.0)),
            difficulty_level=data.get('difficulty_level', 'medium'),
            equipment_required=data.get('equipment_required'),
            muscle_groups=data.get('muscle_groups'),
            description=data.get('description'),
            contraindications=data.get('contraindications'),
            is_verified=False,  # Custom exercises are not verified
            is_custom=True,
            created_by=current_user.id,
            popularity_score=0
        )
        
        db.session.add(new_exercise)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Exercise added successfully',
            'exercise': new_exercise.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        print(f"Error adding exercise: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== GOALS ENDPOINTS ====================

@physical_activity_bp.route('/api/client/physical-activity/goals', methods=['POST'])
@login_required
def api_create_goal():
    """Create a new workout goal"""
    try:
        data = request.get_json()
        
        goal = WorkoutGoal(
            user_id=current_user.id,
            goal_type=data.get('goal_type'),
            goal_name=data.get('goal_name'),
            description=data.get('description'),
            target_value=data.get('target_value'),
            target_unit=data.get('target_unit'),
            exercise_id=data.get('exercise_id'),
            target_sets=data.get('target_sets'),
            target_reps=data.get('target_reps'),
            target_weight=data.get('target_weight'),
            period_type=data.get('period_type', 'weekly'),
            reminder_enabled=data.get('reminder_enabled', True),
            is_active=True
        )
        
        # Set period start/end
        today = date.today()
        if goal.period_type == 'weekly':
            goal.period_start = today - timedelta(days=today.weekday())
            goal.period_end = goal.period_start + timedelta(days=6)
        elif goal.period_type == 'monthly':
            goal.period_start = today.replace(day=1)
            import calendar
            last_day = calendar.monthrange(today.year, today.month)[1]
            goal.period_end = today.replace(day=last_day)
        elif goal.period_type == 'daily':
            goal.period_start = today
            goal.period_end = today
        
        if data.get('reminder_time'):
            goal.reminder_time = datetime.strptime(data.get('reminder_time'), '%H:%M').time()
        
        db.session.add(goal)
        db.session.commit()
        
        # Update progress immediately
        update_goal_progress(current_user.id)
        db.session.refresh(goal)
        
        return jsonify({
            'success': True,
            'message': 'Goal created successfully',
            'goal': goal.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        print(f"Error creating goal: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@physical_activity_bp.route('/api/client/physical-activity/goals', methods=['GET'])
@login_required
def api_get_goals():
    """Get user's workout goals"""
    try:
        active_only = request.args.get('active_only', 'true').lower() == 'true'
        
        query = WorkoutGoal.query.filter(WorkoutGoal.user_id == current_user.id)
        
        if active_only:
            query = query.filter(WorkoutGoal.is_active == True)
        
        goals = query.order_by(WorkoutGoal.created_at.desc()).all()
        
        # Update progress for all active goals
        update_goal_progress(current_user.id)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'goals': [g.to_dict() for g in goals]
        })
    except Exception as e:
        print(f"Error getting goals: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@physical_activity_bp.route('/api/client/physical-activity/goals/<int:goal_id>', methods=['PUT'])
@login_required
def api_update_goal(goal_id):
    """Update a workout goal"""
    try:
        goal = WorkoutGoal.query.filter_by(
            id=goal_id,
            user_id=current_user.id
        ).first()
        
        if not goal:
            return jsonify({'success': False, 'error': 'Goal not found'}), 404
        
        data = request.get_json()
        
        if 'goal_name' in data:
            goal.goal_name = data['goal_name']
        if 'description' in data:
            goal.description = data['description']
        if 'target_value' in data:
            goal.target_value = data['target_value']
        if 'is_active' in data:
            goal.is_active = data['is_active']
        if 'reminder_enabled' in data:
            goal.reminder_enabled = data['reminder_enabled']
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Goal updated',
            'goal': goal.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        print(f"Error updating goal: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@physical_activity_bp.route('/api/client/physical-activity/goals/<int:goal_id>', methods=['DELETE'])
@login_required
def api_delete_goal(goal_id):
    """Delete a workout goal"""
    try:
        goal = WorkoutGoal.query.filter_by(
            id=goal_id,
            user_id=current_user.id
        ).first()
        
        if not goal:
            return jsonify({'success': False, 'error': 'Goal not found'}), 404
        
        db.session.delete(goal)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Goal deleted'})
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting goal: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== SCHEDULE ENDPOINTS ====================

@physical_activity_bp.route('/api/client/physical-activity/schedule', methods=['POST'])
@login_required
def api_create_schedule():
    """Create a scheduled workout"""
    try:
        data = request.get_json()
        
        schedule = WorkoutSchedule(
            user_id=current_user.id,
            exercise_id=data.get('exercise_id'),
            title=data.get('title'),
            exercise_name=data.get('exercise_name'),
            day_of_week=data.get('day_of_week'),
            planned_duration_minutes=data.get('planned_duration_minutes', 30),
            is_recurring=data.get('is_recurring', True),
            recurrence_pattern=data.get('recurrence_pattern', 'weekly'),
            reminder_enabled=data.get('reminder_enabled', True),
            reminder_minutes_before=data.get('reminder_minutes_before', 30),
            notes=data.get('notes')
        )
        
        if data.get('scheduled_date'):
            schedule.scheduled_date = datetime.strptime(data.get('scheduled_date'), '%Y-%m-%d').date()
        
        if data.get('scheduled_time'):
            schedule.scheduled_time = datetime.strptime(data.get('scheduled_time'), '%H:%M').time()
        
        if data.get('recurrence_end_date'):
            schedule.recurrence_end_date = datetime.strptime(data.get('recurrence_end_date'), '%Y-%m-%d').date()
        
        # Get exercise name if not provided
        if data.get('exercise_id') and not schedule.exercise_name:
            exercise = Exercise.query.get(data.get('exercise_id'))
            if exercise:
                schedule.exercise_name = exercise.name
        
        db.session.add(schedule)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Schedule created successfully',
            'schedule': schedule.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        print(f"Error creating schedule: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@physical_activity_bp.route('/api/client/physical-activity/schedule', methods=['GET'])
@login_required
def api_get_schedules():
    """Get workout schedules"""
    try:
        # Filter parameters
        show_completed = request.args.get('show_completed', 'false').lower() == 'true'
        week_only = request.args.get('week_only', 'false').lower() == 'true'
        
        today = date.today()
        
        query = WorkoutSchedule.query.filter(WorkoutSchedule.user_id == current_user.id)
        
        if not show_completed:
            query = query.filter(WorkoutSchedule.is_completed == False)
        
        if week_only:
            week_end = today + timedelta(days=7)
            query = query.filter(or_(
                WorkoutSchedule.is_recurring == True,
                WorkoutSchedule.scheduled_date.between(today, week_end)
            ))
        
        schedules = query.order_by(
            WorkoutSchedule.day_of_week,
            WorkoutSchedule.scheduled_time
        ).all()
        
        return jsonify({
            'success': True,
            'schedules': [s.to_dict() for s in schedules]
        })
    except Exception as e:
        print(f"Error getting schedules: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@physical_activity_bp.route('/api/client/physical-activity/schedule/<int:schedule_id>', methods=['PUT'])
@login_required
def api_update_schedule(schedule_id):
    """Update a scheduled workout"""
    try:
        schedule = WorkoutSchedule.query.filter_by(
            id=schedule_id,
            user_id=current_user.id
        ).first()
        
        if not schedule:
            return jsonify({'success': False, 'error': 'Schedule not found'}), 404
        
        data = request.get_json()
        
        if 'title' in data:
            schedule.title = data['title']
        if 'exercise_name' in data:
            schedule.exercise_name = data['exercise_name']
        if 'day_of_week' in data:
            schedule.day_of_week = data['day_of_week']
        if 'planned_duration_minutes' in data:
            schedule.planned_duration_minutes = data['planned_duration_minutes']
        if 'is_recurring' in data:
            schedule.is_recurring = data['is_recurring']
        if 'reminder_enabled' in data:
            schedule.reminder_enabled = data['reminder_enabled']
        if 'notes' in data:
            schedule.notes = data['notes']
        if 'is_completed' in data:
            schedule.is_completed = data['is_completed']
            if data['is_completed']:
                schedule.completed_at = datetime.utcnow()
        if 'was_skipped' in data:
            schedule.was_skipped = data['was_skipped']
            schedule.skip_reason = data.get('skip_reason')
        
        if data.get('scheduled_date'):
            schedule.scheduled_date = datetime.strptime(data['scheduled_date'], '%Y-%m-%d').date()
        if data.get('scheduled_time'):
            schedule.scheduled_time = datetime.strptime(data['scheduled_time'], '%H:%M').time()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Schedule updated',
            'schedule': schedule.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        print(f"Error updating schedule: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@physical_activity_bp.route('/api/client/physical-activity/schedule/<int:schedule_id>', methods=['DELETE'])
@login_required
def api_delete_schedule(schedule_id):
    """Delete a scheduled workout"""
    try:
        schedule = WorkoutSchedule.query.filter_by(
            id=schedule_id,
            user_id=current_user.id
        ).first()
        
        if not schedule:
            return jsonify({'success': False, 'error': 'Schedule not found'}), 404
        
        db.session.delete(schedule)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Schedule deleted'})
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting schedule: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== ACHIEVEMENTS ENDPOINTS ====================

@physical_activity_bp.route('/api/client/physical-activity/achievements', methods=['GET'])
@login_required
def api_get_achievements():
    """Get user's earned achievements"""
    try:
        achievements = Achievement.query.filter(
            Achievement.user_id == current_user.id
        ).order_by(Achievement.earned_at.desc()).all()
        
        # Group by category
        by_category = {}
        for ach in achievements:
            cat = ach.category or 'overall'
            if cat not in by_category:
                by_category[cat] = []
            by_category[cat].append(ach.to_dict())
        
        # Calculate total points
        total_points = sum(a.points or 0 for a in achievements)
        
        return jsonify({
            'success': True,
            'achievements': [a.to_dict() for a in achievements],
            'by_category': by_category,
            'total_achievements': len(achievements),
            'total_points': total_points
        })
    except Exception as e:
        print(f"Error getting achievements: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== FAVORITES ENDPOINTS ====================

@physical_activity_bp.route('/api/client/physical-activity/favorites', methods=['POST'])
@login_required
def api_add_favorite():
    """Add exercise to favorites"""
    try:
        data = request.get_json()
        exercise_id = data.get('exercise_id')
        
        if not exercise_id:
            return jsonify({'success': False, 'error': 'Exercise ID required'}), 400
        
        # Check if already a favorite
        existing = FavoriteExercise.query.filter_by(
            user_id=current_user.id,
            exercise_id=exercise_id
        ).first()
        
        if existing:
            return jsonify({'success': False, 'error': 'Already in favorites'}), 400
        
        # Check if exercise exists
        exercise = Exercise.query.get(exercise_id)
        if not exercise:
            return jsonify({'success': False, 'error': 'Exercise not found'}), 404
        
        favorite = FavoriteExercise(
            user_id=current_user.id,
            exercise_id=exercise_id,
            preferred_duration=data.get('preferred_duration'),
            preferred_intensity=data.get('preferred_intensity'),
            preferred_sets=data.get('preferred_sets'),
            preferred_reps=data.get('preferred_reps'),
            preferred_weight=data.get('preferred_weight'),
            notes=data.get('notes')
        )
        
        db.session.add(favorite)
        
        # Increase exercise popularity
        exercise.popularity_score = (exercise.popularity_score or 0) + 1
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Added to favorites',
            'favorite': favorite.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        print(f"Error adding favorite: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@physical_activity_bp.route('/api/client/physical-activity/favorites', methods=['GET'])
@login_required
def api_get_favorites():
    """Get user's favorite exercises"""
    try:
        favorites = FavoriteExercise.query.filter(
            FavoriteExercise.user_id == current_user.id
        ).order_by(FavoriteExercise.times_logged.desc()).all()
        
        return jsonify({
            'success': True,
            'favorites': [f.to_dict() for f in favorites]
        })
    except Exception as e:
        print(f"Error getting favorites: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@physical_activity_bp.route('/api/client/physical-activity/favorites/<int:favorite_id>', methods=['DELETE'])
@login_required
def api_remove_favorite(favorite_id):
    """Remove exercise from favorites"""
    try:
        favorite = FavoriteExercise.query.filter_by(
            id=favorite_id,
            user_id=current_user.id
        ).first()
        
        if not favorite:
            return jsonify({'success': False, 'error': 'Favorite not found'}), 404
        
        db.session.delete(favorite)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Removed from favorites'})
    except Exception as e:
        db.session.rollback()
        print(f"Error removing favorite: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500
