import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import api from '../utils/api';
import { auth, setupRecaptcha, signInWithPhoneNumber } from '../utils/firebase';

import { usePrinter } from '../context/PrinterContext';
import { getAppTime, setAppTimeOffset, resetAppTimeOffset } from '../utils/timeUtils';
import { printReceiptBluetooth } from '../utils/printerUtils';

const Settings = () => {
    const { user, setUser, verifyOtp } = useAuth();
    const { connectedDevice, setConnectedDevice, isPrinterActive, setIsPrinterActive, setupDeviceListeners, reconnectDevice } = usePrinter();
    const [darkMode, setDarkMode] = useState(document.documentElement.getAttribute('data-theme') === 'dark');
    const [autoPrintUpi, setAutoPrintUpi] = useState(localStorage.getItem('autoPrintUpi') !== 'false');
    const [is24Hour, setIs24Hour] = useState(localStorage.getItem('timeFormat') === '24h');

    const [manualDate, setManualDate] = useState(getAppTime().toISOString().split('T')[0]);
    const [manualHour, setManualHour] = useState('12');
    const [manualMinute, setManualMinute] = useState('00');
    const [manualSecond, setManualSecond] = useState('00');
    const [manualAmPm, setManualAmPm] = useState('AM');

    // Profile State
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [isEditingBilling, setIsEditingBilling] = useState(false);
    const [profileData, setProfileData] = useState({
        name: user?.name || '',
        shopName: user?.shopName || '',
        shopAddress: user?.shopAddress || '',
        shopLogo: user?.shopLogo || '',
        upiId: user?.upiId || '',
        qrCodeUrl: user?.qrCodeUrl || '',
        gstEnabled: user?.gstEnabled || false,
        gstPercentage: user?.gstPercentage || 0
    });

    // Credentials State
    const [showCredentialModal, setShowCredentialModal] = useState(false);
    const [credentialData, setCredentialData] = useState({ newLoginIdentifier: '', newPassword: '', otp: '' });
    const [isOtpSent, setIsOtpSent] = useState(false);
    const [isLoading, setIsLoading] = useState(false);



    // Printer Engine State
    const [printerStatus, setPrinterStatus] = useState(isPrinterActive ? 'connected' : 'offline');
    const [printerName, setPrinterName] = useState(localStorage.getItem('posPrinterName') || 'No printers found');
    const [isEditingPrinterName, setIsEditingPrinterName] = useState(false);

    const handleSavePrinterName = () => {
        localStorage.setItem('posPrinterName', printerName);
        setIsEditingPrinterName(false);
        toast.success('Machine alias updated.');
    };
    const [isScanning, setIsScanning] = useState(false);
    const [pendingDevice, setPendingDevice] = useState(null);
    const [recentDevices, setRecentDevices] = useState([]);

    const fetchRecentDevices = async () => {
        if (!navigator.bluetooth || !navigator.bluetooth.getDevices) return;
        try {
            const devices = await navigator.bluetooth.getDevices();
            setRecentDevices(devices);
        } catch (err) {
            console.error("Error fetching authorized devices:", err);
        }
    };


    // Recovery Email State
    const [recoveryEmail, setRecoveryEmail] = useState(user?.recoveryEmail || '');
    const [recoveryOtp, setRecoveryOtp] = useState('');
    const [isRecoveryOtpSent, setIsRecoveryOtpSent] = useState(false);
    const [recoveryTimer, setRecoveryTimer] = useState(0);
    const [isChangingRecovery, setIsChangingRecovery] = useState(false);

    const [activeTab, setActiveTab] = useState('branding'); // 'branding', 'billing', 'security', 'system'

    useEffect(() => {
        if (activeTab === 'system') {
            fetchRecentDevices();
        }
    }, [activeTab]);

    // Sync profile data when user changes
    useEffect(() => {
        if (user) {
            setProfileData({
                name: user.name || '',
                shopName: user.shopName || '',
                shopAddress: user.shopAddress || '',
                shopLogo: user.shopLogo || '',
                upiId: user.upiId || '',
                qrCodeUrl: user.qrCodeUrl || '',
                gstEnabled: user.gstEnabled || false,
                gstPercentage: user.gstPercentage || 0
            });
            // Update recovery email input if it's currently empty or just to sync with DB
            if (user.recoveryEmail) {
                setRecoveryEmail(user.recoveryEmail);
            }
        }
    }, [user]);

    useEffect(() => {
        let interval;
        if (recoveryTimer > 0) {
            interval = setInterval(() => setRecoveryTimer(t => t - 1), 1000);
        }
        return () => clearInterval(interval);
    }, [recoveryTimer]);

    useEffect(() => {
        setPrinterStatus(isPrinterActive ? 'connected' : 'offline');
    }, [isPrinterActive]);

    const handleApplyDate = (e) => {
        if (e) e.preventDefault();
        if (!manualDate) return toast.error("Please pick a valid date");
        const currentAppTime = getAppTime();
        const [year, month, day] = manualDate.split('-').map(Number);
        const dateObj = new Date(currentAppTime);
        dateObj.setFullYear(year, month - 1, day);
        setAppTimeOffset(dateObj);
        toast.success("Active Date updated globally.");
    };

    const handleApplyTime = (e) => {
        if (e) e.preventDefault();
        let hrs = parseInt(manualHour, 10);
        if (!is24Hour) {
            if (manualAmPm === 'PM' && hrs !== 12) hrs += 12;
            if (manualAmPm === 'AM' && hrs === 12) hrs = 0;
        }
        const currentAppTime = getAppTime();
        const dateObj = new Date(currentAppTime);
        dateObj.setHours(hrs, parseInt(manualMinute, 10), parseInt(manualSecond, 10));
        setAppTimeOffset(dateObj);
        toast.success("Active Time updated globally.");
    };

    const handleResetDate = (e) => {
        if (e) e.preventDefault();
        const realNow = new Date();
        const currentAppTime = getAppTime();
        const targetAppTime = new Date(currentAppTime);
        targetAppTime.setFullYear(realNow.getFullYear(), realNow.getMonth(), realNow.getDate());
        
        const offset = targetAppTime.getTime() - Date.now();
        localStorage.setItem('appTimeOffset', offset.toString());
        
        setManualDate(realNow.toISOString().split('T')[0]);
        toast.info("Active Date reset to today.");
    };

    const handleResetTimeOnly = (e) => {
        if (e) e.preventDefault();
        const realNow = new Date();
        const currentAppTime = getAppTime();
        const targetAppTime = new Date(currentAppTime);
        targetAppTime.setHours(realNow.getHours(), realNow.getMinutes(), realNow.getSeconds());
        
        const offset = targetAppTime.getTime() - Date.now();
        localStorage.setItem('appTimeOffset', offset.toString());

        setManualHour(realNow.getHours().toString().padStart(2, '0')); // Note: Logic for 12/24h is handled by picker
        setManualMinute(realNow.getMinutes().toString().padStart(2, '0'));
        setManualSecond(realNow.getSeconds().toString().padStart(2, '0'));
        
        toast.info("Active Time reset to current live time.");
    };

    const handleResetAll = (e) => {
        if (e) e.preventDefault();
        resetAppTimeOffset();
        const now = new Date();
        setManualDate(now.toISOString().split('T')[0]);
        setManualSecond('00');
        toast.info("Everything reset to real-time.");
    };

    const toggleTheme = () => {
        const newTheme = darkMode ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        setDarkMode(!darkMode);
        toast.success(`Switched to ${newTheme} theme`);
    };

    const handleRecoveryEmailRequest = async () => {
        const emailToVerify = recoveryEmail.trim().toLowerCase();
        if (!emailToVerify || !emailToVerify.includes('@') || !emailToVerify.includes('.')) {
            return toast.error('Please enter a valid recovery email ID');
        }
        
        if (user?.recoveryEmail?.toLowerCase() === emailToVerify) {
            return toast.info('You already entered this recovery email');
        }

        try {
            setIsLoading(true);
            await api.post('/users/recovery-email/request', { recoveryEmail: emailToVerify });
            setIsRecoveryOtpSent(true);
            setRecoveryTimer(30);
            toast.success('Verification OTP sent to recovery email');
        } catch (error) {
            const msg = error.response?.data?.message;
            if (msg === 'already register') {
                toast.error('This email is already register with another account');
            } else if (msg === 'already entered' || msg === 'already have' || msg?.toLowerCase().includes('already')) {
                toast.info('You already entered this recovery email');
                const updatedUser = { ...user, recoveryEmail: emailToVerify };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                setUser(updatedUser);
                setRecoveryEmail(emailToVerify);
                setIsChangingRecovery(false);
            } else {
                toast.error(msg || 'Failed to send OTP');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleRecoveryVerify = async () => {
        if (recoveryOtp.length !== 6) return toast.error('Enter 6-digit OTP');
        try {
            setIsLoading(true);
            const { data } = await api.post('/users/recovery-email/verify', { otp: recoveryOtp, recoveryEmail: recoveryEmail.trim() });
            
            const updatedUser = { ...user, recoveryEmail: data.recoveryEmail };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);
            
            toast.success('Recovery email updated successfully');
            setIsRecoveryOtpSent(false);
            setRecoveryOtp('');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Invalid OTP');
        } finally {
            setIsLoading(false);
        }
    };

    const handleProfileUpdate = async (e) => {
        if (e) e.preventDefault();
        try {
            setIsLoading(true);
            const { data } = await api.put('/users/profile', profileData);
            
            if (!data || !data.token) {
                console.error("Malformed profile response", data);
                return toast.error("Update succeeded but session sync failed. Please re-login.");
            }

            localStorage.setItem('user', JSON.stringify(data));
            setUser(data);
            toast.success('Profile updated successfully!');
            setIsEditingProfile(false);
            setIsEditingBilling(false);
        } catch (error) {
            console.error(error);
            toast.error('Failed to update profile');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCredentialChangeRequest = async () => {
        try {
            setIsLoading(true);
            const { data } = await api.post('/users/change-credentials/request');

            if (data.authMethod === 'firebase_phone') {
                toast.info('Sending SMS via Google Firebase...');
                const recaptchaVerifier = setupRecaptcha('settings-recaptcha-button');
                try {
                    const confirmationResult = await signInWithPhoneNumber(auth, data.formattedPhone, recaptchaVerifier);
                    window.confirmationResult = confirmationResult;
                    setIsOtpSent(true);
                    toast.success('SMS Sent to your Mobile!');
                } catch (ferr) {
                    console.error("Firebase Auth Error", ferr);
                    toast.error('Firebase SMS Failed. Ensure domain is authorized.');
                    if (window.recaptchaVerifier) { window.recaptchaVerifier.clear(); window.recaptchaVerifier = null; }
                }
            } else {
                setIsOtpSent(true);
                toast.success(data.message || 'OTP sent via Email');
            }
        } catch (error) {
            toast.error('Failed to request OTP');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCredentialVerify = async () => {
        try {
            if (!credentialData.newLoginIdentifier && !credentialData.newPassword) {
                return toast.error('Please enter a new username or new password');
            }
            if (credentialData.newPassword && credentialData.newPassword.length < 6) return toast.error('Password must be at least 6 characters');

            setIsLoading(true);
            let firebaseToken = undefined;

            if (window.confirmationResult) {
                const result = await window.confirmationResult.confirm(credentialData.otp);
                firebaseToken = await result.user.getIdToken();
            }

            const { data } = await api.post('/users/change-credentials/verify', {
                otp: credentialData.otp,
                newLoginIdentifier: credentialData.newLoginIdentifier,
                newPassword: credentialData.newPassword,
                firebaseToken
            });

            if (data.user) {
                localStorage.setItem('user', JSON.stringify(data.user));
                setUser(data.user);
            }

            toast.success('Credentials updated successfully!');
            setShowCredentialModal(false);
            setIsOtpSent(false);
            setCredentialData({ newLoginIdentifier: '', newPassword: '', otp: '' });
        } catch (error) {
            console.error(error);
            toast.error(error.message || error.response?.data?.message || 'Invalid OTP');
        } finally {
            setIsLoading(false);
        }
    };

    const connectDeviceFinal = async (deviceToConnect) => {
        try {
            setIsScanning(true);
            const finalName = deviceToConnect.name || 'Unknown Billing Machine';
            toast.info('Performing Security Handshake (System Link)...', { autoClose: 2000 });


            await deviceToConnect.gatt.connect();
            setupDeviceListeners(deviceToConnect);

            localStorage.setItem('posPrinter', deviceToConnect.id);
            localStorage.setItem('posPrinterName', finalName);

            setConnectedDevice(deviceToConnect);
            setIsPrinterActive(true);
            setPrinterName(finalName);
            setPrinterStatus('connected');
            window.dispatchEvent(new Event('printerStateChanged'));
            toast.success(`Success! Secure connection established with ${finalName} 🖨️`);
        } catch (err) {
            console.error(err);
            if (err.name === 'NetworkError') {
                toast.error('Handshake Failed! Ensure the POS machine is turned ON and in range.');
            } else {
                toast.error('Failed to securely connect to printer API.');
            }
        } finally {
            setIsScanning(false);
            setPendingDevice(null);
        }
    };

    const handleTestPrint = async () => {
        try {
            let activePrinter = await reconnectDevice();
            if (!activePrinter) {
                return toast.error('Printer not connected or offline. Is it ON?');
            }
            toast.info('Sending test page...');
            const testPayload = {
                customerName: 'Hardware Test',
                items: [{ itemName: 'Test Connection', weight: '0.000', ratePerGram: 0, price: 0 }],
                finalTotal: 0,
                shopDetails: { name: user?.shopName || 'Gold Desk Shop', address: 'System Diagnostics' }
            };
            await printReceiptBluetooth(activePrinter, testPayload);
            toast.success('Test print successful! 🖨️');
        } catch (error) {
            console.error(error);
            toast.error(error.message || 'Test print failed. Check connection.');
        }
    };

    const handlePrinterScan = async () => {
        try {
            if (!navigator.bluetooth) {
                return toast.error('Web Bluetooth API is not supported in this browser. Please use Chrome/Edge on Desktop or Android.');
            }

            toast.info('Opening Bluetooth Picker... Tip: If you see "Unknown Device", wait 5 seconds for the name to resolve.', { autoClose: 5000 });
            
            const device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: [
                    '000018f0-0000-1000-8000-00805f9b34fb', 
                    '0000fee7-0000-1000-8000-00805f9b34fb',
                    'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
                    '49535343-fe7d-4ae5-8fa9-9fafd205e455',
                    '0000ae30-0000-1000-8000-00805f9b34fb',
                    '0000af30-0000-1000-8000-00805f9b34fb',
                    '0000ffe0-0000-1000-8000-00805f9b34fb',
                    '0000ffe1-0000-1000-8000-00805f9b34fb',
                    '0000fff0-0000-1000-8000-00805f9b34fb',
                    '0000fff1-0000-1000-8000-00805f9b34fb',
                    '0000180a-0000-1000-8000-00805f9b34fb',
                    '00001800-0000-1000-8000-00805f9b34fb',
                    '00001801-0000-1000-8000-00805f9b34fb',
                    '00001101-0000-1000-8000-00805f9b34fb',
                    '00000af0-0000-1000-8000-00805f9b34fb'
                ]
            });

            if (device) {
                const finalName = device.name || 'Unknown Bluetooth Device';

                toast.info(`Checking compatibility for: ${finalName}...`, { autoClose: 2000 });

                // Simulate deep security scan
                setTimeout(() => {
                    const safeKeywords = ['pos', 'printer', 'thermal', 'tm-', 'rp-', 'mtp', 'tvs', 'hoin', 'blue', 'bt'];
                    const isLikelySafe = safeKeywords.some(kw => finalName.toLowerCase().includes(kw));

                    // Refined security check: If not likely safe AND not an unknown device, prompt user.
                    // Otherwise, proceed with connection.
                    if (!isLikelySafe && finalName !== 'Unknown Bluetooth Device') {
                        setPendingDevice(device);
                        setIsScanning(false);
                    } else {
                        if (finalName === 'Unknown Bluetooth Device') {
                            toast.warn('⚠️ Device name could not be resolved, but proceeding with connection...');
                        } else {
                            toast.success('✅ Security Scan Passed. Device is safe.');
                        }
                        connectDeviceFinal(device);
                    }
                }, 2000);
            }
        } catch (err) {
            console.error(err);
            setIsScanning(false);
            if (err.name === 'NotFoundError') {
                toast.warn('Scanning cancelled by user.');
            } else {
                toast.error('Failed to initialize scan API.');
            }
        }
    };



    return (
        <div className="d-flex">
            <Sidebar />
            <div className="main-content flex-grow-1">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2 className="fw-bold m-0">Settings</h2>
                </div>

                {/* Tab Navigation */}
                <div className="d-flex gap-2 mb-4 overflow-auto pb-2 noscroll">
                    {['branding', 'billing', 'security', 'system'].map(tab => (
                        <motion.button
                            key={tab}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setActiveTab(tab)}
                            className={`btn rounded-pill px-4 fw-bold text-nowrap transition-all ${activeTab === tab ? 'btn-gold shadow-sm' : 'btn-light border text-secondary'}`}
                        >
                            {tab === 'branding' && 'Shop Logo & Name'}
                            {tab === 'billing' && 'Billing & Payment'}
                            {tab === 'security' && 'Account Security'}
                            {tab === 'system' && 'Billing Machine & Time'}

                        </motion.button>
                    ))}
                </div>

                <div className="row g-4">
                    {/* --- BRANDING TAB --- */}
                    {activeTab === 'branding' && (
                        <div className="col-12 animate-fade-in">
                            <div className="glass-panel p-4 border-0 mb-4 position-relative">
                                <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-2">
                                    <h5 className="fw-bold m-0">Business Ownership</h5>

                                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setIsEditingProfile(!isEditingProfile)}>
                                        {isEditingProfile ? 'Cancel' : 'Edit Info'}
                                    </button>
                                </div>

                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label className="form-label small text-secondary fw-semibold">Owner Full Name</label>
                                        <input type="text" className="form-control form-control-glass" value={profileData.name} onChange={e => setProfileData({ ...profileData, name: e.target.value })} readOnly={!isEditingProfile} />
                                    </div>
                                    <div className="col-12 mt-3">
                                        <label className="form-label small text-secondary fw-semibold">Login Identity (Cannot Edit Here)</label>
                                        <input type="text" className="form-control form-control-glass text-muted bg-light-subtle" value={user?.email || user?.phone || ''} readOnly />

                                    </div>
                                    <hr className="my-4 text-light" />
                                    <h6 className="fw-bold mb-3 text-secondary">Shop Details</h6>
                                    <div className="col-md-6">
                                        <label className="form-label small text-secondary fw-semibold">Shop Name</label>
                                        <input type="text" className="form-control form-control-glass" value={profileData.shopName} onChange={e => setProfileData({ ...profileData, shopName: e.target.value })} readOnly={!isEditingProfile} />
                                    </div>
                                    <div className="col-12">
                                        <label className="form-label small text-secondary fw-semibold">Shop Address (Multi-line Supported)</label>
                                        <textarea 
                                            rows="3" 
                                            className="form-control form-control-glass" 
                                            placeholder="Enter complete shop address for bills..." 
                                            value={profileData.shopAddress} 
                                            onChange={e => setProfileData({ ...profileData, shopAddress: e.target.value })} 
                                            readOnly={!isEditingProfile} 
                                        />
                                    </div>
                                </div>

                                {isEditingProfile && (
                                    <button type="button" className="btn btn-advanced mt-4 w-100" onClick={handleProfileUpdate} disabled={isLoading}>
                                        {isLoading ? 'Saving...' : '💾 Save Profile'}
                                    </button>
                                )}

                            </div>
                        </div>
                    )}

                    {/* --- BILLING TAB --- */}
                    {activeTab === 'billing' && (
                        <div className="col-12 animate-fade-in">
                            <div className="glass-panel p-4 border-0 mb-4">
                                <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-2">
                                    <h5 className="fw-bold m-0">Billing & Payment</h5>
                                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setIsEditingBilling(!isEditingBilling)}>
                                        {isEditingBilling ? 'Cancel' : 'Edit Setup'}
                                    </button>
                                </div>

                                <div className="row g-3 mb-4">
                                    <div className="col-md-6">
                                        <label className="form-label small text-secondary fw-semibold">Receiving UPI ID</label>
                                        <input type="text" className="form-control form-control-glass" placeholder="shopname@bank" value={profileData.upiId} onChange={e => setProfileData({ ...profileData, upiId: e.target.value })} readOnly={!isEditingBilling} />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label small text-secondary fw-semibold">UPI QR Code URL (Image Link)</label>
                                        <input type="text" className="form-control form-control-glass" placeholder="Image Link" value={profileData.qrCodeUrl} onChange={e => setProfileData({ ...profileData, qrCodeUrl: e.target.value })} readOnly={!isEditingBilling} />
                                    </div>
                                </div>

                                <div className="p-3 border rounded mb-3 bg-light-subtle">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <div>
                                            <h6 className="mb-1 fw-bold">Enable GST Billing</h6>
                                            <p className="small text-secondary m-0">Apply Goods & Services Tax to all bills</p>
                                        </div>
                                        <div className="form-check form-switch m-0 fs-4">
                                            <input className="form-check-input" type="checkbox" role="switch" checked={profileData.gstEnabled} onChange={(e) => setProfileData({ ...profileData, gstEnabled: e.target.checked })} style={{ cursor: 'pointer' }} />
                                        </div>
                                    </div>
                                    {profileData.gstEnabled && (
                                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-3 p-3 bg-light-subtle rounded border shadow-sm">

                                            <label className="form-label small fw-bold text-secondary mb-1">Default GST Percentage (%)</label>
                                            <div className="input-group input-group-sm mb-1" style={{ maxWidth: '120px' }}>
                                                <input type="number" className="form-control" value={profileData.gstPercentage} onChange={e => setProfileData({ ...profileData, gstPercentage: e.target.value })} />
                                                <span className="input-group-text">%</span>
                                            </div>
                                            <small className="text-muted">This will be used as the default rate for new entries.</small>
                                        </motion.div>
                                    )}
                                    <button type="button" className="btn btn-sm btn-outline-dark mt-3 w-100 fw-bold" onClick={handleProfileUpdate} disabled={isLoading}>
                                        Update GST Settings
                                    </button>
                                </div>

                                {isEditingBilling && (
                                    <button type="button" className="btn btn-advanced w-100 mt-2" onClick={handleProfileUpdate} disabled={isLoading}>
                                        {isLoading ? 'Saving...' : '💾 Save Setup'}
                                    </button>
                                )}

                            </div>
                        </div>
                    )}

                    {/* --- SECURITY TAB --- */}
                    {activeTab === 'security' && (
                        <div className="col-12 animate-fade-in">
                            <div className="glass-panel p-4 border-0 mb-4">
                                <h5 className="fw-bold mb-4 border-bottom pb-2">Login Security</h5>

                                
                                <div className="row g-4">
                                    <div className="col-md-6">
                                        <div className="p-3 border rounded h-100 d-flex flex-column justify-content-between shadow-sm">
                                            <div>
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <h6 className="fw-bold m-0">Recovery Contact Email</h6>

                                                    {user?.recoveryEmail && <span className="badge bg-success">🛡️ SECURED</span>}
                                                </div>
                                                <p className="small text-secondary mb-3">Backup email used to reset your password if you ever forget it.</p>

                                            </div>

                                            {(user?.recoveryEmail && !isChangingRecovery) ? (
                                                <div className="d-flex flex-column gap-3">
                                                    <div className="position-relative">
                                                        <input 
                                                            type="email" 
                                                            className="form-control form-control-glass bg-light-subtle fw-bold" 

                                                            style={{ cursor: 'pointer', color: 'var(--text-secondary)' }}
                                                            value={recoveryEmail || user.recoveryEmail} 
                                                            readOnly 
                                                            onClick={() => setIsChangingRecovery(true)}
                                                        />
                                                        <span className="position-absolute end-0 top-50 translate-middle-y me-3 opacity-50">🔒</span>
                                                    </div>
                                                    <button 
                                                        type="button" 
                                                        className="btn btn-sm btn-outline-dark fw-bold w-100 py-2" 
                                                        onClick={() => {
                                                            setIsChangingRecovery(true);
                                                        }}
                                                    >
                                                        🔄 Change Recovery Email
                                                    </button>
                                                </div>
                                            ) : !isRecoveryOtpSent ? (
                                                <div className="d-flex flex-column gap-2">
                                                    <div className="d-flex gap-2">
                                                        <input 
                                                            type="email" 
                                                            className="form-control form-control-glass" 
                                                            placeholder="Enter new recovery email" 
                                                            value={recoveryEmail} 
                                                            onChange={e => setRecoveryEmail(e.target.value)} 
                                                        />
                                                        <button 
                                                            type="button" 
                                                            className="btn btn-sm btn-gold fw-bold px-3" 
                                                            onClick={handleRecoveryEmailRequest} 
                                                            disabled={isLoading}
                                                        >
                                                            {isLoading ? '...' : (user?.recoveryEmail?.toLowerCase() === recoveryEmail.trim().toLowerCase() ? 'Active' : 'Verify')}
                                                        </button>
                                                    </div>
                                                    {isChangingRecovery && (
                                                        <button type="button" className="btn btn-link btn-sm text-secondary text-decoration-none" onClick={() => {
                                                            setIsChangingRecovery(false);
                                                            setRecoveryEmail(user.recoveryEmail || '');
                                                        }}>
                                                            Cancel Update
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="d-flex flex-column gap-2">
                                                    <div className="alert alert-info py-2 small mb-2">Enter OTP sent to {recoveryEmail}</div>
                                                    <input type="text" maxLength="6" className="form-control form-control-glass text-center fw-bold fs-5 tracking-widest" placeholder="000000" value={recoveryOtp} onChange={e => setRecoveryOtp(e.target.value)} />
                                                    <div className="d-flex gap-2">
                                                        <button className="btn btn-gold flex-grow-1 fw-bold" onClick={handleRecoveryVerify} disabled={isLoading}>
                                                            {isLoading ? 'Verifying...' : 'Confirm Update'}
                                                        </button>
                                                        <button className="btn btn-light border px-3" onClick={() => setIsRecoveryOtpSent(false)}>Back</button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="col-md-6">
                                        <div className="p-3 border rounded h-100 d-flex flex-column justify-content-between shadow-sm">
                                            <div>
                                                <h6 className="fw-bold mb-2">Username & Password</h6>
                                                <p className="small text-secondary mb-3">Update your main login details used to enter the system.</p>

                                            </div>
                                            <button className="btn-security w-100" onClick={() => setShowCredentialModal(true)}>
                                                Change Login Username / Password
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 p-3 border rounded">
                                    <div className="d-flex justify-content-between align-items-center mb-0">
                                        <div>
                                            <h6 className="mb-1 fw-bold">Two-Factor Auth</h6>
                                            <p className="small text-secondary m-0">SMS OTP is required for security</p>
                                        </div>
                                        <span className="badge bg-success">Active</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- SYSTEM HUB TAB --- */}
                    {activeTab === 'system' && (
                        <div className="col-12 animate-fade-in">
                            <div className="glass-panel p-4 border-0">
                                <h5 className="fw-bold mb-4 border-bottom pb-2">System Hub (Billing Machine)</h5>


                                <div className="row g-4">
                                    <div className="col-xl-7">
                                        <div className="p-3 border rounded mb-3 bg-light-subtle">
                                            <h6 className="fw-bold mb-3">Thermal Billing Machine</h6>

                                            <div className="d-flex justify-content-between align-items-center mb-3">
                                                <div className="small">
                                                    <span className="text-secondary">Status:</span>
                                                    <div className={`badge ${printerStatus === 'connected' ? 'bg-success' : 'bg-danger'} ms-2`}>{printerStatus.toUpperCase()}</div>
                                                </div>
                                                <button type="button" className="btn btn-sm btn-gold fw-bold px-3 shadow-sm" onClick={handlePrinterScan} disabled={isScanning}>
                                                    {isScanning ? 'Connecting...' : 'Connect Wireless Machine'}

                                                </button>
                                            </div>
                                            <div className="mb-3">
                                                <div className="d-flex justify-content-between align-items-center mb-1">
                                                    <label className="form-label small text-secondary fw-semibold m-0">Saved Device</label>
                                                    {isPrinterActive && (
                                                        <button 
                                                            type="button" 
                                                            className="btn btn-link btn-sm p-0 text-decoration-none small"
                                                            onClick={() => isEditingPrinterName ? handleSavePrinterName() : setIsEditingPrinterName(true)}
                                                        >
                                                            {isEditingPrinterName ? '✅ Save' : '✏️ Rename'}
                                                        </button>
                                                    )}
                                                </div>
                                                <input 
                                                    type="text" 
                                                    className={`form-control form-control-glass form-control-sm ${isEditingPrinterName ? 'bg-white' : 'text-secondary'}`} 
                                                    value={printerName} 
                                                    onChange={(e) => setPrinterName(e.target.value)}
                                                    readOnly={!isEditingPrinterName} 
                                                />
                                            </div>
                                            <div className="d-flex gap-2">
                                                <button type="button" className="btn btn-sm btn-dark flex-grow-1" onClick={() => {
                                                    if (connectedDevice) connectedDevice.gatt.disconnect();
                                                    setConnectedDevice(null);
                                                    setIsPrinterActive(false);
                                                    localStorage.removeItem('posPrinter');
                                                    localStorage.removeItem('posPrinterName');
                                                    setPrinterStatus('offline');
                                                    setPrinterName('No machine found');
                                                    toast.info('Billing Machine removed.');
                                                }}>Remove Billing Machine</button>

                                                <button type="button" className="btn btn-sm btn-outline-secondary flex-grow-1 shadow-sm" onClick={handleTestPrint}>Test Print</button>
                                            </div>
                                        </div>

                                        {/* Recently Paired List */}
                                        {recentDevices.length > 0 && (
                                            <div className="p-3 border rounded mb-3 bg-white">
                                                <h6 className="fw-bold mb-3 small text-secondary">Authorized Printer Cache</h6>
                                                <div className="d-flex flex-column gap-2">
                                                    {recentDevices.map(device => (
                                                        <div key={device.id} className="d-flex justify-content-between align-items-center p-2 rounded bg-light border-0">
                                                            <div className="d-flex align-items-center gap-2">
                                                                <span className="fs-5">🖨️</span>
                                                                <div>
                                                                    <div className="fw-bold small">{device.name || 'Unknown Device'}</div>
                                                                    <div className="text-secondary" style={{ fontSize: '0.6rem' }}>UUID: {device.id.slice(0, 12)}...</div>
                                                                </div>
                                                            </div>
                                                            <button 
                                                                className="btn btn-sm btn-outline-dark fw-bold px-3 py-1"
                                                                onClick={() => connectDeviceFinal(device)}
                                                                style={{ fontSize: '0.7rem' }}
                                                            >
                                                                Instant Link
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="p-3 border rounded">
                                            <h6 className="fw-bold mb-3">System Settings</h6>
                                            <div className="row g-3">
                                                <div className="col-md-4">
                                                    <div className="form-check form-switch p-0 m-0 d-flex flex-column align-items-start">
                                                        <label className="small fw-bold text-secondary mb-1">Dark Mode</label>
                                                        <input className="form-check-input ms-0 fs-5" type="checkbox" checked={darkMode} onChange={toggleTheme} />
                                                    </div>
                                                </div>
                                                <div className="col-md-4">
                                                    <div className="form-check form-switch p-0 m-0 d-flex flex-column align-items-start">
                                                        <label className="small fw-bold text-secondary mb-1">Auto-Print</label>
                                                        <input className="form-check-input ms-0 fs-5" type="checkbox" checked={autoPrintUpi} onChange={(e) => {
                                                            setAutoPrintUpi(e.target.checked);
                                                            localStorage.setItem('autoPrintUpi', e.target.checked.toString());
                                                        }} />
                                                    </div>
                                                </div>
                                                <div className="col-md-4">
                                                    <div className="form-check form-switch p-0 m-0 d-flex flex-column align-items-start">
                                                        <label className="small fw-bold text-secondary mb-1">24H Format</label>
                                                        <input className="form-check-input ms-0 fs-5" type="checkbox" checked={is24Hour} onChange={(e) => {
                                                            setIs24Hour(e.target.checked);
                                                            localStorage.setItem('timeFormat', e.target.checked ? '24h' : '12h');
                                                            window.dispatchEvent(new Event('timeFormatChanged'));
                                                        }} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-xl-5">
                                        <div className="p-3 border rounded h-100 bg-light-subtle">
                                            <h6 className="fw-bold mb-3">System Date & Time Setup</h6>
                                            <div className="d-flex flex-column gap-3">
                                                <div className="d-flex flex-column gap-1">
                                                    <label className="small fw-bold text-secondary">Active Calendar Date</label>
                                                    <div className="d-flex gap-2">
                                                        <input type="date" className="form-control form-control-sm" value={manualDate} onChange={e => setManualDate(e.target.value)} />
                                                        <button className="btn btn-sm btn-gold fw-bold px-3" onClick={handleApplyDate}>Apply Date</button>
                                                    </div>
                                                </div>
                                                <div className="d-flex flex-column gap-1">
                                                    <label className="small fw-bold text-secondary">Active Clock Time</label>
                                                    <div className="d-flex gap-1 align-items-center">
                                                        <select className="form-select form-select-sm" value={manualHour} onChange={e => setManualHour(e.target.value)}>
                                                            {Array.from({ length: is24Hour ? 24 : 12 }, (_, i) => String(is24Hour ? i : (i === 0 ? 12 : i)).padStart(2, '0')).map(h => <option key={h} value={h}>{h}</option>)}
                                                        </select>
                                                        <span>:</span>
                                                        <select className="form-select form-select-sm" value={manualMinute} onChange={e => setManualMinute(e.target.value)}>
                                                            {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map(m => <option key={m} value={m}>{m}</option>)}
                                                        </select>
                                                        {!is24Hour && (
                                                            <select className="form-select form-select-sm" value={manualAmPm} onChange={e => setManualAmPm(e.target.value)}>
                                                                <option value="AM">AM</option><option value="PM">PM</option>
                                                            </select>
                                                        )}
                                                        <button className="btn btn-sm btn-gold fw-bold px-3 ms-auto" onClick={handleApplyTime}>Apply Time</button>
                                                    </div>
                                                </div>
                                                <button className="btn btn-sm btn-outline-danger w-100 mt-2 fw-bold" onClick={handleResetAll}>🔄 Reset Everything To Live</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Security Warning Modal for Unknown Hardware */}
                {pendingDevice && (
                    <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content glass-panel border border-danger shadow-lg">
                                <div className="modal-header border-bottom-0 bg-danger text-white">
                                    <h5 className="modal-title fw-bold">⚠️ Unsafe Hardware Detected</h5>
                                </div>
                                <div className="modal-body pb-0 pt-4 text-center">
                                    <div className="mb-4">
                                        <h1 className="display-1 text-danger mb-3" style={{ filter: 'drop-shadow(0px 5px 5px rgba(220,53,69,0.3))' }}>🦠</h1>
                                        <h5 className="fw-bolder">Malware / Unrecognized Signature</h5>
                                        <p className="text-secondary small mt-2">
                                            The machine you selected <b className="text-dark">&quot;{pendingDevice.name || 'Unknown Bluetooth Device'}&quot;</b> does not match our verified Point-of-Sale hardware signatures.
                                            This could be a headset, smart TV, or potentially a malicious device attempting to spoof a printer.
                                        </p>
                                    </div>
                                    <div className="alert alert-warning text-start small">
                                        <strong>Risk Warning:</strong> Proceeding with this connection could expose your billing cache to unwanted hardware.
                                    </div>
                                </div>
                                <div className="modal-footer border-top-0 d-flex gap-2">
                                    <button type="button" className="btn btn-secondary flex-grow-1" onClick={() => setPendingDevice(null)}>Cancel & Abort</button>
                                    <button type="button" className="btn btn-outline-danger flex-grow-1 fw-bold" onClick={() => connectDeviceFinal(pendingDevice)}>
                                        Ignore & Connect Anyway
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Credential Change Modal */}
                {showCredentialModal && (
                    <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)' }}>
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content glass-panel border-0">
                                <div className="modal-header border-bottom-0">
                                    <h5 className="modal-title fw-bold">Update Login Credentials</h5>
                                    <button type="button" className="btn-close" onClick={() => { setShowCredentialModal(false); setIsOtpSent(false); }}></button>
                                </div>
                                <div className="modal-body pb-4">
                                    {!isOtpSent ? (
                                        <div className="text-center">
                                            <p className="text-secondary mb-4">We will send a 6-digit OTP to your registered phone or email to securely verify your identity before allowing changes.</p>
                                            <div id="settings-recaptcha-button"></div>
                                            <button className="btn-gold w-100 mt-2" onClick={handleCredentialChangeRequest} disabled={isLoading}>
                                                {isLoading ? 'Sending...' : 'Request Secure OTP'}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="d-flex flex-column gap-3">
                                            <div className="alert alert-info py-2 small mb-0">Fill in one or both of the fields below.</div>
                                            <div>
                                                <label className="form-label small fw-semibold">New Username (Email / Mobile)</label>
                                                <input type="text" placeholder="Leave empty to keep current" className="form-control form-control-glass" value={credentialData.newLoginIdentifier} onChange={e => setCredentialData({ ...credentialData, newLoginIdentifier: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="form-label small fw-semibold">New Password</label>
                                                <input type="password" placeholder="Leave empty to keep current" className="form-control form-control-glass" value={credentialData.newPassword} onChange={e => setCredentialData({ ...credentialData, newPassword: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="form-label small fw-semibold">6-Digit Security OTP</label>
                                                <input type="text" maxLength="6" className="form-control form-control-glass text-center tracking-widest fw-bold" placeholder="------" style={{ letterSpacing: '0.5em' }} value={credentialData.otp} onChange={e => setCredentialData({ ...credentialData, otp: e.target.value })} />
                                            </div>
                                            <button className="btn-gold w-100 mt-2" onClick={handleCredentialVerify} disabled={isLoading || credentialData.otp.length !== 6}>
                                                {isLoading ? 'Verifying...' : 'Verify & Change'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Settings;
