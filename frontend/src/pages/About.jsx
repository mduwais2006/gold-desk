import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import api from '../utils/api';

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
            await api.post('/contact', formData);
            toast.success('Your message has been sent to our engineering team! 🚀');
            setFormData({ name: '', email: '', description: '' });
        } catch (error) {
            console.error(error);
            toast.error('Failed to send message. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="d-flex min-vh-100 theme-colorful">
            <Sidebar />
            <div className="main-content flex-grow-1 p-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2 className="fw-bold m-0 animate-fade-in shadow-sm-text" style={{ color: 'var(--text-primary)' }}>Help Center & Resources</h2>
                    <div className="badge bg-gold-subtle text-gold px-3 py-2 rounded-pill border border-gold-subtle fw-bold">v3.1.0 Enterprise</div>
                </div>

                <div className="row g-4">
                    {/* Platform Statistics Overview */}
                    <motion.div className="col-12" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                        <div className="glass-panel p-4 border-0 mb-2 border-start border-4 border-warning shadow-lg">
                            <h5 className="fw-900 mb-3 help-heading d-flex align-items-center gap-2">
                                <span className="fs-4">🛡️</span> Gold Desk POS: The Future of Jewelry Retail
                            </h5>
                            <p className="help-text mb-0 opacity-75">
                                You are operating on the <strong>Quantum-Speed Engine</strong>. Gold Desk is designed to eliminate friction in jewelry sales, providing sub-millisecond data synchronization, precision hardware integration, and world-class security for your business assets.
                            </p>
                        </div>
                    </motion.div>

                    {/* How It Works - Core Modules */}
                    <motion.div className="col-md-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                        <div className="glass-panel p-4 border-0 shadow-lg rounded-4 border-start border-4 border-warning h-100 custom-hover-lift">
                            <div className="fs-1 mb-3">⚡</div>
                            <h6 className="fw-900 mb-2 text-uppercase tracking-wider">Zero-Lag Interface</h6>
                            <p className="help-text small opacity-75">
                                Every interaction is optimized for speed. Our <strong>Data & Report</strong> section now features smooth-scroll navigation and a refined search engine.
                            </p>
                        </div>
                    </motion.div>

                    <motion.div className="col-md-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                        <div className="glass-panel p-4 border-0 shadow-lg rounded-4 border-start border-4 border-warning h-100 custom-hover-lift">
                            <div className="fs-1 mb-3">🖨️</div>
                            <h6 className="fw-900 mb-2 text-uppercase tracking-wider">Universal Printing</h6>
                            <p className="help-text small opacity-75">
                                Print to any hardware. Whether using a <strong>Bluetooth Thermal Printer</strong> or a standard Office Printer, Gold Desk adapts instantly.
                            </p>
                        </div>
                    </motion.div>

                    <motion.div className="col-md-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                        <div className="glass-panel p-4 border-0 shadow-lg rounded-4 border-start border-4 border-warning h-100 custom-hover-lift">
                            <div className="fs-1 mb-3">⚙️</div>
                            <h6 className="fw-900 mb-2 text-uppercase tracking-wider">System Settings</h6>
                            <p className="help-text small opacity-75">
                                Full control over your environment. Toggle <strong>Dark Mode</strong>, manage <strong>UPI Autoprint</strong>, and customize your billing preferences.
                            </p>
                        </div>
                    </motion.div>

                    {/* Important Policies */}
                    <motion.div className="col-12" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                        <div className="glass-panel p-4 border-0 bg-success bg-opacity-10 border-success-subtle border-start border-4">
                            <h6 className="fw-900 text-success text-uppercase mb-3"><i className="bi bi-shield-check me-2"></i> Security & Performance Guarantee</h6>
                            <p className="help-text small mb-0 fw-medium">
                                To maintain peak performance, the <strong>Live Reports Engine</strong> prioritizes the most recent 6 months of data. 
                                For archival purposes, we recommend using the <strong>Excel Export</strong> feature monthly to maintain a permanent local database.
                            </p>
                        </div>
                    </motion.div>

                    {/* FAQ */}
                    <motion.div className="col-12" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                        <div className="glass-panel p-4 border-0 shadow-lg rounded-4 border-start border-4 border-warning">
                            <h5 className="fw-bolder mb-4 help-heading d-flex align-items-center gap-2">
                                <span className="fs-4">💡</span> Essential Guides & FAQ
                            </h5>

                            <div className="accordion accordion-flush" id="faqAccordion">

                                
                                <div className="accordion-item border-bottom mb-2 rounded overflow-hidden">
                                    <h2 className="accordion-header">
                                        <button className={`accordion-button bg-transparent fw-bold border-0 shadow-none d-flex justify-content-between align-items-center w-100 p-3 text-start accordion-button-black ${activeFaq !== 2 ? 'collapsed' : ''}`} type="button" onClick={() => toggleFaq(2)}>
                                            <span>Can I use regular printers (Laser/Inkjet)?</span>
                                            <i className={`bi bi-chevron-down`} style={{ transition: 'transform 0.3s', transform: activeFaq === 2 ? 'rotate(180deg)' : 'rotate(0)' }}></i>
                                        </button>
                                    </h2>
                                    <div className="accordion-collapse" style={{ maxHeight: activeFaq === 2 ? '200px' : '0', overflow: 'hidden', transition: 'all 0.3s' }}>
                                        <div className="accordion-body help-text small pt-0 px-3 pb-3 opacity-75">
                                            Yes! Gold Desk now uses a <strong>Native Browser Printing Engine</strong>. When you click Generate, simply select your office printer from the browser's standard print dialog.
                                        </div>
                                    </div>
                                </div>

                                <div className="accordion-item border-bottom mb-2 rounded overflow-hidden">
                                    <h2 className="accordion-header">
                                        <button className={`accordion-button bg-transparent fw-bold border-0 shadow-none d-flex justify-content-between align-items-center w-100 p-3 text-start accordion-button-black ${activeFaq !== 3 ? 'collapsed' : ''}`} type="button" onClick={() => toggleFaq(3)}>
                                            <span>Is my shop's financial data private?</span>
                                            <i className={`bi bi-chevron-down`} style={{ transition: 'transform 0.3s', transform: activeFaq === 3 ? 'rotate(180deg)' : 'rotate(0)' }}></i>
                                        </button>
                                    </h2>
                                    <div className="accordion-collapse" style={{ maxHeight: activeFaq === 3 ? '200px' : '0', overflow: 'hidden', transition: 'all 0.3s' }}>
                                        <div className="accordion-body help-text small pt-0 px-3 pb-3 opacity-75">
                                            Absolutely. We utilize <strong>End-to-End Encryption</strong> and isolated database clusters. No one, including our developers, can access your specific transaction lists without your secure authentication key.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Troubleshooting & Security */}
                    <div className="col-md-6">
                        <motion.div className="glass-panel p-4 border-0 shadow-lg rounded-4 border-start border-4 border-warning h-100" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                            <h5 className="fw-bolder mb-3 help-heading d-flex align-items-center gap-2">
                                <span className="fs-4">🔧</span> Critical Troubleshooting
                            </h5>
                            <div className="help-text small opacity-75">
                                <p className="mb-2"><strong>Billing button disabled:</strong> Ensure you have added at least one item and filled the Customer Name / Mobile fields.</p>
                                <p className="mb-2"><strong>Reports not updating:</strong> The live engine syncs periodically. Click <strong>Reset</strong> in filters to force a fresh data fetch from the cloud.</p>
                                <p className="mb-0"><strong>Receipt layout issues:</strong> Ensure your printer is set to 80mm or A4 in the browser print settings to match the Receipt engine output.</p>
                            </div>
                        </motion.div>
                    </div>

                    <div className="col-md-6">
                        <motion.div 
                            className="glass-panel p-4 border-0 shadow-lg rounded-4 h-100 position-relative overflow-hidden" 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            transition={{ duration: 0.3 }}
                            style={{ 
                                background: 'linear-gradient(135deg, rgba(30, 41, 59, 1), rgba(15, 23, 42, 1))',
                                borderLeft: '5px solid #fbbf24 !important' 
                            }}
                        >
                            <div style={{ position: 'absolute', top: '-20px', right: '-20px', opacity: '0.1', fontSize: '10rem', color: '#fbbf24' }}>📜</div>
                            <h5 className="fw-bolder mb-3 d-flex align-items-center gap-2 position-relative z-1" style={{ color: '#fbbf24' }}>
                                Enterprise Architecture
                            </h5>
                            <div className="position-relative z-1" style={{ color: '#e2e8f0' }}>
                                <p className="mb-2 small"><strong>Engine:</strong> Built on React 18 with high-concurrency state management for millisecond responsiveness.</p>
                                <p className="mb-0 small"><strong>Compliance:</strong> Standardized tax calculation modules with dynamic GST linking ensure your bookkeeping is always audit-ready.</p>
                            </div>
                        </motion.div>
                    </div>

                    {/* Contact Support Form */}
                    <motion.div className="col-12" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                        <div className="glass-panel p-4 border-0 shadow-lg rounded-4 border-start border-4 border-warning mt-2 mb-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
                            <div className="row">
                                <div className="col-md-5 text-start pe-md-5 mb-4 mb-md-0 d-flex flex-column justify-content-center">
                                    <h4 className="fw-bolder mb-3 d-flex align-items-center gap-2">
                                        <span className="fs-3">💌</span> Support & Feedback
                                    </h4>
                                    <p className="help-text small mb-4 opacity-75">
                                        Get direct support for your jewelry desk. Send us your feature requests or report any technical issues, and our team will get back to you shortly.
                                    </p>
                                    <div className="d-flex flex-column gap-3">
                                        <div className="d-flex align-items-center gap-3">
                                            <div className="p-3 rounded-circle text-warning border border-warning-subtle bg-warning-subtle bg-opacity-10 d-flex align-items-center justify-content-center" style={{ width: '56px', height: '56px' }}>
                                                <img src="https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg" alt="Gmail" width="28" height="28" />
                                            </div>
                                            <div>
                                                <div className="small text-secondary fw-bold text-uppercase">Direct Engineering Channel</div>
                                                <div className="mt-1">
                                                    <a href="mailto:golddesk.help@gmail.com" className="fw-bold text-decoration-none fs-6 support-email-link">golddesk.help@gmail.com</a>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-7 border-start border-light border-opacity-10 ps-md-5">
                                    <h1 className="fw-900 mb-4 feedback-heading text-start">Feedback</h1>
                                    <form onSubmit={handleContactSubmit}>
                                        <div className="row g-3">
                                            <div className="col-md-6 text-start">
                                                <label className="form-label fw-bold text-secondary small">Authorized Name</label>
                                                <input type="text" className="form-control form-control-glass bg-light bg-opacity-10" placeholder="Your Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                                            </div>
                                            <div className="col-md-6 text-start">
                                                <label className="form-label fw-bold text-secondary small">Security Email</label>
                                                <input type="email" className="form-control form-control-glass bg-light bg-opacity-10" placeholder="your@email.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                                            </div>
                                            <div className="col-12 text-start">
                                                <label className="form-label fw-bold text-secondary small">Detailed Inquiry</label>
                                                <textarea className="form-control form-control-glass bg-light bg-opacity-10" rows="3" placeholder="How can we help you?" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required></textarea>
                                            </div>
                                            <div className="col-12">
                                                <button type="submit" className="btn btn-warning fw-bold w-100 py-3 rounded-pill shadow-lg d-flex justify-content-center align-items-center gap-2 custom-hover-lift" disabled={loading}>
                                                    {loading ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> : <span>Send Message <i className="bi bi-send-check-fill ms-1"></i></span>}
                                                </button>
                                            </div>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
            {/* Scoped CSS for placeholder style consistency */}
            <style>{`
                .glass-panel {
                    will-change: transform, opacity;
                    transform: translateZ(0);
                    backface-visibility: hidden;
                }
                .form-control-glass::placeholder {
                    color: rgba(255,255,255,0.4) !important;
                }
                [data-theme="light"] .form-control-glass::placeholder {
                    color: #000000 !important;
                    opacity: 0.7;
                }
                .feedback-heading {
                    font-size: 2.5rem;
                    letter-spacing: -1px;
                    transition: color 0.15s ease;
                }
                [data-theme="dark"] .feedback-heading {
                    color: #ffffff !important;
                }
                .feedback-heading {
                    color: var(--accent-primary, #d4af37);
                }
                .support-email-link {
                    color: #ffffff;
                    transition: color 0.1s ease;
                }
                [data-theme="light"] .support-email-link {
                    color: #000000 !important;
                }
                .support-email-link:hover {
                    color: var(--accent-primary) !important;
                }
            `}</style>
        </div>
    );
};

export default About;
