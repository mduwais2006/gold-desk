const express = require('express');
const router = express.Router();
const { getInventory, addItem, updateItem, deleteItem } = require('../controllers/inventoryController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getInventory)
    .post(protect, addItem);

router.route('/:id')
    .put(protect, updateItem)
    .delete(protect, deleteItem);

module.exports = router;
