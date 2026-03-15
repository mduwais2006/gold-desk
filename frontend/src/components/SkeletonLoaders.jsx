import React from 'react';
import { motion } from 'framer-motion';

const Skeleton = ({ className }) => (
    <motion.div
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        className={`bg-light-subtle rounded ${className}`}
        style={{ backgroundColor: 'var(--border)' }}
    />
);

export const DashboardSkeleton = () => (
    <div className="animate-fade-in">
        <div className="row g-4 mb-4">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="col-md-3">
                    <div className="stat-card p-4">
                        <Skeleton className="stat-icon mb-3" />
                        <Skeleton className="h4 w-75 mb-2" />
                        <Skeleton className="small w-50" />
                    </div>
                </div>
            ))}
        </div>
        <div className="glass-panel p-4 h-100">
            <Skeleton className="h4 w-25 mb-4" />
            <Skeleton className="h-100 w-100" style={{ minHeight: '300px' }} />
        </div>
    </div>
);

export const TableSkeleton = () => (
    <div className="p-4 glass-panel animate-fade-in">
        <div className="d-flex justify-content-between mb-4">
            <Skeleton className="h4 w-25" />
            <Skeleton className="h-10 w-25" />
        </div>
        {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="d-flex gap-3 mb-3">
                <Skeleton className="h-10 w-100 py-3" />
            </div>
        ))}
    </div>
);
