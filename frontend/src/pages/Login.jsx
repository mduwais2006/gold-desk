import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { auth, setupRecaptcha, signInWithPhoneNumber } from '../utils/firebase';

const Login = () => {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        // Pre-initialize reCAPTCHA on mount to make OTP generation instantly fast "like Google"
        setupRecaptcha('sign-in-button');
    }, []);

    const onSubmit = async (data) => {
        try {
            setIsLoading(true);
            const res = await login(data.loginIdentifier, data.password);

            if (res.authMethod === 'firebase_phone') {
                toast.info('Sending SMS via Google Firebase...');
                // Use the pre-initialized recaptchaVerifier, or set it up if somehow missing
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


                <form onSubmit={handleSubmit(onSubmit)} className="d-flex flex-column gap-3">
                    <div>
                        <label className="form-label small fw-semibold">Email or Phone Number</label>
                        <input
                            type="text"
                            className="form-control w-100 form-control-glass theme-light"
                            placeholder="Email or +1 234 567 890"
                            {...register('loginIdentifier', { required: 'Email or Phone is required' })}
                            autoComplete="username"
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
                                autoComplete="current-password"
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
                        <div className="text-end mt-1">
                            <Link to="/forgot-password" title="Forgot Password" className="small text-secondary fw-semibold text-decoration-none hover-gold transition-all">
                                Forgot Password?
                            </Link>
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
