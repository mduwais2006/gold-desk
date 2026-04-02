import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { auth, setupRecaptcha, signInWithPhoneNumber } from '../utils/firebase';
import { motion, AnimatePresence } from 'framer-motion';

const Login = () => {
    const { register, handleSubmit, watch, formState: { errors } } = useForm();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [emailAlert, setEmailAlert] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const watchedIdentifier = watch('loginIdentifier', '');

    useEffect(() => {
        // Pre-initialize reCAPTCHA on mount to make OTP generation instantly fast
        setupRecaptcha('sign-in-button');
    }, []);

    // Auto-dismiss email alert after 3 seconds
    useEffect(() => {
        if (emailAlert) {
            const t = setTimeout(() => setEmailAlert(false), 3000);
            return () => clearTimeout(t);
        }
    }, [emailAlert]);

    const handleForgotPasswordClick = (e) => {
        e.preventDefault();
        const val = (watchedIdentifier || '').trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!val || !emailRegex.test(val)) {
            setEmailAlert(true);
            return;
        }

        // Valid email — navigate and pre-fill on ForgotPassword page
        navigate('/forgot-password', { state: { prefillEmail: val } });
    };

    const onSubmit = async (data) => {
        try {
            setIsLoading(true);
            const res = await login(data.loginIdentifier, data.password);

            if (res.authMethod === 'firebase_phone') {
                toast.info('Sending SMS via Google Firebase...');
                const recaptchaVerifier = window.recaptchaVerifier || setupRecaptcha('sign-in-button');

                try {
                    const confirmationResult = await signInWithPhoneNumber(auth, res.formattedPhone, recaptchaVerifier);
                    window.confirmationResult = confirmationResult;

                    await Swal.fire({
                        icon: 'success',
                        title: 'OTP Sent Successfully',
                        text: 'A 6-digit code has been sent to your mobile phone via SMS.',
                        timer: 2000,
                        showConfirmButton: false,
                        position: 'top-end',
                        toast: true
                    });

                    navigate('/verify-otp', { state: { loginIdentifier: data.loginIdentifier, authMethod: res.authMethod, formattedPhone: res.formattedPhone, password: data.password } });
                } catch (ferr) {
                    console.error("Firebase Auth Error", ferr);
                    Swal.fire({
                        icon: 'error',
                        title: 'SMS Failed',
                        text: 'Firebase SMS Failed. Usually invalid config or phone format.',
                        confirmButtonColor: 'var(--accent-primary)'
                    });
                    if (window.recaptchaVerifier) { window.recaptchaVerifier.clear(); window.recaptchaVerifier = null; }
                }
            } else {
                if (res.isDevMode) {
                    Swal.fire({
                        icon: 'info',
                        title: 'Smart Dev Mode',
                        text: 'Your OTP has been sent to the server terminal. Please check the Gold Block.',
                        confirmButtonColor: 'var(--accent-primary)'
                    });
                } else {
                    Swal.fire({
                        icon: 'success',
                        title: 'OTP Sent Successfully',
                        text: 'Please check your email inbox for your 6-digit access code.',
                        timer: 3000,
                        showConfirmButton: false
                    });
                }
                navigate('/verify-otp', { state: { loginIdentifier: res.loginIdentifier, authMethod: 'email', password: data.password } });
            }

        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Login failed';
            Swal.fire({
                icon: 'error',
                title: 'Access Denied',
                text: errorMessage.charAt(0).toUpperCase() + errorMessage.slice(1),
                confirmButtonColor: 'var(--accent-primary)'
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-wrapper">
            <div className="auth-card glass-panel animate-fade-in">
                <div className="text-center mb-4">
                    <img src="/logo.png" alt="Gold Desk Logo" className="logo-img mb-3 mt-1" style={{ width: '80px', height: '80px', filter: 'drop-shadow(0 0 10px rgba(212,175,55,0.3))' }} />
                    <h2 className="fw-bold mb-1" style={{ color: 'var(--accent-primary)' }}>Gold Desk</h2>
                    <p className="text-secondary small">Secure Access to Your Business</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="d-flex flex-column gap-3" autoComplete="off">
                    <div>
                        <label className="form-label small fw-semibold">Email or Phone Number</label>
                        <input
                            type="text"
                            className="form-control w-100 form-control-glass theme-light"
                            placeholder="Email or +1 234 567 890"
                            {...register('loginIdentifier', { required: 'Email or Phone is required' })}
                            autoComplete="off"
                        />
                        {errors.loginIdentifier && <span className="text-danger small mt-1 d-block">{errors.loginIdentifier.message}</span>}
                    </div>

                    <div>
                        <label className="form-label small fw-semibold">Password</label>
                        <div className="password-field-container">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="form-control w-100 form-control-glass with-toggle"
                                placeholder="••••••••"
                                {...register('password', { required: 'Password is required' })}
                                autoComplete="off"
                            />
                            <span
                                className="password-toggle-icon"
                                onClick={() => setShowPassword(!showPassword)}
                                title={showPassword ? 'Hide Password' : 'Show Password'}
                            >
                                {showPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                )}
                            </span>
                        </div>

                        {/* Animated Email Validation Alert — shown when email is missing/invalid on Forgot Password click */}
                        <AnimatePresence>
                            {emailAlert && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                                    transition={{ duration: 0.22, ease: 'easeOut' }}
                                    className="d-flex align-items-start gap-2 mt-2 px-3 py-2 rounded-3 shadow-sm"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(220,53,69,0.12), rgba(220,53,69,0.06))',
                                        border: '1px solid rgba(220,53,69,0.35)',
                                        backdropFilter: 'blur(8px)'
                                    }}
                                >
                                    <span style={{ fontSize: '1rem', lineHeight: 1.5 }}>⚠️</span>
                                    <div className="flex-grow-1">
                                        <div className="fw-bold text-danger" style={{ fontSize: '0.8rem' }}>Valid Email Required</div>
                                        <div className="text-secondary" style={{ fontSize: '0.72rem', lineHeight: 1.4 }}>
                                            Enter your email address in the field above before clicking "Forgot Password"
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setEmailAlert(false)}
                                        className="btn-close flex-shrink-0"
                                        style={{ fontSize: '0.6rem', opacity: 0.45, marginTop: '2px' }}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="text-end mt-1">
                            <a
                                href="/forgot-password"
                                onClick={handleForgotPasswordClick}
                                className="small text-secondary fw-semibold text-decoration-none hover-gold transition-all"
                                style={{ cursor: 'pointer' }}
                            >
                                Forgot Password?
                            </a>
                        </div>
                        {errors.password && <span className="text-danger small mt-1 d-block">{errors.password.message}</span>}
                    </div>

                    <div id="sign-in-button"></div>
                    <button type="submit" className="btn btn-advanced w-100 mt-2" disabled={isLoading}>
                        {isLoading ? 'Authenticating...' : 'Sign In'}
                    </button>

                    <div className="text-center mt-3">
                        <p className="small text-secondary mb-0">
                            Don&apos;t have an account? <Link to="/register" className="fw-bold text-decoration-none" style={{ color: 'var(--accent-primary)' }}>Sign up</Link>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;
