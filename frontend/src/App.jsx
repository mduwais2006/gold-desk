import React, { useState, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { AnimatePresence, motion } from 'framer-motion';
import 'react-toastify/dist/ReactToastify.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/index.css';

import { AuthProvider, useAuth } from './context/AuthContext';
import { PrinterProvider } from './context/PrinterContext';
import SplashLoading from './components/SplashLoading';

// --- Lazy Loading Components for Max Performance ---
const Login = React.lazy(() => import('./pages/Login'));
const Signup = React.lazy(() => import('./pages/Signup'));
const VerifyOTP = React.lazy(() => import('./pages/VerifyOTP'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Billing = React.lazy(() => import('./pages/Billing'));
const Settings = React.lazy(() => import('./pages/Settings'));
const DataEntry = React.lazy(() => import('./pages/DataEntry'));
const About = React.lazy(() => import('./pages/About'));
const LockScreen = React.lazy(() => import('./pages/LockScreen'));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'));

import LoadingSequence from './components/LoadingSequence';

// Robust Page Loading Spinner
const PageLoader = () => <LoadingSequence fullScreen={true} />;

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
    const { user, isLocked } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    if (user && isLocked) return <Suspense fallback={<PageLoader />}><LockScreen /></Suspense>;
    return children;
};

// Page Transition Wrapper
const PageWrapper = ({ children }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.02 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
    >
        {children}
    </motion.div>
);

function AppRoutes() {
    const location = useLocation();

    return (
        <AnimatePresence mode="wait">
            <Suspense fallback={<PageLoader />}>
                <Routes location={location}>
                    <Route path="/login" element={<PageWrapper><Login /></PageWrapper>} />
                    <Route path="/register" element={<PageWrapper><Signup /></PageWrapper>} />
                    <Route path="/verify-otp" element={<PageWrapper><VerifyOTP /></PageWrapper>} />
                    <Route path="/forgot-password" element={<PageWrapper><ForgotPassword /></PageWrapper>} />
                    
                    <Route path="/" element={
                        <ProtectedRoute>
                            <PageWrapper><Dashboard /></PageWrapper>
                        </ProtectedRoute>
                    } />
                    <Route path="/billing" element={
                        <ProtectedRoute>
                            <PageWrapper><Billing /></PageWrapper>
                        </ProtectedRoute>
                    } />
                    <Route path="/data-entry" element={
                        <ProtectedRoute>
                            <PageWrapper><DataEntry /></PageWrapper>
                        </ProtectedRoute>
                    } />
                    <Route path="/settings" element={
                        <ProtectedRoute>
                            <PageWrapper><Settings /></PageWrapper>
                        </ProtectedRoute>
                    } />
                    <Route path="/about" element={
                        <ProtectedRoute>
                            <PageWrapper><About /></PageWrapper>
                        </ProtectedRoute>
                    } />
                    
                    {/* Fallback to Dashboard */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Suspense>
        </AnimatePresence>
    );
}

function App() {
    const [showSplash, setShowSplash] = useState(true);

    // Initial Theme Sync
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
    }, []);

    return (
        <AuthProvider>
            <PrinterProvider>
                <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                    <AnimatePresence mode="wait">
                        {showSplash ? (
                            <SplashLoading key="splash" onComplete={() => setShowSplash(false)} />
                        ) : (
                            <motion.div 
                                key="app" 
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: 1 }} 
                                transition={{ duration: 0.5 }}
                            >
                                <div className="bg-aura aura-gold"></div>
                                <div className="bg-aura aura-azure"></div>
                                <AppRoutes />
                                <ToastContainer position="top-right" theme="colored" autoClose={3000} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Router>
            </PrinterProvider>
        </AuthProvider>
    );
}

export default App;
