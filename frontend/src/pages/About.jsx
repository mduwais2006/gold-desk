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
                    {/* Platform Statistics Overview */}
                    <motion.div className="col-12" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="glass-panel p-4 border-0 mb-2 border-start border-4 border-warning">
                            <h5 className="fw-900 mb-3 help-heading d-flex align-items-center gap-2">
                                <span className="fs-4">🏆</span> Gold Data Entry: Enterprise Edition
                            </h5>
                            <p className="help-text mb-0">
                                You are using the latest <strong>v2.4.0 Engine</strong>. This platform is architected for maximum speed, security, and hardware precision. Manage your jewelry shop's daily operations with real-time analytics and seamless POS integration.
                            </p>
                        </div>
                    </motion.div>

                    {/* How It Works - Core Modules */}
                    <motion.div className="col-md-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <div className="glass-panel p-4 border-0 shadow-sm rounded-4 h-100">
                            <div className="fs-1 mb-3">📈</div>
                            <h6 className="fw-900 mb-2 text-uppercase tracking-wider">Dashboard</h6>
                            <p className="help-text small">
                                Track your daily revenue, customer growth, and item breakdowns. Our predictive growth analysis compares your present and last month performance automatically.
                            </p>
                        </div>
                    </motion.div>

                    <motion.div className="col-md-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <div className="glass-panel p-4 border-0 shadow-sm rounded-4 h-100">
                            <div className="fs-1 mb-3">📠</div>
                            <h6 className="fw-900 mb-2 text-uppercase tracking-wider">Billing Engine</h6>
                            <p className="help-text small">
                                Generate professional tax invoices. Connect your <strong>Thermal Bluetooth Printer</strong> in settings to get physical receipts instantly. Supports UPI and Cash modes.
                            </p>
                        </div>
                    </motion.div>

                    <motion.div className="col-md-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                        <div className="glass-panel p-4 border-0 shadow-sm rounded-4 h-100">
                            <div className="fs-1 mb-3">📊</div>
                            <h6 className="fw-900 mb-2 text-uppercase tracking-wider">Data & Reports</h6>
                            <p className="help-text small">
                                Use the <strong>Jewelry Calculator</strong> for quick entries. Filter records by date/month and export your business data securely to <strong>Excel (XLSX)</strong> or <strong>PDF</strong>.
                            </p>
                        </div>
                    </motion.div>

                    {/* Important Policies */}
                    <motion.div className="col-12" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                        <div className="glass-panel p-4 border-0 bg-info bg-opacity-10">
                            <h6 className="fw-900 text-info text-uppercase mb-3"><i className="bi bi-shield-lock-fill me-2"></i> Data Retention & Performance Policy</h6>
                            <p className="help-text small mb-0">
                                To ensure sub-second loading speeds (Google-Standard), the <strong>Reports Section</strong> displays transactions from the <strong>last 6 months only</strong>. 
                                For permanent record keeping, please use the <strong>Export to Excel</strong> feature at the end of every month.
                            </p>
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
                                            <span>Why is the Billing Section locked?</span>
                                            <i className={`bi bi-chevron-down`} style={{ transition: 'transform 0.3s', transform: activeFaq === 1 ? 'rotate(180deg)' : 'rotate(0)' }}></i>
                                        </button>
                                    </h2>
                                    <div id="collapse1" className={`accordion-collapse`} style={{ maxHeight: activeFaq === 1 ? '200px' : '0', overflow: 'hidden', transition: 'max-height 0.3s ease-in-out' }}>
                                        <div className="accordion-body help-text small pt-0 px-3 pb-3">
                                            The <strong>Hardware Lock</strong> activates if no Bluetooth Printer is connected. Go to Settings &gt; Billing Machine to connect your device and enable the Billing Engine.
                                        </div>
                                    </div>
                                </div>
                                <div className="accordion-item border-bottom mb-2 rounded overflow-hidden" style={{ transition: 'all 0.3s' }}>
                                    <h2 className="accordion-header" id="faq2">
                                        <button className={`accordion-button bg-transparent fw-bold border-0 shadow-none d-flex justify-content-between align-items-center w-100 p-3 text-start accordion-button-black ${activeFaq !== 2 ? 'collapsed' : ''}`} type="button" onClick={() => toggleFaq(2)}>
                                            <span>How do I export GST-ready reports?</span>
                                            <i className={`bi bi-chevron-down`} style={{ transition: 'transform 0.3s', transform: activeFaq === 2 ? 'rotate(180deg)' : 'rotate(0)' }}></i>
                                        </button>
                                    </h2>
                                    <div id="collapse2" className={`accordion-collapse`} style={{ maxHeight: activeFaq === 2 ? '200px' : '0', overflow: 'hidden', transition: 'max-height 0.3s ease-in-out' }}>
                                        <div className="accordion-body help-text small pt-0 px-3 pb-3">
                                            Navigate to <strong>Data & Reports</strong>, set your filters (Month/Year), and click <strong>Excel (XLSX)</strong>. The generated file includes Weight, Rate, GST %, and Final Totals automatically.
                                        </div>
                                    </div>
                                </div>
                                <div className="accordion-item border-bottom mb-2 rounded overflow-hidden" style={{ transition: 'all 0.3s' }}>
                                    <h2 className="accordion-header" id="faq3">
                                        <button className={`accordion-button bg-transparent fw-bold border-0 shadow-none d-flex justify-content-between align-items-center w-100 p-3 text-start accordion-button-black ${activeFaq !== 3 ? 'collapsed' : ''}`} type="button" onClick={() => toggleFaq(3)}>
                                            <span>Are my shop details safe?</span>
                                            <i className={`bi bi-chevron-down`} style={{ transition: 'transform 0.3s', transform: activeFaq === 3 ? 'rotate(180deg)' : 'rotate(0)' }}></i>
                                        </button>
                                    </h2>
                                    <div id="collapse3" className={`accordion-collapse`} style={{ maxHeight: activeFaq === 3 ? '200px' : '0', overflow: 'hidden', transition: 'max-height 0.3s ease-in-out' }}>
                                        <div className="accordion-body help-text small pt-0 px-3 pb-3">
                                            Yes. We use <strong>Google Firebase Security Rules</strong> ensuring only YOU can see your data. Your connection is encrypted with modern SSL and Hardware Tokenization.
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
                                        <button type="submit" className="btn btn-advanced w-100 d-flex justify-content-center align-items-center gap-2" disabled={loading}>
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
