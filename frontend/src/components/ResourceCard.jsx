import React from 'react';
import { motion } from 'framer-motion';
import { Phone, Navigation2, Star } from 'lucide-react';

const ResourceCard = ({ resource, index, userLocation, onGetDirections }) => {

    const isTopMatch = index === 0;

    // Helper functions for dynamic UI state
    const getAvailabilityDetails = (status) => {
        if (status === 'Available') return { text: 'High', colorText: 'text-green-500', dot: 'bg-green-500' };
        if (status === 'Limited') return { text: 'Moderate', colorText: 'text-amber-500', dot: 'bg-amber-500' };
        return { text: 'Critical/Low', colorText: 'text-red-500', dot: 'bg-red-500' };
    };

    const getBackgroundImage = (type) => {
        switch (type) {
            case 'hospital': return 'https://images.unsplash.com/photo-1587351608754-04f762740bc1?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80';
            case 'ambulance': return 'https://images.unsplash.com/photo-1599700403969-f77b3df2ec9e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80';
            case 'blood_bank': return 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80';
            case 'oxygen': return 'https://images.unsplash.com/photo-1583324113626-70df0f4deaab?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80';
            default: return 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80';
        }
    };

    const handleDirections = () => {
        if (onGetDirections) {
            onGetDirections();
        } else {
            const url = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${resource.latitude || resource.lat},${resource.longitude || resource.lng}`;
            window.open(url, '_blank');
        }
    };

    const availObj = getAvailabilityDetails(resource.availability);
    const confidenceScore = Math.min(99, Math.max(50, Math.round((resource.score * 10) * 10))); // Convert e.g., 0.92 to 92

    if (isTopMatch) {
        return (
            <div className="golden-glow flex flex-col lg:flex-row items-stretch overflow-hidden rounded-xl bg-white dark:bg-primary-brand/5 border border-accent-gold/40 mb-4 shadow-xl">
                <div className="relative w-full lg:w-1/3 min-h-[200px] overflow-hidden">
                    <div className="absolute inset-0 bg-center bg-no-repeat bg-cover transition-transform duration-700 hover:scale-105" style={{ backgroundImage: `url(${getBackgroundImage(resource.type)})` }}></div>
                    <div className="absolute top-4 left-4 flex gap-2 flex-wrap">
                        <span className="bg-accent-gold text-background-dark text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-widest shadow-lg">Recommended</span>
                        <span className="bg-primary-brand text-white text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-widest shadow-lg">{confidenceScore}% AI Confidence</span>
                    </div>
                </div>
                <div className="flex flex-1 flex-col p-6 gap-4">
                    <div className="flex justify-between items-start">
                        <div className="flex flex-col gap-1 pr-2">
                            <h3 className="text-slate-900 dark:text-slate-100 text-2xl font-extrabold leading-tight">{resource.name}</h3>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className={`flex items-center gap-1 ${availObj.colorText} text-xs md:text-sm font-bold uppercase tracking-wider`}>
                                    <span className={`w-2 h-2 rounded-full ${availObj.dot} animate-pulse`}></span>
                                    Live Availability: {availObj.text}
                                </span>
                                <span className="text-slate-300 dark:text-slate-600 hidden md:inline">•</span>
                                <span className="text-slate-500 dark:text-slate-400 text-xs md:text-sm font-medium">Est. {resource.estimated_response_time} mins</span>
                            </div>
                        </div>
                        <div className="text-right shrink-0">
                            <p className="text-3xl font-black text-primary-brand leading-none tracking-tighter shrink-0">{resource.distance_km} <span className="text-sm font-bold uppercase">KM</span></p>
                            <div className="flex items-center justify-end gap-1 mt-1">
                                <Star className="w-3 h-3 text-accent-gold fill-accent-gold" />
                                <span className="text-xs text-slate-500 font-bold">{resource.rating}</span>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-auto pt-2">
                        <a href={`tel:${resource.phone}`} className="flex items-center justify-center gap-2 h-12 md:h-14 bg-primary-brand text-white rounded-lg text-sm md:text-lg font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-lg shadow-primary-brand/20 active:scale-95">
                            <Phone className="w-5 h-5" /> Call Now
                        </a>
                        <button onClick={handleDirections} className="flex items-center justify-center gap-2 h-12 md:h-14 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-sm md:text-lg font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg active:scale-95">
                            <Navigation2 className="w-5 h-5" /> Navigate
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Standard Match View
    return (
        <div className="flex flex-col lg:flex-row items-stretch overflow-hidden rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-primary-brand/30 transition-all mb-4 shadow-sm group">
            <div className="relative w-full lg:w-1/4 min-h-[160px] overflow-hidden">
                <div className="absolute inset-0 bg-center bg-no-repeat bg-cover grayscale-[40%] group-hover:grayscale-0 transition-all duration-500" style={{ backgroundImage: `url(${getBackgroundImage(resource.type)})` }}></div>
                <div className="absolute top-4 left-4">
                    <span className="bg-slate-800/80 backdrop-blur text-white text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-widest">{confidenceScore}% AI Confidence</span>
                </div>
            </div>
            <div className="flex flex-1 flex-col p-5 gap-4">
                <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1 pr-2">
                        <h3 className="text-slate-900 dark:text-slate-100 text-lg md:text-xl font-bold leading-tight">{resource.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`flex items-center gap-1 ${availObj.colorText} text-xs font-bold uppercase tracking-wider`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${availObj.dot}`}></span>
                                Live Availability: {availObj.text}
                            </span>
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-xl md:text-2xl font-black text-slate-700 dark:text-slate-300 leading-none">{resource.distance_km} <span className="text-xs">KM</span></p>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-auto pt-1">
                    <a href={`tel:${resource.phone}`} className="flex items-center justify-center gap-2 h-10 md:h-12 bg-primary-brand/10 text-primary-brand rounded-lg text-xs md:text-sm font-bold uppercase tracking-widest hover:bg-primary-brand/20 transition-all active:scale-95">
                        <Phone className="w-4 h-4" /> Call
                    </a>
                    <button onClick={handleDirections} className="flex items-center justify-center gap-2 h-10 md:h-12 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs md:text-sm font-bold uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95">
                        <Navigation2 className="w-4 h-4" /> Navigate
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ResourceCard;
