import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const LockScreen = () => {
    const [password, setPassword] = useState('');
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
                        <input
                            type="password"
                            className="form-control text-center py-2"
                            placeholder="Enter password to unlock"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isUnlocking}
                        />
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
