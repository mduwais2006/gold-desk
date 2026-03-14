import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const AiWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();
    const [messages, setMessages] = useState([
        { sender: 'ai', text: 'Hello! I am your AI Assistant. How can I help you manage Gold Desk today?' }
    ]);
    const [input, setInput] = useState('');
    const location = useLocation();

    // Do not show widget on Auth pages
    if (['/login', '/register', '/verify-otp'].includes(location.pathname)) {
        return null;
    }

    const handleSend = (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const newMsgs = [...messages, { sender: 'user', text: input }];
        setMessages(newMsgs);
        setInput('');

        // Enhanced Generative AI Simulation Logic
        setTimeout(() => {
            const lowerInput = input.toLowerCase();
            let reply = "";

            // Dynamic Knowledge Base Rules Engine with Navigation Actions
            const knowledgeBase = [
                {
                    keywords: ['go to', 'open', 'navigate', 'bill', 'invoice', 'receipt'],
                    response: "Navigating you to the Billing section where you can generate invoices and print receipts!",
                    action: () => navigate('/billing')
                },
                {
                    keywords: ['go to', 'open', 'navigate', 'entry', 'data', 'calculator'],
                    response: "Taking you to Data Entry! Here you can log daily prices, calculate jewelry, and view historical reports.",
                    action: () => navigate('/data-entry')
                },
                {
                    keywords: ['go to', 'open', 'navigate', 'setting', 'profile'],
                    response: "Opening Settings for you. You can configure your POS hardware and shop details here.",
                    action: () => navigate('/settings')
                },
                {
                    keywords: ['go to', 'open', 'navigate', 'help', 'about', 'contact'],
                    response: "Taking you to the Help Center. You can read FAQs and contact our support team here.",
                    action: () => navigate('/about')
                },
                {
                    keywords: ['go to', 'open', 'navigate', 'dash', 'home', 'main'],
                    response: "Going back to your Dashboard to view your latest analytics and revenue charts.",
                    action: () => navigate('/')
                },
                // Information-only responses below
                {
                    keywords: ['export', 'excel', 'pdf', 'spreadsheet', 'download'],
                    response: "To export your shop data, head to Data Entry > View Reports. Use the date/month filters to find specific records, then click 'Excel' to download a spreadsheet or 'PDF' for a formatted document natively to your device."
                },
                {
                    keywords: ['delete', 'remove', 'trash', 'clear'],
                    response: "You can securely delete records from the 'View Reports' datatable in Data Entry. Just click the red trash icon. Be careful, as deletions are permanent! I recently added a 'Clear All' button on the entry form itself too for wiping forms fast."
                },
                {
                    keywords: ['password', 'login', 'auth', 'otp', 'account'],
                    response: "Gold Desk uses robust Firebase Authentication. You can change your password securely via OTP in the Settings > Preferences section if you're logged in, or use 'Forgot Password' on the login screen."
                },
                {
                    keywords: ['dark', 'theme', 'color', 'mode'],
                    response: "I've recently optimized the Dark Theme! It offers incredible readability with high-contrast text, glassmorphism panels, and elegant button designs perfect for low-light environments."
                },
                {
                    keywords: ['hi', 'hello', 'hey', 'greetings'],
                    response: "Hello! I am the Gold Desk Native Generative AI. I know everything about this app—from Bluetooth POS printing architectures to Excel report filtering. You can ask me questions or command me to 'go to billing', 'open settings', etc!"
                }
            ];

            let exactMatchAction = false;

            knowledgeBase.forEach(kb => {
                let score = kb.keywords.filter(keyword => lowerInput.includes(keyword)).length;
                
                // Boost score significantly if it's a direct navigational command
                if ((lowerInput.includes('go to') || lowerInput.includes('open') || lowerInput.includes('navigate')) && kb.action) {
                    let targetKeywords = kb.keywords.filter(k => !['go to', 'open', 'navigate'].includes(k));
                    if (targetKeywords.some(tk => lowerInput.includes(tk))) {
                        score += 10;
                    }
                }

                if (score > maxScore) {
                    maxScore = score;
                    bestMatch = kb;
                }
            });

            if (bestMatch && maxScore > 0) {
                reply = bestMatch.response;
                if (bestMatch.action && (lowerInput.includes('go to') || lowerInput.includes('open') || lowerInput.includes('navigate'))) {
                    exactMatchAction = true;
                }
            } else {
                reply = "I'm specialized in Gold Desk's architecture. I can help you with connecting Bluetooth POS printers, exporting Excel/PDF reports, Data Entry management, Billing calculations, or configuring Settings. Could you rephrase your question regarding these specific features?";
            }

            setMessages((prev) => [...prev, { sender: 'ai', text: reply }]);
            
            // Execute the autonomous action after replying
            if (exactMatchAction && bestMatch && bestMatch.action) {
                setTimeout(() => {
                    bestMatch.action();
                    setIsOpen(false); // Optionally close the widget after navigating
                }, 1000);
            }

        }, Math.random() * 600 + 400); // Simulate generative typing delay (400-1000ms)
    };

    return (
        <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 9999 }}>
            {isOpen && (
                <div className="glass-panel bg-white p-0 mb-3 overflow-hidden shadow-lg animate-fade-in" style={{ width: '320px', height: '400px', display: 'flex', flexDirection: 'column' }}>
                    <div className="p-3 text-white d-flex justify-content-between align-items-center" style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' }}>
                        <span className="fw-bold">✨ Gold Desk AI</span>
                        <button className="btn-close btn-close-white" style={{ fontSize: '0.8rem' }} onClick={() => setIsOpen(false)}></button>
                    </div>

                    <div className="flex-grow-1 p-3 overflow-auto d-flex flex-column gap-2" style={{ background: '#fafafa' }}>
                        {messages.map((m, idx) => (
                            <div key={idx} className={`p-2 rounded w-75 small ${m.sender === 'ai' ? 'bg-white border text-dark align-self-start' : 'bg-warning text-dark align-self-end text-end shadow-sm'}`}>
                                {m.text}
                            </div>
                        ))}
                    </div>

                    <form onSubmit={handleSend} className="p-2 bg-white border-top d-flex gap-2">
                        <input
                            type="text"
                            className="form-control form-control-sm border-0"
                            style={{ boxShadow: 'none' }}
                            placeholder="Ask me anything..."
                            value={input}
                            onChange={e => setInput(e.target.value)}
                        />
                        <button type="submit" className="btn btn-sm btn-gold px-3">➤</button>
                    </form>
                </div>
            )}

            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="btn btn-lg rounded-circle shadow p-0 d-flex align-items-center justify-content-center animate-float hover-accent"
                    style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', color: '#fff', width: '60px', height: '60px', border: '5px solid rgba(255,255,255,0.4)', backgroundClip: 'padding-box' }}
                >
                    <span style={{ fontSize: '1.5rem' }}>✨</span>
                </button>
            )}
        </div>
    );
};

export default AiWidget;
