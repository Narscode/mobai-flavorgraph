#!/usr/bin/env python3
import os
import sys
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def main():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("Error: DATABASE_URL not set in environment.")
        sys.exit(1)
        
    # Mask connection details for safety
    masked_url = database_url.split("@")[-1] if "@" in database_url else database_url
    print(f"Connecting to database at: {masked_url}")
    
    try:
        import psycopg2
    except ImportError:
        print("Error: psycopg2 module not found. Run 'pip install psycopg2-binary'")
        sys.exit(1)
        
    try:
        conn = psycopg2.connect(database_url)
        cur = conn.cursor()
        cur.execute("SELECT 1;")
        result = cur.fetchone()
        print(f"Connection successful! Query 'SELECT 1;' returned: {result[0]}")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Connection failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
