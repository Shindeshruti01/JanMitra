import os
import random

import mysql.connector
import pandas as pd


DEDUPLICATION_COLUMNS = [
    "Name",
    "Age",
    "DOB",
    "Gender",
    "City",
    "State",
    "Address",
    "Aadhar",
]


def deduplicate_voters_dataframe(df):
    if df.empty:
        return df

    dedupe_df = df.copy()

    for column in DEDUPLICATION_COLUMNS:
        if column not in dedupe_df.columns:
            dedupe_df[column] = ""

    dedupe_df["_sort_voter_id"] = pd.to_numeric(dedupe_df.get("Voter_ID"), errors="coerce")
    dedupe_df = dedupe_df.sort_values(by=["_sort_voter_id"], na_position="last")

    normalized_columns = []
    for column in DEDUPLICATION_COLUMNS:
        normalized_column = f"_dedupe_{column}"
        normalized_columns.append(normalized_column)
        dedupe_df[normalized_column] = (
            dedupe_df[column]
            .fillna("")
            .astype(str)
            .str.strip()
            .str.lower()
        )

    dedupe_df = dedupe_df.drop_duplicates(subset=normalized_columns, keep="first")
    dedupe_df = dedupe_df.drop(columns=["_sort_voter_id", *normalized_columns], errors="ignore")

    return dedupe_df.reset_index(drop=True)

def get_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", "Ramvardayini@2005"),
        database=os.getenv("DB_NAME", "voter_db")
    )


def get_server_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", "Ramvardayini@2005")
    )


def ensure_users_voter_id_column():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SHOW COLUMNS FROM users LIKE 'voter_id'")
    column = cursor.fetchone()

    if not column:
        cursor.execute("ALTER TABLE users ADD COLUMN voter_id INT NULL")
        conn.commit()

    cursor.close()
    conn.close()


def ensure_users_review_columns():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SHOW COLUMNS FROM users LIKE 'review_status'")
    status_column = cursor.fetchone()
    if not status_column:
        cursor.execute("ALTER TABLE users ADD COLUMN review_status VARCHAR(50) NULL")
        conn.commit()

    cursor.execute("SHOW COLUMNS FROM users LIKE 'review_message'")
    message_column = cursor.fetchone()
    if not message_column:
        cursor.execute("ALTER TABLE users ADD COLUMN review_message TEXT NULL")
        conn.commit()

    cursor.close()
    conn.close()


def ensure_voters_status_column():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SHOW COLUMNS FROM voters LIKE 'status'")
    column = cursor.fetchone()

    if not column:
        cursor.execute("ALTER TABLE voters ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'Pending'")
        conn.commit()

    cursor.close()
    conn.close()


def ensure_verified_voters_table():
    clean_db_name = os.getenv("CLEAN_DB_NAME", "clean_voter_db")
    server_conn = get_server_connection()
    server_cursor = server_conn.cursor()

    server_cursor.execute(f"CREATE DATABASE IF NOT EXISTS {clean_db_name}")
    server_conn.commit()
    server_cursor.close()
    server_conn.close()

    conn = mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", "Ramvardayini@2005"),
        database=clean_db_name
    )
    cursor = conn.cursor()

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS verified_voters (
            id INT AUTO_INCREMENT PRIMARY KEY,
            source_voter_id INT NOT NULL UNIQUE,
            Name VARCHAR(255) NOT NULL,
            Age INT,
            DOB VARCHAR(50),
            Gender VARCHAR(50),
            City VARCHAR(100),
            State VARCHAR(100),
            Address TEXT,
            Aadhar VARCHAR(50),
            source_status VARCHAR(20),
            reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    conn.commit()

    cursor.close()
    conn.close()

def load_voters():
    ensure_voters_status_column()
    conn = get_connection()
    df = pd.read_sql("SELECT * FROM voters", conn)
    conn.close()
    return deduplicate_voters_dataframe(df)

def get_user_by_username(username):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True, buffered=True)

    query = "SELECT * FROM users WHERE username = %s"
    cursor.execute(query, (username,))
    user = cursor.fetchone()

    cursor.close()
    conn.close()
    return user


