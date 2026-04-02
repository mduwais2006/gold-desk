import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';

const Signup = () => {
    const { register, handleSubmit, watch, formState: { errors } } = useForm();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const { register: registerUser } = useAuth();
    const navigate = useNavigate();

    const onSubmit = async (data) => {
        try {
            setIsLoading(true);
            await registerUser({
                name: data.name,
                email: data.email,
                password: data.password,
                shopName: data.shopName,
                phone: data.phone
            });
            
            Swal.fire({
                title: '<h2 style="color: #eab308; font-weight: 800;">Welcome to Gold Desk Premium 👑</h2>',
                html: `
                    <div style="text-align: left; padding: 10px;">
                        <p style="color: #64748b; font-size: 1.1rem; margin-bottom: 20px;">Hi <b>${data.name}</b>, your account for <b>${data.shopName || 'your shop'}</b> is ready!</p>
                        <div style="background: rgba(234, 179, 8, 0.05); padding: 15px; border-radius: 12px; border: 1px dashed #eab308;">
                            <h4 style="color: #1e293b; margin-top: 0; font-size: 1rem;">Premium Features Unlocked:</h4>
                            <ul style="color: #475569; padding-left: 20px; font-size: 0.9rem; line-height: 1.8;">
                                <li>✨ <b>Real-time Sales Analytics</b></li>
                                <li>🔐 <b>Secure Cloud Billing</b></li>
                                <li>📊 <b>Inventory Intelligence</b></li>
                                <li>⚡ <b>Blazing Fast Performance</b></li>
                            </ul>
                        </div>
                        <p style="margin-top: 20px; color: #1e293b; text-align: center;">Please log in to explore your new dashboard.</p>
                    </div>
                `,
                showConfirmButton: true,
                confirmButtonText: 'Let\'s Get Started',
                confirmButtonColor: '#eab308',
                background: '#ffffff',
                customClass: {
                    popup: 'premium-popup'
                }
            }).then(() => {
                navigate('/login');
            });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Registration failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-wrapper py-5">
            <div className="auth-card glass-panel animate-fade-in my-auto py-4">
                <div className="text-center mb-4">
                    <h2 className="fw-bold mb-1" style={{ color: 'var(--accent-primary)' }}>Create Account</h2>
                    <p className="text-secondary small">Join Gold Desk Management Portal</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="d-flex flex-column gap-3" autoComplete="off">
                    <div className="row g-3">
                        <div className="col-sm-6">
                            <label className="form-label small fw-semibold">Full Name</label>
                            <input
                                type="text"
                                className="form-control w-100 form-control-glass"
                                placeholder="John Doe"
                                {...register('name', { required: 'Name is required' })}
                                autoComplete="off"
                            />
                            {errors.name && <span className="text-danger small mt-1 d-block">{errors.name.message}</span>}
                        </div>
                        <div className="col-sm-6">
                            <label className="form-label small fw-semibold">Phone Number / Mobile</label>
                            <input
                                type="tel"
                                className="form-control w-100 form-control-glass"
                                placeholder="+1 234 567 890"
                                {...register('phone', { required: 'Phone number is required' })}
                                autoComplete="off"
                            />
                            {errors.phone && <span className="text-danger small mt-1 d-block">{errors.phone.message}</span>}
                        </div>
                    </div>

                    <div>
                        <label className="form-label small fw-semibold">Shop Name</label>
                        <input
                            type="text"
                            className="form-control w-100 form-control-glass"
                            placeholder="Golden Jewellers Ltd."
                            {...register('shopName')}
                            autoComplete="off"
                        />
                    </div>

                    <div>
                        <label className="form-label small fw-semibold">Email Address</label>
                        <input
                            type="email"
                            className="form-control w-100 form-control-glass theme-light"
                            placeholder="vendor@golddesk.com"
                            {...register('email', { required: 'Email is required' })}
                            autoComplete="off"
                        />
                        {errors.email && <span className="text-danger small mt-1 d-block">{errors.email.message}</span>}
                    </div>

                    <div>
                        <label className="form-label small fw-semibold">Password</label>
                        <div className="password-field-container">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="form-control w-100 form-control-glass with-toggle"
                                placeholder="••••••••"
                                {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Min 6 chars' } })}
                                autoComplete="off"
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
                        {errors.password && <span className="text-danger small mt-1 d-block">{errors.password.message}</span>}
                    </div>

                    <div>
                        <label className="form-label small fw-semibold">Confirm Password</label>
                        <div className="password-field-container">
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                className="form-control w-100 form-control-glass with-toggle"
                                placeholder="••••••••"
                                {...register('confirmPassword', { 
                                    required: 'Confirmation is required',
                                    validate: val => val === watch('password') || 'Passwords do not match'
                                })}
                                autoComplete="off"
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

                    <button type="submit" className="btn-gold w-100 mt-2" disabled={isLoading}>
                        {isLoading ? 'Creating Account...' : 'Sign Up'}
                    </button>

                    <div className="text-center mt-3">
                        <p className="small text-secondary mb-0">
                            Already have an account? <Link to="/login" className="fw-bold text-decoration-none" style={{ color: 'var(--accent-primary)' }}>Sign in</Link>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Signup;
