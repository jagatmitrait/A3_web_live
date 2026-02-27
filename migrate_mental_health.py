"""
Database Migration Script: Add missing columns to mental_health_assessments table
Run this once to fix the database schema.
"""
import sys
sys.path.insert(0, '.')

from app import app, db

def run_migration():
    with app.app_context():
        print("Starting migration...")
        
        # Use raw SQL to add columns if they don't exist
        try:
            # PostgreSQL syntax for adding columns
            db.session.execute(db.text("""
                DO $$ 
                BEGIN
                    -- Add 'answers' column if it doesn't exist
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                                   WHERE table_name='mental_health_assessments' AND column_name='answers') THEN
                        ALTER TABLE mental_health_assessments ADD COLUMN answers JSON;
                        RAISE NOTICE 'Added answers column';
                    END IF;
                    
                    -- Add 'max_score' column if it doesn't exist
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                                   WHERE table_name='mental_health_assessments' AND column_name='max_score') THEN
                        ALTER TABLE mental_health_assessments ADD COLUMN max_score INTEGER;
                        RAISE NOTICE 'Added max_score column';
                    END IF;
                END $$;
            """))
            db.session.commit()
            print("Migration completed successfully!")
            
        except Exception as e:
            print(f"Error during migration: {e}")
            db.session.rollback()
            
            # Try alternative approach - drop and recreate
            print("\nTrying alternative: Dropping and recreating table...")
            try:
                db.session.execute(db.text("DROP TABLE IF EXISTS mental_health_assessments CASCADE"))
                db.session.commit()
                db.create_all()
                print("Table recreated successfully!")
            except Exception as e2:
                print(f"Error recreating table: {e2}")
                db.session.rollback()

if __name__ == '__main__':
    run_migration()
