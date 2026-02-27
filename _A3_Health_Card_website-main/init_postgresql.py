"""
PostgreSQL Database Initialization Script
==========================================
Run this script AFTER installing PostgreSQL and creating the database.

Usage:
    python init_postgresql.py
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def check_connection():
    """Test PostgreSQL connection"""
    try:
        from app import app, db
        with app.app_context():
            # Test connection
            db.engine.connect()
            print("✅ Database connection successful!")
            return True
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False

def create_tables():
    """Create all database tables"""
    try:
        from app import app, db
        with app.app_context():
            db.create_all()
            print("✅ All tables created successfully!")
            return True
    except Exception as e:
        print(f"❌ Table creation failed: {e}")
        return False

def count_tables():
    """Count existing tables"""
    try:
        from app import app, db
        with app.app_context():
            from sqlalchemy import inspect
            inspector = inspect(db.engine)
            tables = inspector.get_table_names()
            print(f"📊 Total tables in database: {len(tables)}")
            if tables:
                print("   Tables:", ", ".join(tables[:10]), "..." if len(tables) > 10 else "")
            return len(tables)
    except Exception as e:
        print(f"❌ Error: {e}")
        return 0

if __name__ == "__main__":
    print("=" * 50)
    print("  PostgreSQL Database Initialization")
    print("=" * 50)
    print()
    
    print("Step 1: Testing database connection...")
    if not check_connection():
        print("\n⚠️  Please check your .env file and PostgreSQL setup!")
        print("   Make sure DATABASE_URL is correctly configured.")
        sys.exit(1)
    
    print("\nStep 2: Creating database tables...")
    if not create_tables():
        sys.exit(1)
    
    print("\nStep 3: Verifying tables...")
    count_tables()
    
    print("\n" + "=" * 50)
    print("  ✅ Database initialization complete!")
    print("=" * 50)
