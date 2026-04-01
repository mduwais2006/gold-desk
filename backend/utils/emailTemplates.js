const getOtpEmailTemplate = (otp, purpose = 'Login', shopName = 'Gold Desk Premium', shopLogo = '') => {
    const finalLogo = shopLogo || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/logo.png`;
    return `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 30px auto; padding: 40px; border-radius: 24px; background: #ffffff; box-shadow: 0 20px 50px rgba(0,0,0,0.05); border: 1px solid #f1f5f9;">
            <div style="text-align: center; margin-bottom: 35px;">
                <img src="${finalLogo}" alt="Shop Logo" style="max-height: 80px; width: auto; margin-bottom: 20px; border-radius: 12px; border: 1px solid #f1f5f9;" />
                <h1 style="color: #0f172a; font-weight: 800; margin: 0; font-size: 24px; text-transform: uppercase;">${shopName}</h1>
                <p style="color: #94a3b8; letter-spacing: 0.1em; font-size: 12px; text-transform: uppercase; margin-top: 5px;">Security Verification</p>
            </div>
            
            <h2 style="color: #1e293b; font-size: 20px; font-weight: 600; text-align: center; margin-bottom: 25px;">${purpose} OTP</h2>
            <p style="color: #475569; line-height: 1.6; font-size: 15px; text-align: center; margin-bottom: 30px;">
                Please use the following One-Time Password to proceed. This code is valid for a short period of time.
            </p>
            
            <div style="background: #f8fafc; padding: 25px; border-radius: 16px; text-align: center; border: 2px dashed #cbd5e1; margin-bottom: 30px;">
                <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #eab308;">${otp}</div>
            </div>

            <p style="color: #64748b; font-size: 14px; text-align: center; line-height: 1.6;">
                If you didn't request this code, you can safely ignore this email.
            </p>
            
            <div style="margin-top: 40px; padding-top: 25px; border-top: 1px solid #f1f5f9; text-align: center;">
                <p style="color: #94a3b8; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} ${shopName}. All rights reserved.</p>
                <p style="color: #cbd5e1; font-size: 11px; margin-top: 5px;">This is an automated priority message.</p>
            </div>
        </div>
    `;
};

const getWelcomeEmailTemplate = (name, shopName = 'Your Shop', shopLogo = '') => {
    const finalLogo = shopLogo || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/logo.png`;
    return `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 30px auto; padding: 40px; border-radius: 24px; background: #ffffff; box-shadow: 0 20px 50px rgba(0,0,0,0.05); border: 1px solid #f1f5f9;">
            <div style="text-align: center; margin-bottom: 35px;">
                <img src="${finalLogo}" alt="Shop Logo" style="max-height: 100px; width: auto; margin-bottom: 25px; border-radius: 15px; border: 2px solid #fffcf0; box-shadow: 0 4px 10px rgba(0,0,0,0.05);" />
                <div style="display: inline-block; padding: 12px 25px; background: #fffcf0; border-radius: 20px; border: 2px solid #eab308; margin-bottom: 0;">
                    <h1 style="color: #eab308; font-weight: 900; margin: 0; font-size: 24px; letter-spacing: 1px; text-transform: uppercase;">${shopName}</h1>
                </div>
                <p style="color: #94a3b8; letter-spacing: 0.4em; font-size: 10px; text-transform: uppercase; margin-top: 10px;">Premium Jewellers Portal</p>
            </div>
            
            <h2 style="color: #0f172a; font-size: 24px; font-weight: 700; margin-bottom: 15px;">Hi ${name}, welcome aboard! 👋</h2>
            <p style="color: #475569; line-height: 1.7; font-size: 16px; margin-bottom: 25px;">We're thrilled to have you join the Gold Desk family. Your professional dashboard for <b>${shopName}</b> is now active and ready for use.</p>
            
            <div style="background: #f8fafc; padding: 30px; border-radius: 20px; margin: 30px 0; border: 1px solid #f1f5f9;">
                <h4 style="color: #1e293b; margin: 0 0 15px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Your Premium Toolset:</h4>
                <div style="display: grid; gap: 12px; color: #475569; font-size: 15px;">
                    <div style="margin-bottom: 8px;">✨ <b>Real-time Analytics</b> — Live sales tracking</div>
                    <div style="margin-bottom: 8px;">🔐 <b>Secure Billing</b> — A4 & Thermal thermal receipts</div>
                    <div style="margin-bottom: 8px;">📊 <b>Inventory Engine</b> — Smart stock management</div>
                    <div>🚀 <b>Google-Fast Speed</b> — Optimized performance</div>
                </div>
            </div>

            <div style="text-align: center; margin: 40px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" style="background: #eab308; color: #ffffff; padding: 18px 45px; text-decoration: none; border-radius: 16px; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 10px 20px rgba(234, 179, 8, 0.2);">Launch My Dashboard</a>
            </div>
            
            <p style="color: #64748b; font-size: 14px; text-align: center; line-height: 1.6;">If you have any questions, our support team is always here for you.</p>
            
            <div style="margin-top: 50px; padding-top: 30px; border-top: 1px solid #f1f5f9; text-align: center;">
                <p style="color: #94a3b8; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} ${shopName}. All rights reserved.</p>
                <p style="color: #cbd5e1; font-size: 11px; margin-top: 5px;">This is an automated priority message from Gold Desk.</p>
            </div>
        </div>
    `;
};

module.exports = {
    getOtpEmailTemplate,
    getWelcomeEmailTemplate
};
