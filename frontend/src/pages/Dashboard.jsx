import React, { useEffect, useState, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { toast } from 'react-toastify';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAnalyticsData } from '../redux/analyticsSlice';

const Dashboard = () => {
    const dispatch = useDispatch();
    const { data: rawData, status: analyticsStatus } = useSelector((state) => state.analytics);
    
    useEffect(() => {
        // Always fetch fresh data on dashboard mount to instantly reflect new bills or entries
        dispatch(fetchAnalyticsData());
    }, [dispatch]);

    const StatCard = React.memo(({ title, value, icon, colorClass, subtitle }) => (
        <div className="stat-card glass-panel border-0 h-100">
            <div className={`stat-icon ${colorClass || ''}`}>{icon}</div>
            <div className="stat-title">{title}</div>
            <div className={`stat-value ${colorClass?.includes('text-success') ? 'text-success' : ''}`}>{value}</div>
            {subtitle && (
                <div className="mt-2 fw-semibold text-secondary" style={{ fontSize: '0.8rem' }}>
                    {subtitle}
                </div>
            )}
        </div>
    ));
    StatCard.displayName = 'StatCard';

    const { stats, chartData, compareMonths } = useMemo(() => {
        if (!rawData || !rawData.stats) {
            return { stats: {}, chartData: [], compareMonths: {} };
        }

        const { stats, compareMonths } = rawData;
        
        // Prepare chart data from summary
        const computedChartData = [
            { name: compareMonths.last, value: stats.lastMonthRevenue, fill: '#94a3b8' },
            { name: compareMonths.current, value: stats.thisMonthRevenue, fill: '#f59e0b' }
        ];
        
        return { stats, chartData: computedChartData, compareMonths };
    }, [rawData]);

    const isLoading = analyticsStatus === 'loading' && (!rawData || !rawData.stats);
    // Removed old manual fetching logic

    return (
        <div className="d-flex">
            <Sidebar />
            <div className="main-content flex-grow-1">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2 className="fw-bold m-0">Business Overview</h2>
                </div>

                {isLoading ? (
                    <div className="d-flex justify-content-center align-items-center" style={{ height: '300px' }}>
                        <div className="spinner-border text-warning" role="status">
                            <span className="visually-hidden">Loading Fast State...</span>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="row g-4 mb-5 animate-fade-in">
                            <div className="col-md-3">
                                <StatCard 
                                    title="Today's Entry Value" 
                                    value={`₹ ${stats?.todayRevenue?.toLocaleString('en-IN') || '0'}`} 
                                    icon="📈" 
                                    colorClass="text-success" 
                                />
                            </div>
                            <div className="col-md-3">
                                <StatCard 
                                    title="Total Entries (All Time)" 
                                    value={stats?.totalEntries?.toLocaleString('en-IN') || '0'} 
                                    icon="📝" 
                                    colorClass="text-info bg-info bg-opacity-10" 
                                />
                             </div>
                            <div className="col-md-3">
                                <StatCard 
                                    title={`Customers (${compareMonths?.current})`} 
                                    value={stats?.customersThisMonth?.toLocaleString('en-IN') || '0'} 
                                    icon="👥" 
                                    colorClass="text-success bg-success bg-opacity-10" 
                                    subtitle={`${compareMonths?.last}: ${stats?.customersLastMonth?.toLocaleString('en-IN') || '0'}`}
                                />
                             </div>
                            <div className="col-md-3">
                                <StatCard 
                                    title="Growth Analysis" 
                                    value={`${stats?.customerGrowth >= 0 ? '+' : ''}${stats?.customerGrowth || 0}%`} 
                                    icon="📊" 
                                    colorClass={stats?.customerGrowth >= 0 ? 'text-success bg-primary bg-opacity-10' : 'text-danger bg-danger bg-opacity-10'} 
                                    subtitle={`${compareMonths?.current} vs ${compareMonths?.last}`}
                                />
                             </div>
                        </div>

                        <div className="row g-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                            <div className="col-lg-8">
                                <div className="glass-panel p-4 h-100 border-0">
                                    <h5 className="fw-bold mb-4">Revenue Comparison (Last vs Present Month)</h5>
                                    <div style={{ height: '300px' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-10} tickFormatter={(value) => `₹${value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value}`} />
                                                <Tooltip 
                                                    cursor={{ fill: '#f8fafc' }}
                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} 
                                                    formatter={(value) => `₹ ${value.toLocaleString('en-IN')}`} 
                                                />
                                                <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={60}>
                                                    {chartData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                            <div className="col-lg-4">
                                <div className="glass-panel p-4 h-100 border-0 d-flex flex-column gap-3">
                                    <h5 className="fw-bold mb-2">Entry Breakdown</h5>

                                    <div className="p-3 rounded bg-light d-flex justify-content-between align-items-center">
                                        <div className="d-flex align-items-center gap-2">
                                            <div className="rounded-circle bg-warning" style={{ width: 12, height: 12 }}></div>
                                            <span className="fw-semibold text-secondary">Gold Items</span>
                                        </div>
                                        <span className="fw-bold text-dark">₹ {stats?.goldSales?.toLocaleString('en-IN') || '0'}</span>
                                    </div>

                                    <div className="p-3 rounded bg-light d-flex justify-content-between align-items-center">
                                        <div className="d-flex align-items-center gap-2">
                                            <div className="rounded-circle bg-secondary" style={{ width: 12, height: 12 }}></div>
                                            <span className="fw-semibold text-secondary">Silver Items</span>
                                        </div>
                                        <span className="fw-bold text-dark">₹ {stats?.silverSales?.toLocaleString('en-IN') || '0'}</span>
                                    </div>

                                    <div className="mt-auto">
                                        <div className="d-flex justify-content-between text-secondary small mb-1">
                                            <span>Total Items Logged</span>
                                            <span>{stats?.totalEntries || 0}</span>
                                        </div>
                                        <div className="progress" style={{ height: '6px' }}>
                                            <div className="progress-bar bg-warning" role="progressbar" style={{ width: '100%' }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
