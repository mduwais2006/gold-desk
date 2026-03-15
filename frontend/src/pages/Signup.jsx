import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';

const Signup = () => {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const [isLoading, setIsLoading] = useState(false);
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
            <div className="auth-card glass-panel animate-fade-in my-auto py-4" style={{ maxWidth: '500px' }}>
                <div className="text-center mb-4">
                    <h2 className="fw-bold mb-1" style={{ color: 'var(--accent-primary)' }}>Create Account</h2>
                    <p className="text-secondary small">Join Gold Desk Management Portal</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="d-flex flex-column gap-3">
                    <div className="row g-3">
                        <div className="col-sm-6">
                            <label className="form-label small fw-semibold">Full Name</label>
                            <input
                                type="text"
                                className="form-control w-100 form-control-glass"
                                placeholder="John Doe"
                                {...register('name', { required: 'Name is required' })}
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
                        />
                    </div>

                    <div>
                        <label className="form-label small fw-semibold">Email Address</label>
                        <input
                            type="email"
                            className="form-control w-100 form-control-glass"
                            placeholder="vendor@golddesk.com"
                            {...register('email', { required: 'Email is required' })}
                        />
                        {errors.email && <span className="text-danger small mt-1 d-block">{errors.email.message}</span>}
                    </div>

                    <div>
                        <label className="form-label small fw-semibold">Password</label>
                        <input
                            type="password"
                            className="form-control w-100 form-control-glass"
                            placeholder="••••••••"
                            {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Min 6 chars' } })}
                        />
                        {errors.password && <span className="text-danger small mt-1 d-block">{errors.password.message}</span>}
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
