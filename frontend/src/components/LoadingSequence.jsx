import React from 'react';

/**
 * LoadingSequence Component
 * @param {boolean} fullScreen - If true, renders as a fixed splash screen.
 * @param {string} text - The custom loading text to display.
 */
const LoadingSequence = ({ fullScreen = false, text = "Loading..." }) => {
    return (
        <div className={fullScreen ? "splash-screen" : "d-flex flex-column align-items-center justify-content-center p-5 w-100"}>
            <div className="text-center">
                <div className="loading-spinner mx-auto mb-4" style={{ width: '50px', height: '50px' }}></div>
                <div className="loading-text" style={{ fontSize: '0.8rem', opacity: 0.7 }}>{text}</div>
            </div>
        </div>
    );
};

export default LoadingSequence;
