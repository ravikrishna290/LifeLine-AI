import requests
import os
from dotenv import load_dotenv

load_dotenv()
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

print(f"API Key Starts With: {GOOGLE_MAPS_API_KEY[:10] if GOOGLE_MAPS_API_KEY else 'NONE'}")

url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
params = {
    "location": "28.6139,77.2090",
    "radius": 10000,
    "type": "hospital",
    "key": GOOGLE_MAPS_API_KEY
}

print("Making request...")
try:
    response = requests.get(url, params=params, timeout=10)
    print(f"Status Code: {response.status_code}")
except Exception as e:
    print(f"Error: {e}")
