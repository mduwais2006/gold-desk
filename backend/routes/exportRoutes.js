const express = require('express');
const router = express.Router();
const { exportExcelFile } = require('../controllers/exportController');

router.post('/excel', exportExcelFile);

module.exports = router;
