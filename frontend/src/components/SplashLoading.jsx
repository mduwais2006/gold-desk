import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SplashLoading = ({ onComplete }) => {
    const [progress, setProgress] = useState(0);

    // Intelligent Velocity Engine: Still adapts speed based on connectivity, but silently
    const velocity = useMemo(() => {
        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (conn) {
            if (conn.saveData) return 0.5;
            const effective = conn.effectiveType;
            if (effective === '4g') return 2.0; // Boosted from 1.5
            if (effective === '3g') return 1.2; // Boosted from 0.8
            return 0.6; // Boosted from 0.4
        }
        return 1.6; // Boosted from 1.2
    }, []);

    useEffect(() => {
        let currentProgress = 0;
        const interval = setInterval(() => {
            let increment = Math.random() * 2 * velocity;
            if (currentProgress < 70) {
                increment = Math.random() * 3 * velocity;
            } else if (currentProgress < 95) {
                increment = Math.random() * 0.5 * velocity;
            } else {
                increment = 0.1;
            }

            currentProgress = Math.min(currentProgress + increment, 99.9);
            setProgress(currentProgress);

            if (currentProgress > 99) {
                clearInterval(interval);
                setTimeout(() => {
                    setProgress(100);
                    setTimeout(onComplete, 500);
                }, 400);
            }
        }, 50);

        return () => clearInterval(interval);
    }, [onComplete, velocity]);

    return (
        <AnimatePresence>
            <motion.div
                className="splash-screen"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 1.05, filter: "blur(20px)" }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--bg-primary)', // Real theme background
                    zIndex: 9999,
                    overflow: 'hidden'
                }}
            >
                {/* Theme-aware Aura Background */}
                <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.05, 0.12, 0.05] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                    style={{ 
                        position: 'absolute', 
                        width: '70vw', 
                        height: '70vw', 
                        background: 'radial-gradient(circle, var(--accent-primary) 0%, transparent 70%)', 
                        borderRadius: '50%', 
                        top: '50%', 
                        left: '50%', 
                        transform: 'translate(-50%, -50%)', 
                        pointerEvents: 'none', 
                        filter: 'blur(60px)' 
                    }}
                />

                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.8 }}
                    style={{ position: 'relative', zIndex: 10, textAlign: 'center' }}
                >
                    <div style={{
                        width: '120px',
                        height: '120px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--glass-bg)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '35px',
                        boxShadow: 'var(--glass-shadow)',
                        margin: '0 auto 40px',
                        position: 'relative'
                    }}>
                        <motion.svg
                            width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 2, ease: "easeInOut" }}
                        >
                            <polygon points="12 2 2 7 12 22 22 7 12 2" />
                            <polyline points="2 7 12 7 22 7" />
                        </motion.svg>
                        
                    </div>

                    <h1 style={{
                        margin: 0,
                        color: 'var(--text-primary)',
                        fontSize: '3rem',
                        letterSpacing: '8px',
                        fontWeight: 900,
                        textTransform: 'uppercase'
                    }}>
                        GOLD DESK
                    </h1>
                </motion.div>

                {/* Minimalist Progress System */}
                <div className="mt-5" style={{ width: '220px', zIndex: 10 }}>
                    <div className="d-flex justify-content-between align-items-center mb-1 px-1">
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                           LOADING...
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: '900', fontFamily: 'monospace' }}>
                            {Math.round(progress)}%
                        </span>
                    </div>
                    <div style={{
                        height: "3px",
                        width: "100%",
                        background: 'var(--glass-border)',
                        borderRadius: "10px",
                        overflow: 'hidden'
                    }}>
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ ease: "linear" }}
                            style={{
                                height: '100%',
                                background: 'var(--accent-primary)',
                                boxShadow: '0 0 10px var(--accent-primary)'
                            }}
                        />
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default SplashLoading;
