import os

import bcrypt
import mysql.connector

def get_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", "Ramvardayini@2005"),
        database=os.getenv("DB_NAME", "voter_db")
    )

def create_user(username, password, role):
    conn = get_connection()
    cursor = conn.cursor()

    # Check if user already exists
    cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
    existing_user = cursor.fetchone()

    if existing_user:
        print(f"User '{username}' already exists. Skipping insert.")
    else:
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        query = "INSERT INTO users (username, password_hash, role) VALUES (%s, %s, %s)"
        values = (username, password_hash, role)

        cursor.execute(query, values)
        conn.commit()

        print(f"{role} user '{username}' created successfully")

    cursor.close()
    conn.close()

create_user("admin1", "admin123", "admin")
create_user("voter1", "voter123", "voter")
