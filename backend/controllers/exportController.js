const os = require('os');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

exports.exportExcelFile = async (req, res) => {
    try {
        const { data, filename } = req.body;

        if (!data || data.length === 0) {
            return res.status(400).json({ message: 'No data provided to export' });
        }

        // Try to save to D:\ drive first (per user request), fallback to user Desktop
        const dDrivePath = 'D:\\GoldDesk_Excel_Reports';
        const desktopPath = path.join(os.homedir(), 'Desktop', 'GoldDesk_Excel_Reports');
        
        let targetDir = fs.existsSync('D:\\') ? dDrivePath : desktopPath;

        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        const finalFileName = `${filename || 'Jewelry_Report'}_${new Date().getTime()}.xlsx`;
        const filePath = path.join(targetDir, finalFileName);

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sales");

        XLSX.writeFile(workbook, filePath);

        res.status(200).json({ 
            message: `Excel successfully saved to: ${filePath}`, 
            filePath 
        });

    } catch (error) {
        console.error('Export Error:', error);
        res.status(500).json({ message: 'Failed to generate Excel file on the local machine.' });
    }
};
