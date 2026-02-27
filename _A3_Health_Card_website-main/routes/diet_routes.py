"""
Diet Plan Blueprint - Routes for Client Diet & Nutrition Dashboard
Handles diet plans, meal logging, nutrition tracking, and progress
"""
from flask import Blueprint, jsonify, request, render_template
from flask_login import login_required, current_user
from datetime import datetime, date, timedelta
from sqlalchemy import func

# Blueprint definition
diet_bp = Blueprint('diet', __name__)

# Models and database - will be initialized from app.py
db = None
User = None
DietHealthProfile = None
DietGeneratedPlan = None
DietMeal = None
DietMealItem = None
DietFoodDatabase = None
DietWaterLog = None
DietWeightLog = None
DietFavoriteFood = None


def init_blueprint(database, models):
    """Initialize blueprint with database and models"""
    global db, User, DietHealthProfile, DietGeneratedPlan, DietMeal
    global DietMealItem, DietFoodDatabase, DietWaterLog, DietWeightLog, DietFavoriteFood
    
    db = database
    User = models.get('User')
    DietHealthProfile = models.get('DietHealthProfile')
    DietGeneratedPlan = models.get('DietGeneratedPlan')
    DietMeal = models.get('DietMeal')
    DietMealItem = models.get('DietMealItem')
    DietFoodDatabase = models.get('DietFoodDatabase')
    DietWaterLog = models.get('DietWaterLog')
    DietWeightLog = models.get('DietWeightLog')
    DietFavoriteFood = models.get('DietFavoriteFood')
    
    # Auto-seed food database on first run
    try:
        seed_food_database_if_empty(database, DietFoodDatabase)
    except Exception as e:
        print(f"Note: Could not auto-seed food database: {e}")


