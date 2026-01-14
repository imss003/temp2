
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
 
DATABASE_URL = (
    "mssql+pyodbc://MU-SIGMA%5CShubham.Shukla@10.1.70.97/B06-S56-T06"
    "?driver=ODBC+Driver+17+for+SQL+Server"
    "&trusted_connection=yes"
)
 
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,   # prevents stale connection issues
    echo=True             # optional: shows SQL queries in console
)
 
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)
 
Base = declarative_base()
 
# Dependency for FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
 