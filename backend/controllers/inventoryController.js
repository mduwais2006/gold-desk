const { db } = require('../config/firebase');

// @desc    Get user inventory
// @route   GET /api/inventory
// @access  Private
const getInventory = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // HYBRID FETCH: Legacy root + New sub-collection
        const [subSnapshot, rootSnapshot] = await Promise.all([
            db.collection('users').doc(userId).collection('inventory').get(),
            db.collection('inventory').where('userId', '==', userId).get()
        ]);

        const items = [];
        subSnapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
        
        const seenIds = new Set(items.map(i => i.id));
        rootSnapshot.forEach(doc => {
            if (!seenIds.has(doc.id)) {
                items.push({ id: doc.id, ...doc.data() });
            }
        });

        res.status(200).json(items);
    } catch (error) {
        console.error("Inventory Fetch Error:", error);
        res.status(500).json({ message: 'Error fetching inventory' });
    }
};

// @desc    Add new item
// @route   POST /api/inventory
// @access  Private
const addItem = async (req, res) => {
    try {
        const userId = req.user.id;
        const { itemName, category, metalType, weight, price } = req.body;

        if (!itemName || !weight || !price) {
            return res.status(400).json({ message: 'Please add all required fields' });
        }

        const itemData = {
            userId,
            itemName,
            category,
            metalType,
            weight: Number(weight),
            price: Number(price),
            createdAt: new Date().toISOString()
        };

        const newItem = await db.collection('users').doc(userId).collection('inventory').add(itemData);

        res.status(201).json({ id: newItem.id, ...itemData });
    } catch (error) {
        console.error("Add Item Error:", error);
        res.status(500).json({ message: 'Error adding item' });
    }
};

// @desc    Update item
// @route   PUT /api/inventory/:id
// @access  Private
const updateItem = async (req, res) => {
    try {
        const userId = req.user.id;
        const itemRef = db.collection('users').doc(userId).collection('inventory').doc(req.params.id);
        const doc = await itemRef.get();

        if (!doc.exists) {
            // Try legacy root
            const rootRef = db.collection('inventory').doc(req.params.id);
            const rootDoc = await rootRef.get();
            if (rootDoc.exists && rootDoc.data().userId === userId) {
                await rootRef.update(req.body);
                const updated = await rootRef.get();
                return res.status(200).json({ id: updated.id, ...updated.data() });
            }
            return res.status(404).json({ message: 'Item not found' });
        }

        await itemRef.update(req.body);
        const updatedDoc = await itemRef.get();
        res.status(200).json({ id: updatedDoc.id, ...updatedDoc.data() });
    } catch (error) {
        res.status(500).json({ message: 'Error updating item' });
    }
};

// @desc    Delete item
// @route   DELETE /api/inventory/:id
// @access  Private
const deleteItem = async (req, res) => {
    try {
        const userId = req.user.id;
        const itemRef = db.collection('users').doc(userId).collection('inventory').doc(req.params.id);
        const doc = await itemRef.get();

        if (doc.exists) {
            await itemRef.delete();
            return res.status(200).json({ id: req.params.id });
        }

        // Try legacy root
        const rootRef = db.collection('inventory').doc(req.params.id);
        const rootDoc = await rootRef.get();
        if (rootDoc.exists && rootDoc.data().userId === userId) {
            await rootRef.delete();
            return res.status(200).json({ id: req.params.id });
        }

        res.status(404).json({ message: 'Item not found' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting item' });
    }
};

module.exports = {
    getInventory,
    addItem,
    updateItem,
    deleteItem
};
