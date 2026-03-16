import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const LockScreen = () => {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isUnlocking, setIsUnlocking] = useState(false);
    const { user, unlock, logout } = useAuth();

    const handleUnlock = async (e) => {
        e.preventDefault();
        
        if (!password) {
            toast.warning('Please enter your password to unlock');
            return;
        }

        setIsUnlocking(true);
        try {
            await unlock(password);
            toast.success('Session Unlocked!');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Incorrect password');
        } finally {
            setIsUnlocking(false);
        }
    };

    return (
        <div className="login-container w-100 vh-100 d-flex align-items-center justify-content-center" style={{ background: 'var(--bg-secondary)' }}>
            <div className="glass-panel p-5 animate-fade-in text-center" style={{ maxWidth: '400px', width: '90%' }}>
                <div className="mb-4">
                    <div className="d-flex justify-content-center mb-3">
                        {user?.shopLogo ? (
                            <img src={user.shopLogo} alt="Shop Logo" style={{ height: '60px', objectFit: 'contain' }} />
                        ) : (
                            <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold fs-3" style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', color: 'white' }}>
                                🔒
                            </div>
                        )}
                    </div>
                    <h3 className="fw-bold mb-1">Session Locked</h3>
                    <p className="text-secondary small">Welcome back, {user?.name}</p>
                </div>

                <form onSubmit={handleUnlock}>
                    <div className="form-group mb-4">
                        <div className="password-field-container">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="form-control text-center py-2 with-toggle"
                                placeholder="Enter password to unlock"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isUnlocking}
                                style={{ paddingRight: '48px' }}
                            />
                            <span 
                                className="password-toggle-icon" 
                                onClick={() => setShowPassword(!showPassword)}
                                title={showPassword ? 'Hide Password' : 'Show Password'}
                            >
                                {showPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                )}
                            </span>
                        </div>
                    </div>
                    
                    <button 
                        type="submit" 
                        className="btn btn-gold w-100 py-2 fw-semibold mb-3 d-flex align-items-center justify-content-center gap-2"
                        disabled={isUnlocking}
                    >
                        {isUnlocking ? <span className="spinner-border spinner-border-sm"></span> : '🔓 Unlock'}
                    </button>
                    
                    <button 
                        type="button" 
                        onClick={logout} 
                        className="btn btn-outline-danger btn-sm w-100 py-2 fw-semibold"
                        disabled={isUnlocking}
                    >
                        Sign out completely Instead
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LockScreen;
