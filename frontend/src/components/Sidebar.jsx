import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAppTime } from '../utils/timeUtils';
import { motion } from 'framer-motion';
import api from '../utils/api';

const Icons = {
    Dashboard: () => <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor" width="22" height="22"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>,
    Billing: () => <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor" width="22" height="22"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 11.25H9M12 15h-3m3-7.5H9" /></svg>,
    DataEntry: () => <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor" width="22" height="22"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/><path strokeLinecap="round" strokeLinejoin="round" d="M9 10.5h6m-6 3h6m-6 3h6" /></svg>,
    Settings: () => <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor" width="22" height="22"><path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.559.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    About: () => <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor" width="22" height="22"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>,
    Logout: () => <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor" width="20" height="20"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg>,
    Menu: () => <svg fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" width="24" height="24"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
};


const Sidebar = () => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const [currentTime, setCurrentTime] = useState(getAppTime());
    const [isOpen, setIsOpen] = useState(false);


    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(getAppTime()), 1000);
        
        const handleFormatChange = () => setCurrentTime(getAppTime());
        window.addEventListener('timeFormatChanged', handleFormatChange);
        
        // WARM CACHE: Pre-fetch reports in background for instant transition
        const prefetchReports = async () => {
             try {
                 const res = await api.get('/data-entry');
                 localStorage.setItem('cachedReports', JSON.stringify(res.data.slice(0, 50)));
                 // Also cache unique customer list for instant suggestions in billing
                 const uniqueCusts = Array.from(new Set(res.data.map(r => JSON.stringify({ name: r.customerName, mobile: r.mobile }))))
                                         .map(s => JSON.parse(s))
                                         .filter(c => c.name && c.mobile);
                 localStorage.setItem('cachedCustomers', JSON.stringify(uniqueCusts.slice(0, 100)));
             } catch (e) {}
        };
        if (user) prefetchReports();

        return () => {
            clearInterval(timer);
            window.removeEventListener('timeFormatChanged', handleFormatChange);
        };
    }, [user]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const formatDate = (date) => {
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatTime = (date) => {
        const is24Hour = localStorage.getItem('timeFormat') === '24h';
        
        // Use a consistent locale string base
        let options = {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: !is24Hour
        };
        
        let timeStr = date.toLocaleTimeString('en-US', options);
        
        // Manual fix to ensure AM/PM is always present if the browser/locale drops it in 24h mode
        if (is24Hour && !timeStr.includes('AM') && !timeStr.includes('PM')) {
            const ampm = date.getHours() >= 12 ? 'PM' : 'AM';
            timeStr += ` ${ampm}`;
        }
        
        return timeStr;
    };

    return (
        <>
            {/* Mobile Header Toggle */}
            {/* Premium Mobile Header */}
            <div className="mobile-header d-lg-none">
                <div className="d-flex align-items-center">
                    <div className="fw-bold text-accent-primary small tracking-widest text-uppercase">{user?.shopName || 'GOLD DATA ENTRY'}</div>
                    {user?.shopAddress && <div className="ms-2 small text-secondary d-none d-sm-block opacity-75" style={{ fontSize: '0.6rem' }}>| {user.shopAddress.split('\n')[0]}</div>}
                </div>
                <button 
                    className="ellipsis-menu border-0 bg-transparent p-2"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <Icons.Menu />
                </button>
            </div>


            {/* Sidebar Overlay for Mobile (High-Performance Fixed Inset) */}
            {isOpen && (
                <div 
                    className="fixed-inset d-lg-none" 
                    style={{ 
                        zIndex: 998, 
                        background: 'rgba(0,0,0,0.6)', 
                        position: 'fixed', 
                        inset: 0,
                        backdropFilter: 'blur(4px)'
                    }} 
                    onClick={() => setIsOpen(false)}
                />
            )}


            <div className={`sidebar d-flex flex-column justify-content-between ${isOpen ? 'open' : ''}`} style={{ paddingTop: '2.5rem' }}>
                <div>
                    <div className="mb-5 text-center px-3">
                        {/* Premium Brand Header */}
                        <div className="brand-box glass-panel p-3 border-0 shadow-lg rounded-4 border-start border-4 border-warning mb-4 mx-2">
                            <h3 className="fw-900 mb-0" style={{ 
                                color: 'var(--accent-primary)', 
                                fontSize: '1.2rem', 
                                letterSpacing: '2px', 
                                textTransform: 'uppercase'
                            }}>
                                {user?.shopName || 'GOLD DATA ENTRY'}
                            </h3>
                            <div className="small opacity-75 fw-bold mt-1" style={{ letterSpacing: '0.5px', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                                {user?.shopAddress || "PREMIUM JEWELRY DESK"}
                            </div>
                        </div>
                    </div>

                    <div className="mb-5 p-3 mx-3 rounded-4 glass-panel text-center border-0 shadow-lg border-start border-4 border-warning d-none d-lg-block" style={{ background: 'rgba(212, 175, 55, 0.08)', backdropFilter: 'blur(10px)' }}>
                        <div className="fw-bold fs-6 text-warning mb-1" style={{ letterSpacing: '1px' }}>{formatDate(currentTime)}</div>
                        <div className="d-flex justify-content-center align-items-baseline gap-1 font-monospace" style={{ color: 'var(--text-primary)' }}>
                            <div className="fs-4 fw-900" style={{ textShadow: '0 0 15px rgba(212, 175, 55, 0.3)' }}>
                                {formatTime(currentTime).split(' ')[0].split(':')[0]}
                            </div>
                            <div className="fs-4 fw-900 mx-1 animate-pulse" style={{ opacity: 0.8 }}>:</div>
                            <div className="fs-4 fw-900">
                                {formatTime(currentTime).split(' ')[0].split(':')[1]}
                            </div>
                            <div className="fs-4 fw-900 mx-1 animate-pulse" style={{ opacity: 0.8 }}>:</div>
                            <motion.div 
                                key={formatTime(currentTime).split(' ')[0].split(':')[2]}
                                initial={{ opacity: 0.5 }}
                                animate={{ opacity: 1 }}
                                className="fs-4 fw-900 text-warning"
                            >
                                {formatTime(currentTime).split(' ')[0].split(':')[2]}
                            </motion.div>
                            <div className="small fw-bold ms-2 opacity-75" style={{ fontSize: '0.7rem' }}>
                                {formatTime(currentTime).split(' ')[1]}
                            </div>
                        </div>
                    </div>

                    <nav className="nav flex-column gap-3 mt-4">

                        <NavLink to="/" onClick={() => setIsOpen(false)} className={({ isActive }) => `nav-link rounded-4 d-flex align-items-center gap-3 px-3 py-3 font-monospace fw-semibold fs-6 mb-1 ${isActive ? 'bg-warning text-dark shadow-lg border-start border-4 border-dark' : 'text-secondary hover-accent'}`} style={{ letterSpacing: '0.3px' }}>
                            <Icons.Dashboard /> <span className="nav-text">Dashboard</span>
                        </NavLink>
                        <NavLink to="/billing" onClick={() => setIsOpen(false)} className={({ isActive }) => `nav-link rounded-4 d-flex align-items-center gap-3 px-3 py-3 font-monospace fw-semibold fs-6 mb-1 ${isActive ? 'bg-warning text-dark shadow-lg border-start border-4 border-dark' : 'text-secondary hover-accent'}`} style={{ letterSpacing: '0.3px' }}>
                            <Icons.Billing /> <span className="nav-text">Billing / Invoice</span>
                        </NavLink>

                        <NavLink to="/data-entry" onClick={() => setIsOpen(false)} className={({ isActive }) => `nav-link rounded-4 d-flex align-items-center gap-3 px-3 py-3 font-monospace fw-semibold fs-6 mb-1 ${isActive ? 'bg-warning text-dark shadow-lg border-start border-4 border-dark' : 'text-secondary hover-accent'}`} style={{ letterSpacing: '0.3px' }}>
                            <Icons.DataEntry /> <span className="nav-text">Data & Reports</span>
                        </NavLink>
                        <NavLink to="/about" onClick={() => setIsOpen(false)} className={({ isActive }) => `nav-link rounded-4 d-flex align-items-center gap-3 px-3 py-3 font-monospace fw-semibold fs-6 mb-1 ${isActive ? 'bg-warning text-dark shadow-lg border-start border-4 border-dark' : 'text-secondary hover-accent'}`} style={{ letterSpacing: '0.3px' }}>
                            <Icons.About /> <span className="nav-text">Help & About</span>
                        </NavLink>
                        <NavLink to="/settings" onClick={() => setIsOpen(false)} className={({ isActive }) => `nav-link rounded-4 d-flex align-items-center gap-3 px-3 py-3 font-monospace fw-semibold fs-6 ${isActive ? 'bg-warning text-dark shadow-lg border-start border-4 border-dark' : 'text-secondary hover-accent'}`} style={{ letterSpacing: '0.3px', marginBottom: '1rem' }}>
                            <Icons.Settings /> <span className="nav-text">Settings</span>
                        </NavLink>
                    </nav>

                </div>

                <div className="mt-auto" style={{ marginBottom: '3rem' }}>
                    <div className="p-3 mx-2 rounded-4 glass-panel mb-3 text-center border-0 shadow-lg border-start border-4 border-warning d-none d-lg-block">
                        <p className="mb-1 fw-bold small text-truncate">{user?.name}</p>
                        <p className="mb-0 text-secondary" style={{ fontSize: '0.7rem' }}>{user?.email}</p>
                    </div>
                    <button onClick={handleLogout} className="btn btn-outline-danger w-100 d-flex align-items-center justify-content-center gap-2 font-monospace fw-semibold py-2">
                        <Icons.Logout /> <span className="nav-text">Logout</span>
                    </button>
                    <div className="mb-2"></div> {/* Extra space at absolute bottom */}
                </div>

            </div>
        </>

    );
};

export default Sidebar;
