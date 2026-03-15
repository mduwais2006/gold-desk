import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { auth, setupRecaptcha, signInWithPhoneNumber } from '../utils/firebase';

const VerifyOTP = () => {
    const { register, handleSubmit, setValue, formState: { errors } } = useForm();
    const [isLoading, setIsLoading] = useState(false);
    const [timer, setTimer] = useState(90);
    const { verifyOtp, login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Redirect if they somehow got here without logging in a phone/email first
    const loginIdentifier = location.state?.loginIdentifier || location.state?.phone;
    const authMethod = location.state?.authMethod;
    const password = location.state?.password;
    const formattedPhone = location.state?.formattedPhone;

    useEffect(() => {
        if (!loginIdentifier) {
            navigate('/login');
        }
    }, [loginIdentifier, navigate]);

    useEffect(() => {
        let interval = null;
        if (timer > 0) {
            interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
        }
        return () => clearInterval(interval);
    }, [timer]);

    useEffect(() => {
        if (authMethod === 'firebase_phone') {
            // Speed up resend by pre-initializing the invisible recaptcha
            setTimeout(() => {
                setupRecaptcha('resend-captcha');
            }, 500); // slight delay to ensure DOM is ready
        }
    }, [authMethod]);

    const handleResend = async () => {
        try {
            setIsLoading(true);
            if (authMethod === 'firebase_phone') {
                toast.info('Sending new SMS...');
                const recaptchaVerifier = window.recaptchaVerifier || setupRecaptcha('resend-captcha');
                try {
                    const result = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);
                    window.confirmationResult = result;
                    toast.success('New SMS Sent to your Mobile!');
                    setTimer(90);
                } catch (ferr) {
                    toast.error('Firebase SMS Failed. Usually invalid config or phone format.');
                    if (window.recaptchaVerifier) { window.recaptchaVerifier.clear(); window.recaptchaVerifier = null; }
                }
            } else {
                const res = await login(loginIdentifier, password);
                if (res.showOtpLocally) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Email Delivery Failed',
                        text: `Your email server configuration is incomplete. For testing, your OTP is: ${res.devOtp}`,
                        confirmButtonColor: 'var(--accent-primary)'
                    });
                } else if (res.devOtp) {
                    Swal.fire({
                        icon: 'info',
                        title: 'Demo Environment',
                        text: `Bypassing real email logic. Your fresh OTP is: ${res.devOtp}`,
                        confirmButtonColor: 'var(--accent-primary)'
                    });
                } else {
                    toast.success(res.message || 'New OTP Sent');
                }
                
                // User requirement: Automatically clear entered data on resend
                setValue('otp', '');
                
                setTimer(90);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to resend OTP');
        } finally {
            setIsLoading(false);
        }
    };

    const onSubmit = async (data) => {
        if (timer === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'OTP Expired',
                text: 'Your current OTP has expired. Please request a new one.',
                confirmButtonColor: 'var(--accent-primary)'
            });
            return;
        }
        try {
            setIsLoading(true);
            let firebaseToken = null;

            if (authMethod === 'firebase_phone') {
                if (!window.confirmationResult) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Session Expired',
                        text: 'Your session has expired. Please request a new OTP.',
                        confirmButtonColor: 'var(--accent-primary)'
                    }).then(() => {
                        navigate('/login');
                    });
                    return;
                }
                const result = await window.confirmationResult.confirm(data.otp);
                firebaseToken = await result.user.getIdToken();
            }

            await verifyOtp(loginIdentifier, data.otp, firebaseToken);
            toast.success('Login Successful');
            navigate('/'); // To Dashboard
        } catch (error) {
            console.error(error);
            const errorMsg = error.message || error.response?.data?.message || 'Invalid or Expired OTP';
            Swal.fire({
                icon: 'error',
                title: 'Verification Failed',
                text: errorMsg.charAt(0).toUpperCase() + errorMsg.slice(1),
                confirmButtonColor: 'var(--accent-primary)'
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-wrapper">
            <div className="auth-card glass-panel animate-fade-in text-center">
                <div className="mb-4">
                    <div className="stat-icon mx-auto mb-3" style={{ width: '64px', height: '64px', fontSize: '2rem' }}>
                        🛡️
                    </div>
                    <h2 className="fw-bold mb-1">Verify Identity</h2>
                    <p className="text-secondary small">Enter the 6-digit code sent to<br /><strong className="text-primary-emphasis">{loginIdentifier}</strong></p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="d-flex flex-column gap-3">
                    <div>
                        <input
                            type="text"
                            maxLength="6"
                            className="form-control w-100 form-control-glass text-center fs-2 fw-bold tracking-widest"
                            placeholder="------"
                            style={{ letterSpacing: '0.5em' }}
                            {...register('otp', { required: 'OTP is required', minLength: { value: 6, message: 'Must be 6 digits' } })}
                        />
                        {errors.otp && <span className="text-danger small mt-1 d-block">{errors.otp.message}</span>}
                    </div>

                    {timer > 0 ? (
                        <div className="text-secondary small mb-2">
                            Time remaining: <span className="fw-bold text-danger">{timer}s</span>
                        </div>
                    ) : (
                        <div className="text-danger small fw-bold mb-2">OTP Expired</div>
                    )}

                    <button type="submit" className="btn-gold w-100 mt-2" disabled={isLoading || timer === 0}>
                        {isLoading ? 'Verifying...' : 'Verify Secure Login'}
                    </button>

                    {timer === 0 && (
                        <button type="button" onClick={handleResend} className="btn-outline-gold w-100 mt-2" disabled={isLoading} style={{ background: 'transparent', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', padding: '0.75rem', borderRadius: '8px' }}>
                            Resend OTP
                        </button>
                    )}

                    <div id="resend-captcha" className="mt-2 text-center d-flex justify-content-center"></div>

                    <div className="mt-4">
                        <Link to="/login" className="small text-secondary text-decoration-none hover-accent transition">
                            Cancel & Return to Login
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default VerifyOTP;
