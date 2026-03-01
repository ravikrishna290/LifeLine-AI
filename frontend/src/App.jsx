import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SearchPage from './pages/SearchPage';

function App() {
    return (
        <Router>
            <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-red-200">
                {/* Navigation Bar */}
                <nav className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
                    <div className="container mx-auto flex h-16 items-center justify-between px-4">
                        <div className="flex items-center gap-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-white shadow-lg shadow-red-200">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20" /><path d="M2 12h20" /></svg>
                            </div>
                            <span className="text-xl font-bold tracking-tight text-slate-900">LifeLine AI</span>
                        </div>
                    </div>
                </nav>

                {/* Main Content Area */}
                <main>
                    <Routes>
                        <Route path="/" element={<SearchPage />} />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

export default App;
