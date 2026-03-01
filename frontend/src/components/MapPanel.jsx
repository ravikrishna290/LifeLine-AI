import React, { useCallback, useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, DirectionsRenderer } from '@react-google-maps/api';
import { Phone, Navigation2, Star } from 'lucide-react';

const containerStyle = {
    width: '100%',
    height: '100%'
};

const MapPanel = ({ userLocation, resources, activeRouteDestination, clearRoute }) => {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
    });

    const [map, setMap] = useState(null);
    const [activeMarker, setActiveMarker] = useState(null);
    const [directionsResponse, setDirectionsResponse] = useState(null);

    const onLoad = useCallback(function callback(map) {
        setMap(map);
    }, []);

    const onUnmount = useCallback(function callback(map) {
        setMap(null);
    }, []);

    // Effect to calculate route when activeRouteDestination changes
    useEffect(() => {
        if (!activeRouteDestination || !userLocation?.lat || !window.google) {
            setDirectionsResponse(null);
            return;
        }

        const directionsService = new window.google.maps.DirectionsService();

        const origin = userLocation;
        const destination = { lat: activeRouteDestination.latitude || activeRouteDestination.lat, lng: activeRouteDestination.longitude || activeRouteDestination.lng };

        console.log("ROUTING DEBUG: Drawing route from", origin, "to", destination);

        directionsService.route(
            {
                origin: origin,
                destination: destination,
                travelMode: window.google.maps.TravelMode.DRIVING,
            },
            (result, status) => {
                if (status === window.google.maps.DirectionsStatus.OK) {
                    setDirectionsResponse(result);
                    setActiveMarker(null); // Close info window when routing starts
                } else {
                    console.error('error fetching directions', result, status);
                    alert(`Google Maps Route Error: ${status}\nPlease ensure the "Directions API" is enabled in your Google Cloud Console for this API key.`);
                }
            }
        );
    }, [activeRouteDestination, userLocation]);


    if (!isLoaded) return <div className="flex h-full items-center justify-center bg-slate-100 text-slate-500 font-medium">Loading Map...</div>;

    return (
        <div className="w-full h-full relative z-0">
            {/* Clear Route Button Overlay */}
            {directionsResponse && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20">
                    <button
                        onClick={() => { setDirectionsResponse(null); if (clearRoute) clearRoute(); }}
                        className="bg-slate-900/90 hover:bg-black text-white px-4 py-2 rounded-full font-bold text-sm shadow-xl flex items-center gap-2 backdrop-blur-md transition-all"
                    >
                        Exit Navigation ✕
                    </button>
                </div>
            )}

            <GoogleMap
                mapContainerStyle={containerStyle}
                center={userLocation?.lat ? userLocation : { lat: 28.6139, lng: 77.2090 }}
                zoom={14}
                onLoad={onLoad}
                onUnmount={onUnmount}
                options={{
                    disableDefaultUI: false,
                    zoomControl: false,
                    streetViewControl: false,
                    mapTypeControl: false,
                    styles: [
                        {
                            "featureType": "poi.medical",
                            "elementType": "geometry",
                            "stylers": [{ "color": "#fecaca" }]
                        }
                    ]
                }}
            >
                {/* Route Renderer */}
                {directionsResponse && (
                    <DirectionsRenderer
                        directions={directionsResponse}
                        options={{
                            polylineOptions: {
                                strokeColor: "#ef4444", // Red emergency route line
                                strokeWeight: 6,
                                strokeOpacity: 0.8
                            },
                            suppressMarkers: true // Keep our custom glowing markers instead of default A/B pins
                        }}
                    />
                )}

                {/* User Location Marker */}
                {userLocation?.lat && (
                    <Marker
                        position={userLocation}
                        icon={{
                            path: window.google.maps.SymbolPath.CIRCLE,
                            fillColor: '#3b82f6',
                            fillOpacity: 1,
                            strokeWeight: 3,
                            strokeColor: '#ffffff',
                            scale: 10,
                        }}
                        title="Your Location"
                    />
                )}

                {/* Resource Markers (hide them if routing is active for cleaner UI, or keep them. Let's keep them) */}
                {resources.map((resource, index) => {
                    const isTopMatch = index === 0;
                    return (
                        <Marker
                            key={resource.id}
                            position={{ lat: resource.latitude || resource.lat, lng: resource.longitude || resource.lng }}
                            onClick={() => setActiveMarker(resource)}
                            title={resource.name}
                            icon={{
                                path: window.google.maps.SymbolPath.CIRCLE,
                                fillColor: isTopMatch ? '#ef4444' : '#64748b',
                                fillOpacity: 1,
                                strokeWeight: 3,
                                strokeColor: '#ffffff',
                                scale: isTopMatch ? 12 : 9,
                            }}
                        />
                    );
                })}

                {/* Info Window on click */}
                {activeMarker && !directionsResponse && (
                    <InfoWindow
                        position={{ lat: activeMarker.latitude || activeMarker.lat, lng: activeMarker.longitude || activeMarker.lng }}
                        onCloseClick={() => setActiveMarker(null)}
                    >
                        <div className="p-1 min-w-[200px]">
                            {resources.findIndex(r => r.id === activeMarker.id) === 0 && (
                                <div className="flex items-center gap-1 text-[10px] font-bold text-red-600 uppercase tracking-wider mb-2 bg-red-50 w-fit px-2 py-0.5 rounded-full">
                                    <Star className="w-3 h-3 fill-red-500" /> Top AI Pick
                                </div>
                            )}
                            <h3 className="font-bold text-slate-900 mb-1">{activeMarker.name}</h3>
                            <div className="text-xs text-slate-500 mb-2">{activeMarker.distance_km ? `${activeMarker.distance_km} km away` : ''}</div>
                            <div className="flex gap-2">
                                <a href={`tel:${activeMarker.phone}`} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 rounded-lg flex items-center justify-center gap-1 text-xs font-semibold transition-colors">
                                    <Phone className="w-3 h-3" /> Call
                                </a>
                            </div>
                        </div>
                    </InfoWindow>
                )}
            </GoogleMap>
        </div>
    );
};

export default React.memo(MapPanel);
