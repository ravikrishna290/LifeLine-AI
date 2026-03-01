from sqlalchemy import Column, Integer, String, Float, Boolean
from database import Base
from pydantic import BaseModel
from typing import Optional

# SQLAlchemy Models
class Resource(Base):
    __tablename__ = "resources"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    type = Column(String, index=True) # hospital, blood_bank, ambulance, oxygen
    latitude = Column(Float)
    longitude = Column(Float)
    phone = Column(String)
    availability = Column(String) # Available, Limited, Not Available
    estimated_response_time = Column(Integer) # in minutes
    rating = Column(Float)

# Pydantic Schemas
class ResourceBase(BaseModel):
    name: str
    type: str
    latitude: float
    longitude: float
    phone: str
    availability: str
    estimated_response_time: int
    rating: float

class ResourceCreate(ResourceBase):
    pass

class ResourceResponse(ResourceBase):
    id: int
    
    class Config:
        from_attributes = True

# Schema for ranked responses, which includes calculated fields
class RankedResourceResponse(ResourceResponse):
    distance_km: float
    score: float
