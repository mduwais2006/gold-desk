const { db } = require('../config/firebase');

// @desc    Get dashboard analytics summary
// @route   GET /api/analytics
// @access  Private
const getDashboardAnalytics = async (req, res) => {
    try {
        const userId = req.user.id;
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        let lastMonth = currentMonth - 1;
        let lastMonthYear = currentYear;
        if (lastMonth < 0) {
            lastMonth = 11;
            lastMonthYear--;
        }

        // Calculate the start of "Last Month" to limit document fetching
        const startOfLastMonth = new Date(lastMonthYear, lastMonth, 1).toISOString();

        // 🚀 PRO OPTIMIZATION: Use Firestore Count Aggregation for "All Time" stats
        let totalEntries = 0;
        try {
            const [totalCountRoot, totalCountSub] = await Promise.all([
                db.collection('dataEntries').where('userId', '==', userId).count().get(),
                db.collection('users').doc(userId).collection('dataEntries').count().get()
            ]);
            totalEntries = (totalCountRoot?.data()?.count || 0) + (totalCountSub?.data()?.count || 0);
        } catch (countErr) {
            console.error("Count aggregation failed, falling back to 0:", countErr.message);
        }

        // Fetch documents - removing the strict 'date' filter to avoid Index Missing errors for now
        // This ensures the dashboard ALWAYS works while we investigate individual user index needs
        const [subSnapshot, rootSnapshot] = await Promise.all([
            db.collection('users').doc(userId).collection('dataEntries').get(),
            db.collection('dataEntries').where('userId', '==', userId).get()
        ]);

        let stats = { 
            todayRevenue: 0, 
            totalRevenue: 0, // We'll estimate this or keep as 0 for "All Time" if not pre-calculated
            totalEntries: totalEntries, 
            goldSales: 0, 
            silverSales: 0, 
            customersThisMonth: 0, 
            customersLastMonth: 0, 
            thisMonthRevenue: 0, 
            lastMonthRevenue: 0 
        };

        const todayStr = now.toISOString().split('T')[0];
        const seenIds = new Set();

        const processEntry = (doc) => {
            if (seenIds.has(doc.id)) return;
            seenIds.add(doc.id);

            const entry = doc.data();
            const rev = entry.finalTotal || 0;
            if (!entry.date) return; // Skip entries without date
            
            const entryDate = new Date(entry.date);
            if (isNaN(entryDate.getTime())) return; // Skip invalid dates
            
            const eMonth = entryDate.getMonth();
            const eYear = entryDate.getFullYear();
            const eDateStr = (entry.date || '').split('T')[0];
            
            if (eDateStr === todayStr) stats.todayRevenue += rev;
            if (entry.itemType === 'Gold') stats.goldSales += rev;
            if (entry.itemType === 'Silver') stats.silverSales += rev;

            if (eMonth === currentMonth && eYear === currentYear) {
                stats.customersThisMonth++;
                stats.thisMonthRevenue += rev;
            } else if (eMonth === lastMonth && eYear === lastMonthYear) {
                stats.customersLastMonth++;
                stats.lastMonthRevenue += rev;
            }
        };

        subSnapshot.forEach(processEntry);
        rootSnapshot.forEach(processEntry);

        // Calculate growth percentage
        const customerGrowth = stats.customersLastMonth === 0 
            ? 0 
            : Math.round(((stats.customersThisMonth - stats.customersLastMonth) / stats.customersLastMonth) * 100);

        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const compareMonths = {
            current: `${monthNames[currentMonth]} ${currentYear}`,
            last: `${monthNames[lastMonth]} ${lastMonthYear}`
        };

        res.status(200).json({
            stats: { ...stats, customerGrowth },
            compareMonths
        });
    } catch (error) {
        console.error('Error fetching dashboard analytics:', error);
        res.status(500).json({ message: 'Failed to fetch analytics' });
    }
};

module.exports = {
    getDashboardAnalytics
};
