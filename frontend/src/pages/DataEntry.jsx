import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import { toast } from 'react-toastify';
import api from '../utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { exportToExcel, generateReportsPdf } from '../utils/exportUtils';
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
    const { connectedDevice, isPrinterActive, reconnectDevice } = usePrinter();
    const [activeTab, setActiveTab] = useState('entry'); // 'entry' or 'reports'
    const formRef = React.useRef(null);

    useEffect(() => {
        if (activeTab === 'entry' && formRef.current && window.innerWidth > 768) {
            formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [activeTab]);

    const [isReportsLoading, setIsReportsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState(null);
    const [printData, setPrintData] = useState(null);

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

    const itemTypes = ['Gold', 'Silver', 'Platinum', 'Diamond', 'Other'];
    const jewelryItems = ['Chain', 'Necklace', 'Ring', 'Earring', 'Bracelet', 'Bangle', 'Pendant', 'Coin', 'Other'];

    const getLiveGstRate = (material, itemName) => {
        if (itemName === 'Coin') return 3;
        const rates = { 'Gold': 3, 'Silver': 3, 'Platinum': 3, 'Diamond': 3, 'Other': 18 };
        return rates[material] || 3;
    };

    const totalMoney = useMemo(() => (Number(formData.grams) || 0) * (Number(formData.ratePerGram) || 0), [formData.grams, formData.ratePerGram]);
    const finalTotal = useMemo(() => {
        const afterDiscount = totalMoney - (Number(formData.negotiableAmount) || 0);
        const gstRate = Number(formData.gstPercentage) || 0;
        return afterDiscount + (afterDiscount * gstRate) / 100;
    }, [totalMoney, formData.negotiableAmount, formData.gstPercentage]);

    const [reports, setReports] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [activeSuggestionField, setActiveSuggestionField] = useState(null);

    const { uniqueCustomers, uniqueStaff, uniqueItems } = useMemo(() => {
        const custMap = new Map();
        const staffSet = new Set();
        const itemSet = new Set();
        reports.forEach(r => {
            if (r.customerName && r.mobile && !custMap.has(r.mobile)) custMap.set(r.mobile, { name: r.customerName, mobile: r.mobile });
            if (r.staffName) staffSet.add(r.staffName);
            if (r.itemName) itemSet.add(r.itemName);
        });
        return { uniqueCustomers: Array.from(custMap.values()), uniqueStaff: Array.from(staffSet), uniqueItems: Array.from(itemSet) };
    }, [reports]);

    const commonGstRates = [3, 0, 5, 12, 18, 28];
    const [filters, setFilters] = useState({ searchDate: '', searchTime: '', searchMonth: '', searchYear: new Date().getFullYear().toString(), searchQuery: '' });

    useEffect(() => {
        if (!formData.billNumber) fetchNextBillNumber();
        fetchReports();
    }, []);

    const fetchNextBillNumber = async () => {
        try {
            const res = await api.get('/data-entry/next-bill');
            setFormData(prev => ({ ...prev, billNumber: res.data.billNumber }));
        } catch (error) {}
    };

    const fetchReports = async () => {
        try {
            setIsReportsLoading(true);
            const res = await api.get('/data-entry');
            setReports(res.data);
        } catch (error) {
            console.error('Fetch reports failed', error);
        } finally {
            setIsReportsLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if ((name === 'itemType' || name === 'itemName') && user?.gstEnabled) {
            const nextMaterial = name === 'itemType' ? value : formData.itemType;
            const nextItem = name === 'itemName' ? value : formData.itemName;
            setFormData(prev => ({ ...prev, [name]: value, gstPercentage: getLiveGstRate(nextMaterial, nextItem) }));
        } else {
            setFormData({ ...formData, [name]: value });
        }

        if (localStorage.getItem('disableAutocomplete') === 'true') return;

        const query = value.toLowerCase();
        if (name === 'customerName' || name === 'mobile') {
            const matches = uniqueCustomers.filter(c => name === 'customerName' ? c.name.toLowerCase().includes(query) : c.mobile.includes(query)).slice(0, 5);
            setSuggestions(matches.map(c => ({ label: name === 'customerName' ? c.name : c.mobile, subLabel: name === 'customerName' ? `📱 ${c.mobile}` : `👤 ${c.name}`, ...c })));
        setActiveSuggestionField(name);
        } else if (name === 'staffName') {
            setSuggestions(uniqueStaff.filter(s => s.toLowerCase().includes(query)).map(s => ({ label: s, value: s })).slice(0, 5));
            setActiveSuggestionField('staffName');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setIsSaving(true);
            const finalItemName = formData.itemName === 'Other' ? formData.customItemName : formData.itemName;
            const payload = { ...formData, itemName: finalItemName, totalAmount: Number(totalMoney), finalTotal: Number(finalTotal) };
            const res = await api.post('/data-entry', payload);
            toast.success('Entry saved!');
            setReports(prev => [res.data, ...prev]);
            
            // Sync to billing draft
            let items = JSON.parse(localStorage.getItem('pendingBillingItems') || '[]');
            items.push({ itemName: `${formData.itemType} - ${finalItemName}`, weight: formData.grams, ratePerGram: formData.ratePerGram, price: Number(finalTotal), gst: formData.gstPercentage });
            localStorage.setItem('pendingBillingItems', JSON.stringify(items));
            localStorage.setItem('pendingCustomerDetails', JSON.stringify({ customerName: formData.customerName, mobile: formData.mobile, billNumber: formData.billNumber }));

            setFormData(prev => ({ ...prev, date: getCurrentDateTimeLocal(), grams: '', ratePerGram: '', negotiableAmount: '', customItemName: '' }));
        } catch (error) {
            toast.error('Save failed');
        } finally {
            setIsSaving(false);
        }
    };

    const filteredReports = useMemo(() => {
        const cutoff = getAppTime(); cutoff.setMonth(cutoff.getMonth() - 6);
        return reports.filter(r => {
            const d = new Date(r.date);
            if (d < cutoff) return false;
            const q = filters.searchQuery.toLowerCase();
            return (!filters.searchMonth || (d.getMonth() + 1).toString().padStart(2, '0') === filters.searchMonth) &&
                   (!filters.searchYear || d.getFullYear().toString() === filters.searchYear) &&
                   (!q || (r.customerName || '').toLowerCase().includes(q) || (r.mobile || '').includes(q) || (r.billNumber || '').toLowerCase().includes(q));
        });
    }, [reports, filters]);

    const handleHardwarePrintRow = async (entry) => {
        const payload = {
            billNumber: entry.billNumber,
            customerName: entry.customerName || 'Cash Sale',
            mobile: entry.mobile || 'N/A',
            finalTotal: entry.finalTotal,
            gstPercentage: entry.gstPercentage,
            items: [{ itemName: `${entry.itemType} - ${entry.itemName}`, weight: entry.grams, ratePerGram: entry.ratePerGram, price: entry.totalAmount }],
            shopDetails: { name: user?.shopName, address: user?.shopAddress }
        };
        try {
            let printer = connectedDevice;
            if (!printer && isPrinterActive) printer = await reconnectDevice();
            if (printer) await printReceiptBluetooth(printer, payload);
            setPrintData(payload);
            setTimeout(() => window.print(), 500);
            toast.success('Bill Sync Successful!');
        } catch (e) {
            toast.error('Print failed');
        }
    };

    const confirmDeleteEntry = async () => {
        if (!deleteTargetId) return;
        try {
            setIsSaving(true);
            await api.delete(`/data-entry/${deleteTargetId}`);
            setReports(reports.filter(r => r.id !== deleteTargetId));
            toast.success('Deleted permanently');
        } catch (e) {
            toast.error('Delete failed');
        } finally {
            setIsSaving(false); setDeleteTargetId(null);
        }
    };

    return (
        <div className="d-flex min-vh-100">
            <Sidebar />
            <div className="main-content flex-grow-1">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2 className="fw-bold m-0">Accounting</h2>
                    <div className="btn-group">
                        <button className={`btn ${activeTab === 'entry' ? 'btn-gold' : 'btn-light'}`} onClick={() => setActiveTab('entry')}>➕ Entry</button>
                        <button className={`btn ${activeTab === 'reports' ? 'btn-gold' : 'btn-light'}`} onClick={() => setActiveTab('reports')}>📜 Reports</button>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {activeTab === 'entry' ? (
                        <motion.div key="entry" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="row justify-content-center" ref={formRef}>
                            <div className="col-xl-8 col-lg-10">
                                <div className="glass-panel p-4 border-0 mb-4 shadow-lg">
                                    <form onSubmit={handleSubmit} className="row g-3">
                                        <div className="col-md-6 position-relative">
                                            <label className="form-label small fw-bold">Customer</label>
                                            <input type="text" name="customerName" value={formData.customerName} onChange={handleInputChange} className="form-control" onBlur={() => setTimeout(() => setActiveSuggestionField(null), 200)} />
                                            <SuggestionDropdown isVisible={activeSuggestionField === 'customerName'} suggestions={suggestions} onSelect={s => setFormData(p => ({ ...p, customerName: s.name, mobile: s.mobile }))} />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label small fw-bold">Mobile</label>
                                            <input type="text" name="mobile" value={formData.mobile} onChange={handleInputChange} className="form-control" />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label small fw-bold">Bill #</label>
                                            <input type="text" name="billNumber" value={formData.billNumber} onChange={handleInputChange} className="form-control fw-bold" required />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label small fw-bold">Material</label>
                                            <select name="itemType" value={formData.itemType} onChange={handleInputChange} className="form-select">
                                                {itemTypes.map(it => <option key={it} value={it}>{it}</option>)}
                                            </select>
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label small fw-bold">Item</label>
                                            <select name="itemName" value={formData.itemName} onChange={handleInputChange} className="form-select">
                                                {jewelryItems.map(ji => <option key={ji} value={ji}>{ji}</option>)}
                                            </select>
                                        </div>
                                        <div className="col-md-4"><label className="small fw-bold">Weight (g)</label><input type="number" step="0.001" name="grams" value={formData.grams} onChange={handleInputChange} className="form-control" required /></div>
                                        <div className="col-md-4"><label className="small fw-bold">Rate/g</label><input type="number" name="ratePerGram" value={formData.ratePerGram} onChange={handleInputChange} className="form-control" required /></div>
                                        <div className="col-md-4"><label className="small fw-bold text-danger">Discount</label><input type="number" name="negotiableAmount" value={formData.negotiableAmount} onChange={handleInputChange} className="form-control" /></div>

                                        <div className="col-12 mt-4 p-3 rounded bg-light border d-flex justify-content-between">
                                            <div><div className="small">Subtotal</div><div className="h4 fw-bold">₹ {totalMoney.toLocaleString()}</div></div>
                                            <div className="text-end text-success"><div className="small">Final Total</div><div className="h2 fw-bold">₹ {finalTotal.toLocaleString()}</div></div>
                                        </div>
                                        <button className="btn btn-advanced w-100 py-3 mt-3 fw-bold" disabled={isSaving}>{isSaving ? 'Processing...' : '✅ Save to Reports'}</button>
                                    </form>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div key="reports" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <div className="glass-panel p-3 mb-4 d-flex gap-3 overflow-auto">
                                <input type="text" className="form-control" style={{ minWidth: '200px' }} placeholder="Search Customer/Bill..." value={filters.searchQuery} onChange={e => setFilters({ ...filters, searchQuery: e.target.value })} />
                                <div className="d-flex gap-2">
                                    <button className="btn btn-outline-dark" onClick={() => exportToExcel(filteredReports, 'Jewelry_Report')}>Excel</button>
                                    <button className="btn btn-outline-dark" onClick={() => generateReportsPdf(filteredReports, 'Jewelry_Report', { name: user?.shopName })}>PDF</button>
                                </div>
                            </div>
                            
                            {isReportsLoading ? <div className="text-center py-5">Loading Records...</div> : (
                                <>
                                    {/* Mobile Cards */}
                                    <div className="d-md-none">
                                        {filteredReports.slice(0, 100).map(r => (
                                            <div key={r.id} className="glass-panel p-3 mb-3 border-0 shadow-sm" style={{ borderLeft: '4px solid gold' }}>
                                                <div className="d-flex justify-content-between mb-2">
                                                    <span className="badge bg-light text-dark">#{r.billNumber}</span>
                                                    <span className="small text-muted">{new Date(r.date).toLocaleDateString()}</span>
                                                </div>
                                                <div className="fw-bold">{r.customerName}</div>
                                                <div className="h5 text-success">₹ {Number(r.finalTotal).toLocaleString()}</div>
                                                <div className="d-flex gap-2 mt-2">
                                                    <button className="btn btn-sm btn-dark flex-grow-1" onClick={() => handleHardwarePrintRow(r)}>Print</button>
                                                    <button className="btn btn-sm btn-outline-danger" onClick={() => setDeleteTargetId(r.id)}>🗑️</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Desktop Table */}
                                    <div className="table-responsive d-none d-md-block glass-panel p-0 border-0">
                                        <table className="table table-hover mb-0">
                                            <thead className="thead-glass">
                                                <tr><th>Bill #</th><th>Date</th><th>Customer</th><th>Details</th><th className="text-end">Total</th><th className="text-center">Actions</th></tr>
                                            </thead>
                                            <tbody>
                                                {filteredReports.slice(0, 100).map(r => (
                                                    <tr key={r.id}>
                                                        <td><span className="badge bg-gold-soft text-dark">{r.billNumber}</span></td>
                                                        <td className="small">{new Date(r.date).toLocaleDateString()}</td>
                                                        <td className="fw-bold">{r.customerName}</td>
                                                        <td className="small">{r.itemType} · {r.itemName} · {r.grams}g</td>
                                                        <td className="text-end text-success fw-bold">₹ {Number(r.finalTotal).toLocaleString()}</td>
                                                        <td className="text-center">
                                                            <button className="btn btn-sm btn-dark me-2" onClick={() => handleHardwarePrintRow(r)}>🧾</button>
                                                            <button className="btn btn-sm btn-outline-danger" onClick={() => setDeleteTargetId(r.id)}>🗑️</button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <AnimatePresence>
                {deleteTargetId && (
                    <div className="modal d-block" style={{ zIndex: 1050 }}>
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content shadow-lg border-0 p-4 text-center">
                                <h4 className="fw-bold">Delete permanently?</h4>
                                <p className="text-muted">This action is irreversible.</p>
                                <div className="d-flex gap-3 justify-content-center mt-3">
                                    <button className="btn btn-light px-4" onClick={() => setDeleteTargetId(null)}>Cancel</button>
                                    <button className="btn btn-danger px-4" onClick={confirmDeleteEntry}>Confirm Delete</button>
                                </div>
                            </div>
                        </div>
                        <div className="modal-backdrop show" onClick={() => setDeleteTargetId(null)} style={{ background: 'rgba(0,0,0,0.5)' }}></div>
                    </div>
                )}
            </AnimatePresence>

            <div style={{ display: 'none' }}><Receipt billData={printData} /></div>
        </div>
    );
};

export default DataEntry;
