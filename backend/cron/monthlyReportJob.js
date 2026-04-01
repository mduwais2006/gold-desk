const cron = require('node-cron');
const nodemailer = require('nodemailer');
const { db } = require('../config/firebase');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const getReportEmailTemplate = (name, shopName, monthName, year, stats) => {
    return `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 30px auto; padding: 40px; border-radius: 24px; background: #ffffff; box-shadow: 0 20px 50px rgba(0,0,0,0.05); border: 1px solid #f1f5f9;">
            <div style="text-align: center; margin-bottom: 35px;">
                <img src="${process.env.FRONTEND_URL || 'http://localhost:5173'}/logo.png" alt="Gold Desk Logo" style="height: 60px; margin-bottom: 15px;" />
                <h1 style="color: #0f172a; font-weight: 800; margin: 0; font-size: 24px;">GOLD DESK APP</h1>
                <p style="color: #94a3b8; letter-spacing: 0.1em; font-size: 12px; text-transform: uppercase;">Monthly Performance Report</p>
            </div>
            
            <h2 style="color: #1e293b; font-size: 20px; font-weight: 600; text-align: center; margin-bottom: 15px;">Hello ${name},</h2>
            <p style="color: #475569; line-height: 1.6; font-size: 15px; text-align: center; margin-bottom: 30px;">
                Here is your automated dashboard summary for <b>${shopName || 'your shop'}</b> for the month of <b>${monthName} ${year}</b>.
            </p>
            
            <div style="background: #f8fafc; padding: 25px; border-radius: 16px; border: 1px solid #e2e8f0; margin-bottom: 30px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 10px 0; color: #64748b; font-size: 14px; border-bottom: 1px solid #f1f5f9;">Total Customers (Month)</td>
                        <td style="padding: 10px 0; color: #0f172a; font-size: 16px; font-weight: 700; text-align: right; border-bottom: 1px solid #f1f5f9;">${stats.customers}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; color: #64748b; font-size: 14px; border-bottom: 1px solid #f1f5f9;">Total Revenue (Month)</td>
                        <td style="padding: 10px 0; color: #10b981; font-size: 16px; font-weight: 700; text-align: right; border-bottom: 1px solid #f1f5f9;">₹${stats.revenue.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; color: #64748b; font-size: 14px;">Total Lifetime Entries</td>
                        <td style="padding: 10px 0; color: #0f172a; font-size: 16px; font-weight: 700; text-align: right;">${stats.totalEntries}</td>
                    </tr>
                </table>
            </div>

            <div style="text-align: center; margin: 40px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" style="background: #eab308; color: #ffffff; padding: 15px 35px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 14px rgba(234, 179, 8, 0.3);">View Full Dashboard</a>
            </div>
            
            <p style="color: #64748b; font-size: 13px; text-align: center; line-height: 1.6;">
                This report is generated automatically at the end of each month.
            </p>
            
            <div style="margin-top: 40px; padding-top: 25px; border-top: 1px solid #f1f5f9; text-align: center;">
                <p style="color: #94a3b8; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} Gold Desk Management Portal. All rights reserved.</p>
            </div>
        </div>
    `;
};

const sendMonthlyReports = async () => {
    console.log(`\n\x1b[45m\x1b[37m 📊 STARTING MONTHLY REPORT CRON JOB \x1b[0m`);
    
    try {
        const usersSnapshot = await db.collection('users').get();
        if (usersSnapshot.empty) {
            console.log('No users found for report generation.');
            return;
        }

        const now = new Date();
        const currentYear = now.getFullYear();
        let lastMonth = now.getMonth() - 1;
        let lastMonthYear = currentYear;
        
        if (lastMonth < 0) {
            lastMonth = 11;
            lastMonthYear--;
        }

        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const reportMonthName = monthNames[lastMonth];

        // Process users sequentially to prevent rate limits or memory bursts in free tiers
        for (const userDoc of usersSnapshot.docs) {
            const userId = userDoc.id;
            const userData = userDoc.data();
            const email = userData.email || userData.recoveryEmail;

            if (!email || !email.includes('@')) {
                continue; // Skip users without a valid email
            }

            try {
                // Fetch data entries for this user
                const [subSnapshot, rootSnapshot] = await Promise.all([
                    db.collection('users').doc(userId).collection('dataEntries').get(),
                    db.collection('dataEntries').where('userId', '==', userId).get()
                ]);

                let totalEntries = 0;
                let monthRevenue = 0;
                let monthCustomers = 0;
                const seenIds = new Set();

                const processEntry = (doc) => {
                    if (seenIds.has(doc.id)) return;
                    seenIds.add(doc.id);
                    totalEntries++;

                    const entry = doc.data();
                    if (!entry.date) return;
                    
                    const entryDate = new Date(entry.date);
                    if (isNaN(entryDate.getTime())) return;
                    
                    const eMonth = entryDate.getMonth();
                    const eYear = entryDate.getFullYear();

                    if (eMonth === lastMonth && eYear === lastMonthYear) {
                        monthCustomers++;
                        monthRevenue += (entry.finalTotal || 0);
                    }
                };

                subSnapshot.forEach(processEntry);
                rootSnapshot.forEach(processEntry);

                const stats = {
                    totalEntries,
                    revenue: monthRevenue,
                    customers: monthCustomers
                };

                const mailOptions = {
                    from: `Gold Desk <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
                    to: email,
                    subject: '📊 Gold Desk - Your Monthly Dashboard Report',
                    html: getReportEmailTemplate(userData.name, userData.shopName, reportMonthName, lastMonthYear, stats)
                };

                await transporter.sendMail(mailOptions);
                console.log(`\x1b[32m✔ Monthly report sent to ${email}\x1b[0m`);
            } catch (userErr) {
                console.error(`❌ Failed to send report to ${email}:`, userErr.message);
            }
        }
        
        console.log(`\n\x1b[45m\x1b[37m 📊 COMPLETED MONTHLY REPORT CRON JOB \x1b[0m`);
    } catch (error) {
        console.error('Critical error in monthly report cron:', error);
    }
};

// Schedule it to run on the 1st of every month at 00:00 (Midnight)
const initCronJobs = () => {
    // Enable this to test it starting after 1 minute for local testing if needed
    // cron.schedule('* * * * *', sendMonthlyReports);
    
    // Proper monthly schedule
    cron.schedule('0 0 1 * *', sendMonthlyReports);
    console.log('✅ Monthly report cron job scheduled.');
};

module.exports = { initCronJobs };
