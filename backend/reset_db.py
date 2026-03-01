from database import SessionLocal
from models import Resource

db = SessionLocal()
db.query(Resource).delete()
db.commit()
print("All old database rows deleted.")
db.close()
