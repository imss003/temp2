import os
from fastapi import FastAPI, File, UploadFile, Form, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv
from typing import Optional, Union, Any
import logging

# Import local modules - Ensure these files exist in the same directory!
from database import get_db, engine
import models

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# 1. CORS Middleware (Must be FIRST)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Cloudinary Config
cloudinary.config(
    cloud_name=os.getenv("CLOUD_NAME"),
    api_key=os.getenv("API_KEY"),
    api_secret=os.getenv("API_SECRET")
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

# --- Startup ---
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

# --- Core Routes ---

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

    elif user.role == "audit" or user.role == "admin":
        response["all_requests"] = db.query(models.Requests).all()
        if user.role == "admin":
            response["stats"] = {
                "total_users": db.query(models.User).count(),
                "total_requests": db.query(models.Requests).count(),
                "pending": db.query(models.Requests).filter_by(status="Pending").count(),
                "paid": db.query(models.Requests).filter_by(status="Paid").count()
            }
    return response

@app.post("/request")
async def create_request(
    emp_id: int = Form(...), 
    category: str = Form(...), 
    description: str = Form(...),
    file: UploadFile = File(...), 
    db: Session = Depends(get_db)
):
    print("Step 1: Received request from frontend")
    try:
        # 1. Verify User
        user = db.query(models.User).filter_by(emp_id=emp_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        print("Step 2: User found in database")
        
        # 2. Prepare the file for upload
        # This ensures the 'cursor' is at the start of the file data
        await file.seek(0) 
        file_content = await file.read() # Reading into memory helps avoid stream resets
        
        print("Step 3: Starting Cloudinary Upload...")
        # 3. Upload to Cloudinary with explicit parameters
        upload = cloudinary.uploader.upload(
            file_content,
            resource_type="auto",
            folder="reimbursements",
            use_filename=True,
            unique_filename=True
        )
        print("Step 4: Cloudinary Upload Successful")

        # 4. Determine status and save to DB
        initial_status = "Awaiting Finance" if user.role == "manager" else "Pending"

        req = models.Requests(
            emp_id=emp_id,
            category=category,
            description=description,
            image_path=upload["secure_url"],
            status=initial_status
        )
        db.add(req)
        db.commit()
        return {"message": "Request created", "status": initial_status}

    except Exception as e:
        logger.error(f"Error in /request: {str(e)}")
        # If it's a Cloudinary specific error, it will be caught here
        raise HTTPException(status_code=500, detail=f"Upload Failed: {str(e)}")

# 3. THE NEW UPDATE ROUTE
@app.put("/request/{req_id}")
def update_request(req_id: int, data: RequestUpdate, db: Session = Depends(get_db)):
    req = db.query(models.Requests).filter_by(req_id=req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    
    req.category = data.category
    req.description = data.description
    
    # Optional: Reset status to Pending so it can be re-approved
    req.status = "Pending"
    
    db.commit()
    return {"message": "Request updated successfully"}

# --- Admin Management ---
@app.get("/admin/users")
def get_users(db: Session = Depends(get_db)):
    print(db.query(models.User).all())
    return db.query(models.User).all()

@app.post("/admin/user")
def add_user(user: UserCreate, db: Session = Depends(get_db)):
    m_id = user.manager_id
    if m_id == "" or m_id == 0 or m_id is None:
        m_id = None
    else:
        try:
            m_id = int(m_id)
            manager_exists = db.query(models.User).filter_by(emp_id=m_id).first()
            if not manager_exists:
                raise HTTPException(status_code=400, detail=f"Manager ID {m_id} not found.")
        except ValueError:
            m_id = None

    existing_user = db.query(models.User).filter_by(emp_id=user.emp_id).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Employee ID already exists.")

    db_user = models.User(
        emp_id=user.emp_id,
        name=user.name,
        role=user.role,
        manager_id=m_id
    )
    db.add(db_user)
    db.commit()
    return {"message": "User Added"}

@app.delete("/admin/user/{emp_id}")
def delete_user(emp_id: int, db: Session = Depends(get_db)):
    if emp_id == 1:
        raise HTTPException(status_code=400, detail="Cannot delete Master Admin.")
    user = db.query(models.User).filter_by(emp_id=emp_id).first()
    if user:
        db.delete(user)
        db.commit()
    return {"message": "Deleted"}

@app.post("/admin/policy")
def create_policy(policy: PolicyCreate, db: Session = Depends(get_db)):
    db.merge(models.Policy(**policy.dict()))
    db.commit()
    return {"message": "Policy Updated"}

@app.get("/policies")
def get_policies(db: Session = Depends(get_db)):
    return db.query(models.Policy).all()

# --- Status Updates & Finance ---

@app.put("/manager/approve/{req_id}")
def approve(req_id: int, db: Session = Depends(get_db)):
    req = db.query(models.Requests).filter_by(req_id=req_id).first()
    if not req: raise HTTPException(status_code=404, detail="Request not found")
    req.status = "Manager Approved"
    db.commit()
    return {"msg": "OK"}

@app.put("/manager/reject/{req_id}")
def manager_reject(req_id: int, db: Session = Depends(get_db)):
    req = db.query(models.Requests).filter_by(req_id=req_id).first()
    if not req: raise HTTPException(status_code=404, detail="Request not found")
    req.status = "Rejected"
    db.commit()
    return {"message": "Rejected"}

@app.put("/finance/approve/{req_id}")
def finance_approve(req_id: int, db: Session = Depends(get_db)):
    req = db.query(models.Requests).filter_by(req_id=req_id).first()
    if not req: raise HTTPException(status_code=404, detail="Not found")
    req.status = "Paid"
    db.commit()
    return {"message": "Approved and Paid"}

@app.put("/finance/reject/{req_id}")
def finance_reject(req_id: int, db: Session = Depends(get_db)):
    req = db.query(models.Requests).filter_by(req_id=req_id).first()
    if not req: raise HTTPException(status_code=404, detail="Not found")
    req.status = "Rejected by Finance"
    db.commit()
    return {"message": "Rejected"}

@app.put("/finance/pay/{req_id}")
def finance_pay(req_id: int, db: Session = Depends(get_db)):
    req = db.query(models.Requests).filter_by(req_id=req_id).first()
    if not req: 
        raise HTTPException(status_code=404, detail="Request not found")
    req.status = "Paid"
    db.commit()
    return {"message": "Payment Released Successfully"}