import os
import logging
from typing import Optional, Any

from fastapi import FastAPI, File, UploadFile, Form, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv

# Ensure these local files exist in your directory
from database import get_db, engine
import models

# --- Setup & Configuration ---
load_dotenv()
models.Base.metadata.create_all(bind=engine)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# 1. CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
    manager_id: Optional[Any] = None

class RequestUpdate(BaseModel):
    category: str
    description: str

class PolicyCreate(BaseModel):
    category: str
    amount_limit: int
    description: str

# --- Database Initialization ---
@app.on_event("startup")
def seed_admin_only():
    db = next(get_db())
    admin = db.query(models.User).filter_by(emp_id=1).first()
    if not admin:
        master_admin = models.User(
            emp_id=1, 
            name="Master Admin", 
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
    file: Optional[UploadFile] = File(None), # Optional File
    db: Session = Depends(get_db)
):
    try:
        user = db.query(models.User).filter_by(emp_id=emp_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        image_url = None
        
        # LOGIC: Only upload if a file exists and has a filename
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
            image_path=image_url, # Will be None if no file uploaded
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
    req.status = "Pending" # Reset status for re-approval
    
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
        response["team_requests"] = db.query(models.Requests).filter(models.Requests.emp_id.in_(team_ids)).all()
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
    # Clean up manager_id
    if m_id in ["", 0, None]:
        m_id = None
    else:
        try:
            m_id = int(m_id)
            if not db.query(models.User).filter_by(emp_id=m_id).first():
                raise HTTPException(status_code=400, detail=f"Manager {m_id} doesn't exist")
        except: m_id = None

    if db.query(models.User).filter_by(emp_id=user.emp_id).first():
        raise HTTPException(status_code=400, detail="ID already exists")

    new_user = models.User(emp_id=user.emp_id, name=user.name, role=user.role, manager_id=m_id)
    db.add(new_user)
    db.commit()
    return {"message": "User added"}

@app.delete("/admin/user/{emp_id}")
def delete_user(emp_id: int, db: Session = Depends(get_db)):
    if emp_id == 1: raise HTTPException(status_code=400, detail="Cannot delete Master Admin")
    user = db.query(models.User).filter_by(emp_id=emp_id).first()
    if user:
        db.delete(user)
        db.commit()
    return {"message": "User deleted"}

# --- Status Update Routes ---

@app.put("/manager/approve/{req_id}")
def manager_approve(req_id: int, db: Session = Depends(get_db)):
    req = db.query(models.Requests).filter_by(req_id=req_id).first()
    if req: 
        req.status = "Manager Approved"
        db.commit()
    return {"msg": "Approved"}

@app.put("/manager/reject/{req_id}")
def manager_reject(req_id: int, db: Session = Depends(get_db)):
    req = db.query(models.Requests).filter_by(req_id=req_id).first()
    if req: 
        req.status = "Rejected"
        db.commit()
    return {"msg": "Rejected"}

@app.put("/finance/approve/{req_id}")
def finance_approve(req_id: int, db: Session = Depends(get_db)):
    req = db.query(models.Requests).filter_by(req_id=req_id).first()
    if req: 
        req.status = "Paid"
        db.commit()
    return {"msg": "Paid"}

@app.put("/finance/pay/{req_id}")
def finance_pay(req_id: int, db: Session = Depends(get_db)):
    req = db.query(models.Requests).filter_by(req_id=req_id).first()
    if req: 
        req.status = "Paid"
        db.commit()
    return {"msg": "Paid"}

@app.get("/policies")
def get_policies(db: Session = Depends(get_db)):
    return db.query(models.Policy).all()

@app.post("/admin/policy")
def create_policy(policy: PolicyCreate, db: Session = Depends(get_db)):
    db.merge(models.Policy(**policy.dict()))
    db.commit()
    return {"message": "Policy Updated"}