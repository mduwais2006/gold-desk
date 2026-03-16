const express = require('express');
const router = express.Router();
const { getDataEntries, createDataEntry, deleteDataEntry, bulkDeleteDataEntries } = require('../controllers/dataEntryController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getDataEntries)
    .post(protect, createDataEntry);

router.route('/bulk-delete')
    .post(protect, bulkDeleteDataEntries);

router.route('/:id')
    .delete(protect, deleteDataEntry);

module.exports = router;
