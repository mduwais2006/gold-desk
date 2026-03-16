const { admin, db } = require('../config/firebase');

// @desc    Get all data entries for the user
// @route   GET /api/data-entry
// @access  Private
const getDataEntries = async (req, res) => {
    try {
        const userId = req.user.id;

        // HYBRID FETCH: Check both new sub-collection and old root collection for backward compatibility
        const [subSnapshot, rootSnapshot] = await Promise.all([
            db.collection('users').doc(userId).collection('dataEntries').get(),
            db.collection('dataEntries').where('userId', '==', userId).get()
        ]);

        let entries = [];
        subSnapshot.forEach(doc => entries.push({ id: doc.id, ...doc.data() }));
        
        // Add root items only if they don't already exist in sub-collection (avoid duplicates if partially migrated)
        const subIds = new Set(entries.map(e => e.id));
        rootSnapshot.forEach(doc => {
            if (!subIds.has(doc.id)) {
                entries.push({ id: doc.id, ...doc.data() });
            }
        });

        // Sort manually by date descending
        entries.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.status(200).json(entries);
    } catch (error) {
        console.error('Error fetching data entries:', error);
        res.status(500).json({ message: 'Failed to fetch data entries' });
    }
};

// @desc    Create a new data entry
// @route   POST /api/data-entry
// @access  Private
const createDataEntry = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            date,
            customerName,
            mobile,
            itemType,
            itemName,
            grams,
            ratePerGram,
            totalAmount,
            negotiableAmount,
            gstPercentage,
            finalTotal
        } = req.body;

        // Generate sequential bill number for the user
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();
        const shopInitial = (userData?.shopName || 'g').charAt(0).toLowerCase();
        const yearYY = new Date().getFullYear().toString().slice(-2);

        const entrySnapshot = await db.collection('users').doc(userId).collection('dataEntries').get();
        const entryCount = entrySnapshot.size + 1;
        const billNumber = req.body.billNumber || `${shopInitial}${yearYY}${String(entryCount).padStart(2, '0')}`;

        const newEntry = {
            userId,
            billNumber,
            date: date || new Date().toISOString(),
            customerName: customerName || '',
            mobile: mobile || '',
            itemType: itemType || 'Gold',
            itemName: itemName || 'Other',
            grams: Number(grams) || 0,
            ratePerGram: Number(ratePerGram) || 0,
            totalAmount: Number(totalAmount) || 0,
            negotiableAmount: Number(negotiableAmount) || 0,
            gstPercentage: Number(gstPercentage) || 0,
            finalTotal: Number(finalTotal) || 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        // Saving to Sub-collection as per new clean structure
        const docRef = await db.collection('users').doc(userId).collection('dataEntries').add(newEntry);

        res.status(201).json({ id: docRef.id, ...newEntry });
    } catch (error) {
        console.error('Error creating data entry:', error);
        res.status(500).json({ message: 'Failed to save data entry' });
    }
};

// @desc    Delete a data entry
// @route   DELETE /api/data-entry/:id
// @access  Private
const deleteDataEntry = async (req, res) => {
    try {
        const userId = req.user.id;
        const entryId = req.params.id;

        // Try deleting from sub-collection first
        const subRef = db.collection('users').doc(userId).collection('dataEntries').doc(entryId);
        const subDoc = await subRef.get();

        if (subDoc.exists) {
            await subRef.delete();
            return res.status(200).json({ message: 'Entry deleted from sub-collection', id: entryId });
        }

        // Try deleting from root collection (legacy data)
        const rootRef = db.collection('dataEntries').doc(entryId);
        const rootDoc = await rootRef.get();
        if (rootDoc.exists && rootDoc.data().userId === userId) {
            await rootRef.delete();
            return res.status(200).json({ message: 'Legacy entry deleted', id: entryId });
        }

        res.status(404).json({ message: 'Entry not found' });
    } catch (error) {
        console.error('Error deleting data entry:', error);
        res.status(500).json({ message: 'Failed to delete data entry' });
    }
};

// @desc    Bulk delete entries based on filters
// @route   POST /api/data-entry/bulk-delete
// @access  Private
const bulkDeleteDataEntries = async (req, res) => {
    try {
        const userId = req.user.id;
        const { dateRange, month, year } = req.body;
        let query = db.collection('users').doc(userId).collection('dataEntries');

        // Note: Simple bulk delete strategy - fetch IDs then batch delete
        const snapshot = await query.get();
        const batch = db.batch();
        let count = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            const entryDate = new Date(data.date);
            let shouldDelete = false;

            const monthMatches = !month || (entryDate.getMonth() + 1 === Number(month));
            const yearMatches = !year || (entryDate.getFullYear() === Number(year));

            if (monthMatches && yearMatches && (month || year)) {
                shouldDelete = true;
            }

            if (shouldDelete) {
                batch.delete(doc.ref);
                count++;
            }
        });

        if (count > 0) {
            await batch.commit();
        }

        res.status(200).json({ message: `Successfully deleted ${count} entries.`, count });
    } catch (error) {
        console.error('Bulk Delete Error:', error);
        res.status(500).json({ message: 'Failed to perform bulk deletion.' });
    }
};

module.exports = {
    getDataEntries,
    createDataEntry,
    deleteDataEntry,
    bulkDeleteDataEntries
};
