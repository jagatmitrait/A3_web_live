"""
SQLite to PostgreSQL Data Migration Script v3
==============================================
Fixed: Boolean conversion, transaction handling per row
"""

import sqlite3
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def convert_value(value, is_boolean_column=False):
    """Convert SQLite values to PostgreSQL compatible values"""
    if value is None:
        return None
    if is_boolean_column or (isinstance(value, int) and value in (0, 1)):
        # Could be a boolean stored as int
        return bool(value) if is_boolean_column else value
    return value

def migrate_data():
    """Migrate all data from SQLite to PostgreSQL"""
    
    sqlite_path = os.path.join(os.path.dirname(__file__), 'instance', 'a3_health_card.db')
    
    if not os.path.exists(sqlite_path):
        print(f"❌ SQLite database not found: {sqlite_path}")
        return False
    
    print(f"📂 SQLite database: {sqlite_path}")
    
    # Connect to SQLite  
    sqlite_conn = sqlite3.connect(sqlite_path)
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cursor = sqlite_conn.cursor()
    
    # Check SQLite data
    sqlite_cursor.execute("SELECT COUNT(*) FROM users")
    print(f"📊 Users in SQLite: {sqlite_cursor.fetchone()[0]}")
    
    from app import app, db
    from sqlalchemy import inspect
    
    # Known boolean columns in the schema
    boolean_columns = {
        'is_verified', 'is_active', 'is_locked', 'is_trusted', 'is_admin',
        'is_deleted', 'is_approved', 'is_emergency', 'is_completed', 'is_read',
        'is_public', 'is_primary', 'email_verified', 'phone_verified',
        'two_factor_enabled', 'notifications_enabled', 'consent_given',
        'data_sharing', 'success', 'verified', 'active', 'enabled', 'locked'
    }
    
    with app.app_context():
        # Get table info from PostgreSQL to understand structure
        inspector = inspect(db.engine)
        
        # Migrate users table first
        print("\n📋 Migrating users table...")
        
        sqlite_cursor.execute("SELECT * FROM users")
        rows = sqlite_cursor.fetchall()
        columns = [desc[0] for desc in sqlite_cursor.description]
        
        success_count = 0
        
        for row in rows:
            try:
                row_dict = {}
                for i, col in enumerate(columns):
                    value = row[i]
                    # Convert boolean columns
                    if col.lower() in boolean_columns or col.startswith('is_') or col.endswith('_enabled') or col.endswith('_verified'):
                        if value is not None:
                            value = bool(value)
                    row_dict[col] = value
                
                # Build INSERT
                cols = ', '.join([f'"{c}"' for c in columns])
                placeholders = ', '.join([f':{c}' for c in columns])
                sql = f'INSERT INTO "users" ({cols}) VALUES ({placeholders})'
                
                db.session.execute(db.text(sql), row_dict)
                db.session.commit()  # Commit each row
                success_count += 1
                print(f"   ✅ User {row_dict.get('email', 'unknown')} migrated")
                
            except Exception as e:
                db.session.rollback()
                print(f"   ❌ Error: {str(e)[:60]}")
        
        print(f"\n   Total users migrated: {success_count}")
        
        # Verify
        result = db.session.execute(db.text('SELECT COUNT(*) FROM users')).scalar()
        print(f"\n✅ Verification - Users in PostgreSQL: {result}")
        
        # Now migrate other tables (logs) - optional
        if result > 0:
            print("\n📋 Migrating log tables...")
            
            log_tables = ['login_logs', 'api_logs', 'session_logs', 'device_fingerprints', 'admin_login_history']
            
            for table_name in log_tables:
                try:
                    sqlite_cursor.execute(f"SELECT * FROM {table_name}")
                    rows = sqlite_cursor.fetchall()
                    
                    if not rows:
                        continue
                    
                    columns = [desc[0] for desc in sqlite_cursor.description]
                    migrated = 0
                    
                    for row in rows:
                        try:
                            row_dict = {}
                            for i, col in enumerate(columns):
                                value = row[i]
                                if col.lower() in boolean_columns or col.startswith('is_') or col.endswith('_enabled'):
                                    if value is not None:
                                        value = bool(value)
                                row_dict[col] = value
                            
                            cols = ', '.join([f'"{c}"' for c in columns])
                            placeholders = ', '.join([f':{c}' for c in columns])
                            sql = f'INSERT INTO "{table_name}" ({cols}) VALUES ({placeholders})'
                            
                            db.session.execute(db.text(sql), row_dict)
                            db.session.commit()
                            migrated += 1
                        except:
                            db.session.rollback()
                    
                    if migrated > 0:
                        print(f"   ✅ {table_name}: {migrated} records")
                        
                except Exception as e:
                    db.session.rollback()
    
    sqlite_conn.close()
    print("\n" + "="*50)
    print("  Migration Complete!")
    print("="*50)
    return True

if __name__ == "__main__":
    print("=" * 50)
    print("  SQLite → PostgreSQL Migration v3")
    print("=" * 50)
    migrate_data()
