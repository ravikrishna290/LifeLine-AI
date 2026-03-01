import os
import requests
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GOOGLE_MAPS_API_KEY")

lat = 13.1547
lng = 80.2388
radius_meters = 10000

url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
params = {
    "location": f"{lat},{lng}",
    "radius": radius_meters,
    "type": "hospital",
    "key": api_key
}

response = requests.get(url, params=params)
print(response.status_code)
print(response.json())