def seed_food_database_if_empty(database, FoodModel):
    """Automatically seed food database if empty - runs once on app startup"""
    if not FoodModel:
        return
    
    try:
        count = FoodModel.query.count()
        if count > 0:
            return  # Already has data
        
        print("Auto-seeding food database...")
        
        # Food data: [name, hindi, category, cuisine, serving_size, unit, cal, protein, carbs, fat, fiber, sugar, sodium, is_veg, is_vegan, is_gf, gi]
        FOODS = [
            ["Roti (Wheat)", "रोटी", "Grains", "Indian", 1, "piece", 71, 2.7, 15, 0.4, 1.9, 0.4, 1, True, True, False, 62],
            ["Rice (Cooked)", "चावल", "Grains", "Indian", 100, "g", 130, 2.7, 28, 0.3, 0.4, 0, 1, True, True, True, 73],
            ["Brown Rice", "ब्राउन राइस", "Grains", "Indian", 100, "g", 111, 2.6, 23, 0.9, 1.8, 0, 5, True, True, True, 50],
            ["Paratha", "पराठा", "Grains", "Indian", 1, "piece", 150, 4, 20, 6, 2, 0.5, 200, True, True, False, 55],
            ["Poha", "पोहा", "Grains", "Indian", 100, "g", 110, 2.5, 23, 0.5, 0.8, 1, 15, True, True, True, 64],
            ["Idli", "इडली", "Grains", "Indian", 1, "piece", 39, 2, 8, 0.1, 0.4, 0.3, 50, True, True, True, 55],
            ["Dosa", "डोसा", "Grains", "Indian", 1, "piece", 133, 3.9, 18, 5, 0.9, 1, 120, True, True, True, 60],
            ["Dal (Masoor)", "मसूर दाल", "Pulses", "Indian", 100, "g", 116, 9, 20, 0.4, 7.9, 2, 2, True, True, True, 30],
            ["Dal (Moong)", "मूंग दाल", "Pulses", "Indian", 100, "g", 105, 7, 18, 0.4, 5, 2, 2, True, True, True, 28],
            ["Dal (Toor)", "तूर दाल", "Pulses", "Indian", 100, "g", 128, 8, 22, 0.6, 5.2, 3, 5, True, True, True, 32],
            ["Rajma", "राजमा", "Pulses", "Indian", 100, "g", 127, 8.7, 23, 0.5, 6.4, 0.3, 2, True, True, True, 29],
            ["Chole", "छोले", "Pulses", "Indian", 100, "g", 164, 8.9, 27, 2.6, 7.6, 4.8, 7, True, True, True, 28],
            ["Paneer", "पनीर", "Dairy", "Indian", 100, "g", 265, 18.3, 1.2, 20.8, 0, 0.5, 20, True, False, True, 27],
            ["Curd (Dahi)", "दही", "Dairy", "Indian", 100, "g", 61, 3.5, 4.7, 3.3, 0, 4.7, 46, True, False, True, 35],
            ["Palak (Spinach)", "पालक", "Vegetables", "Indian", 100, "g", 23, 2.9, 3.6, 0.4, 2.2, 0.4, 79, True, True, True, 15],
            ["Bhindi (Okra)", "भिंडी", "Vegetables", "Indian", 100, "g", 33, 1.9, 7, 0.2, 3.2, 1.5, 7, True, True, True, 20],
            ["Gobi (Cauliflower)", "गोभी", "Vegetables", "Indian", 100, "g", 25, 1.9, 5, 0.3, 2, 1.9, 30, True, True, True, 15],
            ["Aloo Sabzi", "आलू सब्ज़ी", "Vegetables", "Indian", 100, "g", 97, 2, 13, 4, 1.5, 1, 250, True, True, True, 65],
            ["Chicken Curry", "चिकन करी", "Non-Veg", "Indian", 100, "g", 165, 25, 4, 6, 0.5, 1.5, 450, False, False, True, 0],
            ["Egg Curry", "अंडा करी", "Non-Veg", "Indian", 1, "egg", 155, 12, 3, 11, 0, 1, 350, False, False, True, 0],
            ["Banana", "केला", "Fruits", "General", 1, "medium", 105, 1.3, 27, 0.4, 3.1, 14, 1, True, True, True, 51],
            ["Apple", "सेब", "Fruits", "General", 1, "medium", 95, 0.5, 25, 0.3, 4.4, 19, 2, True, True, True, 36],
            ["Mango", "आम", "Fruits", "Indian", 100, "g", 60, 0.8, 15, 0.4, 1.6, 14, 1, True, True, True, 51],
            ["Orange", "संतरा", "Fruits", "General", 1, "medium", 62, 1.2, 15, 0.2, 3.1, 12, 0, True, True, True, 43],
            ["Almonds", "बादाम", "Nuts", "General", 28, "g", 164, 6, 6, 14, 3.5, 1.2, 0, True, True, True, 15],
            ["Walnuts", "अखरोट", "Nuts", "General", 28, "g", 185, 4.3, 3.9, 18.5, 1.9, 0.7, 1, True, True, True, 15],
            ["Chai (Milk Tea)", "चाय", "Beverages", "Indian", 150, "ml", 50, 1.5, 7, 1.5, 0, 6, 25, True, False, True, 40],
            ["Green Tea", "ग्रीन टी", "Beverages", "General", 150, "ml", 2, 0, 0, 0, 0, 0, 2, True, True, True, 0],
            ["Oatmeal", "दलिया", "Grains", "International", 100, "g", 68, 2.4, 12, 1.4, 1.7, 0.5, 49, True, True, True, 55],
            ["Eggs (Boiled)", "उबले अंडे", "Proteins", "International", 1, "large", 78, 6, 0.6, 5, 0, 0.6, 62, False, False, True, 0],
            ["Chicken Breast", "चिकन ब्रेस्ट", "Proteins", "International", 100, "g", 165, 31, 0, 3.6, 0, 0, 74, False, False, True, 0],
            ["Samosa", "समोसा", "Snacks", "Indian", 1, "piece", 262, 4, 24, 17, 2, 2, 300, True, True, False, 70],
            ["Gulab Jamun", "गुलाब जामुन", "Sweets", "Indian", 1, "piece", 150, 2, 22, 6, 0, 18, 50, True, False, True, 75],
        ]
        
        for food in FOODS:
            new_food = FoodModel(
                food_name=food[0], food_name_hindi=food[1], category=food[2], cuisine=food[3],
                serving_size=food[4], serving_unit=food[5], calories=food[6], protein=food[7],
                carbs=food[8], fat=food[9], fiber=food[10], sugar=food[11], sodium_mg=food[12],
                is_vegetarian=food[13], is_vegan=food[14], is_gluten_free=food[15],
                glycemic_index=food[16] if food[16] > 0 else None, is_verified=True, is_custom=False
            )
            database.session.add(new_food)
        
        database.session.commit()
        print(f"Auto-seeded {len(FOODS)} foods to database!")
    except Exception as e:
        database.session.rollback()
        print(f"Food seeding skipped: {e}")


# ==================== PAGE ROUTES ====================

@diet_bp.route('/client/diet-plan')
@login_required
def diet_plan_page():
    """Render the diet plan page"""
    return render_template('diet_plan.html')


# ==================== DASHBOARD STATS ====================

