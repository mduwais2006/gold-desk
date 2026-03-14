const express = require('express');
const router = express.Router();
const { getDataEntries, createDataEntry, deleteDataEntry } = require('../controllers/dataEntryController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getDataEntries)
    .post(protect, createDataEntry);

router.route('/:id')
    .delete(protect, deleteDataEntry);

module.exports = router;