def get_user_by_voter_id(voter_id):
    ensure_users_review_columns()
    conn = get_connection()
    cursor = conn.cursor(dictionary=True, buffered=True)

    query = "SELECT * FROM users WHERE voter_id = %s"
    cursor.execute(query, (voter_id,))
    user = cursor.fetchone()

    cursor.close()
    conn.close()
    return user

def get_voter_by_voter_id(voter_id):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True, buffered=True)

    query = "SELECT * FROM voters WHERE Voter_ID = %s"
    cursor.execute(query, (voter_id,))
    voter = cursor.fetchone()

    cursor.close()
    conn.close()
    return voter

def get_voter_by_aadhar(aadhar):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True, buffered=True)

    query = "SELECT * FROM voters WHERE Aadhar = %s"
    cursor.execute(query, (aadhar,))
    voter = cursor.fetchone()

    cursor.close()
    conn.close()
    return voter


def get_voter_by_name_and_aadhar(name, aadhar):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True, buffered=True)

    query = "SELECT * FROM voters WHERE LOWER(Name) = LOWER(%s) AND Aadhar = %s"
    cursor.execute(query, (name, aadhar))
    voter = cursor.fetchone()

    cursor.close()
    conn.close()
    return voter

def create_voter(voter_data):
    ensure_voters_status_column()
    conn = get_connection()
    cursor = conn.cursor()

    query = """
        INSERT INTO voters (Voter_ID, Name, Age, DOB, Gender, City, State, Address, Aadhar, status)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """

    values = (
        voter_data["Voter_ID"],
        voter_data["Name"],
        voter_data["Age"],
        voter_data["DOB"],
        voter_data["Gender"],
        voter_data["City"],
        voter_data["State"],
        voter_data["Address"],
        voter_data["Aadhar"],
        voter_data["status"]
    )

    cursor.execute(query, values)
    conn.commit()

    cursor.close()
    conn.close()

def generate_voter_id():
    return random.randint(100000, 999999)


def create_new_user(username, password_hash, role, voter_id=None):
    ensure_users_voter_id_column()
    conn = get_connection()
    cursor = conn.cursor()

    query = """
        INSERT INTO users (username, password_hash, role, voter_id)
        VALUES (%s, %s, %s, %s)
    """
    cursor.execute(query, (username, password_hash, role, voter_id))
    conn.commit()

    cursor.close()
    conn.close()


def update_user_voter_id(username, voter_id):
    conn = get_connection()
    cursor = conn.cursor()

    query = "UPDATE users SET voter_id = %s WHERE username = %s"
    cursor.execute(query, (voter_id, username))
    conn.commit()

    cursor.close()
    conn.close()


def get_voter_profile_by_username(username):
    ensure_users_voter_id_column()
    ensure_users_review_columns()
    ensure_voters_status_column()
    conn = get_connection()
    cursor = conn.cursor(dictionary=True, buffered=True)

    query = """
        SELECT
            u.id AS user_id,
            u.username,
            u.role,
            u.voter_id,
            u.review_status,
            u.review_message,
            v.Name,
            v.Age,
            v.DOB,
            v.Gender,
            v.City,
            v.State,
            v.Address,
            v.Aadhar,
            v.status
        FROM users u
        LEFT JOIN voters v ON u.voter_id = v.Voter_ID
        WHERE u.username = %s
    """

    cursor.execute(query, (username,))
    profile = cursor.fetchone()

    cursor.close()
    conn.close()
    return profile


def update_voter_status(voter_id, status):
    ensure_voters_status_column()
    conn = get_connection()
    cursor = conn.cursor()

    query = "UPDATE voters SET status = %s WHERE Voter_ID = %s"
    cursor.execute(query, (status, voter_id))
    conn.commit()
    affected = cursor.rowcount

    cursor.close()
    conn.close()
    return affected


