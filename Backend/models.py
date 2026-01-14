from sqlalchemy import Column, Integer, String, ForeignKey, Float
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    emp_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)
    password = Column(String, nullable=False)
    role = Column(String(20), nullable=False)  # valid values: 'employee', 'manager', 'finance', 'admin'
    manager_id = Column(Integer, ForeignKey("users.emp_id"), nullable=True)

    # Relationships
    requests = relationship("Requests", back_populates="employee")

class Requests(Base):
    __tablename__ = "requests"

    req_id = Column(Integer, primary_key=True, index=True)
    emp_id = Column(Integer, ForeignKey("users.emp_id"), nullable=False)
    category = Column(String(50))
    amount = Column(Float, nullable=False)
    description = Column(String(200))
    image_path = Column(String(255), nullable=True)
    
    # Status flows: Pending -> Manager Approved -> Paid
    # Or for managers: Awaiting Finance -> Paid
    status = Column(String(20), default="Pending")

    employee = relationship("User", back_populates="requests")

class Policy(Base):
    __tablename__ = "policies"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(50), unique=True, nullable=False)
    amount_limit = Column(Integer, nullable=False)
    description = Column(String(200))