import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getAppTime } from '../utils/timeUtils';

const LiveClock = () => {
    const [time, setTime] = useState(getAppTime());

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(getAppTime());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const format = localStorage.getItem('timeFormat') || '12h';

    const timeOptions = {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: format === '12h'
    };

    const dateOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };

    const formattedTime = time.toLocaleTimeString('en-US', timeOptions);
    const formattedDate = time.toLocaleDateString('en-US', dateOptions);

    return (
        <div className="d-flex flex-column align-items-end justify-content-center">
            <motion.div 
                key={formattedTime}
                initial={{ opacity: 0.8, y: -2 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="fw-bold fs-4 text-dark font-monospace"
                style={{ letterSpacing: '1px' }}
            >
                {formattedTime}
            </motion.div>
            <div className="text-secondary small fw-medium text-uppercase mt-1" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                {formattedDate}
            </div>
        </div>
    );
};

export default LiveClock;
