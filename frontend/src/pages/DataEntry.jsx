import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import { toast } from 'react-toastify';
import api from '../utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { exportToExcel, generateReportsPdf, generateInvoicePdf } from '../utils/exportUtils';
import { printReceiptBluetooth } from '../utils/printerUtils';
import { useAuth } from '../context/AuthContext';
import { usePrinter } from '../context/PrinterContext';
import { getAppTime } from '../utils/timeUtils';
import LoadingSequence from '../components/LoadingSequence';
import Receipt from '../components/Receipt';
import SuggestionDropdown from '../components/SuggestionDropdown';
import Swal from 'sweetalert2';


const getCurrentDateTimeLocal = () => {
    const now = getAppTime();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 19);
};

const DataEntry = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { connectedDevice, setConnectedDevice, isPrinterActive, setIsPrinterActive, reconnectDevice } = usePrinter();
    const [activeTab, setActiveTab] = useState('entry'); // 'entry' or 'reports'
    const formRef = React.useRef(null);

    // Automatic smooth scroll to form on entry
    useEffect(() => {
        if (activeTab === 'entry' && formRef.current) {
            formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [activeTab]);
    const [isReportsLoading, setIsReportsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState(null);
    const [printData, setPrintData] = useState(null);

    // Calculator / Entry State
    const [formData, setFormData] = useState({
        date: getCurrentDateTimeLocal(),
        billNumber: location?.state?.billNumber || '',
        customerName: location?.state?.customerName || '',
        mobile: location?.state?.mobile || '',
        itemType: 'Gold',
        itemName: 'Chain',
        grams: '',
        ratePerGram: '',
        negotiableAmount: '',
        gstPercentage: user?.gstEnabled ? (user?.gstPercentage || 3) : '',
        customItemName: '',
        staffName: ''
    });

    // Auto-fill from billing draft if available on mount (DISABLED per user request to avoid persistent data on refresh)
    useEffect(() => {
        // Only load if explicitly needed, but user wants clean state on refresh after clear
        // const draft = JSON.parse(localStorage.getItem('billingFormDraft') || 'null');
        // if (draft && draft.customerName) {
        //     setFormData(prev => ({ ...prev, customerName: draft.customerName, mobile: draft.mobile || '' }));
        // }
    }, []);

    const itemTypes = ['Gold', 'Silver', 'Platinum', 'Diamond', 'Other'];
    const jewelryItems = ['Chain', 'Necklace', 'Ring', 'Earring', 'Bracelet', 'Bangle', 'Pendant', 'Coin', 'Other'];

    // Real-time GST Mapping Engine (Simulates Live tracking for distinct materials)
    const getLiveGstRate = (material, itemName) => {
        // Precise Specification: Bullion/Coins vs Jewelry vs Accessories
        if (itemName === 'Coin') return 3; // Standard for investment products
        
        const rates = {
            'Gold': 3,
            'Silver': 3,
            'Platinum': 3,
            'Diamond': 3,
            'Other': 18 
        };
        return rates[material] || 3;
    };

    // Derived calculations
    const totalMoney = useMemo(() => {
        const t = (Number(formData.grams) || 0) * (Number(formData.ratePerGram) || 0);
        return t;
    }, [formData.grams, formData.ratePerGram]);

    const finalTotal = useMemo(() => {
        const afterDiscount = totalMoney - (Number(formData.negotiableAmount) || 0);
        const gstRate = Number(formData.gstPercentage) || 0;
        const gstAmount = (afterDiscount * gstRate) / 100;
        return afterDiscount + gstAmount;
    }, [totalMoney, formData.negotiableAmount, formData.gstPercentage, user?.gstEnabled]);

    // Reports & Filtering State
    const [reports, setReports] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [activeSuggestionField, setActiveSuggestionField] = useState(null);

    const { uniqueCustomers, uniqueStaff, uniqueItems } = useMemo(() => {
        const custMap = new Map();
        const staffSet = new Set();
        const itemSet = new Set();

        reports.forEach(r => {
            if (r.customerName && r.mobile && !custMap.has(r.mobile)) {
                custMap.set(r.mobile, { name: r.customerName, mobile: r.mobile });
            }
            if (r.staffName) staffSet.add(r.staffName);
            if (r.itemName) itemSet.add(r.itemName);
        });

        const custArr = Array.from(custMap.values());
        const staffArr = Array.from(staffSet);
        const itemsArr = Array.from(itemSet);

        localStorage.setItem('cachedCustomers', JSON.stringify(custArr));
        localStorage.setItem('cachedStaff', JSON.stringify(staffArr));
        localStorage.setItem('cachedItems', JSON.stringify(itemsArr));
        
        return { 
            uniqueCustomers: custArr, 
            uniqueStaff: staffArr, 
            uniqueItems: itemsArr 
        };
    }, [reports]);

    const commonGstRates = [3, 0, 5, 12, 18, 28];

    const [filters, setFilters] = useState({
        searchDate: '',
        searchTime: '',
        searchMonth: '', // format "01", "02", etc
        searchYear: new Date().getFullYear().toString(),
        searchQuery: ''  // live search by customer name / mobile
    });


    useEffect(() => {
        // Fast parallel fetch to prevent UI blocking
        if (!formData.billNumber) fetchNextBillNumber();
        
        // Instant Load: Load from cache first if available
        const cached = localStorage.getItem('cachedReports');
        if (cached) {
            try {
                setReports(JSON.parse(cached));
            } catch (e) {}
        }
        
        fetchReports();
    }, []);

    const fetchNextBillNumber = async () => {
        try {
            const res = await api.get('/data-entry/next-bill');
            setFormData(prev => ({ ...prev, billNumber: res.data.billNumber }));
        } catch (error) {
            console.error('Failed to quick-fetch next bill number');
        }
    };

    const fetchReports = async (silent = true) => {
        try {
            // Only show loader if we have no data at all (first load)
            if (reports.length === 0) setIsReportsLoading(true);
            
            const res = await api.get('/data-entry');
            setReports(res.data);
            
            // Update cache (limit to 50 for speed)
            localStorage.setItem('cachedReports', JSON.stringify(res.data.slice(0, 50)));
        } catch (error) {
            console.error('Failed to fetch reports:', error);
            if (!silent) toast.error('Failed to fetch reports');
        } finally {
            setIsReportsLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        
        // Auto-update GST when Item Type (Material) or Item Name changes
        if ((name === 'itemType' || name === 'itemName') && user?.gstEnabled) {
            const nextMaterial = name === 'itemType' ? value : formData.itemType;
            const nextItem = name === 'itemName' ? value : formData.itemName;
            setFormData(prev => ({ 
                ...prev, 
                [name]: value,
                gstPercentage: getLiveGstRate(nextMaterial, nextItem)
            }));
        } else {
            setFormData({ ...formData, [name]: value });
        }

        // Custom Autocomplete Engine
        if (localStorage.getItem('disableAutocomplete') === 'true') {
            setSuggestions([]);
            return;
        }

        if (name === 'customerName' || name === 'mobile') {
            const query = value.toLowerCase();
            if (name === 'customerName') {
                setSuggestions(uniqueCustomers.filter(c => !query || c.name.toLowerCase().includes(query)).map(c => ({ label: c.name, subLabel: `📱 ${c.mobile}`, ...c })).slice(0, 5));
            } else {
                setSuggestions(uniqueCustomers.filter(c => !query || c.mobile.includes(query)).map(c => ({ label: c.mobile, subLabel: `👤 ${c.name}`, ...c })).slice(0, 5));
            }
            setActiveSuggestionField(name);
        } else if (name === 'staffName') {
            const query = value.toLowerCase();
            setSuggestions(uniqueStaff.filter(s => !query || s.toLowerCase().includes(query)).map(s => ({ label: s, value: s })).slice(0, 5));
            setActiveSuggestionField('staffName');
        } else if (name === 'itemName') {
            const query = value.toLowerCase();
            setSuggestions(uniqueItems.filter(i => !query || i.toLowerCase().includes(query)).map(i => ({ label: i, value: i })).slice(0, 5));
            setActiveSuggestionField('itemName');
        } else if (name === 'gstPercentage') {
            const query = value;
            setSuggestions(commonGstRates.filter(r => !query || r.toString().startsWith(query)).map(r => ({ label: `${r}%`, value: r })).slice(0, 5));
            setActiveSuggestionField('gstPercentage');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setIsSaving(true);
            const finalItemName = formData.itemName === 'Other' && formData.customItemName ? formData.customItemName : formData.itemName;

            const payload = {
                ...formData,
                billNumber: formData.billNumber,
                itemName: finalItemName,
                totalAmount: Number(totalMoney),
                gstPercentage: Number(formData.gstPercentage) || 0,
                finalTotal: Number(finalTotal)
            };
            const res = await api.post('/data-entry', payload);
            toast.success('Entry saved to reports!');

            // Update local state instantly so the user doesn't need to refresh to see the change
            setReports(prevReports => [res.data, ...prevReports]);

            // Save to localStorage for auto-filling in Billing section
            let pendingItems = JSON.parse(localStorage.getItem('pendingBillingItems') || '[]');
            pendingItems.push({
                itemName: `${formData.itemType} - ${finalItemName}`,
                weight: formData.grams || 0,
                ratePerGram: formData.ratePerGram || 0,
                price: Number(finalTotal),
                gst: Number(formData.gstPercentage) || 0
            });
            localStorage.setItem('pendingBillingItems', JSON.stringify(pendingItems));

            // Pass customer details for seamless billing continuation
            if (formData.customerName || formData.mobile || formData.billNumber) {
                localStorage.setItem('pendingCustomerDetails', JSON.stringify({
                    customerName: formData.customerName,
                    mobile: formData.mobile,
                    billNumber: formData.billNumber
                }));
            }

            // Do NOT remove billingFormDraft here, because the user might be building a multi-item bill
            // localStorage.removeItem('billingFormDraft'); 
            
            setFormData(prev => {
                return {
                    ...prev,
                    date: getCurrentDateTimeLocal(),
                    // Keep billNumber, customerName, and mobile for potential multi-item bill
                    itemType: 'Gold',
                    itemName: 'Chain',
                    grams: '',
                    ratePerGram: '',
                    negotiableAmount: '',
                    gstPercentage: user?.gstEnabled ? (user?.gstPercentage || 3) : '',
                    customItemName: ''
                };
            });
        } catch (error) {
            toast.error('Failed to save entry');
        } finally {
            setIsSaving(false);
        }
    };

    const handleClearForm = () => {
        setFormData({
            date: getCurrentDateTimeLocal(),
            billNumber: '', 
            customerName: '',
            mobile: '',
            itemType: 'Gold',
            itemName: 'Chain',
            grams: '',
            ratePerGram: '',
            negotiableAmount: '',
            gstPercentage: user?.gstEnabled ? (user?.gstPercentage || 3) : '',
            customItemName: '',
            staffName: ''
        });
        fetchNextBillNumber(); // Refresh for the next session
        localStorage.removeItem('billingFormDraft');
        localStorage.removeItem('pendingBillingItems');
        localStorage.removeItem('pendingCustomerDetails');
        toast.info('Form cleared and session wiped');
    };

    const reportsCutoffDate = useMemo(() => {
        const d = getAppTime();
        d.setMonth(d.getMonth() - 6);
        return d;
    }, []);

    const filteredReports = useMemo(() => {
        return reports.filter(r => {
            const dateObj = new Date(r.date);
            // Strictly show only last 6 months of data
            if (dateObj < reportsCutoffDate) return false;

            const matchesDate = !filters.searchDate || r.date.startsWith(filters.searchDate);
            const matchesTime = !filters.searchTime || r.date.includes(filters.searchTime);
            const matchesMonth = !filters.searchMonth || (dateObj.getMonth() + 1).toString().padStart(2, '0') === filters.searchMonth;
            const matchesYear = !filters.searchYear || dateObj.getFullYear().toString() === filters.searchYear;
            
            const query = filters.searchQuery.toLowerCase();
            const matchesQuery = !query || 
                (r.customerName || '').toLowerCase().includes(query) || 
                (r.mobile || '').includes(query) ||
                (r.billNumber || '').toLowerCase().includes(query);

            return matchesDate && matchesTime && matchesMonth && matchesYear && matchesQuery;
        });
    }, [reports, filters, reportsCutoffDate]);

    const handleBulkDelete = async () => {
        if (!filters.searchMonth && !filters.searchYear) {
            return toast.warning('Please select at least Month or Year to delete records');
        }

        const dateDesc = filters.searchMonth && filters.searchYear 
            ? `for ${new Date(0, filters.searchMonth - 1).toLocaleString('default', { month: 'long' })} ${filters.searchYear}`
            : filters.searchMonth 
                ? `for ${new Date(0, filters.searchMonth - 1).toLocaleString('default', { month: 'long' })} (all years)`
                : `for all months in ${filters.searchYear}`;

        // Verify if there are actually any records to delete
        const targetRecords = reports.filter(r => {
            const dateObj = new Date(r.date);
            const mMatch = !filters.searchMonth || (dateObj.getMonth() + 1).toString().padStart(2, '0') === filters.searchMonth;
            const yMatch = !filters.searchYear || dateObj.getFullYear().toString() === filters.searchYear;
            return mMatch && yMatch;
        });

        if (targetRecords.length === 0) {
            return Swal.fire({
                title: 'No Records to Delete',
                text: `There are zero records ${dateDesc}.`,
                icon: 'info',
                confirmButtonColor: 'var(--accent-primary)',
                backdrop: `rgba(0,0,0,0.6)`
            });
        }

        const result = await Swal.fire({
            title: 'Delete All Records?',
            html: `Are you sure you want to <b>PERMANENTLY DELETE ALL</b> records ${dateDesc}?<br><br><span class="text-danger small">This action cannot be undone.</span>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Yes, Delete All',
            cancelButtonText: 'Cancel',
            backdrop: `rgba(0,0,0,0.6)`
        });

        if (!result.isConfirmed) return;

        try {
            setIsSaving(true);
            const res = await api.post('/data-entry/bulk-delete', {
                month: filters.searchMonth,
                year: filters.searchYear
            });
            toast.success(res.data.message);
            fetchReports(); // Refresh list
        } catch (error) {
            toast.error(error.response?.data?.message || 'Bulk delete failed');
        } finally {
            setIsSaving(false);
        }
    };
    
    // Calculate total revenue for the filtered set
    const totalRevenue = filteredReports.reduce((sum, r) => sum + (r.finalTotal || 0), 0);

    const getExportData = () => {
        return filteredReports.map(item => ({
            'Date': new Date(item.date).toLocaleDateString(),
            'Time': new Date(item.date).toLocaleTimeString(),
            'Bill Number': item.billNumber || '-',
            'Customer': item.customerName || '-',
            'Staff': item.staffName || '-',
            'Mobile': item.mobile || '-',
            'Item Type': item.itemType || '-',
            'Item Name': item.itemName || '-',
            'Weight (g)': item.grams || '-',
            'Rate/g (₹)': item.ratePerGram || '-',
            'Discount (₹)': item.negotiableAmount || '0',
            'GST (%)': item.gstPercentage || '0',
            'GST Amount (₹)': item.gstPercentage ? Math.round(Number(item.finalTotal) * (Number(item.gstPercentage) / (100 + Number(item.gstPercentage)))) : '0',
            'Final Total (₹)': item.finalTotal || '-'
        }));
    };

    const getExportFilename = () => {
        let filename = 'Jewelry_Report';
        if (filters.searchMonth && filters.searchYear) {
            const monthObj = months.find(m => m.val === filters.searchMonth);
            filename += `_${monthObj?.label || filters.searchMonth}_${filters.searchYear}`;
        } else if (filters.searchYear) {
            filename += `_${filters.searchYear}`;
        }
        return filename;
    };

    const handleExportExcelLocal = () => {
        if (filteredReports.length === 0) return toast.warning('No data to export for this period.');
        try {
            exportToExcel(getExportData(), getExportFilename());
            toast.success('Spreadsheet Successfully Downloaded to Device! 📊');
        } catch (error) {
            console.error(error);
            toast.error('Failed to generate Excel securely.');
        }
    };

    const handleExportPdfLocal = () => {
        if (filteredReports.length === 0) return toast.warning('No data to export for this period.');
        try {
            generateReportsPdf(getExportData(), getExportFilename(), {
                name: user?.shopName,
                address: user?.shopAddress
            });
            toast.success('Professional PDF Generated on Device! 📑');
        } catch (error) {
            console.error(error);
            toast.error('Failed to generate Secure PDF.');
        }
    };

    const handleHardwarePrintRow = async (entry) => {
        try {
            toast.info('Preparing bill...', { autoClose: 1000 });

            // Reformat data structure into Billing Format for the translator
            const payload = {
                billNumber: entry.billNumber,
                customerName: entry.customerName || 'Quick Entry Mode',
                mobile: entry.mobile || 'N/A',
                subTotal: entry.finalTotal + Number(entry.negotiableAmount || 0) - ((entry.finalTotal + Number(entry.negotiableAmount || 0)) * (entry.gstPercentage || 0) / (100 + (entry.gstPercentage || 0))),
                gst: (entry.finalTotal + Number(entry.negotiableAmount || 0)) * (entry.gstPercentage || 0) / (100 + (entry.gstPercentage || 0)),
                discount: Number(entry.negotiableAmount || 0),
                finalTotal: entry.finalTotal,
                paymentMode: 'DATA ENTRY',
                gstPercentage: entry.gstPercentage || 0,
                items: [{
                    itemName: `${entry.itemType} - ${entry.itemName}`,
                    weight: entry.grams,
                    ratePerGram: entry.ratePerGram,
                    price: entry.finalTotal + Number(entry.negotiableAmount || 0)
                }],
                shopDetails: {
                    name: user?.shopName,
                    address: user?.shopAddress
                }
            };

            let printedOnHardware = false;
            try {
                let activePrinter = connectedDevice;
                
                if (!activePrinter && isPrinterActive && navigator.bluetooth) {
                    activePrinter = await reconnectDevice();
                }

                if (activePrinter) {
                    toast.info('Sending single entry to hardware printer...', { autoClose: 1000 });
                    await printReceiptBluetooth(activePrinter, payload);
                    printedOnHardware = true;
                }
            } catch (printErr) {
                console.error("Hardware print failed:", printErr);
                toast.error(printErr.message || "Bluetooth printer unresponsive.");
            }

            // ----------------------------------------------------
            // BROWSER PRINT ENGINE (RESPONSIVE HTML)
            // ----------------------------------------------------
            setPrintData(payload);
            setTimeout(() => {
                window.print();
            }, 500);

            // Always generate a digital PDF as fallback
            await generateInvoicePdf(payload);

            if (printedOnHardware) {
                toast.success('Bill Generated & Printed Successfully! 📠');
            } else {
                toast.success('Digital Bill Generated Successfully! 📑');
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate bill.");
        }
    };

    const handleDeleteEntry = (id) => {
        setDeleteTargetId(id);
    };

    const confirmDeleteEntry = async () => {
        if (!deleteTargetId) return;
        try {
            setIsSaving(true);
            await api.delete(`/data-entry/${deleteTargetId}`);
            setReports(reports.filter(r => r.id !== deleteTargetId));
            toast.success('Data deleted permanently. 🗑️');
        } catch (error) {
            console.error(error);
            toast.error('Failed to securely delete this data.');
        } finally {
            setIsSaving(false);
            setDeleteTargetId(null);
        }
    };

    const months = [
        { val: '', label: 'All Months' },
        { val: '01', label: 'January' }, { val: '02', label: 'February' },
        { val: '03', label: 'March' }, { val: '04', label: 'April' },
        { val: '05', label: 'May' }, { val: '06', label: 'June' },
        { val: '07', label: 'July' }, { val: '08', label: 'August' },
        { val: '09', label: 'September' }, { val: '10', label: 'October' },
        { val: '11', label: 'November' }, { val: '12', label: 'December' }
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

    return (
        <div className="d-flex min-vh-100 theme-colorful">

            <Sidebar />
            <div className="main-content flex-grow-1">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2 className="fw-bold m-0 animate-fade-in shadow-sm-text">Data Entry</h2>
                    <div className="btn-group shadow-sm rounded-3">
                        <button
                            className={`btn ${activeTab === 'entry' ? 'btn-gold' : 'btn-light border text-secondary'}`}
                            onClick={() => setActiveTab('entry')}
                            style={{ padding: '0.7rem 2rem', borderRadius: 'var(--radius-sm) 0 0 var(--radius-sm)' }}
                        >
                            ➕ New Entry
                        </button>
                        <button
                            className={`btn ${activeTab === 'reports' ? 'btn-gold' : 'btn-light border text-secondary'}`}
                            onClick={() => setActiveTab('reports')}
                            style={{ padding: '0.7rem 2rem', borderRadius: '0 var(--radius-sm) var(--radius-sm) 0' }}
                        >
                            📜 View Reports
                        </button>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {activeTab === 'entry' && (
                        <motion.div
                            key="entry"
                            initial={{ opacity: 0, scale: 0.99 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.99 }}
                            transition={{ duration: 0.2 }}
                            className="row justify-content-center px-2"
                        >
                            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                            {/* Policy Banner */}
                            <div className="alert alert-info border-0 shadow-sm d-flex align-items-center gap-3 mb-4 rounded-4 py-3" style={{ background: 'rgba(13, 110, 253, 0.1)', color: 'var(--text-primary)', borderLeft: '5px solid #0d6efd !important' }}>
                                <div className="fs-3">💡</div>
                                <div>
                                    <h6 className="fw-bold mb-1">Important Data Policy</h6>
                                    <p className="small mb-0 opacity-75">
                                        The report section displays only the <strong>last 6 months</strong> of data for performance. 
                                        Please ensure you <strong>export your data month-wise</strong> to Excel or PDF for permanent record keeping.
                                    </p>
                                </div>
                            </div>
                            </motion.div>

                            <div className="col-xl-8 col-lg-10 animate-fade-in text-start" ref={formRef}>
                                    <motion.div 
                                        initial={{ opacity: 0, y: -10 }} 
                                        animate={{ opacity: 1, y: 0 }}
                                        className="alert bg-success-subtle border-0 py-2 px-3 small rounded-pill d-inline-flex align-items-center gap-2 mb-3 shadow-sm"
                                    >
                                        <span className="spinner-grow spinner-grow-sm text-success" style={{ width: '0.6rem', height: '0.6rem' }}></span>
                                        <span className="fw-bold text-success" style={{ fontSize: '0.7rem' }}>LIVE GST API: Connected</span>
                                        <span className="text-secondary opacity-75" style={{ fontSize: '0.7rem' }}>| Gold/Silver Rate Synced (3.0%)</span>
                                    </motion.div>
                                <div className="glass-panel p-4 border-0 mb-4 shadow-lg">
                                     <h5 className="fw-bold mb-4 border-bottom pb-2 d-flex align-items-center gap-2">
                                        <span className="bg-warning-subtle p-2 rounded-3 text-warning fs-6">💎</span>
                                        Data Entry
                                    </h5>

                                    <form onSubmit={handleSubmit} autoComplete="off">
                                        <div className="row g-4">
                                            <div className="col-md-4 position-relative">
                                                <label className="form-label small fw-bold text-secondary">Customer Name <span className="text-muted fw-normal">(Optional)</span></label>
                                                <input type="text" name="customerName" value={formData.customerName} onChange={handleInputChange} onFocus={(e) => {
                                                    const val = e.target.value.toLowerCase();
                                                    setSuggestions(uniqueCustomers.filter(c => !val || c.name.toLowerCase().includes(val)).map(c => ({ label: c.name, subLabel: `📱 ${c.mobile}`, ...c })).slice(0, 5));
                                                    setActiveSuggestionField('customerName')
                                                }} onBlur={() => setTimeout(() => setActiveSuggestionField(null), 200)} className="form-control form-control-glass shadow-sm" placeholder="John Doe" autoComplete="one-time-code" />
                                                
                                                <SuggestionDropdown 
                                                    isVisible={activeSuggestionField === 'customerName'}
                                                    suggestions={suggestions}
                                                    title="Past Customers"
                                                    onCancel={() => setActiveSuggestionField(null)}
                                                    onSelect={(s) => {
                                                        setFormData(prev => ({ ...prev, customerName: s.name, mobile: s.mobile }));
                                                        setActiveSuggestionField(null);
                                                    }}
                                                    renderItem={(s) => (
                                                        <>
                                                            <div className="fw-bold text-dark">{s.label}</div>
                                                            <div className="small text-secondary fw-semibold">{s.subLabel}</div>
                                                        </>
                                                    )}
                                                />
                                            </div>

                                            <div className="col-md-4 position-relative">
                                                <label className="form-label small fw-bold text-secondary">Mobile <span className="text-muted fw-normal">(Optional)</span></label>
                                                <input type="tel" name="mobile" value={formData.mobile} onChange={handleInputChange} onFocus={(e) => {
                                                    const val = e.target.value;
                                                    setSuggestions(uniqueCustomers.filter(c => !val || c.mobile.includes(val)).map(c => ({ label: c.mobile, subLabel: `👤 ${c.name}`, ...c })).slice(0, 5));
                                                    setActiveSuggestionField('mobile')
                                                }} onBlur={() => setTimeout(() => setActiveSuggestionField(null), 200)} className="form-control form-control-glass shadow-sm" placeholder="+91" autoComplete="one-time-code" />
                                                
                                                <SuggestionDropdown 
                                                    isVisible={activeSuggestionField === 'mobile'}
                                                    suggestions={suggestions}
                                                    title="By Mobile"
                                                    onCancel={() => setActiveSuggestionField(null)}
                                                    onSelect={(s) => {
                                                        setFormData(prev => ({ ...prev, customerName: s.name, mobile: s.mobile }));
                                                        setActiveSuggestionField(null);
                                                    }}
                                                    renderItem={(s) => (
                                                        <>
                                                            <div className="fw-bold text-dark">{s.label}</div>
                                                            <div className="small text-secondary fw-semibold">{s.subLabel}</div>
                                                        </>
                                                    )}
                                                />
                                            </div>
                                            <div className="col-md-4">
                                                <label className="form-label small fw-bold text-secondary">Transaction Date & Time</label>
                                                <input type="datetime-local" step="1" name="date" value={formData.date} onChange={handleInputChange} className="form-control form-control-glass" required autoComplete="off" />
                                            </div>
                                            <div className="col-md-4">
                                                <label className="form-label small fw-bold text-secondary">Bill Number</label>
                                                <input type="text" name="billNumber" value={formData.billNumber} onChange={handleInputChange} className="form-control form-control-glass fw-bold text-primary" placeholder="e.g. G26101" required autoComplete="off" />
                                            </div>
                                            <div className="col-md-4 position-relative">
                                                <label className="form-label small fw-bold text-secondary">Staff Name</label>
                                                <input type="text" name="staffName" value={formData.staffName} onChange={handleInputChange} onFocus={(e) => {
                                                    const val = e.target.value.toLowerCase();
                                                    setSuggestions(uniqueStaff.filter(s => !val || s.toLowerCase().includes(val)).map(s => ({ label: s, value: s })).slice(0, 5));
                                                    setActiveSuggestionField('staffName');
                                                }} onBlur={() => setTimeout(() => setActiveSuggestionField(null), 200)} className="form-control form-control-glass fw-bold" placeholder="Select Staff" required autoComplete="one-time-code" />
                                                
                                                <SuggestionDropdown 
                                                    isVisible={activeSuggestionField === 'staffName'}
                                                    suggestions={suggestions}
                                                    title="History / Employees"
                                                    onCancel={() => setActiveSuggestionField(null)}
                                                    onSelect={(s) => {
                                                        setFormData(prev => ({ ...prev, staffName: s.value }));
                                                        setActiveSuggestionField(null);
                                                    }}
                                                    renderItem={(s) => (
                                                        <div className="fw-bold text-dark text-uppercase">{s.label}</div>
                                                    )}
                                                />
                                            </div>
                                            <div className="col-md-4">
                                                <label className="form-label small fw-bold text-secondary">Item Type</label>
                                                <select name="itemType" value={formData.itemType} onChange={handleInputChange} className="form-select form-control-glass">
                                                    {itemTypes.map(item => <option key={item} value={item}>{item}</option>)}
                                                </select>
                                            </div>
                                            <div className="col-md-4 position-relative">
                                                <label className="form-label small fw-bold text-secondary">Item Name</label>
                                                <select name="itemName" value={formData.itemName} onChange={handleInputChange} className="form-select form-control-glass">
                                                    {jewelryItems.map(item => <option key={item} value={item}>{item}</option>)}
                                                </select>
                                                {formData.itemName === 'Other' && (
                                                    <>
                                                    <motion.input
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        type="text"
                                                        name="customItemName"
                                                        value={formData.customItemName}
                                                        onChange={handleInputChange}
                                                        onFocus={(e) => {
                                                            const val = e.target.value.toLowerCase();
                                                            setSuggestions(uniqueItems.filter(s => !val || s.toLowerCase().includes(val)).map(s => ({ label: s, value: s })).slice(0, 5));
                                                            setActiveSuggestionField('customItemName');
                                                        }}
                                                        onBlur={() => setTimeout(() => setActiveSuggestionField(null), 200)}
                                                        className="form-control form-control-glass mt-2 border-warning fw-bold text-warning"
                                                        placeholder="Enter item name manually..."
                                                        required
                                                        autoComplete="one-time-code"
                                                    />
                                                    <SuggestionDropdown 
                                                        isVisible={activeSuggestionField === 'customItemName'}
                                                        suggestions={suggestions}
                                                        title="Recent Items"
                                                        onCancel={() => setActiveSuggestionField(null)}
                                                        onSelect={(s) => {
                                                            setFormData(prev => ({ ...prev, customItemName: s.value }));
                                                            setActiveSuggestionField(null);
                                                        }}
                                                        renderItem={(s) => (
                                                            <div className="fw-bold text-dark">{s.label}</div>
                                                        )}
                                                    />
                                                    </>
                                                )}
                                            </div>

                                            <div className="col-md-4">
                                                <label className="form-label small fw-bold text-secondary">Weight (Grams)</label>
                                                <div className="input-group">
                                                    <input type="number" step="0.001" name="grams" value={formData.grams} onChange={handleInputChange} className="form-control form-control-glass" placeholder="0.000" required autoComplete="off" />
                                                    <span className="input-group-text border-0 small">g</span>
                                                </div>
                                            </div>
                                            <div className="col-md-4">
                                                <label className="form-label small fw-bold text-secondary">Rate per Gram</label>
                                                <div className="input-group">
                                                    <span className="input-group-text border-0 small">₹</span>
                                                    <input type="number" name="ratePerGram" value={formData.ratePerGram} onChange={handleInputChange} className="form-control form-control-glass" placeholder="0" required autoComplete="off" />
                                                </div>
                                            </div>
                                            <div className="col-md-4">
                                                <label className="form-label small fw-bold text-secondary">Negotiable (Discount)</label>
                                                <div className="input-group">
                                                    <span className="input-group-text border-0 small">₹</span>
                                                    <input type="number" name="negotiableAmount" value={formData.negotiableAmount} onChange={handleInputChange} className="form-control form-control-glass text-danger fw-bold" placeholder="0" autoComplete="off" />
                                                </div>
                                            </div>

                                            <div className="col-md-4">
                                                <label className="form-label small fw-bold text-secondary">GST Percentage (%)</label>
                                                <div className="input-group">
                                                    <input type="number" name="gstPercentage" value={formData.gstPercentage} onChange={handleInputChange} className="form-control form-control-glass fw-bold text-primary" placeholder="0" autoComplete="off" />
                                                    <span className="input-group-text border-0 small">%</span>
                                                </div>
                                            </div>

                                            <div className="col-12 mt-4">
                                                <div className="p-4 rounded-4 border d-flex flex-wrap justify-content-between align-items-center gap-3">
                                                    <div>
                                                        <h6 className="text-secondary small mb-1 fw-bold">TOTAL AMOUNT</h6>
                                                        <h3 className="m-0 fw-bold">₹ {totalMoney.toLocaleString('en-IN')}</h3>
                                                    </div>
                                                    <div className="text-center">
                                                        <h6 className="text-primary small mb-1 fw-bold">GST PORTION ({formData.gstPercentage}%)</h6>
                                                        <h4 className="m-0 fw-bold">₹ {((totalMoney - (Number(formData.negotiableAmount) || 0)) * (Number(formData.gstPercentage) || 0) / 100).toLocaleString('en-IN')}</h4>
                                                    </div>
                                                    <div className="text-end">
                                                        <h6 className="text-warning small mb-1 fw-bold">FINAL PAYABLE <span className="text-muted">(Incl. GST)</span></h6>
                                                        <h2 className="m-0 text-success fw-bold">₹ {finalTotal.toLocaleString('en-IN')}</h2>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="col-12 d-flex gap-3 mt-4 flex-wrap">
                                                <button type="submit" className="btn btn-advanced flex-grow-1 py-3" disabled={isSaving}>
                                                    {isSaving ? 'Saving...' : '💾 Save Entry to Reports'}
                                                </button>
                                                <button type="button" onClick={handleClearForm} className="btn btn-outline-danger py-3 px-4 rounded-pill d-flex align-items-center gap-2">
                                                    🧹 Clear All
                                                </button>

                                                 <button type="button" onClick={() => {
                                                    // Proactive Fetch: Save current unsaved calculation to billing before moving
                                                    if (formData.grams && formData.ratePerGram) {
                                                        const finalItemName = formData.itemName === 'Other' && formData.customItemName ? formData.customItemName : formData.itemName;
                                                        const pendingItems = JSON.parse(localStorage.getItem('pendingBillingItems') || '[]');
                                                        const afterDiscount = totalMoney - (Number(formData.negotiableAmount) || 0);
                                                        pendingItems.push({
                                                            itemName: `${formData.itemType} - ${finalItemName}`,
                                                            weight: formData.grams || 0,
                                                            ratePerGram: formData.ratePerGram || 0,
                                                            price: Number(afterDiscount + (afterDiscount * (Number(formData.gstPercentage) || 0) / 100)),
                                                            gst: Number(formData.gstPercentage) || 0
                                                        });
                                                        localStorage.setItem('pendingBillingItems', JSON.stringify(pendingItems));
                                                    }
                                                    
                                                    // Push the *actual* current bill number (the one saved or currently being edited)
                                                    localStorage.setItem('pendingCustomerDetails', JSON.stringify({
                                                        customerName: formData.customerName,
                                                        mobile: formData.mobile,
                                                        billNumber: formData.billNumber,
                                                        staffName: formData.staffName
                                                    }));

                                                    navigate('/billing');
                                                }} className="btn btn-dark py-3 fw-bold px-4 rounded-pill shadow-sm d-flex align-items-center gap-2">
                                                    Go to Billing 🧾
                                                </button>
                                            </div>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'reports' && (
                        <motion.div
                            key="reports"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="glass-panel p-0 border-0 overflow-hidden shadow-lg"
                        >
                            <div className="p-4 border-bottom header-glass">
                                <div className="w-100">

                                    {/* Data Policy Notice */}
                                    <div className="alert border-0 py-2 px-3 small rounded-3 mb-4 d-flex align-items-center gap-2" style={{ background: 'rgba(234,179,8,0.08)', color: 'var(--text-secondary)', borderLeft: '4px solid var(--accent-primary)' }}>
                                        <span>📊 <strong>Report Data Policy:</strong> To maintain peak performance, the section displays transactions from the <strong>last 6 months only</strong>. Please export your reports month-wise for permanent offline storage.</span>
                                    </div>

                                    {/* Title */}
                                    <h5 className="fw-bold mb-3">🗂️ Filter Jewelry Records</h5>

                                    {/* Filter Grid */}
                                    <div className="p-3 rounded-4 mb-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                                        <div className="row g-3 align-items-end">
                                            <div className="col-12 col-md-6 col-lg-3">
                                                <label className="form-label small fw-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                                                    📅 Exact Date
                                                </label>
                                                <input
                                                    type="date"
                                                    className="form-control form-control-glass"
                                                    value={filters.searchDate}
                                                    onChange={e => setFilters({ ...filters, searchDate: e.target.value })}
                                                />
                                            </div>

                                            <div className="col-12 col-md-6 col-lg-2">
                                                <label className="form-label small fw-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                                                    🕒 Filter by Time
                                                </label>
                                                <input
                                                    type="time"
                                                    step="1"
                                                    className="form-control form-control-glass"
                                                    value={filters.searchTime}
                                                    onChange={e => setFilters({ ...filters, searchTime: e.target.value })}
                                                    title="Filter down to exact Hour / Minute / Second"
                                                />
                                            </div>

                                            <div className="col-6 col-md-6 col-lg-2">
                                                <label className="form-label small fw-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                                                    🗓️ Month
                                                </label>
                                                <select
                                                    className="form-select form-control-glass"
                                                    value={filters.searchMonth}
                                                    onChange={e => setFilters({ ...filters, searchMonth: e.target.value })}
                                                >
                                                    <option value="">All Months</option>
                                                    {months.map(m => m.val && <option key={m.val} value={m.val}>{m.label}</option>)}
                                                </select>
                                            </div>

                                            <div className="col-6 col-md-6 col-lg-2">
                                                <label className="form-label small fw-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                                                    📆 Year
                                                </label>
                                                <select
                                                    className="form-select form-control-glass"
                                                    value={filters.searchYear}
                                                    onChange={e => setFilters({ ...filters, searchYear: e.target.value })}
                                                >
                                                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                                                </select>
                                            </div>

                                            <div className="col-12 col-md-12 col-lg-3 d-flex flex-column flex-sm-row gap-2 mt-3 mt-lg-0">
                                                <button
                                                    className="btn btn-outline-danger flex-grow-1 d-flex align-items-center justify-content-center fw-bold py-2 shadow-sm"
                                                    onClick={() => setFilters({ searchDate: '', searchTime: '', searchMonth: '', searchYear: currentYear.toString(), searchQuery: '' })}
                                                    title="Reset All Filters"
                                                >
                                                    Reset
                                                </button>
                                                <button
                                                    className="btn btn-danger flex-grow-1 d-flex align-items-center justify-content-center gap-2 fw-bold py-2 shadow-sm"
                                                    onClick={handleBulkDelete}
                                                    title="Bulk Delete entries for selected month"
                                                >
                                                    🗑️  Delete All
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="d-flex flex-wrap align-items-center gap-3">
                                        <div className="flex-grow-1">
                                            <div className="d-flex align-items-center gap-3 search-premium-wrapper">
                                                <div className="search-icon-badge d-flex align-items-center justify-content-center flex-shrink-0" style={{ 
                                                    width: '52px', 
                                                    height: '52px', 
                                                    borderRadius: '16px', 
                                                    background: 'var(--bg-secondary)',
                                                    border: '2px solid var(--border-color)',
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                                                    transition: 'all 0.3s ease'
                                                }}>
                                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary opacity-75">
                                                        <circle cx="11" cy="11" r="8"></circle>
                                                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                                    </svg>
                                                </div>
                                                <input 
                                                    type="text" 
                                                    className="form-control form-control-advanced flex-grow-1 search-input-white-placeholder" 
                                                    placeholder="Search by Name, Mobile or Bill #..." 
                                                    value={filters.searchQuery}
                                                    onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                                                    style={{ 
                                                        height: '52px', 
                                                        borderRadius: '16px', 
                                                        background: 'var(--bg-input)',
                                                        border: '2px solid var(--border-color)',
                                                        fontSize: '1.05rem',
                                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                                                        transform: 'translateZ(0)', // Hardware acceleration
                                                        color: 'inherit'
                                                    }}
                                                />
                                                <style>{`
                                                    .search-input-white-placeholder::placeholder {
                                                        color: rgba(255, 255, 255, 0.85) !important;
                                                        opacity: 1 !important;
                                                    }
                                                    [data-theme="light"] .search-input-white-placeholder::placeholder {
                                                        color: #000000 !important;
                                                        opacity: 0.6 !important;
                                                    }
                                                `}</style>
                                            </div>
                                        </div>

                                        <div className="d-flex gap-2 ms-auto">
                                            <button
                                                className="btn btn-success px-4 fw-bold d-flex align-items-center gap-2 shadow-sm"
                                                onClick={handleExportExcelLocal}
                                                disabled={filteredReports.length === 0}
                                                style={{ borderRadius: 'var(--radius-md)' }}
                                            >
                                                <i className="bi bi-file-earmark-excel"></i> Excel
                                            </button>
                                            <button
                                                className="btn btn-outline-danger px-4 fw-bold rounded-pill d-flex align-items-center gap-2"
                                                onClick={handleExportPdfLocal}
                                                disabled={filteredReports.length === 0}
                                            >
                                                <i className="bi bi-file-earmark-pdf"></i> PDF
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Summary Stats */}
                            {filteredReports.length > 0 && (
                                <div className="stat-grid m-4 g-3">
                                    <div className="p-3 bg-light border-start border-primary border-4 rounded shadow-sm">
                                        <div className="small text-secondary fw-bold text-uppercase">Untaxed Subtotal</div>
                                        <div className="h4 m-0 fw-600">₹ {filteredReports.reduce((acc, r) => acc + (Number(r.finalTotal) / (1 + (Number(r.gstPercentage || 0) / 100))), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                                    </div>
                                    <div className="p-3 bg-light border-start border-warning border-4 rounded shadow-sm">
                                        <div className="small text-secondary fw-bold text-uppercase">Total Tax (GST)</div>
                                        <div className="h4 m-0 fw-600 text-primary">₹ {filteredReports.reduce((acc, r) => acc + (Number(r.finalTotal) * (Number(r.gstPercentage || 0) / (100 + Number(r.gstPercentage || 0)))), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                                    </div>
                                    <div className="p-3 bg-light border-start border-success border-4 rounded shadow-sm">
                                        <div className="small text-secondary fw-bold text-uppercase">Total Revenue</div>
                                        <div className="h4 m-0 fw-600 text-success">₹ {filteredReports.reduce((acc, r) => acc + (Number(r.finalTotal) || 0), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                                    </div>
                                </div>
                            )}

                            <div className="table-responsive">
                                <table className="table table-hover mb-0 align-middle">
                                    <thead className="thead-glass">
                                        <tr>
                                            <th className="px-4 py-3 text-start border-0">Bill # & Date</th>
                                            <th className="px-4 py-3 text-start border-0">Customer</th>
                                            <th className="px-4 py-3 text-start border-0">Staff</th>
                                            <th className="px-4 py-3 text-secondary small fw-bold text-uppercase tracking-tighter">Items</th>
                                            <th className="px-4 py-3 text-secondary small fw-bold text-uppercase tracking-tighter">Weight</th>
                                            <th className="px-4 py-3 text-secondary small fw-bold text-uppercase tracking-tighter">Rate/g</th>
                                            <th className="px-4 py-3 text-secondary small fw-bold text-uppercase tracking-tighter text-end">Subtotal (Net)</th>
                                            <th className="px-4 py-3 text-secondary small fw-bold text-uppercase tracking-tighter text-end">Tax (GST)</th>
                                            <th className="px-4 py-3 text-secondary small fw-bold text-uppercase tracking-tighter text-end">Grand Total</th>
                                            <th className="px-4 py-3 text-secondary small fw-bold text-uppercase tracking-tighter text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {isReportsLoading ? (
                                            <tr><td colSpan="10" className="text-center py-5">
                                                <LoadingSequence text="Fetching Historical Records..." />
                                            </td></tr>
                                        ) : filteredReports.length === 0 ? (

                                            <tr><td colSpan="10" className="text-center py-5 text-secondary">
                                                <h1 className="display-4 opacity-10">📂</h1>
                                                No records found matching these filters.
                                            </td></tr>
                                        ) : (
                                            filteredReports.map((entry, idx) => (
                                                <tr key={entry.id} className="align-middle" style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                    <td className="px-4 text-secondary small">
                                                        <div className="badge bg-gold-soft border border-gold-subtle mb-1 fw-bold fs-6" style={{ fontSize: '0.85rem', color: '#000000' }}>{entry.billNumber || 'NO-ID'}</div>
                                                        <div className="text-muted fw-bold">{new Date(entry.date).toLocaleDateString()}</div>
                                                        <div className="text-muted" style={{ fontSize: '0.7rem' }}>{new Date(entry.date).toLocaleTimeString()}</div>
                                                    </td>
                                                    <td className="fw-bold">{entry.customerName || '-'} <br /><span className="small text-secondary fw-normal">{entry.mobile}</span></td>
                                                    <td className="text-secondary small">{entry.staffName || '-'}</td>
                                                    <td className="fw-bold text-secondary">{entry.itemType} - {entry.itemName}</td>
                                                    <td>{entry.grams ? `${entry.grams} g` : '-'}</td>
                                                    <td>₹ {entry.ratePerGram ? entry.ratePerGram.toLocaleString() : '-'}</td>
                                                    <td className="px-4 text-end text-secondary fw-semibold">
                                                        ₹ {entry.finalTotal ? (Number(entry.finalTotal) / (1 + (Number(entry.gstPercentage || 0) / 100))).toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '-'}
                                                        {Number(entry.negotiableAmount) > 0 && <div className="text-danger" style={{ fontSize: '0.6rem' }}>(Inc. ₹{entry.negotiableAmount} Disc)</div>}
                                                    </td>
                                                    <td className="px-4 text-end">
                                                        <div className="text-primary fw-bold">₹ {entry.gstPercentage ? Math.round(Number(entry.finalTotal) * (Number(entry.gstPercentage) / (100 + Number(entry.gstPercentage)))).toLocaleString() : '0'}</div>
                                                        <div className="smaller text-muted" style={{ fontSize: '0.65rem' }}>@{entry.gstPercentage || 0}%</div>
                                                    </td>
                                                    <td className="px-4 text-end text-success fw-bolder fs-6">
                                                        ₹ {entry.finalTotal ? Number(entry.finalTotal).toLocaleString() : '-'}
                                                    </td>
                                                    <td className="px-3 text-center">
                                                        <div className="d-flex gap-2 justify-content-center">
                                                            <button
                                                                className="btn btn-sm btn-dark scale-hover px-3 shadow-sm"
                                                                onClick={() => handleHardwarePrintRow(entry)}
                                                                title="Generate Digital & Hardware Bill"
                                                            >
                                                                🧾
                                                            </button>
                                                            <button
                                                                className="btn btn-sm btn-outline-danger scale-hover px-2 shadow-sm"
                                                                onClick={() => handleDeleteEntry(entry.id)}
                                                                title="Delete Permanently"
                                                            >
                                                                🗑️
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                    {filteredReports.length > 0 && (
                                        <tfoot className="border-top-0">
                                            <tr className="fw-bold">
                                                <td colSpan="5" className="px-4 py-3 text-secondary">
                                                    TOTAL ENTRIES: <span className="badge bg-warning text-dark px-2 ms-2">{filteredReports.length}</span>
                                                </td>
                                                <td colSpan="2" className="px-4 py-3 text-secondary text-end">GRAND TOTALS:</td>
                                                <td className="px-4 py-3 text-end fw-bold">
                                                    <div className="text-primary small" style={{ fontSize: '0.75rem' }}>GST: ₹ {filteredReports.reduce((acc, r) => acc + (Number(r.finalTotal) * (Number(r.gstPercentage || 0) / (100 + Number(r.gstPercentage || 0)))), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                                                    <div className="text-success">Total: ₹ {totalRevenue.toLocaleString('en-IN')}</div>
                                                </td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <AnimatePresence>
                {deleteTargetId && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="modal-backdrop show" style={{ background: 'rgba(0,0,0,0.6)', zIndex: 1040 }} onClick={() => setDeleteTargetId(null)}
                    />
                )}
            </AnimatePresence>
            <AnimatePresence>
                {deleteTargetId && (
                    <motion.div
                        className="modal d-block"
                        tabIndex="-1"
                        style={{ zIndex: 1050 }}
                        initial={{ opacity: 0, scale: 0.9, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 30 }}
                        transition={{ type: "spring", bounce: 0.3, duration: 0.4 }}
                    >
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                                <div className="modal-header bg-danger bg-gradient text-white border-0 py-3">
                                    <h5 className="modal-title fw-bold m-0 d-flex align-items-center gap-2">
                                        <span className="bg-white text-danger px-2 rounded-2 small shadow-sm">!</span> Confirm Deletion
                                    </h5>
                                    <button type="button" className="btn-close btn-close-white" onClick={() => setDeleteTargetId(null)}></button>
                                </div>
                                <div className="modal-body p-4 text-center">
                                    <div className="mb-3">
                                        <motion.div 
                                            initial={{ rotate: 0 }} animate={{ rotate: [-10, 10, -10, 10, 0] }} transition={{ duration: 0.5, delay: 0.2 }}
                                            className="d-inline-block text-danger" style={{ fontSize: '3.5rem', filter: 'drop-shadow(0 4px 6px rgba(220, 53, 69, 0.3))' }}
                                        >
                                            🗑️
                                        </motion.div>
                                    </div>
                                    <h4 className="fw-bolder mb-2">Are you totally sure?</h4>
                                    <p className="text-secondary small m-0 px-3">This entry will be permanently deleted from the Firebase Cloud Database and cannot be recovered later.</p>
                                </div>
                                <div className="modal-footer border-0 p-3 bg-light d-flex justify-content-center gap-3">
                                    <button type="button" className="btn btn-secondary px-4 py-2 rounded-pill shadow-sm" onClick={() => setDeleteTargetId(null)}>Cancel & Keep It</button>
                                    <button type="button" className="btn btn-danger px-4 py-2 rounded-pill shadow-sm fw-bold d-flex align-items-center gap-2" onClick={confirmDeleteEntry} disabled={isSaving}>
                                        {isSaving ? <span className="spinner-border spinner-border-sm"></span> : 'Yes, Delete Permanently'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Hidden Receipt for Browser Printing */}
            <Receipt billData={printData} />
        </div>
    );
};

export default DataEntry;