@diet_bp.route('/api/client/diet/stats')
@login_required
def api_diet_stats():
    """Get diet dashboard statistics"""
    try:
        user_id = current_user.id
        today = date.today()
        week_ago = today - timedelta(days=7)
        
        # Get active diet plan
        active_plan = DietGeneratedPlan.query.filter_by(
            user_id=user_id,
            is_active=True
        ).first()
        
        # Get today's meals
        today_meals = DietMeal.query.filter(
            DietMeal.user_id == user_id,
            DietMeal.date == today
        ).all()
        
        today_calories = sum(m.total_calories or 0 for m in today_meals)
        today_protein = sum(m.total_protein or 0 for m in today_meals)
        today_carbs = sum(m.total_carbs or 0 for m in today_meals)
        today_fat = sum(m.total_fat or 0 for m in today_meals)
        
        # Get today's water intake
        water_log = DietWaterLog.query.filter_by(
            user_id=user_id,
            date=today
        ).first()
        
        water_ml = water_log.amount_ml if water_log else 0
        water_goal = water_log.goal_ml if water_log else 2500
        
        # Get latest weight
        latest_weight = DietWeightLog.query.filter_by(
            user_id=user_id
        ).order_by(DietWeightLog.date.desc()).first()
        
        # Get health profile for targets
        health_profile = DietHealthProfile.query.filter_by(
            user_id=user_id
        ).first()
        
        # Calculate weekly average
        week_meals = DietMeal.query.filter(
            DietMeal.user_id == user_id,
            DietMeal.date >= week_ago
        ).all()
        
        week_calories = sum(m.total_calories or 0 for m in week_meals)
        days_logged = len(set(m.date for m in week_meals))
        avg_daily_calories = round(week_calories / days_logged) if days_logged > 0 else 0
        
        return jsonify({
            'success': True,
            'stats': {
                'today': {
                    'calories': round(today_calories),
                    'protein': round(today_protein, 1),
                    'carbs': round(today_carbs, 1),
                    'fat': round(today_fat, 1),
                    'meals_logged': len(today_meals)
                },
                'water': {
                    'amount_ml': water_ml,
                    'goal_ml': water_goal,
                    'percentage': round((water_ml / water_goal) * 100) if water_goal else 0
                },
                'weight': {
                    'current_kg': latest_weight.weight_kg if latest_weight else None,
                    'bmi': latest_weight.bmi if latest_weight else None,
                    'last_logged': latest_weight.date.isoformat() if latest_weight else None
                },
                'targets': {
                    'calories': active_plan.daily_calories if active_plan else 2000,
                    'protein_g': active_plan.protein_g if active_plan else 60,
                    'carbs_g': active_plan.carbs_g if active_plan else 250,
                    'fat_g': active_plan.fat_g if active_plan else 65
                },
                'has_active_plan': active_plan is not None,
                'has_health_profile': health_profile is not None,
                'avg_daily_calories': avg_daily_calories
            }
        })
    except Exception as e:
        print(f"Error getting diet stats: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== HEALTH PROFILE ====================

@diet_bp.route('/api/client/diet/health-profile', methods=['GET'])
@login_required
def api_get_health_profile():
    """Get user's health profile"""
    try:
        profile = DietHealthProfile.query.filter_by(
            user_id=current_user.id
        ).first()
        
        return jsonify({
            'success': True,
            'profile': profile.to_dict() if profile else None
        })
    except Exception as e:
        print(f"Error getting health profile: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@diet_bp.route('/api/client/diet/health-profile', methods=['POST'])
@login_required
def api_save_health_profile():
    """Save or update user's health profile"""
    try:
        data = request.get_json()
        
        profile = DietHealthProfile.query.filter_by(
            user_id=current_user.id
        ).first()
        
        if not profile:
            profile = DietHealthProfile(user_id=current_user.id)
            db.session.add(profile)
        
        # Update fields
        profile.fasting_glucose = data.get('fasting_glucose')
        profile.hba1c = data.get('hba1c')
        profile.total_cholesterol = data.get('total_cholesterol')
        profile.triglycerides = data.get('triglycerides')
        profile.hdl_cholesterol = data.get('hdl_cholesterol')
        profile.ldl_cholesterol = data.get('ldl_cholesterol')
        profile.blood_pressure = data.get('blood_pressure')
        profile.known_conditions = data.get('known_conditions', [])
        profile.allergies = data.get('allergies', [])
        profile.diet_preference = data.get('diet_preference')
        profile.cuisine_preference = data.get('cuisine_preference', [])
        profile.height_cm = data.get('height_cm')
        profile.weight_kg = data.get('weight_kg')
        profile.age = data.get('age')
        profile.gender = data.get('gender')
        profile.activity_level = data.get('activity_level')
        profile.goal = data.get('goal')
        profile.target_weight_kg = data.get('target_weight_kg')
        
        if data.get('target_date'):
            profile.target_date = datetime.strptime(data.get('target_date'), '%Y-%m-%d').date()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Health profile saved',
            'profile': profile.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        print(f"Error saving health profile: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== GENERATED DIET PLANS ====================

@diet_bp.route('/api/client/diet/plans', methods=['GET'])
@login_required
def api_get_diet_plans():
    """Get user's diet plans"""
    try:
        plans = DietGeneratedPlan.query.filter_by(
            user_id=current_user.id
        ).order_by(DietGeneratedPlan.created_at.desc()).all()
        
        return jsonify({
            'success': True,
            'plans': [p.to_dict() for p in plans]
        })
    except Exception as e:
        print(f"Error getting diet plans: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@diet_bp.route('/api/client/diet/plans/active', methods=['GET'])
@login_required
def api_get_active_plan():
    """Get user's active diet plan"""
    try:
        plan = DietGeneratedPlan.query.filter_by(
            user_id=current_user.id,
            is_active=True
        ).first()
        
        return jsonify({
            'success': True,
            'plan': plan.to_dict() if plan else None
        })
    except Exception as e:
        print(f"Error getting active plan: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@diet_bp.route('/api/client/diet/plans/<int:plan_id>/activate', methods=['PUT'])
@login_required
def api_activate_plan(plan_id):
    """Activate a diet plan and deactivate others"""
    try:
        # Deactivate all plans
        DietGeneratedPlan.query.filter_by(
            user_id=current_user.id
        ).update({'is_active': False})
        
        # Activate selected plan
        plan = DietGeneratedPlan.query.filter_by(
            id=plan_id,
            user_id=current_user.id
        ).first()
        
        if not plan:
            return jsonify({'success': False, 'error': 'Plan not found'}), 404
        
        plan.is_active = True
        plan.start_date = date.today()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Plan activated',
            'plan': plan.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        print(f"Error activating plan: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@diet_bp.route('/api/client/diet/plans/<int:plan_id>', methods=['DELETE'])
@login_required
def api_delete_plan(plan_id):
    """Delete a diet plan"""
    try:
        plan = DietGeneratedPlan.query.filter_by(
            id=plan_id,
            user_id=current_user.id
        ).first()
        
        if not plan:
            return jsonify({'success': False, 'error': 'Plan not found'}), 404
        
        db.session.delete(plan)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Plan deleted'})
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting plan: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@diet_bp.route('/api/client/diet/generate-plan', methods=['POST'])
@login_required
def api_generate_diet_plan():
    """Generate a personalized diet plan based on health profile"""
    try:
        data = request.get_json()
        
        # Get or create health profile
        profile = DietHealthProfile.query.filter_by(user_id=current_user.id).first()
        if not profile:
            profile = DietHealthProfile(user_id=current_user.id)
            db.session.add(profile)
        
        # Update health profile with submitted data
        profile.height_cm = data.get('height_cm', profile.height_cm)
        profile.weight_kg = data.get('weight_kg', profile.weight_kg)
        profile.age = data.get('age', profile.age)
        profile.gender = data.get('gender', profile.gender)
        profile.activity_level = data.get('activity_level', profile.activity_level)
        profile.goal = data.get('goal', profile.goal)
        profile.known_conditions = data.get('known_conditions', profile.known_conditions or [])
        profile.allergies = data.get('allergies', profile.allergies or [])
        profile.diet_preference = data.get('diet_preference', profile.diet_preference)
        profile.target_weight_kg = data.get('target_weight_kg')
        
        # Lab values (optional)
        profile.fasting_glucose = data.get('fasting_glucose')
        profile.hba1c = data.get('hba1c')
        profile.total_cholesterol = data.get('total_cholesterol')
        profile.blood_pressure = data.get('blood_pressure')
        
        db.session.flush()
        
        # Validate required fields
        if not all([profile.height_cm, profile.weight_kg, profile.age, profile.gender, profile.activity_level]):
            return jsonify({
                'success': False,
                'error': 'Missing required fields: height, weight, age, gender, activity level'
            }), 400
        
        # ==================== CALCULATE BMR ====================
        # Using Mifflin-St Jeor Equation (most accurate)
        if profile.gender and profile.gender.lower() == 'female':
            bmr = (10 * profile.weight_kg) + (6.25 * profile.height_cm) - (5 * profile.age) - 161
        else:
            bmr = (10 * profile.weight_kg) + (6.25 * profile.height_cm) - (5 * profile.age) + 5
        
        # ==================== CALCULATE TDEE ====================
        activity_multipliers = {
            'sedentary': 1.2,      # Little/no exercise
            'light': 1.375,        # Exercise 1-3 days/week
            'moderate': 1.55,      # Exercise 3-5 days/week
            'active': 1.725,       # Exercise 6-7 days/week
            'very_active': 1.9     # Very hard exercise/physical job
        }
        
        activity_key = (profile.activity_level or 'sedentary').lower().replace(' ', '_')
        multiplier = activity_multipliers.get(activity_key, 1.2)
        tdee = round(bmr * multiplier)
        
        # ==================== ADJUST FOR GOAL ====================
        goal = (profile.goal or 'maintain').lower().replace(' ', '_')
        
        if goal == 'weight_loss':
            daily_calories = round(tdee - 500)  # 0.5 kg/week deficit
        elif goal == 'aggressive_loss':
            daily_calories = round(tdee - 750)  # Faster but harder
        elif goal == 'weight_gain':
            daily_calories = round(tdee + 300)  # Lean gain
        elif goal == 'muscle_gain':
            daily_calories = round(tdee + 400)
        else:  # maintain
            daily_calories = tdee
        
        # Minimum calorie floors for safety
        min_calories = 1200 if profile.gender.lower() == 'female' else 1500
        daily_calories = max(daily_calories, min_calories)
        
        # ==================== MACRO DISTRIBUTION ====================
        conditions = [c.lower() for c in (profile.known_conditions or [])]
        
        # Default macros (percentage of calories)
        protein_pct = 25
        carbs_pct = 50
        fat_pct = 25
        
        # Condition-specific adjustments
        recommendations = []
        foods_to_avoid = []
        foods_to_include = []
        
        if 'diabetes' in conditions or 'prediabetes' in conditions:
            protein_pct = 30
            carbs_pct = 40
            fat_pct = 30
            recommendations.append("Focus on low glycemic index (GI) foods")
            recommendations.append("Avoid refined sugars and processed carbs")
            recommendations.append("Include fiber-rich vegetables with every meal")
            foods_to_avoid.extend(['white rice', 'white bread', 'sugary drinks', 'sweets', 'fruit juice'])
            foods_to_include.extend(['brown rice', 'whole grains', 'leafy greens', 'cinnamon', 'bitter gourd'])
        
        if 'hypertension' in conditions or 'high_bp' in conditions:
            recommendations.append("Follow DASH diet principles - low sodium")
            recommendations.append("Limit sodium to 1500-2000mg per day")
            recommendations.append("Increase potassium-rich foods")
            foods_to_avoid.extend(['processed foods', 'pickles', 'papad', 'excess salt', 'canned soups'])
            foods_to_include.extend(['banana', 'spinach', 'sweet potato', 'beans', 'yogurt'])
        
        if 'pcod' in conditions or 'pcos' in conditions:
            protein_pct = 30
            carbs_pct = 35
            fat_pct = 35
            recommendations.append("Focus on anti-inflammatory foods")
            recommendations.append("Choose complex carbs over simple carbs")
            recommendations.append("Include healthy fats from nuts and seeds")
            foods_to_avoid.extend(['dairy', 'refined carbs', 'fried foods', 'red meat'])
            foods_to_include.extend(['flaxseeds', 'walnuts', 'fatty fish', 'turmeric', 'green tea'])
        
        if 'thyroid' in conditions or 'hypothyroid' in conditions:
            recommendations.append("Limit goitrogens (raw cruciferous vegetables)")
            recommendations.append("Ensure adequate iodine and selenium")
            foods_to_avoid.extend(['raw cabbage', 'raw broccoli', 'soy products'])
            foods_to_include.extend(['eggs', 'fish', 'brazil nuts', 'cooked vegetables'])
        
        if 'cholesterol' in conditions or 'high_cholesterol' in conditions:
            protein_pct = 25
            carbs_pct = 50
            fat_pct = 25
            recommendations.append("Reduce saturated fats, increase fiber")
            recommendations.append("Include omega-3 rich foods")
            foods_to_avoid.extend(['fried foods', 'butter', 'ghee', 'red meat', 'full-fat dairy'])
            foods_to_include.extend(['oats', 'flaxseeds', 'fish', 'olive oil', 'almonds'])
        
        # Diet preference adjustments
        diet_pref = (profile.diet_preference or '').lower()
        if 'vegan' in diet_pref:
            recommendations.append("Ensure adequate B12, iron, and protein from plant sources")
            foods_to_include.extend(['tofu', 'tempeh', 'legumes', 'nutritional yeast'])
        elif 'vegetarian' in diet_pref:
            foods_to_include.extend(['paneer', 'curd', 'legumes', 'eggs' if 'egg' in diet_pref else 'tofu'])
        
        # ==================== CALCULATE MACROS IN GRAMS ====================
        protein_g = round((daily_calories * protein_pct / 100) / 4)  # 4 cal/g
        carbs_g = round((daily_calories * carbs_pct / 100) / 4)      # 4 cal/g
        fat_g = round((daily_calories * fat_pct / 100) / 9)          # 9 cal/g
        fiber_g = 25 if profile.gender.lower() == 'female' else 30   # Recommended fiber
        
        # ==================== MEAL DISTRIBUTION ====================
        meal_plan = {
            'breakfast': {
                'time': '7:00 - 9:00 AM',
                'calories': round(daily_calories * 0.25),
                'description': 'Light but nutritious start'
            },
            'mid_morning_snack': {
                'time': '10:30 - 11:00 AM',
                'calories': round(daily_calories * 0.10),
                'description': 'Healthy snack to maintain energy'
            },
            'lunch': {
                'time': '12:30 - 2:00 PM',
                'calories': round(daily_calories * 0.30),
                'description': 'Largest meal of the day'
            },
            'evening_snack': {
                'time': '4:00 - 5:00 PM',
                'calories': round(daily_calories * 0.10),
                'description': 'Light snack before dinner'
            },
            'dinner': {
                'time': '7:00 - 8:30 PM',
                'calories': round(daily_calories * 0.25),
                'description': 'Balanced, lighter meal'
            }
        }
        
        # Water recommendation based on weight
        water_ml = round(profile.weight_kg * 35)  # 35ml per kg body weight
        
        # ==================== CREATE DIET PLAN ====================
        # Deactivate existing plans
        DietGeneratedPlan.query.filter_by(user_id=current_user.id).update({'is_active': False})
        
        plan = DietGeneratedPlan(
            user_id=current_user.id,
            plan_name=f"{goal.replace('_', ' ').title()} Plan - {date.today().strftime('%b %Y')}",
            plan_type=goal,  # Changed from 'goal' to 'plan_type'
            daily_calories=daily_calories,
            protein_g=protein_g,
            carbs_g=carbs_g,
            fat_g=fat_g,
            fiber_g=fiber_g,
            protein_percent=protein_pct,
            carbs_percent=carbs_pct,
            fat_percent=fat_pct,
            meal_timing=meal_plan,  # Changed from 'meal_distribution' to 'meal_timing'
            special_instructions='\n'.join(recommendations),  # Changed from 'recommendations'
            foods_to_avoid=list(set(foods_to_avoid)),
            recommended_foods=list(set(foods_to_include)),  # Changed from 'foods_to_include'
            is_active=True,
            start_date=date.today()
        )
        
        db.session.add(plan)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Diet plan generated successfully!',
            'plan': plan.to_dict(),
            'calculation': {
                'bmr': round(bmr),
                'tdee': tdee,
                'goal_adjustment': daily_calories - tdee,
                'protein_pct': protein_pct,
                'carbs_pct': carbs_pct,
                'fat_pct': fat_pct
            }
        })
        
    except Exception as e:
        db.session.rollback()
        print(f"Error generating diet plan: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== MEALS ====================

@diet_bp.route('/api/client/diet/meals', methods=['POST'])
@login_required
def api_log_meal():
    """Log a new meal"""
    try:
        data = request.get_json()
        
        meal = DietMeal(
            user_id=current_user.id,
            date=datetime.strptime(data.get('date', date.today().isoformat()), '%Y-%m-%d').date(),
            meal_type=data.get('meal_type'),
            meal_name=data.get('meal_name'),
            notes=data.get('notes')
        )
        
        db.session.add(meal)
        db.session.flush()  # Get the meal ID
        
        # Add food items
        total_calories = 0
        total_protein = 0
        total_carbs = 0
        total_fat = 0
        total_fiber = 0
        
        for item_data in data.get('items', []):
            item = DietMealItem(
                meal_id=meal.id,
                food_id=item_data.get('food_id'),
                food_name=item_data.get('food_name'),
                quantity=item_data.get('quantity'),
                serving_unit=item_data.get('serving_unit'),
                calories=item_data.get('calories', 0),
                protein=item_data.get('protein', 0),
                carbs=item_data.get('carbs', 0),
                fat=item_data.get('fat', 0),
                fiber=item_data.get('fiber', 0)
            )
            db.session.add(item)
            
            total_calories += item.calories or 0
            total_protein += item.protein or 0
            total_carbs += item.carbs or 0
            total_fat += item.fat or 0
            total_fiber += item.fiber or 0
        
        # Update meal totals
        meal.total_calories = total_calories
        meal.total_protein = total_protein
        meal.total_carbs = total_carbs
        meal.total_fat = total_fat
        meal.total_fiber = total_fiber
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Meal logged',
            'meal': meal.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        print(f"Error logging meal: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@diet_bp.route('/api/client/diet/meals', methods=['GET'])
@login_required
def api_get_meals():
    """Get meal history"""
    try:
        days = request.args.get('days', 7, type=int)
        meal_date = request.args.get('date')
        
        query = DietMeal.query.filter(DietMeal.user_id == current_user.id)
        
        if meal_date:
            query = query.filter(DietMeal.date == datetime.strptime(meal_date, '%Y-%m-%d').date())
        else:
            start_date = date.today() - timedelta(days=days)
            query = query.filter(DietMeal.date >= start_date)
        
        meals = query.order_by(DietMeal.date.desc(), DietMeal.created_at.desc()).all()
        
        return jsonify({
            'success': True,
            'meals': [m.to_dict() for m in meals]
        })
    except Exception as e:
        print(f"Error getting meals: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@diet_bp.route('/api/client/diet/meals/<int:meal_id>', methods=['DELETE'])
@login_required
def api_delete_meal(meal_id):
    """Delete a meal"""
    try:
        meal = DietMeal.query.filter_by(
            id=meal_id,
            user_id=current_user.id
        ).first()
        
        if not meal:
            return jsonify({'success': False, 'error': 'Meal not found'}), 404
        
        db.session.delete(meal)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Meal deleted'})
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting meal: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== WATER TRACKING ====================

@diet_bp.route('/api/client/diet/water', methods=['GET'])
@login_required
def api_get_water():
    """Get water intake"""
    try:
        log_date = request.args.get('date', date.today().isoformat())
        log_date = datetime.strptime(log_date, '%Y-%m-%d').date()
        
        water_log = DietWaterLog.query.filter_by(
            user_id=current_user.id,
            date=log_date
        ).first()
        
        return jsonify({
            'success': True,
            'water': water_log.to_dict() if water_log else {
                'date': log_date.isoformat(),
                'amount_ml': 0,
                'goal_ml': 2500,
                'glasses': 0,
                'percentage': 0
            }
        })
    except Exception as e:
        print(f"Error getting water: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@diet_bp.route('/api/client/diet/water', methods=['POST'])
@login_required
def api_log_water():
    """Log water intake"""
    try:
        data = request.get_json()
        log_date = datetime.strptime(data.get('date', date.today().isoformat()), '%Y-%m-%d').date()
        
        water_log = DietWaterLog.query.filter_by(
            user_id=current_user.id,
            date=log_date
        ).first()
        
        if not water_log:
            water_log = DietWaterLog(
                user_id=current_user.id,
                date=log_date,
                goal_ml=data.get('goal_ml', 2500)
            )
            db.session.add(water_log)
        
        # Add to current amount
        add_ml = data.get('add_ml', 0)
        add_glasses = data.get('add_glasses', 0)
        
        if add_glasses:
            add_ml = add_glasses * 250  # 1 glass = 250ml
        
        water_log.amount_ml = (water_log.amount_ml or 0) + add_ml
        water_log.glasses = water_log.amount_ml // 250
        
        if data.get('goal_ml'):
            water_log.goal_ml = data.get('goal_ml')
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Water logged',
            'water': water_log.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        print(f"Error logging water: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== WEIGHT TRACKING ====================

@diet_bp.route('/api/client/diet/weight', methods=['GET'])
@login_required
def api_get_weight():
    """Get weight history"""
    try:
        days = request.args.get('days', 30, type=int)
        start_date = date.today() - timedelta(days=days)
        
        logs = DietWeightLog.query.filter(
            DietWeightLog.user_id == current_user.id,
            DietWeightLog.date >= start_date
        ).order_by(DietWeightLog.date.desc()).all()
        
        return jsonify({
            'success': True,
            'logs': [l.to_dict() for l in logs]
        })
    except Exception as e:
        print(f"Error getting weight: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@diet_bp.route('/api/client/diet/weight', methods=['POST'])
@login_required
def api_log_weight():
    """Log weight and measurements"""
    try:
        data = request.get_json()
        log_date = datetime.strptime(data.get('date', date.today().isoformat()), '%Y-%m-%d').date()
        
        # Check if entry exists for this date
        weight_log = DietWeightLog.query.filter_by(
            user_id=current_user.id,
            date=log_date
        ).first()
        
        if not weight_log:
            weight_log = DietWeightLog(
                user_id=current_user.id,
                date=log_date
            )
            db.session.add(weight_log)
        
        weight_log.weight_kg = data.get('weight_kg')
        weight_log.waist_cm = data.get('waist_cm')
        weight_log.chest_cm = data.get('chest_cm')
        weight_log.hip_cm = data.get('hip_cm')
        weight_log.arm_cm = data.get('arm_cm')
        weight_log.thigh_cm = data.get('thigh_cm')
        weight_log.body_fat_percent = data.get('body_fat_percent')
        weight_log.notes = data.get('notes')
        
        # Calculate BMI if height available
        profile = DietHealthProfile.query.filter_by(user_id=current_user.id).first()
        if profile and profile.height_cm and weight_log.weight_kg:
            height_m = profile.height_cm / 100
            weight_log.bmi = round(weight_log.weight_kg / (height_m * height_m), 1)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Weight logged',
            'log': weight_log.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        print(f"Error logging weight: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== FOOD DATABASE ====================

@diet_bp.route('/api/client/diet/foods/search', methods=['GET'])
@login_required
def api_search_foods():
    """Search food database"""
    try:
        query = request.args.get('q', '').strip()
        category = request.args.get('category')
        cuisine = request.args.get('cuisine')
        is_vegetarian = request.args.get('vegetarian')
        limit = request.args.get('limit', 20, type=int)
        
        search = DietFoodDatabase.query
        
        if query:
            search = search.filter(
                db.or_(
                    DietFoodDatabase.food_name.ilike(f'%{query}%'),
                    DietFoodDatabase.food_name_hindi.ilike(f'%{query}%')
                )
            )
        
        if category:
            search = search.filter(DietFoodDatabase.category == category)
        
        if cuisine:
            search = search.filter(DietFoodDatabase.cuisine == cuisine)
        
        if is_vegetarian == 'true':
            search = search.filter(DietFoodDatabase.is_vegetarian == True)
        
        foods = search.limit(limit).all()
        
        return jsonify({
            'success': True,
            'foods': [f.to_dict() for f in foods],
            'count': len(foods)
        })
    except Exception as e:
        print(f"Error searching foods: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@diet_bp.route('/api/client/diet/foods/categories', methods=['GET'])
@login_required
def api_get_food_categories():
    """Get food categories"""
    try:
        categories = db.session.query(
            DietFoodDatabase.category,
            func.count(DietFoodDatabase.id)
        ).group_by(DietFoodDatabase.category).all()
        
        return jsonify({
            'success': True,
            'categories': [{'name': c[0], 'count': c[1]} for c in categories if c[0]]
        })
    except Exception as e:
        print(f"Error getting categories: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@diet_bp.route('/api/client/diet/foods/custom', methods=['POST'])
@login_required
def api_add_custom_food():
    """Add a custom food to database"""
    try:
        data = request.get_json()
        
        food = DietFoodDatabase(
            food_name=data.get('food_name'),
            food_name_hindi=data.get('food_name_hindi'),
            category=data.get('category'),
            cuisine=data.get('cuisine'),
            serving_size=data.get('serving_size'),
            serving_unit=data.get('serving_unit'),
            calories=data.get('calories'),
            protein=data.get('protein', 0),
            carbs=data.get('carbs', 0),
            fat=data.get('fat', 0),
            fiber=data.get('fiber', 0),
            sugar=data.get('sugar', 0),
            sodium_mg=data.get('sodium_mg', 0),
            is_vegetarian=data.get('is_vegetarian', True),
            is_vegan=data.get('is_vegan', False),
            is_gluten_free=data.get('is_gluten_free', False),
            glycemic_index=data.get('glycemic_index'),
            is_custom=True,
            is_verified=False,
            created_by=current_user.id
        )
        
        db.session.add(food)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Food added',
            'food': food.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        print(f"Error adding custom food: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== FAVORITES ====================

@diet_bp.route('/api/client/diet/favorites', methods=['GET'])
@login_required
def api_get_favorites():
    """Get user's favorite foods"""
    try:
        favorites = DietFavoriteFood.query.filter_by(
            user_id=current_user.id
        ).all()
        
        return jsonify({
            'success': True,
            'favorites': [f.to_dict() for f in favorites]
        })
    except Exception as e:
        print(f"Error getting favorites: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@diet_bp.route('/api/client/diet/favorites', methods=['POST'])
@login_required
def api_add_favorite():
    """Add food to favorites"""
    try:
        data = request.get_json()
        food_id = data.get('food_id')
        
        # Check if already favorite
        existing = DietFavoriteFood.query.filter_by(
            user_id=current_user.id,
            food_id=food_id
        ).first()
        
        if existing:
            return jsonify({'success': True, 'message': 'Already in favorites'})
        
        favorite = DietFavoriteFood(
            user_id=current_user.id,
            food_id=food_id,
            preferred_quantity=data.get('preferred_quantity'),
            preferred_unit=data.get('preferred_unit')
        )
        
        db.session.add(favorite)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Added to favorites'
        })
    except Exception as e:
        db.session.rollback()
        print(f"Error adding favorite: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@diet_bp.route('/api/client/diet/favorites/<int:food_id>', methods=['DELETE'])
@login_required
def api_remove_favorite(food_id):
    """Remove food from favorites"""
    try:
        favorite = DietFavoriteFood.query.filter_by(
            user_id=current_user.id,
            food_id=food_id
        ).first()
        
        if favorite:
            db.session.delete(favorite)
            db.session.commit()
        
        return jsonify({'success': True, 'message': 'Removed from favorites'})
    except Exception as e:
        db.session.rollback()
        print(f"Error removing favorite: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500
