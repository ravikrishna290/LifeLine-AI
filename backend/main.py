import asyncio
import random
import json
import os
import requests
from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from dotenv import load_dotenv

import models
import database
from ranking import rank_resources
from pydantic import BaseModel
import google.generativeai as genai

# Load environment variables
load_dotenv()
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

genai.configure(api_key=GEMINI_API_KEY)
# Initialize Gemini
model = genai.GenerativeModel('gemini-pro')

# Create database tables (keeping for user/auth if needed later)
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="AI Emergency Resource Locator API - Live Data")

# Configure CORS
origins = [
    "http://localhost",
    "http://localhost:5173", 
    "http://localhost:5174", 
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------
# WebSocket Manager
# -----------------
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        payload = json.dumps(message)
        for connection in list(self.active_connections):
            try:
                await connection.send_text(payload)
            except Exception as e:
                print(f"Failed to send message to a client: {e}")
                self.disconnect(connection)

manager = ConnectionManager()
# -----------------

manager = ConnectionManager()
# -----------------

class VoiceQuery(BaseModel):
    text: str

@app.post("/api/voice-triage")
async def voice_triage(query: VoiceQuery):
    """
    Takes transcribed voice text from a frantic user and uses Gemini to categorize 
    the emergency type and urgency.
    """
    try:
        prompt = f"""
        Act as a strict, ultra-fast Medical Emergency Dispatch AI.
        
        Read the following transcribed voice message from a patient or bystander:
        "{query.text}"
        
        You must classify this into EXACTLY ONE of the following Resource Types:
        - "hospital" (for trauma, heart attacks, strokes, unknown severe illness)
        - "ambulance" (if they explicitly ask for an ambulance or transport)
        - "blood_bank" (if they mention needing blood)
        - "oxygen" (if they explicitly mention needing oxygen cylinders)
        
        And into EXACTLY ONE of the following Urgency Levels:
        - "critical" (immediate threat to life/limb, unconscious, not breathing, severe bleeding, chest pain)
        - "moderate" (needs fast help but stable, broken bones, severe pain, deep cuts)
        - "low" (non-life-threatening, mild pain, seeking general care)
        
        Output ONLY a raw, valid JSON object with absolutely no formatting blocks or markdown.
        Example output:
        {{"resourceType": "hospital", "urgency": "critical"}}
        """
        response = model.generate_content(prompt)
        # Clean formatting just in case
        cleaned_response = response.text.replace('```json', '').replace('```', '').strip()
        data = json.loads(cleaned_response)
        
        # Validate fallbacks
        if data.get("resourceType") not in ["hospital", "ambulance", "blood_bank", "oxygen"]:
            data["resourceType"] = "hospital"
            
        if data.get("urgency") not in ["critical", "moderate", "low"]:
            data["urgency"] = "critical"
            
        return data

    except Exception as e:
        print(f"Gemini Triage Error: {e}")
        # Intelligent fallback if AI fails parsing
        return {"resourceType": "hospital", "urgency": "critical"}

@app.get("/")
def read_root():
    return {"message": "Welcome to AI Emergency Resource Locator API"}

@app.get("/resources", response_model=List[models.RankedResourceResponse])
def get_ranked_resources(type: str, lat: float, lng: float, radius: float = 10.0, urgency: str = "critical"):
    """
    Fetches real-world data from Google Places API, applies emergency simulations 
    (availability, response time), and ranks them using AI scoring.
    """
    radius_meters = int(radius * 1000)
    
    # Map app categories to Google Place API types and keywords
    type_mapping = {
        "hospital": "hospital",
        "ambulance": "health",
        "blood_bank": "health",
        "oxygen": "pharmacy",
        "all": "hospital"
    }
    
    keyword = type
    if type.lower() == "blood_bank":
        keyword = "blood bank"
    elif type.lower() == "ambulance":
        keyword = "ambulance service"
    elif type.lower() == "oxygen":
        keyword = "medical oxygen supplier"
    else:
        keyword = ""

    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    params = {
        "location": f"{lat},{lng}",
        "radius": radius_meters,
        "type": type_mapping.get(type.lower(), "health"),
        "key": GOOGLE_MAPS_API_KEY
    }
    if keyword:
        params["keyword"] = keyword
        
    response = requests.get(url, params=params)
    data = response.json()
    
    print(f"DEBUG GOOGLE API RESPONSE: {data.get('status')} - Results Count: {len(data.get('results', []))}")
    if data.get('status') != 'OK' and data.get('status') != 'ZERO_RESULTS':
        print(f"DEBUG GOOGLE API ERROR MESSAGE: {data.get('error_message', 'No error message')}")
        
    parsed_resources = []
    
    # Parse real locations into our simulation models
    for idx, place in enumerate(data.get("results", [])[:25]):
        resource = models.ResourceResponse(
            id=idx + 1000, # Generate dynamic in-memory ID for WebSockets
            name=place.get("name", "Unknown Facility"),
            type=type.lower() if type.lower() != "all" else "hospital",
            latitude=place.get("geometry", {}).get("location", {}).get("lat", 0),
            longitude=place.get("geometry", {}).get("location", {}).get("lng", 0),
            phone=f"+91 {random.randint(9000, 9999)} {random.randint(100000, 999999)}", 
            availability=random.choices(["Available", "Limited", "Not Available"], weights=[0.6, 0.3, 0.1])[0],
            estimated_response_time=random.randint(5, 60), # More realistic response times
            rating=place.get("rating", round(random.uniform(3.5, 5.0), 1))
        )
        parsed_resources.append(resource)
    
    if not parsed_resources:
        return []
        
    # Rank resources and return
    ranked_resources = rank_resources(parsed_resources, lat, lng, urgency)
    return ranked_resources

# -----------------
# Real-Time Websocket
# -----------------
@app.websocket("/ws/availability")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Since we use dynamic IDs starting from 1000 up to ~1025 for Places API results
        dynamic_ids = [1000 + i for i in range(30)]
        
        while True:
            # Wait 3-8 seconds before next simulation tick
            delay = random.uniform(3.0, 8.0)
            await asyncio.sleep(delay)
            
            # Pick a random resource from the dynamic range
            target_id = random.choice(dynamic_ids)
            new_status = random.choice(["Available", "Limited", "Not Available"])
            
            update_msg = {
                "id": target_id,
                "availability": new_status,
                "timestamp": asyncio.get_event_loop().time()
            }
            
            await manager.broadcast(update_msg)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"Websocket error: {e}")
        manager.disconnect(websocket)
