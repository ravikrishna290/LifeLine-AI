import os
import requests
from dotenv import load_dotenv
import json

load_dotenv()
api_key = os.getenv("GOOGLE_MAPS_API_KEY")

url = "https://places.googleapis.com/v1/places:searchNearby"

payload = {
    "includedTypes": ["hospital"],
    "maxResultCount": 10,
    "locationRestriction": {
        "circle": {
            "center": {
                "latitude": 13.1547,
                "longitude": 80.2388
            },
            "radius": 10000.0
        }
    }
}

headers = {
    "Content-Type": "application/json",
    "X-Goog-Api-Key": api_key,
    "X-Goog-FieldMask": "places.displayName,places.location,places.rating"
}

response = requests.post(url, json=payload, headers=headers)
print(response.status_code)
print(json.dumps(response.json(), indent=2))
