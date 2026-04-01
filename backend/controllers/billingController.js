const { db } = require('../config/firebase');

// @desc    Get all bills
// @route   GET /api/bills
// @access  Private
const getBills = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // HYBRID FETCH: Check both new sub-collection and old root collection
        const [subSnapshot, rootSnapshot] = await Promise.all([
            db.collection('users').doc(userId).collection('bills').get(),
            db.collection('bills').where('userId', '==', userId).get()
        ]);

        const bills = [];
        subSnapshot.forEach(doc => bills.push({ id: doc.id, ...doc.data() }));
        
        const subIds = new Set(bills.map(b => b.id));
        rootSnapshot.forEach(doc => {
            if (!subIds.has(doc.id)) {
                bills.push({ id: doc.id, ...doc.data() });
            }
        });

        res.status(200).json(bills);
    } catch (error) {
        console.error("Fetch Bills Error:", error);
        res.status(500).json({ message: 'Error fetching bills' });
    }
};

// @desc    Create new bill
// @route   POST /api/bills
// @access  Private
const createBill = async (req, res) => {
    try {
        const userId = req.user.id;
        const { customerName, mobile, items, subTotal, gst, discount, finalTotal, paymentMode } = req.body;

        if (!customerName || !items || items.length === 0) {
            return res.status(400).json({ message: 'Please add customer and items' });
        }

        // Generate sequential bill number for the user
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();
        const shopInitial = (userData?.shopName || 'G').charAt(0).toUpperCase();
        const yearYY = new Date().getFullYear().toString().slice(-2);
        
        const billSnapshot = await db.collection('users').doc(userId).collection('bills').get();
        const billCount = billSnapshot.size + 1;
        const billNumber = req.body.billNumber || `${shopInitial}${yearYY}${String(billCount).padStart(2, '0')}`;

        const billData = {
            userId,
            billNumber,
            customerName,
            mobile,
            items,
            subTotal: Number(subTotal),
            gst: Number(gst),
            discount: Number(discount),
            finalTotal: Number(finalTotal),
            paymentMode: paymentMode || 'cash',
            createdAt: new Date().toISOString()
        };

        const newBill = await db.collection('users').doc(userId).collection('bills').add(billData);

        // Note: Inventory deduction is deferred until hardware print is confirmed.
        res.status(201).json({ id: newBill.id, billNumber, customerName, finalTotal });
    } catch (error) {
        console.error("Billing Error", error);
        res.status(500).json({ message: 'Error creating bill' });
    }
};

// @desc    Get dashboard analytics
const getAnalytics = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Use Hybrid snapshots for accurate analytics across legacy and new data
        const [subSnapshot, rootSnapshot] = await Promise.all([
            db.collection('users').doc(userId).collection('bills').get(),
            db.collection('bills').where('userId', '==', userId).get()
        ]);

        let totalRevenue = 0;
        let totalBills = 0;
        const seenIds = new Set();

        const processDoc = (doc) => {
            if (seenIds.has(doc.id)) return;
            seenIds.add(doc.id);
            const data = doc.data();
            totalRevenue += (data.finalTotal || 0);
            totalBills += 1;
        };

        subSnapshot.forEach(processDoc);
        rootSnapshot.forEach(processDoc);

        const inventoryRef = db.collection('inventory');
        const invSnapshot = await inventoryRef.where('userId', '==', userId).get();

        res.status(200).json({
            totalRevenue,
            totalBills,
            totalItems: invSnapshot.size
        });
    } catch (error) {
        console.error("Analytics Error:", error);
        res.status(500).json({ message: 'Error loading analytics' });
    }
};

// @desc    Confirm Print and Deduct Inventory
// @route   POST /api/bills/:id/confirm-print
// @access  Private
const confirmPrint = async (req, res) => {
    try {
        const userId = req.user.id;
        const billId = req.params.id;

        const billRef = db.collection('users').doc(userId).collection('bills').doc(billId);
        const billDoc = await billRef.get();

        if (!billDoc.exists) {
            return res.status(404).json({ message: 'Bill not found' });
        }

        const billData = billDoc.data();
        if (billData.inventoryDeducted) {
            return res.status(200).json({ message: 'Inventory already deducted' });
        }

        const items = billData.items || [];
        const batch = db.batch();
        const inventoryRef = db.collection('inventory');

        for (const billedItem of items) {
            if (billedItem.inventoryId) {
                const itemDocRef = inventoryRef.doc(billedItem.inventoryId);
                const itemSnap = await itemDocRef.get();
                if (itemSnap.exists) {
                    batch.delete(itemDocRef);
                }
            }
        }

        // Mark as deducted
        batch.update(billRef, { inventoryDeducted: true });
        
        await batch.commit();

        res.status(200).json({ message: 'Inventory deducted successfully' });
    } catch (error) {
        console.error("Confirm Print Error", error);
        res.status(500).json({ message: 'Error confirming print' });
    }
};

module.exports = {
    getBills,
    createBill,
    getAnalytics,
    confirmPrint
};
