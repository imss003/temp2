import os
import logging
from typing import Optional

from fastapi import FastAPI, File, UploadFile, Form, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv

# Ensure 'database.py' exists with get_db and engine
from database import get_db, engine
import models

# --- Setup & Configuration ---
load_dotenv()
models.Base.metadata.create_all(bind=engine)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# 1. CORS Middleware
origins = [
    "http://localhost:3000", 
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Cloudinary Configuration
cloudinary.config(
    cloud_name=os.getenv("CLOUD_NAME"),
    api_key=os.getenv("API_KEY"),
    api_secret=os.getenv("API_SECRET"),
    secure=True
)

# --- Pydantic Schemas ---

class DashboardRequest(BaseModel):
    emp_id: int

class UserCreate(BaseModel):
    emp_id: int
    name: str
    role: str
    password: str  # Matches models.User.password
    manager_id: Optional[int] = None 

class RequestUpdate(BaseModel):
    category: str
    description: str
    amount: float 

class PolicyCreate(BaseModel):
    category: str
    amount_limit: int
    description: str

class LoginRequest(BaseModel):
    name: str
    password: str

# --- Database Initialization ---
@app.on_event("startup")
def seed_admin_only():
    db = next(get_db())
    # check if Master Admin exists
    if not db.query(models.User).filter_by(emp_id=1).first():
        master_admin = models.User(
            emp_id=1, 
            name="Master Admin", 
            password="admin123", # Added default password
            role="admin", 
            manager_id=None
        )
        db.add(master_admin)
        db.commit()
        logger.info("✅ Master Admin (ID: 1) initialized.")
    db.close()

# --- Core Request Routes ---

@app.post("/request")
async def create_request(
    emp_id: int = Form(...), 
    category: str = Form(...), 
    description: str = Form(...),
    amount: float = Form(...),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    try:
        user = db.query(models.User).filter_by(emp_id=emp_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        image_url = None
        if file and file.filename:
            file.file.seek(0)
            upload_result = cloudinary.uploader.upload(
                file.file,
                resource_type="auto",
                folder="reimbursements"
            )
            image_url = upload_result.get("secure_url")

        initial_status = "Awaiting Finance" if user.role == "manager" else "Pending"

        new_req = models.Requests(
            emp_id=emp_id,
            category=category,
            description=description,
            amount=amount,
            image_path=image_url,
            status=initial_status
        )
        db.add(new_req)
        db.commit()
        return {"message": "Request created successfully", "status": initial_status}
        
    except Exception as e:
        logger.error(f"Request Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Server Error: {str(e)}")

@app.put("/request/{req_id}")
def update_request(req_id: int, data: RequestUpdate, db: Session = Depends(get_db)):
    req = db.query(models.Requests).filter_by(req_id=req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    
    req.category = data.category
    req.description = data.description
    req.amount = data.amount
    req.status = "Pending" 
    
    db.commit()
    return {"message": "Request updated successfully"}

@app.delete("/request/{req_id}")
def delete_request(req_id: int, db: Session = Depends(get_db)):
    req = db.query(models.Requests).filter_by(req_id=req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if req.status != "Pending":
        raise HTTPException(status_code=400, detail="Cannot delete processed requests")

    db.delete(req)
    db.commit()
    return {"message": "Deleted"}

# --- Dashboard & User Management ---

@app.post("/dashboard")
def dashboard(data: DashboardRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter_by(emp_id=data.emp_id).first()
    if not user: 
        raise HTTPException(status_code=404, detail="User not found")

    response = {"emp_id": user.emp_id, "name": user.name, "role": user.role}

    if user.role == "employee":
        response["my_requests"] = db.query(models.Requests).filter_by(emp_id=user.emp_id).all()
    
    elif user.role == "manager":
        team_ids = [u.emp_id for u in db.query(models.User).filter_by(manager_id=user.emp_id).all()]
        response["team_requests"] = db.query(models.Requests)\
            .filter(models.Requests.emp_id.in_(team_ids))\
            .filter(models.Requests.status == "Pending").all()
        response["my_requests"] = db.query(models.Requests).filter_by(emp_id=user.emp_id).all()

    elif user.role == "finance":
        response["finance_queue"] = db.query(models.Requests)\
            .filter(models.Requests.status.in_(["Manager Approved", "Awaiting Finance"])).all()

    elif user.role in ["audit", "admin"]:
        response["all_requests"] = db.query(models.Requests).all()
        if user.role == "admin":
            response["stats"] = {
                "total_users": db.query(models.User).count(),
                "total_requests": db.query(models.Requests).count(),
                "pending": db.query(models.Requests).filter_by(status="Pending").count(),
                "paid": db.query(models.Requests).filter_by(status="Paid").count()
            }
    return response

@app.get("/admin/users")
def get_users(db: Session = Depends(get_db)):
    return db.query(models.User).all()

@app.post("/admin/user")
def add_user(user: UserCreate, db: Session = Depends(get_db)):
    m_id = user.manager_id
    
    # Auto-assign Admin as manager for specific roles
    if user.role in ["manager", "finance", "audit"]:
        m_id = 1
    elif m_id:
        manager_exists = db.query(models.User).filter_by(emp_id=m_id).first()
        if not manager_exists:
            raise HTTPException(status_code=400, detail=f"Manager ID {m_id} does not exist")
    else:
        m_id = None

    if db.query(models.User).filter_by(emp_id=user.emp_id).first():
        raise HTTPException(status_code=400, detail="User ID already exists")

    # Created user using the full schema including password
    new_user = models.User(
        emp_id=user.emp_id, 
        name=user.name, 
        password=user.password, # Critical fix: Include password
        role=user.role, 
        manager_id=m_id
    )
    db.add(new_user)
    db.commit()
    return {"message": "User added successfully"}

@app.delete("/admin/user/{emp_id}")
def delete_user(emp_id: int, db: Session = Depends(get_db)):
    if emp_id == 1: 
        raise HTTPException(status_code=400, detail="Cannot delete Master Admin")
    
    user = db.query(models.User).filter_by(emp_id=emp_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    db.delete(user)
    db.commit()
    return {"message": "User deleted"}

# --- Status Update Routes ---

@app.put("/manager/approve/{req_id}")
def manager_approve(req_id: int, db: Session = Depends(get_db)):
    req = db.query(models.Requests).filter_by(req_id=req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    
    req.status = "Manager Approved"
    db.commit()
    return {"msg": "Approved"}

@app.put("/manager/reject/{req_id}")
def manager_reject(req_id: int, db: Session = Depends(get_db)):
    req = db.query(models.Requests).filter_by(req_id=req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    req.status = "Rejected"
    db.commit()
    return {"msg": "Rejected"}

@app.put("/finance/approve/{req_id}")
def finance_approve(req_id: int, db: Session = Depends(get_db)):
    req = db.query(models.Requests).filter_by(req_id=req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    req.status = "Paid"
    db.commit()
    return {"msg": "Paid"}

# --- Policy Routes ---

@app.get("/policies")
def get_policies(db: Session = Depends(get_db)):
    return db.query(models.Policy).all()

@app.post("/admin/policy")
def create_policy(policy: PolicyCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Policy).filter_by(category=policy.category).first()
    if existing:
        existing.amount_limit = policy.amount_limit
        existing.description = policy.description
    else:
        new_policy = models.Policy(**policy.dict())
        db.add(new_policy)
    db.commit()
    return {"message": "Policy Updated"}

@app.post("/login")
def login_user(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(
        models.User.name == data.name,
        models.User.password == data.password
    ).first()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return {
        "emp_id": user.emp_id,
        "name": user.name,
        "role": user.role
    }