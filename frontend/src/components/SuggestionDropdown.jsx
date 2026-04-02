import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Premium Suggestion Dropdown
 * @param {Array} suggestions - List of items to display
 * @param {string} title - Header text for the dropdown
 * @param {Function} onSelect - Callback when an item is clicked
 * @param {Function} onCancel - Callback to close/clear suggestions
 * @param {Function} renderItem - Custom renderer for each item (optional)
 * @param {boolean} isVisible - Visibility flag
 */
const SuggestionDropdown = ({ 
    suggestions = [], 
    title = 'Suggestions', 
    onSelect, 
    onCancel, 
    renderItem,
    isVisible = false 
}) => {
    if (!isVisible || suggestions.length === 0) return null;

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0, y: -8, scale: 0.98 }} 
                animate={{ opacity: 1, y: 0, scale: 1 }} 
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="position-absolute w-100 mt-1 shadow-lg border rounded-3 overflow-hidden bg-white" 
                style={{ zIndex: 1060, top: '100%', left: 0, minWidth: '200px' }}
            >
                <div className="d-flex justify-content-between align-items-center px-3 py-2 bg-light border-bottom">
                    <span className="small fw-bold text-secondary text-uppercase tracking-wider" style={{ fontSize: '0.65rem' }}>{title}</span>
                    <button 
                        type="button" 
                        className="btn btn-sm p-0 border-0 text-danger opacity-75 hover-opacity-100 transition-all font-monospace" 
                        style={{ fontSize: '0.8rem', outline: 'none', boxShadow: 'none' }}
                        onMouseDown={(e) => { e.preventDefault(); onCancel(); }}
                    >
                        ✕
                    </button>
                </div>
                <div style={{ maxHeight: '200px', overflowY: 'auto', scrollbarWidth: 'thin' }}>
                    {suggestions.map((item, index) => (
                        <div 
                            key={index} 
                            className="px-3 py-2 border-bottom suggestion-item" 
                            style={{ 
                                cursor: 'pointer', 
                                transition: 'all 0.2s ease',
                                background: 'transparent'
                            }} 
                            onMouseDown={(e) => { 
                                e.preventDefault(); 
                                onSelect(item); 
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            {renderItem ? renderItem(item) : (
                                <div className="fw-bold text-dark">{item.toString()}</div>
                            )}
                        </div>
                    ))}
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default SuggestionDropdown;