def delete_voter_record(voter_id):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("DELETE FROM users WHERE voter_id = %s", (voter_id,))
    cursor.execute("DELETE FROM voters WHERE Voter_ID = %s", (voter_id,))
    conn.commit()
    affected = cursor.rowcount

    cursor.close()
    conn.close()
    return affected


def delete_voter_only(voter_id):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("DELETE FROM voters WHERE Voter_ID = %s", (voter_id,))
    conn.commit()
    affected = cursor.rowcount

    cursor.close()
    conn.close()
    return affected


def update_user_review_decision(voter_id, review_status, review_message):
    ensure_users_review_columns()
    conn = get_connection()
    cursor = conn.cursor()

    query = """
        UPDATE users
        SET review_status = %s, review_message = %s
        WHERE voter_id = %s
    """
    cursor.execute(query, (review_status, review_message, voter_id))
    conn.commit()

    cursor.close()
    conn.close()


def save_verified_voter(voter_data):
    ensure_verified_voters_table()
    conn = mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", "Ramvardayini@2005"),
        database=os.getenv("CLEAN_DB_NAME", "clean_voter_db")
    )
    cursor = conn.cursor(dictionary=True, buffered=True)
    lookup_query = """
        SELECT id
        FROM verified_voters
        WHERE source_voter_id = %s OR Aadhar = %s
        ORDER BY reviewed_at DESC
        LIMIT 1
    """
    cursor.execute(lookup_query, (voter_data["Voter_ID"], voter_data.get("Aadhar")))
    existing_record = cursor.fetchone()

    if existing_record:
        query = """
            UPDATE verified_voters
            SET
                source_voter_id = %s,
                Name = %s,
                Age = %s,
                DOB = %s,
                Gender = %s,
                City = %s,
                State = %s,
                Address = %s,
                Aadhar = %s,
                source_status = %s,
                reviewed_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """

        values = (
            voter_data["Voter_ID"],
            voter_data["Name"],
            voter_data.get("Age"),
            voter_data.get("DOB"),
            voter_data.get("Gender"),
            voter_data.get("City"),
            voter_data.get("State"),
            voter_data.get("Address"),
            voter_data.get("Aadhar"),
            voter_data.get("status", "Pending"),
            existing_record["id"],
        )
    else:
        query = """
            INSERT INTO verified_voters
            (source_voter_id, Name, Age, DOB, Gender, City, State, Address, Aadhar, source_status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """

        values = (
            voter_data["Voter_ID"],
            voter_data["Name"],
            voter_data.get("Age"),
            voter_data.get("DOB"),
            voter_data.get("Gender"),
            voter_data.get("City"),
            voter_data.get("State"),
            voter_data.get("Address"),
            voter_data.get("Aadhar"),
            voter_data.get("status", "Pending"),
        )

    cursor.execute(query, values)
    conn.commit()

    cursor.close()
    conn.close()


def load_verified_voters():
    ensure_verified_voters_table()
    conn = mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", "Ramvardayini@2005"),
        database=os.getenv("CLEAN_DB_NAME", "clean_voter_db")
    )
    df = pd.read_sql("SELECT * FROM verified_voters ORDER BY reviewed_at DESC", conn)
    conn.close()
    return df


def verified_voter_exists(voter_data):
    ensure_verified_voters_table()
    conn = mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", "Ramvardayini@2005"),
        database=os.getenv("CLEAN_DB_NAME", "clean_voter_db")
    )
    cursor = conn.cursor(dictionary=True, buffered=True)

    query = """
        SELECT *
        FROM verified_voters
        WHERE source_voter_id = %s OR Aadhar = %s
        LIMIT 1
    """
    cursor.execute(query, (voter_data["Voter_ID"], voter_data.get("Aadhar")))
    record = cursor.fetchone()

    cursor.close()
    conn.close()
    return record
