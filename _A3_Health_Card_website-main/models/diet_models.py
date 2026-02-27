"""
Diet Plan Models for Client Dashboard
Models for diet plans, meals, foods, water intake, and progress tracking
"""
from datetime import datetime


# These will be populated by create_diet_models function
DietHealthProfile = None
DietGeneratedPlan = None
DietMeal = None
DietMealItem = None
DietFoodDatabase = None
DietWaterLog = None
DietWeightLog = None
DietFavoriteFood = None


def create_diet_models(db):
    """Create Diet models with the given database instance"""
    global DietHealthProfile, DietGeneratedPlan, DietMeal, DietMealItem
    global DietFoodDatabase, DietWaterLog, DietWeightLog, DietFavoriteFood
    
    class DietHealthProfileModel(db.Model):
        """User's health profile for diet plan generation"""
        __tablename__ = 'diet_health_profile'
        
        id = db.Column(db.Integer, primary_key=True)
        user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
        
        # Lab Parameters
        fasting_glucose = db.Column(db.Float)  # mg/dL
        hba1c = db.Column(db.Float)  # percentage
        total_cholesterol = db.Column(db.Float)  # mg/dL
        triglycerides = db.Column(db.Float)  # mg/dL
        hdl_cholesterol = db.Column(db.Float)  # mg/dL
        ldl_cholesterol = db.Column(db.Float)  # mg/dL
        
        # Health Status
        blood_pressure = db.Column(db.String(20))  # Normal, Elevated, High Stage 1, High Stage 2
        known_conditions = db.Column(db.JSON)  # ["diabetes", "hypertension", "pcod", "thyroid"]
        allergies = db.Column(db.JSON)  # ["nuts", "dairy", "gluten"]
        
        # Diet Preferences
        diet_preference = db.Column(db.String(30))  # Vegetarian, Non-Vegetarian, Vegan, Eggetarian
        cuisine_preference = db.Column(db.JSON)  # ["indian", "continental", "mediterranean"]
        
        # Body Metrics
        height_cm = db.Column(db.Float)
        weight_kg = db.Column(db.Float)
        age = db.Column(db.Integer)
        gender = db.Column(db.String(10))  # Male, Female, Other
        activity_level = db.Column(db.String(20))  # Sedentary, Light, Moderate, Active, Very Active
        
        # Goals
        goal = db.Column(db.String(30))  # Weight Loss, Weight Gain, Maintain, Muscle Gain
        target_weight_kg = db.Column(db.Float)
        target_date = db.Column(db.Date)
        
        created_at = db.Column(db.DateTime, default=datetime.utcnow)
        updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
        
        # Relationship
        user = db.relationship('User', backref=db.backref('diet_health_profile', uselist=False))
        
        def to_dict(self):
            return {
                'id': self.id,
                'fasting_glucose': self.fasting_glucose,
                'hba1c': self.hba1c,
                'total_cholesterol': self.total_cholesterol,
                'triglycerides': self.triglycerides,
                'hdl_cholesterol': self.hdl_cholesterol,
                'ldl_cholesterol': self.ldl_cholesterol,
                'blood_pressure': self.blood_pressure,
                'known_conditions': self.known_conditions or [],
                'allergies': self.allergies or [],
                'diet_preference': self.diet_preference,
                'cuisine_preference': self.cuisine_preference or [],
                'height_cm': self.height_cm,
                'weight_kg': self.weight_kg,
                'age': self.age,
                'gender': self.gender,
                'activity_level': self.activity_level,
                'goal': self.goal,
                'target_weight_kg': self.target_weight_kg,
                'target_date': self.target_date.isoformat() if self.target_date else None,
                'updated_at': self.updated_at.isoformat() if self.updated_at else None
            }
    
    class DietGeneratedPlanModel(db.Model):
        """AI-generated diet plan based on health profile"""
        __tablename__ = 'diet_generated_plan'
        
        id = db.Column(db.Integer, primary_key=True)
        user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
        
        # Plan Details
        plan_name = db.Column(db.String(100))  # e.g., "Diabetic-Friendly Weight Loss Plan"
        plan_type = db.Column(db.String(50))  # diabetic, heart_healthy, pcod, general, etc.
        
        # Daily Targets
        daily_calories = db.Column(db.Integer)
        protein_g = db.Column(db.Float)
        carbs_g = db.Column(db.Float)
        fat_g = db.Column(db.Float)
        fiber_g = db.Column(db.Float)
        sodium_mg = db.Column(db.Float)
        sugar_g = db.Column(db.Float)
        
        # Macro Percentages
        protein_percent = db.Column(db.Integer)
        carbs_percent = db.Column(db.Integer)
        fat_percent = db.Column(db.Integer)
        
        # Recommendations
        recommended_foods = db.Column(db.JSON)  # List of food names/categories
        foods_to_avoid = db.Column(db.JSON)  # Foods to avoid
        meal_timing = db.Column(db.JSON)  # {"breakfast": "7:00-8:00", ...}
        special_instructions = db.Column(db.Text)
        
        # Sample Meal Plan
        sample_breakfast = db.Column(db.JSON)
        sample_lunch = db.Column(db.JSON)
        sample_dinner = db.Column(db.JSON)
        sample_snacks = db.Column(db.JSON)
        
        # Status
        is_active = db.Column(db.Boolean, default=True)
        start_date = db.Column(db.Date)
        end_date = db.Column(db.Date)
        
        created_at = db.Column(db.DateTime, default=datetime.utcnow)
        updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
        
        # Relationship
        user = db.relationship('User', backref=db.backref('diet_plans', lazy='dynamic'))
        
        def to_dict(self):
            return {
                'id': self.id,
                'plan_name': self.plan_name,
                'plan_type': self.plan_type,
                'daily_calories': self.daily_calories,
                'protein_g': self.protein_g,
                'carbs_g': self.carbs_g,
                'fat_g': self.fat_g,
                'fiber_g': self.fiber_g,
                'sodium_mg': self.sodium_mg,
                'sugar_g': self.sugar_g,
                'protein_percent': self.protein_percent,
                'carbs_percent': self.carbs_percent,
                'fat_percent': self.fat_percent,
                'recommended_foods': self.recommended_foods or [],
                'foods_to_avoid': self.foods_to_avoid or [],
                'meal_timing': self.meal_timing or {},
                'special_instructions': self.special_instructions,
                'sample_breakfast': self.sample_breakfast or [],
                'sample_lunch': self.sample_lunch or [],
                'sample_dinner': self.sample_dinner or [],
                'sample_snacks': self.sample_snacks or [],
                'is_active': self.is_active,
                'start_date': self.start_date.isoformat() if self.start_date else None,
                'created_at': self.created_at.isoformat() if self.created_at else None
            }
    
    class DietMealModel(db.Model):
        """Logged meals (breakfast, lunch, dinner, snacks)"""
        __tablename__ = 'diet_meals'
        
        id = db.Column(db.Integer, primary_key=True)
        user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
        date = db.Column(db.Date, nullable=False)
        meal_type = db.Column(db.String(20), nullable=False)  # breakfast, lunch, dinner, snack
        meal_name = db.Column(db.String(100))  # Optional custom name
        
        # Totals (calculated from items)
        total_calories = db.Column(db.Float, default=0)
        total_protein = db.Column(db.Float, default=0)
        total_carbs = db.Column(db.Float, default=0)
        total_fat = db.Column(db.Float, default=0)
        total_fiber = db.Column(db.Float, default=0)
        
        notes = db.Column(db.Text)
        photo_url = db.Column(db.String(255))
        
        created_at = db.Column(db.DateTime, default=datetime.utcnow)
        updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
        
        # Relationships
        user = db.relationship('User', backref=db.backref('diet_meals', lazy='dynamic'))
        items = db.relationship('DietMealItemModel', backref='meal', lazy='dynamic', cascade='all, delete-orphan')
        
        def to_dict(self):
            return {
                'id': self.id,
                'date': self.date.isoformat() if self.date else None,
                'meal_type': self.meal_type,
                'meal_name': self.meal_name,
                'total_calories': self.total_calories,
                'total_protein': self.total_protein,
                'total_carbs': self.total_carbs,
                'total_fat': self.total_fat,
                'total_fiber': self.total_fiber,
                'notes': self.notes,
                'photo_url': self.photo_url,
                'items': [item.to_dict() for item in self.items],
                'created_at': self.created_at.isoformat() if self.created_at else None
            }
    
    class DietMealItemModel(db.Model):
        """Individual food items within a meal"""
        __tablename__ = 'diet_meal_items'
        
        id = db.Column(db.Integer, primary_key=True)
        meal_id = db.Column(db.Integer, db.ForeignKey('diet_meals.id'), nullable=False)
        food_id = db.Column(db.Integer, db.ForeignKey('diet_food_database.id'))
        
        # Food details (denormalized for historical accuracy)
        food_name = db.Column(db.String(100), nullable=False)
        quantity = db.Column(db.Float, nullable=False)
        serving_unit = db.Column(db.String(30))  # g, ml, cup, piece, tbsp
        
        # Nutrition for this serving
        calories = db.Column(db.Float, default=0)
        protein = db.Column(db.Float, default=0)
        carbs = db.Column(db.Float, default=0)
        fat = db.Column(db.Float, default=0)
        fiber = db.Column(db.Float, default=0)
        
        created_at = db.Column(db.DateTime, default=datetime.utcnow)
        
        def to_dict(self):
            return {
                'id': self.id,
                'food_id': self.food_id,
                'food_name': self.food_name,
                'quantity': self.quantity,
                'serving_unit': self.serving_unit,
                'calories': self.calories,
                'protein': self.protein,
                'carbs': self.carbs,
                'fat': self.fat,
                'fiber': self.fiber
            }
    
    class DietFoodDatabaseModel(db.Model):
        """Food database with nutrition information"""
        __tablename__ = 'diet_food_database'
        
        id = db.Column(db.Integer, primary_key=True)
        
        # Basic Info
        food_name = db.Column(db.String(100), nullable=False)
        food_name_hindi = db.Column(db.String(100))  # Hindi name for Indian foods
        category = db.Column(db.String(50))  # grains, proteins, dairy, vegetables, fruits, etc.
        cuisine = db.Column(db.String(30))  # indian, continental, chinese, etc.
        
        # Serving Info
        serving_size = db.Column(db.Float, nullable=False)
        serving_unit = db.Column(db.String(30), nullable=False)  # g, ml, piece, cup
        
        # Macronutrients (per serving)
        calories = db.Column(db.Float, nullable=False)
        protein = db.Column(db.Float, default=0)
        carbs = db.Column(db.Float, default=0)
        fat = db.Column(db.Float, default=0)
        fiber = db.Column(db.Float, default=0)
        sugar = db.Column(db.Float, default=0)
        
        # Additional Nutrition
        sodium_mg = db.Column(db.Float, default=0)
        potassium_mg = db.Column(db.Float, default=0)
        cholesterol_mg = db.Column(db.Float, default=0)
        
        # Diet Flags
        is_vegetarian = db.Column(db.Boolean, default=True)
        is_vegan = db.Column(db.Boolean, default=False)
        is_gluten_free = db.Column(db.Boolean, default=False)
        is_dairy_free = db.Column(db.Boolean, default=False)
        
        # Health Indicators
        glycemic_index = db.Column(db.Integer)  # Low (<55), Medium (56-69), High (70+)
        glycemic_load = db.Column(db.Float)
        
        # Status
        is_verified = db.Column(db.Boolean, default=True)
        is_custom = db.Column(db.Boolean, default=False)
        created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
        
        created_at = db.Column(db.DateTime, default=datetime.utcnow)
        
        def to_dict(self):
            return {
                'id': self.id,
                'food_name': self.food_name,
                'food_name_hindi': self.food_name_hindi,
                'category': self.category,
                'cuisine': self.cuisine,
                'serving_size': self.serving_size,
                'serving_unit': self.serving_unit,
                'calories': self.calories,
                'protein': self.protein,
                'carbs': self.carbs,
                'fat': self.fat,
                'fiber': self.fiber,
                'sugar': self.sugar,
                'sodium_mg': self.sodium_mg,
                'is_vegetarian': self.is_vegetarian,
                'is_vegan': self.is_vegan,
                'is_gluten_free': self.is_gluten_free,
                'glycemic_index': self.glycemic_index
            }
    
    class DietWaterLogModel(db.Model):
        """Daily water intake tracking"""
        __tablename__ = 'diet_water_log'
        
        id = db.Column(db.Integer, primary_key=True)
        user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
        date = db.Column(db.Date, nullable=False)
        amount_ml = db.Column(db.Integer, default=0)
        goal_ml = db.Column(db.Integer, default=2500)
        glasses = db.Column(db.Integer, default=0)  # 1 glass = 250ml
        
        created_at = db.Column(db.DateTime, default=datetime.utcnow)
        updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
        
        # Relationship
        user = db.relationship('User', backref=db.backref('diet_water_logs', lazy='dynamic'))
        
        def to_dict(self):
            return {
                'id': self.id,
                'date': self.date.isoformat() if self.date else None,
                'amount_ml': self.amount_ml,
                'goal_ml': self.goal_ml,
                'glasses': self.glasses,
                'percentage': round((self.amount_ml / self.goal_ml) * 100, 1) if self.goal_ml else 0
            }
    
    class DietWeightLogModel(db.Model):
        """Weight and body measurements tracking"""
        __tablename__ = 'diet_weight_log'
        
        id = db.Column(db.Integer, primary_key=True)
        user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
        date = db.Column(db.Date, nullable=False)
        
        # Measurements
        weight_kg = db.Column(db.Float)
        waist_cm = db.Column(db.Float)
        chest_cm = db.Column(db.Float)
        hip_cm = db.Column(db.Float)
        arm_cm = db.Column(db.Float)
        thigh_cm = db.Column(db.Float)
        
        # Calculated
        bmi = db.Column(db.Float)
        body_fat_percent = db.Column(db.Float)
        
        notes = db.Column(db.Text)
        photo_url = db.Column(db.String(255))
        
        created_at = db.Column(db.DateTime, default=datetime.utcnow)
        
        # Relationship
        user = db.relationship('User', backref=db.backref('diet_weight_logs', lazy='dynamic'))
        
        def to_dict(self):
            return {
                'id': self.id,
                'date': self.date.isoformat() if self.date else None,
                'weight_kg': self.weight_kg,
                'waist_cm': self.waist_cm,
                'chest_cm': self.chest_cm,
                'hip_cm': self.hip_cm,
                'arm_cm': self.arm_cm,
                'thigh_cm': self.thigh_cm,
                'bmi': self.bmi,
                'body_fat_percent': self.body_fat_percent,
                'notes': self.notes,
                'photo_url': self.photo_url
            }
    
    class DietFavoriteFoodModel(db.Model):
        """User's favorite foods for quick access"""
        __tablename__ = 'diet_favorite_foods'
        
        id = db.Column(db.Integer, primary_key=True)
        user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
        food_id = db.Column(db.Integer, db.ForeignKey('diet_food_database.id'), nullable=False)
        
        # Custom serving preference
        preferred_quantity = db.Column(db.Float)
        preferred_unit = db.Column(db.String(30))
        
        created_at = db.Column(db.DateTime, default=datetime.utcnow)
        
        # Relationships
        user = db.relationship('User', backref=db.backref('diet_favorites', lazy='dynamic'))
        food = db.relationship('DietFoodDatabaseModel', backref='favorites')
        
        def to_dict(self):
            return {
                'id': self.id,
                'food_id': self.food_id,
                'food': self.food.to_dict() if self.food else None,
                'preferred_quantity': self.preferred_quantity,
                'preferred_unit': self.preferred_unit
            }
    
    # Assign to global variables
    DietHealthProfile = DietHealthProfileModel
    DietGeneratedPlan = DietGeneratedPlanModel
    DietMeal = DietMealModel
    DietMealItem = DietMealItemModel
    DietFoodDatabase = DietFoodDatabaseModel
    DietWaterLog = DietWaterLogModel
    DietWeightLog = DietWeightLogModel
    DietFavoriteFood = DietFavoriteFoodModel
    
    return {
        'DietHealthProfile': DietHealthProfileModel,
        'DietGeneratedPlan': DietGeneratedPlanModel,
        'DietMeal': DietMealModel,
        'DietMealItem': DietMealItemModel,
        'DietFoodDatabase': DietFoodDatabaseModel,
        'DietWaterLog': DietWaterLogModel,
        'DietWeightLog': DietWeightLogModel,
        'DietFavoriteFood': DietFavoriteFoodModel
    }
