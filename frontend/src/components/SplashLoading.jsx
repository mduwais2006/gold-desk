import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SplashLoading = ({ onComplete }) => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        // --- Internet-Aware Progress Engine ---
        // Measures approximate connection speed to adjust filling speed
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        const speedFactor = connection ? Math.max(0.5, Math.min(connection.downlink / 10, 2)) : 1;
        
        const interval = setInterval(() => {
            setProgress(prev => {
                const increment = (Math.random() * 10 + 2) * speedFactor;
                const next = prev + increment;
                
                if (next >= 100) {
                    clearInterval(interval);
                    setTimeout(onComplete, 300);
                    return 100;
                }
                return next;
            });
        }, 120);

        return () => clearInterval(interval);
    }, [onComplete]);

    return (
        <div className="splash-screen">
            {/* Dynamic Background Auras */}
            <motion.div 
                animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.15, 0.1] }}
                transition={{ duration: 8, repeat: Infinity }}
                className="bg-aura aura-gold" 
                style={{ top: '-10%', right: '-5%' }}
            />
            <motion.div 
                animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.12, 0.1] }}
                transition={{ duration: 10, repeat: Infinity, delay: 1 }}
                className="bg-aura aura-azure" 
                style={{ bottom: '-10%', left: '-5%' }}
            />

            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center position-relative d-flex flex-column align-items-center"
                style={{ zIndex: 10 }}
            >
                {/* Logo Inside Rotating Ring */}
                <div className="position-relative d-flex align-items-center justify-content-center mb-5" style={{ width: '180px', height: '180px' }}>
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="position-absolute"
                        style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: '50%',
                            border: '3px solid transparent',
                            borderTop: '3px solid var(--accent-primary)',
                            borderRight: '3px solid var(--accent-primary)',
                            opacity: 0.6
                        }}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3, duration: 1 }}
                    >
                        <img 
                            src="/logo.png" 
                            alt="Gold Desk Logo" 
                            style={{ 
                                width: '100px', 
                                height: '100px',
                                objectFit: 'contain',
                                filter: 'drop-shadow(0 0 10px rgba(212, 175, 55, 0.4))'
                            }} 
                        />
                    </motion.div>
                </div>



                <motion.div
                    initial={{ letterSpacing: '2px', opacity: 0 }}
                    animate={{ letterSpacing: 'clamp(4px, 1.5vw, 12px)', opacity: 1 }}
                    transition={{ duration: 0.8 }}
                >
                    <h1 style={{
                        margin: 0,
                        color: 'var(--accent-primary)',
                        fontSize: 'clamp(1.8rem, 5vw, 3.5rem)',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        textShadow: '0 10px 30px rgba(212, 175, 55, 0.15)'
                    }}>
                        GOLD DESK
                    </h1>
                </motion.div>

                <div className="mt-4">
                    <div className="loading-text">
                        System Initialization... {Math.round(progress)}%
                    </div>
                    {/* Professional Progress Bar */}
                    <div className="mx-auto mt-4" style={{ 
                        width: 'min(280px, 70vw)', 
                        height: '6px', 
                        background: 'var(--border-color)', 
                        borderRadius: '10px', 
                        overflow: 'hidden',
                        padding: '1px'
                    }}>
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ type: 'spring', damping: 20, stiffness: 60 }}
                            style={{ 
                                height: '100%', 
                                background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))',
                                borderRadius: '10px'
                            }}
                        />
                    </div>
                </div>
                
                <div className="mt-5 small text-secondary opacity-50 fw-bold tracking-widest text-uppercase" style={{ fontSize: '0.6rem' }}>
                    Secure Cloud Connectivity Active
                </div>
            </motion.div>
        </div>
    );
};


export default SplashLoading;
