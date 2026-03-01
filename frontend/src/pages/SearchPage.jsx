import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Search, Navigation2, Phone, AlertCircle, Loader2, Hospital, Activity, Droplet, Wind, Filter, Star, Info, List as ListIcon, Map as MapIcon, RotateCcw, Mic } from 'lucide-react';
import MapPanel from '../components/MapPanel';
import ResourceCard from '../components/ResourceCard';

const resourceTypes = [
    { id: 'hospital', label: 'Hospitals', icon: Hospital, color: 'text-rose-500', bg: 'bg-rose-50' },
    { id: 'ambulance', label: 'Ambulances', icon: Activity, color: 'text-amber-500', bg: 'bg-amber-50' },
    { id: 'blood_bank', label: 'Blood Banks', icon: Droplet, color: 'text-red-600', bg: 'bg-red-50' },
    { id: 'oxygen', label: 'Oxygen', icon: Wind, color: 'text-blue-500', bg: 'bg-blue-50' },
];

const SearchPage = () => {
    const [location, setLocation] = useState({ lat: null, lng: null });
    const [resourceType, setResourceType] = useState('hospital');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isDetecting, setIsDetecting] = useState(false);
    const [isListening, setIsListening] = useState(false);

    // New Features state
    const [activeTab, setActiveTab] = useState('list'); // 'list' or 'map' (for mobile)
    const [radius, setRadius] = useState(10); // radius in km
    const [urgency, setUrgency] = useState('critical'); // 'critical', 'moderate', 'low'
    const [showFilters, setShowFilters] = useState(false);
    const [wsLive, setWsLive] = useState(false);
    const [activeRouteDestination, setActiveRouteDestination] = useState(null);

    // Refs for WebSocket
    const ws = useRef(null);

    // Default to Delhi for map center if no location
    const defaultCenter = { lat: 28.6139, lng: 77.2090 };

    const detectLocation = () => {
        setIsDetecting(true);
        setError(null);
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                    setIsDetecting(false);
                },
                (err) => {
                    console.error(err);
                    setError("Location access denied. Using default area.");
                    setIsDetecting(false);
                    // Set to default if fail
                    setLocation(defaultCenter);
                }
            );
        } else {
            setError("Geolocation is not supported by your browser.");
            setIsDetecting(false);
            setLocation(defaultCenter);
        }
    };

    useEffect(() => {
        // Auto-detect on mount
        detectLocation();

        // Connect to Live Availability WebSocket
        ws.current = new WebSocket('ws://localhost:8000/ws/availability');

        ws.current.onopen = () => {
            console.log("Connected to Live Availability Stream");
            setWsLive(true);
        };

        ws.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log("Live Update Received:", data);

            // Update the results array if we have this resource
            setResults(prevResults => {
                const updated = [...prevResults];
                const index = updated.findIndex(r => r.id === data.id);
                if (index !== -1) {
                    updated[index] = {
                        ...updated[index],
                        availability: data.availability,
                        _lastUpdated: data.timestamp // Trigger re-render/animation
                    };
                }
                return updated;
            });
        };

        ws.current.onclose = () => {
            console.log("Disconnected from Live Stream");
            setWsLive(false);
        };

        return () => {
            if (ws.current) {
                ws.current.close();
            }
        };
    }, []);

    const handleSearch = async () => {
        if (!location.lat || !location.lng) {
            setError("Location is required. Please set your location first.");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            // Backend runs on port 8000
            const response = await axios.get(`http://localhost:8000/resources`, {
                params: {
                    type: resourceType,
                    lat: location.lat,
                    lng: location.lng,
                    radius: radius, // hypothetical backend support for radius
                    urgency: urgency
                }
            });
            // Simulate ranking delay for UI effect
            setTimeout(() => setResults(response.data), 600);
        } catch (err) {
            console.error(err);
            setError("Failed to fetch resources. Ensure backend is running.");
        } finally {
            setTimeout(() => setLoading(false), 600);
        }
    };

    const handleCallAmbulance = () => {
        // Dial the emergency medical services number (108 is common in India, 911 or 112 universally)
        window.location.href = 'tel:108';
    };

    const handleShareGPS = () => {
        if (!location.lat || !location.lng) {
            alert("Please allow location access to share your GPS coordinates.");
            detectLocation();
            return;
        }

        const mapsLink = `https://www.google.com/maps?q=${location.lat},${location.lng}`;

        if (navigator.share) {
            navigator.share({
                title: 'Emergency: My Location',
                text: 'I need immediate assistance. Here is my current location:',
                url: mapsLink,
            }).catch(console.error);
        } else {
            // Fallback for browsers that don't support Web Share API
            navigator.clipboard.writeText(`I need immediate assistance. My location: ${mapsLink}`);
            alert('Location link copied to your clipboard!');
        }
    };

    const startVoiceTriage = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            setError("Voice recognition is not supported in this browser.");
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            setIsListening(true);
            setError(null);
        };

        recognition.onresult = async (event) => {
            const transcript = event.results[0][0].transcript;
            setIsListening(false);
            setLoading(true);

            try {
                // Send transcribed text to backend Gemini
                const response = await axios.post('http://localhost:8000/api/voice-triage', {
                    text: transcript
                });

                const { resourceType: aiResourceType, urgency: aiUrgency } = response.data;

                // Set the UI States automatically based on AI understanding
                setResourceType(aiResourceType);
                setUrgency(aiUrgency);

                // Auto Trigger the Maps Search if location exists
                if (location.lat) {
                    // Small delay to let React update states, though we could pass them directly 
                    // to a refactored handleSearch in a real app. We'll simulate by re-fetching explicitly:
                    const searchRes = await axios.get(`http://localhost:8000/resources`, {
                        params: {
                            type: aiResourceType,
                            lat: location.lat,
                            lng: location.lng,
                            radius: radius,
                            urgency: aiUrgency
                        }
                    });
                    setTimeout(() => setResults(searchRes.data), 500);
                } else {
                    setError(`AI understood you need a ${aiResourceType} (${aiUrgency}). Please set your location to search.`);
                }
            } catch (err) {
                console.error(err);
                setError("AI Voice parsing failed. Please tap the buttons manually.");
            } finally {
                setTimeout(() => setLoading(false), 500);
            }
        };

        recognition.onerror = (event) => {
            console.error("Speech recognition error", event.error);
            setIsListening(false);
            setError("Failed to hear you. Please try again or tap the buttons.");
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.start();
    };

    // ---------------- UI RENDER ----------------

    const renderHomeView = () => (
        <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-900 w-full relative items-center">
            <div className="w-full max-w-[960px] flex-1 flex flex-col px-4 md:px-10 py-5">
                <header className="flex items-center justify-between border-b border-solid border-primary-brand/10 pb-4 mb-6 mt-2">
                    <div
                        className="flex items-center gap-3 text-primary-brand shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setResults([])}
                    >
                        <span className="material-symbols-outlined text-3xl font-bold">emergency</span>
                        <h1 className="text-slate-900 dark:text-slate-100 text-xl font-extrabold tracking-tighter uppercase whitespace-nowrap">LifeLine AI</h1>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <button
                            onClick={startVoiceTriage}
                            disabled={isListening || loading}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${isListening ? 'bg-red-600 text-white animate-pulse shadow-lg shadow-red-500/50' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                        >
                            <Mic className={`w-4 h-4 ${isListening ? 'animate-bounce' : ''}`} />
                            {isListening ? "Listening..." : "AI Voice"}
                        </button>
                        <button
                            onClick={detectLocation}
                            disabled={isDetecting}
                            className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
                        >
                            {isDetecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                            {location.lat ? "Location Saved" : "Set Location"}
                        </button>
                    </div>
                </header>
                <div className="mb-8">
                    <h2 className="text-4xl font-black leading-tight tracking-tight text-slate-900 dark:text-slate-100">Find Emergency Resources</h2>
                    <p className="text-slate-600 dark:text-slate-400 text-lg mt-2">AI-powered rapid medical assistance locator.</p>
                </div>

                {error && (
                    <div className="mb-6 flex items-start gap-3 text-sm text-red-700 bg-red-50/80 p-4 rounded-xl border border-red-200 shadow-sm">
                        <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
                        <p className="font-medium leading-tight">{error}</p>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4 md:gap-6 mb-10">
                    {resourceTypes.map(type => (
                        <button
                            key={type.id}
                            onClick={() => setResourceType(type.id)}
                            className={`group flex flex-col items-center justify-center gap-2 md:gap-4 p-6 md:p-8 bg-white dark:bg-slate-800 border-2 rounded-xl shadow-sm transition-all transform active:scale-95 ${resourceType === type.id ? 'border-primary-brand' : 'border-transparent hover:border-primary-brand/50'}`}
                        >
                            <div className={`size-14 md:size-16 rounded-full flex items-center justify-center transition-colors ${resourceType === type.id ? 'bg-primary-brand text-white' : 'bg-primary-brand/10 text-primary-brand group-hover:bg-primary-brand group-hover:text-white'}`}>
                                <span className="material-symbols-outlined text-3xl md:text-4xl">
                                    {type.id === 'hospital' ? 'local_hospital' : type.id === 'ambulance' ? 'ambulance' : type.id === 'blood_bank' ? 'bloodtype' : 'medical_services'}
                                </span>
                            </div>
                            <span className="text-sm md:text-lg font-bold text-slate-900 dark:text-slate-100">{type.label}</span>
                        </button>
                    ))}
                </div>

                <div className="mb-10">
                    <h3 className="text-lg md:text-xl font-bold mb-4 flex items-center gap-2 dark:text-white">
                        <span className="material-symbols-outlined text-primary-brand">priority_high</span> Urgency Level
                    </h3>
                    <div className="flex bg-slate-200 dark:bg-slate-800 p-1.5 rounded-xl">
                        {['critical', 'moderate', 'low'].map(level => (
                            <label key={level} className="flex-1 cursor-pointer">
                                <input
                                    type="radio"
                                    name="urgency"
                                    className="peer sr-only"
                                    checked={urgency === level}
                                    onChange={() => setUrgency(level)}
                                />
                                <div className="flex items-center justify-center py-2 md:py-3 rounded-lg text-slate-600 dark:text-slate-400 font-bold peer-checked:bg-primary-brand peer-checked:text-white transition-all peer-checked:scale-[1.02] peer-checked:shadow-lg capitalize text-sm md:text-base">
                                    {level}
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="mt-auto pb-6">
                    <button
                        onClick={handleSearch}
                        disabled={loading || (!location.lat && !isDetecting)}
                        className="w-full bg-primary-brand text-white py-5 md:py-6 rounded-2xl text-lg md:text-xl font-black uppercase tracking-widest shadow-[0_0_30px_rgba(229,55,52,0.4)] hover:shadow-[0_0_50px_rgba(229,55,52,0.6)] transition-all transform active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:active:scale-100"
                    >
                        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <span className="material-symbols-outlined text-3xl">search_check</span>}
                        Find Nearest Help
                    </button>
                </div>
            </div>
            {/* Sticky Bottom Bar */}
            <footer className="w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 flex gap-3 z-50 shrink-0">
                <button onClick={handleCallAmbulance} className="flex-1 bg-primary-brand text-white py-3 rounded-xl font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-primary-brand/20 text-xs md:text-sm transition-transform active:scale-95">
                    <span className="material-symbols-outlined text-xl">call</span> Quick Call Ambulance
                </button>
                <button onClick={handleShareGPS} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 text-xs md:text-sm transition-transform active:scale-95">
                    <span className="material-symbols-outlined text-xl">location_on</span> Share GPS
                </button>
            </footer>
        </div>
    );

    const renderResultsView = () => (
        <div className="h-[calc(100vh-4rem)] w-full flex flex-col md:flex-row overflow-hidden relative bg-background-light dark:bg-background-dark">
            {/* Mobile View Toggle */}
            <div className="md:hidden absolute bottom-6 w-full flex justify-center z-50 pointer-events-none">
                <div className="bg-slate-900/90 backdrop-blur-md p-1 rounded-full flex gap-1 shadow-xl shadow-slate-900/20 border border-slate-700/50 pointer-events-auto">
                    <button
                        onClick={() => { setActiveTab('list'); setActiveRouteDestination(null); }}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${activeTab === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-300 hover:text-white'}`}
                    >
                        <ListIcon className="w-4 h-4" /> List
                    </button>
                    <button
                        onClick={() => setActiveTab('map')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${activeTab === 'map' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-300 hover:text-white'}`}
                    >
                        <MapIcon className="w-4 h-4" /> Map
                    </button>
                </div>
            </div>

            {/* AI Ranked Results List Area */}
            <div className={`w-full md:w-[500px] lg:w-[600px] bg-background-light dark:bg-background-dark border-r border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col h-full z-40 transition-transform duration-500 ease-in-out ${activeTab === 'map' ? '-translate-x-full md:translate-x-0 absolute md:relative' : 'translate-x-0 relative'}`}>
                {/* Fixed Search Header (Simplified for results page) */}
                <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-slate-200 dark:border-primary-brand/20 px-4 py-4 bg-white dark:bg-slate-900/90 backdrop-blur-md shrink-0">
                    <div
                        className="flex items-center gap-3 text-primary-brand cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setResults([])}
                    >
                        <button onClick={(e) => { e.stopPropagation(); setResults([]); }} className="mr-1 text-slate-500 hover:text-primary-brand transition-colors"><RotateCcw className="w-5 h-5" /></button>
                        <span className="material-symbols-outlined text-2xl">emergency</span>
                        <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-tight">LifeLine AI</h2>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleSearch} disabled={loading} className="flex items-center justify-center rounded-lg px-3 py-1.5 bg-slate-100 dark:bg-primary-brand/10 text-primary-brand text-xs font-bold hover:bg-slate-200 dark:hover:bg-primary-brand/20 transition-colors">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-1" />}
                            Refresh
                        </button>
                    </div>
                </header>

                {/* Results Scrollable Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 overscroll-contain pb-24 md:pb-6">
                    <div className="flex flex-col gap-1 mb-6">
                        <h1 className="text-slate-900 dark:text-slate-100 text-3xl font-black leading-tight tracking-tight">AI-Ranked Results</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Top medical facilities prioritized by urgency ({urgency}) and proximity.</p>
                    </div>

                    <div className="space-y-4">
                        {loading ? (
                            // Skeleton loading
                            [...Array(4)].map((_, i) => (
                                <div key={i} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 flex flex-col gap-4 shadow-sm animate-pulse">
                                    <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-md w-3/4"></div>
                                    <div className="h-4 bg-slate-100 dark:bg-slate-700/50 rounded-md w-1/2"></div>
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        <div className="h-12 bg-slate-100 dark:bg-slate-700/50 rounded-lg"></div>
                                        <div className="h-12 bg-slate-100 dark:bg-slate-700/50 rounded-lg"></div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <AnimatePresence>
                                {results.map((resource, index) => (
                                    <motion.div
                                        key={resource.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                    >
                                        <ResourceCard
                                            resource={resource}
                                            index={index}
                                            userLocation={location}
                                            onGetDirections={() => {
                                                setActiveRouteDestination(resource);
                                                if (window.innerWidth < 768) {
                                                    setActiveTab('map');
                                                }
                                            }}
                                        />
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        )}
                    </div>
                </div>
            </div>

            {/* Map Area */}
            <div className={`flex-1 h-full bg-slate-800 relative transition-transform duration-500 ease-in-out md:translate-x-0 ${activeTab === 'list' ? 'translate-x-[100%] md:translate-x-0 absolute md:relative w-full' : 'translate-x-0 w-full relative'}`}>
                <div className="absolute inset-0 z-0">
                    <MapPanel
                        userLocation={location.lat ? location : defaultCenter}
                        resources={results}
                        activeRouteDestination={activeRouteDestination}
                        clearRoute={() => setActiveRouteDestination(null)}
                    />
                </div>
            </div>
        </div>
    );

    // Main render router
    if (results.length === 0 && !loading) {
        return renderHomeView();
    }

    return renderResultsView();
};

export default SearchPage;
