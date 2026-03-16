import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import api from '../utils/api';

const ForgotPassword = () => {
    const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm();
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState(1); // 1: Recovery Email, 2: OTP + New Password
    const [enteredEmail, setEnteredEmail] = useState('');
    const [recoveryEmailHint, setRecoveryEmailHint] = useState('');
    const [resendTimer, setResendTimer] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        let interval;
        if (resendTimer > 0) {
            interval = setInterval(() => setResendTimer(t => t - 1), 1000);
        }
        return () => clearInterval(interval);
    }, [resendTimer]);

    const onRequestOtp = async (data) => {
        try {
            setIsLoading(true);
            const email = data.email?.trim().toLowerCase();
            const res = await api.post('/auth/forgot-password/request', { accountEmail: email });
            setEnteredEmail(email);
            setRecoveryEmailHint(res.data.recoveryEmail);
            setStep(2);
            setResendTimer(90);
            
            // Clear old OTP if this is a resend
            setValue('otp', '');

            if (res.data.isDevMode) {
                Swal.fire({
                    icon: 'info',
                    title: 'Smart Dev Mode',
                    text: 'Recovery OTP sent to server terminal. Please check the Gold Block.',
                    confirmButtonColor: 'var(--accent-primary)'
                });
            } else {
                Swal.fire({
                    icon: 'success',
                    title: 'OTP Sent Successfully',
                    text: 'Please check your recovery email for your access code.',
                    timer: 3000,
                    showConfirmButton: false
                });
            }
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Failed to find account. Check your recovery email address.';
            Swal.fire({
                icon: 'error',
                title: 'Account Not Found',
                text: errorMsg,
                confirmButtonColor: 'var(--accent-primary)'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const onVerifyAndReset = async (data) => {
        try {
            setIsLoading(true);
            await api.post('/auth/forgot-password/reset', {
                accountEmail: enteredEmail,
                otp: data.otp,
                newPassword: data.newPassword
            });
            Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Password reset successfully! Please log in with your new password.',
                confirmButtonColor: 'var(--accent-primary)'
            }).then(() => {
                navigate('/login');
            });
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Invalid OTP or Reset Failed';
            Swal.fire({
                icon: 'error',
                title: 'Reset Failed',
                text: errorMsg.charAt(0).toUpperCase() + errorMsg.slice(1),
                confirmButtonColor: 'var(--accent-primary)'
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-wrapper">
            <div className="auth-card glass-panel animate-fade-in shadow-lg">
                <div className="text-center mb-4">
                    <div className="d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '60px', height: '60px', background: 'rgba(234, 179, 8, 0.1)', borderRadius: '15px' }}>
                        <span style={{ fontSize: '1.5rem' }}>{step === 1 ? '🔑' : '🛡️'}</span>
                    </div>
                    <h2 className="fw-bold mb-1" style={{ color: 'var(--accent-primary)' }}>
                        {step === 1 ? 'Forgot Password' : 'Verify & Reset'}
                    </h2>
                    <p className="text-secondary small">
                        {step === 1
                            ? 'Enter the Recovery Email you set in Settings.'
                            : `OTP sent to ${recoveryEmailHint}. Enter it below along with your new password.`}
                    </p>
                </div>

                {/* Step 1: Enter Recovery Email */}
                {step === 1 && (
                    <form onSubmit={handleSubmit(onRequestOtp)} className="d-flex flex-column gap-3">
                        <div>
                            <label className="form-label small fw-semibold text-secondary">
                                Your Recovery Email
                                <span className="ms-1 fw-normal opacity-75">(set in Settings → Security)</span>
                            </label>
                            <input
                                type="email"
                                className="form-control form-control-glass"
                                placeholder="e.g. yourrecovery@gmail.com"
                                {...register('email', { required: 'Recovery email is required' })}
                            />
                            {errors.email && <span className="text-danger small mt-1 d-block">{errors.email.message}</span>}
                        </div>

                        <div className="alert border-0 py-2 px-3 small rounded-3" style={{ background: 'rgba(234,179,8,0.08)', color: 'var(--text-secondary)' }}>
                            💡 This is the email you saved under <strong>Settings → Recovery Email</strong>, not your login credential.
                        </div>

                        <button type="submit" className="btn-gold w-100 mt-2 py-2 fw-bold" disabled={isLoading}>
                            {isLoading ? (
                                <span><span className="spinner-border spinner-border-sm me-2"></span>Searching...</span>
                            ) : 'Find Account & Send OTP'}
                        </button>
                    </form>
                )}

                {/* Step 2: Enter OTP + New Password */}
                {step === 2 && (
                    <form onSubmit={handleSubmit(onVerifyAndReset)} className="d-flex flex-column gap-3">
                        <div>
                            <label className="form-label small fw-semibold text-secondary text-center d-block">
                                6-Digit Recovery Code
                            </label>
                            <input
                                type="text"
                                maxLength="6"
                                className="form-control form-control-glass text-center fw-bold py-3 fs-4"
                                placeholder="------"
                                style={{ letterSpacing: '0.4em' }}
                                {...register('otp', { required: 'OTP is required', minLength: { value: 6, message: 'OTP must be 6 digits' } })}
                            />
                            {errors.otp && <span className="text-danger small mt-1 d-block text-center">{errors.otp.message}</span>}
                            <div className="text-center mt-2">
                                <button
                                    type="button"
                                    className="btn btn-link btn-sm text-decoration-none text-warning fw-bold"
                                    disabled={resendTimer > 0 || isLoading}
                                    onClick={() => onRequestOtp({ email: enteredEmail })}
                                >
                                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="form-label small fw-semibold text-secondary">New Password</label>
                            <div className="password-field-container">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className="form-control form-control-glass with-toggle"
                                    placeholder="Min. 6 characters"
                                    {...register('newPassword', { required: 'New password is required', minLength: { value: 6, message: 'Password must be at least 6 characters' } })}
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
                            {errors.newPassword && <span className="text-danger small mt-1 d-block">{errors.newPassword.message}</span>}
                        </div>

                        <div>
                            <label className="form-label small fw-semibold text-secondary">Confirm New Password</label>
                            <div className="password-field-container">
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    className="form-control form-control-glass with-toggle"
                                    placeholder="Repeat your new password"
                                    {...register('confirmPassword', {
                                        required: 'Please confirm your password',
                                        validate: val => val === watch('newPassword') || 'Passwords do not match'
                                    })}
                                />
                                <span 
                                    className="password-toggle-icon" 
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    title={showConfirmPassword ? 'Hide Password' : 'Show Password'}
                                >
                                    {showConfirmPassword ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                    )}
                                </span>
                            </div>
                            {errors.confirmPassword && <span className="text-danger small mt-1 d-block">{errors.confirmPassword.message}</span>}
                        </div>

                        <button type="submit" className="btn-gold w-100 mt-2 py-2 fw-bold" disabled={isLoading}>
                            {isLoading ? (
                                <span><span className="spinner-border spinner-border-sm me-2"></span>Resetting...</span>
                            ) : '🔐 Verify & Reset Password'}
                        </button>
                    </form>
                )}

                <div className="text-center mt-4">
                    <Link to="/login" className="small text-secondary fw-semibold text-decoration-none">
                        ← Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
