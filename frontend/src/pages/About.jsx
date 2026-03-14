import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import axios from 'axios';

const About = () => {
    const [formData, setFormData] = useState({ name: '', email: '', description: '' });
    const [loading, setLoading] = useState(false);
    const [activeFaq, setActiveFaq] = useState(null);

    const toggleFaq = (index) => {
        if (activeFaq === index) {
            setActiveFaq(null);
        } else {
            setActiveFaq(index);
        }
    };

    const handleContactSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post('http://localhost:5000/api/contact', formData);
            toast.success('Sent successfully');
            setFormData({ name: '', email: '', description: '' });
        } catch (error) {
            console.error(error);
            toast.error('Failed to send message');
        } finally {
            setLoading(false);
        }
    };
    return (
        <div className="d-flex min-vh-100">
            <Sidebar />
            <div className="main-content flex-grow-1 p-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2 className="fw-bold m-0 animate-fade-in shadow-sm-text">About & Help Center</h2>
                </div>

                <div className="row g-4 animate-fade-in">
                    {/* Data Retention Policy - NEW */}
                    <motion.div className="col-12" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                        <div className="glass-panel p-4 border-0 mb-2 border-start border-4 border-info">
                            <h5 className="fw-bolder mb-3 help-heading d-flex align-items-center gap-2">
                                <span className="fs-4">📊</span> Report Data Policy
                            </h5>
                            <p className="help-text mb-2">
                                To maintain peak performance, the <strong>Report Section</strong> displays transactions from the <strong>last 6 months only</strong>. 
                            </p>
                            <p className="help-text mb-0 fw-bold">
                                Recommendation: We strongly advise users to export their reports month-wise to Excel or PDF format for permanent offline storage.
                            </p>
                        </div>
                    </motion.div>

                    {/* Introduction */}
                    <motion.div className="col-12" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                        <div className="glass-panel p-4 border-0 shadow-sm rounded-4">
                            <h5 className="fw-bolder mb-3 help-heading d-flex align-items-center gap-2">
                                <span className="fs-4">✨</span> Introduction
                            </h5>
                            <p className="help-text mb-0">
                                Welcome to Gold Desk Help Center. Here you can find answers and guidance on how to use our premier jewelry management platform. Gold Desk allows you to effortlessly manage your shop’s daily gold rates, compute complex billing with making charges and GST, securely store client data in Firebase, and optionally print thermal receipts instantly via Bluetooth POS machines.
                            </p>
                        </div>
                    </motion.div>

                    {/* How to Use the Website */}
                    <motion.div className="col-md-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                        <div className="glass-panel p-4 border-0 shadow-sm rounded-4 h-100">
                            <h5 className="fw-bolder mb-3 help-heading d-flex align-items-center gap-2">
                                <span className="fs-4">🚀</span> How to Use the Website
                            </h5>
                            <ol className="help-text ps-3">
                                <li><strong>Sign up:</strong> Create a new master account.</li>
                                <li><strong>Verify:</strong> Securely confirm your OTP via mobile.</li>
                                <li><strong>Login:</strong> Access the secure Dashboard.</li>
                                <li><strong>Setup Settings:</strong> Connect your Bluetooth POS printer & QR Code.</li>
                                <li><strong>Billing:</strong> Instantly generate and print customer invoices.</li>
                                <li><strong>Data Entry & Management:</strong> Record calculations and export to Excel/PDF.</li>
                            </ol>
                        </div>
                    </motion.div>

                    {/* Account Help */}
                    <motion.div className="col-md-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                        <div className="glass-panel p-4 border-0 shadow-sm rounded-4 h-100">
                            <h5 className="fw-bolder mb-3 help-heading d-flex align-items-center gap-2">
                                <span className="fs-4">🔐</span> Account Help
                            </h5>
                            <ul className="help-text list-unstyled">
                                <li><strong>Create Account:</strong> Available on the Registration page.</li>
                                <li><strong>Login Problems:</strong> Ensure mobile number or email matches the registered account exactly.</li>
                                <li><strong>Change Password:</strong> Go to the <span className="fw-bold">Settings</span> menu and click "Change Login Username / Password via OTP".</li>
                                <li><strong>Delete Account:</strong> For full compliance, please contact support below to purge all your private Firebase data securely.</li>
                            </ul>
                        </div>
                    </motion.div>

                    {/* FAQ */}
                    <motion.div className="col-12" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                        <div className="glass-panel p-4 border-0 shadow-sm rounded-4">
                            <h5 className="fw-bolder mb-4 help-heading d-flex align-items-center gap-2">
                                <span className="fs-4">❓</span> Frequently Asked Questions (FAQ)
                            </h5>

                            <div className="accordion accordion-flush" id="faqAccordion">
                                <div className="accordion-item border-bottom mb-2 rounded overflow-hidden" style={{ transition: 'all 0.3s' }}>
                                    <h2 className="accordion-header" id="faq1">
                                        <button className={`accordion-button bg-transparent fw-bold border-0 shadow-none d-flex justify-content-between align-items-center w-100 p-3 text-start accordion-button-black ${activeFaq !== 1 ? 'collapsed' : ''}`} type="button" onClick={() => toggleFaq(1)}>
                                            <span>How do I create an invoice quickly?</span>
                                            <i className={`bi bi-chevron-down`} style={{ transition: 'transform 0.3s', transform: activeFaq === 1 ? 'rotate(180deg)' : 'rotate(0)' }}></i>
                                        </button>
                                    </h2>
                                    <div id="collapse1" className={`accordion-collapse`} style={{ maxHeight: activeFaq === 1 ? '200px' : '0', overflow: 'hidden', transition: 'max-height 0.3s ease-in-out' }}>
                                        <div className="accordion-body help-text small pt-0 px-3 pb-3">
                                            Go to the Billing section, add your items (either manually or from Data Entry drafts), apply optional discounts or GST, and click 'Print Bluetooth Receipt' to instantly obtain your invoice. You can also save the invoice as a PDF.
                                        </div>
                                    </div>
                                </div>
                                <div className="accordion-item border-bottom mb-2 rounded overflow-hidden" style={{ transition: 'all 0.3s' }}>
                                    <h2 className="accordion-header" id="faq2">
                                        <button className={`accordion-button bg-transparent fw-bold border-0 shadow-none d-flex justify-content-between align-items-center w-100 p-3 text-start accordion-button-black ${activeFaq !== 2 ? 'collapsed' : ''}`} type="button" onClick={() => toggleFaq(2)}>
                                            <span>How do I export my shop data to Excel?</span>
                                            <i className={`bi bi-chevron-down`} style={{ transition: 'transform 0.3s', transform: activeFaq === 2 ? 'rotate(180deg)' : 'rotate(0)' }}></i>
                                        </button>
                                    </h2>
                                    <div id="collapse2" className={`accordion-collapse`} style={{ maxHeight: activeFaq === 2 ? '200px' : '0', overflow: 'hidden', transition: 'max-height 0.3s ease-in-out' }}>
                                        <div className="accordion-body help-text small pt-0 px-3 pb-3">
                                            Navigate to the Data Entry section. Click on 'View Reports' and use the filters provided. Then click the Excel or PDF button to securely download the current data directly to your device.
                                        </div>
                                    </div>
                                </div>
                                <div className="accordion-item border-bottom mb-2 rounded overflow-hidden" style={{ transition: 'all 0.3s' }}>
                                    <h2 className="accordion-header" id="faq3">
                                        <button className={`accordion-button bg-transparent fw-bold border-0 shadow-none d-flex justify-content-between align-items-center w-100 p-3 text-start accordion-button-black ${activeFaq !== 3 ? 'collapsed' : ''}`} type="button" onClick={() => toggleFaq(3)}>
                                            <span>Are my invoices auto-saved?</span>
                                            <i className={`bi bi-chevron-down`} style={{ transition: 'transform 0.3s', transform: activeFaq === 3 ? 'rotate(180deg)' : 'rotate(0)' }}></i>
                                        </button>
                                    </h2>
                                    <div id="collapse3" className={`accordion-collapse`} style={{ maxHeight: activeFaq === 3 ? '200px' : '0', overflow: 'hidden', transition: 'max-height 0.3s ease-in-out' }}>
                                        <div className="accordion-body help-text small pt-0 px-3 pb-3">
                                            Currently, Draft Invoices are auto-saved to your browser's local cache. Once you submit a Data Entry form, those logs are securely saved continuously to the centralized Cloud Database.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Troubleshooting & Security */}
                    <div className="col-md-6">
                        <motion.div className="glass-panel p-4 border-0 shadow-sm rounded-4 h-100" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
                            <h5 className="fw-bolder mb-3 help-heading d-flex align-items-center gap-2">
                                <span className="fs-4">🛠️</span> Troubleshooting
                            </h5>
                            <div className="help-text small">
                                <p className="mb-2"><strong>Website not loading:</strong> Check your internet connection. Gold Desk runs a lightweight virtual DOM and natively loads under 0.8 seconds. Try refreshing (Ctrl+R).</p>
                                <p className="mb-2"><strong>Login error:</strong> Ensure Caps Lock is off, and that you verified the exact 6-digit OTP sent by Firebase messaging.</p>
                                <p className="mb-0"><strong>Data not saving:</strong> If offline, your dashboard will alert you. Wait for connection recovery, or perform a manual browser refresh.</p>
                            </div>
                        </motion.div>
                    </div>

                    <div className="col-md-6">
                        <motion.div 
                            className="glass-panel p-4 border-0 shadow-sm rounded-4 h-100 position-relative overflow-hidden" 
                            initial={{ opacity: 0, y: 10 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            transition={{ duration: 0.8 }}
                            style={{ 
                                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9))',
                                borderLeft: '4px solid #10b981 !important' 
                            }}
                        >
                            <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: '0.15', fontSize: '8rem', color: '#10b981' }}>🛡️</div>
                            <h5 className="fw-bolder mb-3 d-flex align-items-center gap-2 position-relative z-1" style={{ color: '#10b981' }}>
                                Privacy & Security
                            </h5>
                            <div className="position-relative z-1" style={{ color: '#ffffff' }}>
                                <p className="mb-2" style={{ color: '#ffffff' }}><strong style={{ color: '#ffffff' }}>Storage:</strong> All personal data is completely encrypted and stored securely physically within Google Firebase Servers.</p>
                                <p className="mb-0" style={{ color: '#ffffff' }}><strong style={{ color: '#ffffff' }}>Safety:</strong> We utilize modern Web-Bluetooth Hardware Verification, anti-CSRF protections, and strict Content-Security-Policies (CSP) to ensure no external software can ever scrape your shop's revenue metrics.</p>
                            </div>
                        </motion.div>
                    </div>

                    {/* Contact Support Form */}
                    <motion.div className="col-12" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.2 }}>
                        <div className="glass-panel p-4 border-0 shadow-sm rounded-4 mt-2 mb-4" style={{ borderTop: '4px solid var(--accent-primary)' }}>
                            <div className="row">
                                <div className="col-md-5 text-start pe-md-4 mb-4 mb-md-0 d-flex flex-column justify-content-center">
                                    <h4 className="fw-bolder mb-3 help-heading d-flex align-items-center gap-2">
                                        <span className="fs-3">📞</span> Get in Touch
                                    </h4>
                                    <p className="help-text mb-4">
                                        Have an enquiry, an architectural issue, or need custom features? Fill out the form or reach out directly to our engineering team.
                                    </p>
                                    <div className="d-flex flex-column gap-3">
                                        <div className="d-flex align-items-center gap-3">
                                            <div className="p-3 rounded-circle text-primary border"><i className="bi bi-envelope-fill"></i></div>
                                            <a href="mailto:golddesk.help@gmail.com" className="fw-bold text-decoration-none">golddesk.help@gmail.com</a>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-7 border-start ps-md-4">
                                    <form onSubmit={handleContactSubmit}>
                                        <div className="mb-3">
                                            <label className="form-label fw-bold text-secondary small">Your Name</label>
                                            <input type="text" className="form-control form-control-glass" placeholder="Enter your full name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label fw-bold text-secondary small">Email Address</label>
                                            <input type="email" className="form-control form-control-glass" placeholder="Enter your email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                                        </div>
                                        <div className="mb-4">
                                            <label className="form-label fw-bold text-secondary small">Description</label>
                                            <textarea className="form-control form-control-glass" rows="4" placeholder="How can we help you?" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required></textarea>
                                        </div>
                                        <button type="submit" className="btn btn-gold w-100 d-flex justify-content-center align-items-center gap-2" disabled={loading}>
                                            {loading ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> : <span>Send Message <i className="bi bi-send-fill ms-1"></i></span>}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                </div>
            </div>
        </div>
    );
};

export default About;
