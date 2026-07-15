from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os 
from dotenv import load_dotenv  
load_dotenv()

host=os.getenv("DB_HOST")
database=os.getenv("DB_NAME")
user=os.getenv("DB_USER")
password=os.getenv("DB_PASSWORD")
port=os.getenv("DB_PORT")

# db_url = f"postgresql://{user}:{password}@{host}:{port}/{database}"

db_url = os.getenv("DATABASE_URL")

engine = create_engine(db_url)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()