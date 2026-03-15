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
                    <h2 className="fw-bold mb-1" style={{ color: 'var(--accent-primary)' }}>Gold Desk</h2>
                    <p className="text-secondary small">Secure Access to Your Business</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="d-flex flex-column gap-3">
                    <div>
                        <label className="form-label small fw-semibold">Email or Phone Number</label>
                        <input
                            type="text"
                            className="form-control w-100 form-control-glass"
                            placeholder="Email or +1 234 567 890"
                            {...register('loginIdentifier', { required: 'Email or Phone is required' })}
                        />
                        {errors.loginIdentifier && <span className="text-danger small mt-1 d-block">{errors.loginIdentifier.message}</span>}
                    </div>

                    <div>
                        <label className="form-label small fw-semibold">Password</label>
                        <input
                            type="password"
                            className="form-control w-100 form-control-glass"
                            placeholder="••••••••"
                            {...register('password', { required: 'Password is required' })}
                        />
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
