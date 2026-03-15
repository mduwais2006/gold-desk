import React, { useEffect, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAnalyticsData } from '../redux/analyticsSlice';
import LoadingSequence from '../components/LoadingSequence';

const Dashboard = () => {
    const dispatch = useDispatch();
    const { data: rawData, status: analyticsStatus } = useSelector((state) => state.analytics);
    
    useEffect(() => {
        dispatch(fetchAnalyticsData());
    }, [dispatch]);

    const StatCard = React.memo(({ title, value, icon, colorClass, subtitle }) => (
        <div className="stat-card glass-panel border-0 h-100 p-4">
            <div className={`stat-icon mb-3 ${colorClass || ''}`} style={{ fontSize: '2rem' }}>{icon}</div>
            <div className="stat-title mb-1" style={{ fontSize: '0.85rem', fontWeight: 700, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '1px' }}>{title}</div>
            <div className="stat-value h2 fw-bold text-high-contrast mb-0">{value}</div>
            {subtitle && (
                <div className="mt-3 fw-semibold text-secondary" style={{ fontSize: '0.8rem' }}>
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
        
        const computedChartData = [
            { name: compareMonths.last, value: stats.lastMonthRevenue, fill: '#94a3b8' },
            { name: compareMonths.current, value: stats.thisMonthRevenue, fill: 'var(--accent-primary)' }
        ];
        
        return { stats, chartData: computedChartData, compareMonths };
    }, [rawData]);

    const isLoading = analyticsStatus === 'loading' && (!rawData || !rawData.stats);

    return (
        <div className="d-flex theme-colorful">
            <Sidebar />
            <div className="main-content flex-grow-1">
                <div className="d-flex justify-content-between align-items-center mb-5">
                    <div>
                        <h1 className="fw-900 m-0 text-high-contrast" style={{ letterSpacing: '-1px' }}>Dashboard</h1>
                        <p className="text-secondary m-0">Welcome back to Gold Desk Business Suite</p>
                    </div>
                </div>

                {isLoading ? (
                    <LoadingSequence text="Fetching Analytics..." />
                ) : (
                    <>
                        <div className="stat-grid mb-5 animate-fade-in">
                            <StatCard 
                                title="Today's Entry Value" 
                                value={`₹ ${stats?.todayRevenue?.toLocaleString('en-IN') || '0'}`} 
                                icon="📈" 
                                colorClass="text-success" 
                            />
                            <StatCard 
                                title="Total Entries (All Time)" 
                                value={stats?.totalEntries?.toLocaleString('en-IN') || '0'} 
                                icon="📝" 
                                colorClass="text-info bg-info bg-opacity-10" 
                            />
                            <StatCard 
                                title={`Customers (${compareMonths?.current})`} 
                                value={stats?.customersThisMonth?.toLocaleString('en-IN') || '0'} 
                                icon="👥" 
                                colorClass="text-success bg-success bg-opacity-10" 
                                subtitle={`${compareMonths?.last}: ${stats?.customersLastMonth?.toLocaleString('en-IN') || '0'}`}
                            />
                            <StatCard 
                                title="Growth Analysis" 
                                value={`${stats?.customerGrowth >= 0 ? '+' : ''}${stats?.customerGrowth || 0}%`} 
                                icon="📊" 
                                colorClass={stats?.customerGrowth >= 0 ? 'text-success bg-primary bg-opacity-10' : 'text-danger bg-danger bg-opacity-10'} 
                                subtitle={`${compareMonths?.current} vs ${compareMonths?.last}`}
                            />
                        </div>


                        <div className="row g-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                            <div className="col-lg-8">
                                <div className="glass-panel p-4 h-100 border-0">
                                    <h5 className="fw-bold mb-4">Revenue Comparison (Last vs Present Month)</h5>
                                    <div style={{ height: '300px' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} dy={10} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} dx={-10} tickFormatter={(value) => `₹${value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value}`} />
                                                <Tooltip 
                                                    cursor={{ fill: 'var(--accent-soft)' }}
                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} 
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

                                    <div className="p-3 rounded bg-light-subtle d-flex justify-content-between align-items-center">

                                        <div className="d-flex align-items-center gap-2">
                                            <div className="rounded-circle bg-warning" style={{ width: 12, height: 12 }}></div>
                                            <span className="fw-semibold text-secondary">Gold Items</span>
                                        </div>
                                        <span className="fw-bold text-high-contrast">₹ {stats?.goldSales?.toLocaleString('en-IN') || '0'}</span>
                                    </div>

                                    <div className="p-3 rounded bg-light-subtle d-flex justify-content-between align-items-center">

                                        <div className="d-flex align-items-center gap-2">
                                            <div className="rounded-circle bg-secondary" style={{ width: 12, height: 12 }}></div>
                                            <span className="fw-semibold text-secondary">Silver Items</span>
                                        </div>
                                        <span className="fw-bold text-high-contrast">₹ {stats?.silverSales?.toLocaleString('en-IN') || '0'}</span>
                                    </div>

                                    <div className="mt-auto">
                                        <div className="d-flex justify-content-between text-secondary small mb-1">
                                            <span>Total Items Logged</span>
                                            <span>{stats?.totalEntries || 0}</span>
                                        </div>
                                        <div className="progress" style={{ height: '6px', background: 'var(--border-color)' }}>
                                            <div className="progress-bar" role="progressbar" style={{ width: '100%', background: 'var(--accent-primary)' }}></div>
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
