import math
from models import Resource

def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance in kilometers between two points 
    on the earth (specified in decimal degrees)
    """
    # convert decimal degrees to radians 
    lon1, lat1, lon2, lat2 = map(math.radians, [lon1, lat1, lon2, lat2])

    # haversine formula 
    dlon = lon2 - lon1 
    dlat = lat2 - lat1 
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a)) 
    r = 6371 # Radius of earth in kilometers
    return c * r

def calculate_score(resource: Resource, user_lat: float, user_lng: float, urgency: str = "critical") -> dict:
    """
    Ranks resources based on:
    - Distance (Closer = higher score)
    - Estimated response time
    - Availability
    - Urgency score
    """
    
    # 1. Distance Score (0.4 base weight)
    distance_km = haversine(user_lat, user_lng, resource.latitude, resource.longitude)
    
    # Normalize distance score (inverse distance, max out around 50km for practical purposes)
    # If distance is 0, score is 1. If distance is > 50km, score approaches 0.
    max_distance_km = 50.0
    distance_score = max(0.0, 1.0 - (distance_km / max_distance_km))
    
    # 2. Availability Score (0.3 base weight)
    availability_score = 0.0
    if resource.availability == "Available":
        availability_score = 1.0
    elif resource.availability == "Limited":
        availability_score = 0.5
    else: # Not Available
        availability_score = 0.0
        
    # 3. Estimated Response Time Score (0.2 base weight)
    # Assuming max acceptable response time is 120 minutes.
    max_response_time = 120.0
    response_time_score = max(0.0, 1.0 - (resource.estimated_response_time / max_response_time))
    
    # 4. Resource Rating (0.1 base weight)
    # Rating is out of 5
    rating_score = resource.rating / 5.0

    # Base weights
    w_distance = 0.4
    w_availability = 0.3
    w_response = 0.2
    w_rating = 0.1

    # Adjust weights based on urgency/type
    if resource.type == "ambulance":
        # Response time is critical
        w_response += 0.2
        w_rating -= 0.1
        w_distance -= 0.1
    elif resource.type == "oxygen":
        # Availability is critical
        w_availability += 0.2
        w_rating -= 0.1
        w_distance -= 0.1
    elif resource.type == "blood_bank":
        # Availability is critical
        w_availability += 0.1
        w_response -= 0.1

    # Urgency adjustments
    urgency_lower = urgency.lower()
    if urgency_lower == "critical":
        w_response += 0.15
        w_distance += 0.1
        w_rating -= 0.1
    elif urgency_lower == "low":
        # Can afford to go further for a better rated or highly available facility
        w_rating += 0.15
        w_distance -= 0.1
        w_response -= 0.1
        
    # Calculate final weighted score
    final_score = (
        (w_distance * distance_score) +
        (w_availability * availability_score) +
        (w_response * response_time_score) +
        (w_rating * rating_score)
    )

    return {
        "score": round(final_score, 4),
        "distance_km": round(distance_km, 2)
    }

def rank_resources(resources: list[Resource], user_lat: float, user_lng: float, urgency: str = "critical") -> list[dict]:
    ranked_results = []
    for resource in resources:
        ranking_info = calculate_score(resource, user_lat, user_lng, urgency)
        
        # Merge resource attributes with ranking info
        resource_dict = {
            "id": resource.id,
            "name": resource.name,
            "type": resource.type,
            "latitude": resource.latitude,
            "longitude": resource.longitude,
            "phone": resource.phone,
            "availability": resource.availability,
            "estimated_response_time": resource.estimated_response_time,
            "rating": resource.rating,
            "distance_km": ranking_info["distance_km"],
            "score": ranking_info["score"]
        }
        ranked_results.append(resource_dict)
    
    # Sort by highest score first
    ranked_results.sort(key=lambda x: x["score"], reverse=True)
    return ranked_results
