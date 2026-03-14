import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

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
            toast.success('Registration successful. Please log in.');
            navigate('/login');
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
