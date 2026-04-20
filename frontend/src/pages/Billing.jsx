import React, { useState, useEffect, useMemo, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../utils/api';
import { toast } from 'react-toastify';
import { useForm, useFieldArray } from 'react-hook-form';
import { generateInvoicePdf } from '../utils/exportUtils';
import { printReceiptBluetooth } from '../utils/printerUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { usePrinter } from '../context/PrinterContext';
import Receipt from '../components/Receipt';
import SuggestionDropdown from '../components/SuggestionDropdown';
import { io } from 'socket.io-client';

const socket = io('http://localhost:5001');

const Billing = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { connectedDevice, setConnectedDevice, isPrinterActive, setIsPrinterActive, isReconnecting, reconnectDevice } = usePrinter();
    const [isSaving, setIsSaving] = useState(false);
    const [paymentMode, setPaymentMode] = useState('cash'); // 'cash' or 'upi'
    const [isSensing, setIsSensing] = useState(false);
    const [printData, setPrintData] = useState(null);
    const summaryRef = useRef(null);
    const autoPrintUpi = localStorage.getItem('autoPrintUpi') !== 'false';

    // Auto-load draft if returning from Data Entry calculator
    const savedDraft = JSON.parse(localStorage.getItem('billingFormDraft') || 'null');

    // Setup form
    const { register, control, handleSubmit, watch, reset, setValue } = useForm({
        defaultValues: savedDraft || {
            customerName: '',
            mobile: '',
            billNumber: '',
            discount: '',
            staffName: '',
            gst: user?.gstPercentage || 3, 
            items: savedDraft?.items || []
        }
    });

    const { fields, append, remove } = useFieldArray({ control, name: 'items' });
    const watchItems = watch('items');
    const watchDiscount = watch('discount');
    const watchGst = watch('gst');
    const watchCustomerName = watch('customerName');
    const watchMobile = watch('mobile');
    const watchBillNumber = watch('billNumber');
    const watchStaffName = watch('staffName');

    // Auto-Calculator & Live GST Dispatcher
    useEffect(() => {
        const subscription = watch((value, { name }) => {
            if (name && name.startsWith('items.')) {
                const match = name.match(/items\.(\d+)\./);
                if (match) {
                    const index = parseInt(match[1], 10);
                    const item = value.items[index];
                    
                    if (item && !name.endsWith('.price')) {
                        const weight = parseFloat(item.weight) || 0;
                        const rate = parseFloat(item.ratePerGram) || 0;
                        const itemGst = parseFloat(item.gst) || 0;
                        
                        // Scenario 1: Auto-calc base price then add item-specific GST
                        if (weight > 0 || rate > 0) {
                            const basePrice = weight * rate;
                            const finalWithGst = basePrice + (basePrice * itemGst / 100);
                            setValue(`items.${index}.price`, finalWithGst.toFixed(2));
                        }
                    }
                }
            }
        });
        return () => subscription.unsubscribe();
    }, [watch, setValue]);

    const [submittedItems, setSubmittedItems] = useState([]);

    // Custom Autocomplete Engine (Sources from DataEntry cache)
    const [suggestions, setSuggestions] = useState([]);
    const [activeSuggestionField, setActiveSuggestionField] = useState(null);
    const { uniqueCustomers, uniqueStaff, uniqueItems } = useMemo(() => ({
        uniqueCustomers: JSON.parse(localStorage.getItem('cachedCustomers') || '[]'),
        uniqueStaff: JSON.parse(localStorage.getItem('cachedStaff') || '[]'),
        uniqueItems: JSON.parse(localStorage.getItem('cachedItems') || '[]')
    }), []);

    useEffect(() => {
        if (localStorage.getItem('disableAutocomplete') === 'true') {
            setSuggestions([]); 
            return;
        }
        if (activeSuggestionField === 'customerName') {
            const query = watchCustomerName?.toLowerCase() || '';
            setSuggestions(uniqueCustomers.filter(c => !query || (c.name && c.name.toLowerCase().includes(query))).map(c => ({ label: c.name, subLabel: `📱 ${c.mobile}`, ...c })).slice(0, 5));
        } else if (activeSuggestionField === 'mobile') {
            const query = watchMobile || '';
            setSuggestions(uniqueCustomers.filter(c => !query || (c.mobile && c.mobile.includes(query))).map(c => ({ label: c.mobile, subLabel: `👤 ${c.name}`, ...c })).slice(0, 5));
        } else if (activeSuggestionField === 'staffName') {
            const query = watchStaffName?.toLowerCase() || '';
            setSuggestions(uniqueStaff.filter(s => !query || s.toLowerCase().includes(query)).map(s => ({ label: s, value: s })).slice(0, 5));
        } else {
            setSuggestions([]);
        }
    }, [watchCustomerName, watchMobile, watchStaffName, activeSuggestionField, uniqueCustomers, uniqueStaff]);

    const handleCalculateTotals = () => {
        let totalGstAmt = 0;
        let totalBase = 0;

        const items = watchItems.map(item => {
            const price = parseFloat(item.price) || 0;
            const itemGstPct = parseFloat(item.gst) || 0;
            const base = price / (1 + itemGstPct / 100);
            const tax = price - base;

            totalBase += base;
            totalGstAmt += tax;

            return { ...item, price };
        });

        // Set effective global GST percentage for summary and printing
        if (totalBase > 0) {
            const effectiveGst = (totalGstAmt / totalBase) * 100;
            // Round to 2 decimal places for clarity if it's messy, though usually it'll be neat
            setValue('gst', Number(effectiveGst.toFixed(2)));
        }
        setSubmittedItems(items);
        toast.info('List synchronized with Summary!');

        // Smooth scroll to summary card (Desktop only to avoid jitter)
        if (summaryRef.current && window.innerWidth > 768) {
            summaryRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // Memoize global calculations (Totals) based on submittedItems instead of live watchItems
    const { calculatedItems, subTotal, gstAmount, finalTotal } = useMemo(() => {
        const items = submittedItems;

        // Sum up base totals and taxes from items
        let sTotal = 0;
        let gTotal = 0;
        
        items.forEach(item => {
            const price = parseFloat(item.price) || 0;
            const itemGstPct = parseFloat(item.gst) || 0;
            const base = price / (1 + itemGstPct / 100);
            const tax = price - base;
            
            sTotal += base;
            gTotal += tax;
        });

        const discountVal = parseFloat(watchDiscount) || 0;
        const fTotal = Math.max(0, (sTotal + gTotal) - discountVal);

        return { calculatedItems: items, subTotal: sTotal, gstAmount: gTotal, finalTotal: fTotal };
    }, [submittedItems, watchDiscount]);




    // Live Auto-Save to prevent data loss when navigating to Calculator
    useEffect(() => {
        // Guard: Don't save if the form is essentially empty (prevents re-saving after reset)
        if (!watchCustomerName && !watchMobile && (!watchItems || watchItems.length === 0)) {
            return;
        }

        const debounce = setTimeout(() => {
            localStorage.setItem('billingFormDraft', JSON.stringify({
                customerName: watchCustomerName,
                mobile: watchMobile,
                discount: watchDiscount,
                gst: watchGst,
                staffName: watch('staffName'),
                items: watchItems
            }));
        }, 1000); // 1s debounce for better performance
        return () => clearTimeout(debounce);
    }, [watchCustomerName, watchMobile, watchDiscount, watchGst, watchItems]);

    const handleApplyGlobalGst = () => {
        const globalGst = parseFloat(watchGst) || 0;
        const currentItems = watch('items');
        currentItems.forEach((_, index) => {
            setValue(`items.${index}.gst`, globalGst);
        });
        toast.info(`Synced ${globalGst}% GST to all items in list.`);
    };

    const handleClearAll = () => {
        // Atomic Cleanup
        localStorage.removeItem('billingFormDraft');
        localStorage.removeItem('pendingBillingItems');
        localStorage.removeItem('pendingCustomerDetails');

        // State Reset
        setSubmittedItems([]);
        setPaymentMode('cash');
        setPrintData(null);

        // Form Reset
        reset({
            customerName: '',
            mobile: '',
            billNumber: '',
            discount: '',
            gst: user?.gstPercentage || 3,
            items: []
        });

        toast.success('Workspace cleared & reset! 🧹');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Load pending data entries automatically from calculator
    useEffect(() => {
        const pendingItemsStr = localStorage.getItem('pendingBillingItems');
        if (pendingItemsStr) {
            try {
                const items = JSON.parse(pendingItemsStr);
                if (items && items.length > 0) {
                    // Strictly append all incoming items to ensure nothing is ever replaced
                    items.forEach(item => append(item));
                    localStorage.removeItem('pendingBillingItems');
                }
            } catch (e) {
                console.error('Failed to parse pending items', e);
            }
        }
    }, [append, remove]);

    // Load pending customer details automatically from calculator
    useEffect(() => {
        const pendingCustomerStr = localStorage.getItem('pendingCustomerDetails');
        if (pendingCustomerStr) {
            try {
                const customerDetails = JSON.parse(pendingCustomerStr);
                if (customerDetails.customerName) setValue('customerName', customerDetails.customerName);
                if (customerDetails.mobile) setValue('mobile', customerDetails.mobile);
                if (customerDetails.billNumber) setValue('billNumber', customerDetails.billNumber);
                if (customerDetails.staffName) setValue('staffName', customerDetails.staffName);
                localStorage.removeItem('pendingCustomerDetails');
            } catch (e) {
                console.error('Failed to parse pending customer details', e);
            }
        }
    }, [setValue]);

    // Ensure GST is auto-filled once user profile loads (if not already set by draft)
    useEffect(() => {
        if (user?.gstEnabled && !watchGst && !savedDraft) {
            setValue('gst', user.gstPercentage || 3);
        }
    }, [user, setValue, watchGst, savedDraft]);

    // Sync printer state for UI
    useEffect(() => {
        // No local state syncing needed as we use context
    }, []);

    // Automated Auto-Bill Generator engine via Socket.io Webhooks
    useEffect(() => {
        let isMounted = true;
        
        if (
            paymentMode === 'upi' &&
            autoPrintUpi &&
            finalTotal > 0 &&
            calculatedItems.length > 0 &&
            calculatedItems[0].itemName &&
            watchCustomerName &&
            watchMobile?.length >= 10 &&
            !isSaving
        ) {
            setIsSensing(true);
            
            // Listen for genuine webhook
            socket.on('payment-received', (paymentData) => {
                if (!isMounted) return;
                console.log("UPI Event Caught:", paymentData);
                toast.success('🔊 Webhook Synced: Payment Received from UPI Machine! Printing bill...');
                handleSubmit(onSubmit)();
                setIsSensing(false);
            });
            
        } else {
            setIsSensing(false);
            socket.off('payment-received');
        }

        return () => {
            isMounted = false;
            socket.off('payment-received');
        };
    }, [paymentMode, finalTotal, calculatedItems, watchCustomerName, watchMobile, isSaving, handleSubmit]);

    const onSubmit = async (data) => {
        if (calculatedItems.length === 0 || !calculatedItems[0].itemName) {
            return toast.error('Please add at least one item');
        }

        try {
            setIsSaving(true);
            const payload = {
                customerName: data.customerName,
                mobile: data.mobile,
                billNumber: data.billNumber,
                staffName: data.staffName,
                items: calculatedItems,
                subTotal,
                gst: gstAmount,
                discount: parseFloat(data.discount) || 0,
                finalTotal,
                paymentMode,
                shopDetails: {
                    name: user?.shopName,
                    address: user?.shopAddress,
                    upiId: user?.upiId,
                    logo: user?.shopLogo
                }
            };

            const res = await api.post('/bills', payload);
            const generatedBillId = res.data.id;
            const generatedBillNum = res.data.billNumber;

            // ----------------------------------------------------
            // HARDWARE PRINT ENGINE (PHYSICAL BLUETOOTH RECEIPT)
            // ----------------------------------------------------
            let printedOnHardware = false;
            try {
                let activePrinter = connectedDevice;

                // Attempt to wake up if disconnected but active in context
                if (!activePrinter && isPrinterActive && navigator.bluetooth) {
                    activePrinter = await reconnectDevice();
                    if (!activePrinter) {
                        toast.warn('Machine not respond. Is it ON?', { autoClose: 3000 });
                    }
                }

                if (activePrinter) {
                    await printReceiptBluetooth(activePrinter, {
                        ...payload,
                        gstPercentage: parseFloat(data.gst) || 0
                    });
                    printedOnHardware = true;
                }
            } catch (printErr) {
                console.error("Hardware print failed:", printErr);
                toast.error(printErr.message || "Bluetooth printer unresponsive. Printing skipped.");
            }

            // Fallback & Digital Record (PDF) removed
            // await generateInvoicePdf({ ...payload, gstPercentage: parseFloat(data.gst) || 0 });

            // ----------------------------------------------------
            // BROWSER PRINT ENGINE (RESPONSIVE HTML)
            // ----------------------------------------------------
            // Only use Browser print preview if Hardware Printing was bypassed or failed.
            if (!printedOnHardware) {
                setPrintData({ ...payload, billNumber: generatedBillNum, gstPercentage: parseFloat(data.gst) || 0 });
                setTimeout(() => {
                    window.print();
                }, 500);
            }

            // Execute delayed Inventory Deduction confirm check
            await api.post(`/bills/${generatedBillId}/confirm-print`);

            if (printedOnHardware) {
                toast.success(`Bill ${generatedBillNum} Generated & Printed via Web Bluetooth! 📠`);
            } else {
                toast.success(`Bill ${generatedBillNum} Saved Successfully! 📑`);
            }
            // Comprehensive Cleanup and Reset
            // Comprehensive Cleanup and Reset
            localStorage.removeItem('billingFormDraft');
            localStorage.removeItem('pendingBillingItems');
            localStorage.removeItem('pendingCustomerDetails');

            // Force immediate UI reset
            setSubmittedItems([]); 
            setPaymentMode('cash'); 
            setPrintData(null); // Clear print state
            
            // Explicitly clear form via reset
            reset({
                customerName: '',
                mobile: '',
                billNumber: '',
                discount: '',
                staffName: '',
                gst: user?.gstPercentage || 3,
                items: []
            });
            window.scrollTo({ top: 0, behavior: 'smooth' });

        } catch (error) {
            console.error("Billing submission error:", error);
            toast.error(error.response?.data?.message || 'Failed to generate bill');
        } finally {
            setIsSaving(false);
        }
    };

    // Browser print is always available - no hardware lock needed

    return (
        <div className="d-flex theme-colorful">

            <Sidebar />
            <div className="main-content flex-grow-1">
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
                    <div className="d-flex align-items-center gap-3">
                        <div>
                            <h2 className="fw-bold m-0">Invoice & Billing</h2>
                        </div>
                        <button 
                            type="button" 
                            onClick={handleClearAll}
                            className="btn btn-outline-danger btn-sm rounded-pill px-3 fw-bold border-2 d-flex align-items-center gap-2 custom-hover-lift"
                            style={{ fontSize: '0.75rem' }}
                        >
                            🧹 Clear Workspace
                        </button>
                    </div>
                    {user?.shopLogo && <img src={user.shopLogo} alt="Shop Logo" style={{ maxHeight: '50px', objectFit: 'contain' }} />}
                </motion.div>

                <div className="row g-4 mb-5">
                    <div className="col-12">
                        <form id="billingForm" onSubmit={handleSubmit(onSubmit)} autoComplete="off">
                            {/* Customer Details */}
                            <motion.div
                                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}
                                className="glass-panel p-4 border-0 mb-4 shadow-lg"
                                style={{ borderRadius: '24px' }}
                            >
                                <div className="d-flex align-items-center gap-2 mb-4">
                                    <div className="bg-warning-subtle p-2 rounded-3 text-warning">👤</div>
                                    <h5 className="fw-bold m-0 text-high-contrast">Customer Information</h5>
                                </div>
                                <div className="row g-3">
                                    <div className="col-md-3 position-relative">
                                        <label className="form-label small fw-900 text-high-contrast text-uppercase tracking-wider">Customer Name</label>
                                        <input type="text" className="form-control form-control-glass bg-light" placeholder="Enter Full Name" {...register('customerName', { required: true })} autoComplete="one-time-code" onFocus={() => setActiveSuggestionField('customerName')} onBlur={() => setTimeout(() => setActiveSuggestionField(null), 200)} />
                                        
                                        <SuggestionDropdown 
                                            isVisible={activeSuggestionField === 'customerName'}
                                            suggestions={suggestions}
                                            title="Past Customers"
                                            onCancel={() => setActiveSuggestionField(null)}
                                            onSelect={(s) => {
                                                setValue('customerName', s.name, { shouldValidate: true });
                                                setValue('mobile', s.mobile, { shouldValidate: true });
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
                                    <div className="col-md-3 position-relative">
                                        <label className="form-label small fw-900 text-high-contrast text-uppercase tracking-wider">Mobile Number</label>
                                        <input type="tel" className="form-control form-control-glass bg-light" placeholder="+91" {...register('mobile', { required: true })} autoComplete="one-time-code" onFocus={() => setActiveSuggestionField('mobile')} onBlur={() => setTimeout(() => setActiveSuggestionField(null), 200)} />
                                        
                                        <SuggestionDropdown 
                                            isVisible={activeSuggestionField === 'mobile'}
                                            suggestions={suggestions}
                                            title="By Mobile"
                                            onCancel={() => setActiveSuggestionField(null)}
                                            onSelect={(s) => {
                                                setValue('customerName', s.name, { shouldValidate: true });
                                                setValue('mobile', s.mobile, { shouldValidate: true });
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
                                    <div className="col-md-3">
                                        <label className="form-label small fw-900 text-high-contrast text-uppercase tracking-wider">Bill Number</label>
                                        <input type="text" className="form-control form-control-glass bg-light fw-bold text-primary" placeholder="G26101" {...register('billNumber', { required: true })} autoComplete="off" />
                                    </div>
                                    <div className="col-md-3 position-relative">
                                        <label className="form-label small fw-900 text-high-contrast text-uppercase tracking-wider">Staff Name</label>
                                        <input type="text" className="form-control form-control-glass bg-light fw-bold" placeholder="Select Staff" {...register('staffName')} onFocus={() => setActiveSuggestionField('staffName')} onBlur={() => setTimeout(() => setActiveSuggestionField(null), 200)} autoComplete="off" />
                                        
                                        <SuggestionDropdown 
                                            isVisible={activeSuggestionField === 'staffName'}
                                            suggestions={suggestions}
                                            title="History / Employees"
                                            onCancel={() => setActiveSuggestionField(null)}
                                            onSelect={(s) => {
                                                setValue('staffName', s.value, { shouldValidate: true });
                                                setActiveSuggestionField(null);
                                            }}
                                            renderItem={(s) => (
                                                <div className="fw-bold text-dark text-uppercase">{s.label}</div>
                                            )}
                                        />
                                    </div>
                                </div>
                            </motion.div>


                            {/* Cart Items */}
                            <motion.div
                                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}
                                className="glass-panel p-4 border-0 shadow-lg"
                                style={{ borderRadius: '24px' }}
                            >
                                <div className="d-flex justify-content-between align-items-center mb-4">
                                    <div className="d-flex align-items-center gap-2">
                                        <div className="bg-warning-subtle p-2 rounded-3 text-warning">🛍️</div>
                                        <h5 className="fw-bold m-0">Itemized List</h5>
                                    </div>
                                    <div className="d-flex gap-2 flex-wrap">
                                        {user?.gstEnabled && (
                                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="button" className="btn btn-sm btn-outline-primary px-3 rounded-pill shadow-sm" onClick={handleApplyGlobalGst}>
                                                🎯 Set GST Manually (Link All)
                                            </motion.button>
                                        )}
                                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="button" className="btn btn-sm btn-dark px-3 rounded-pill shadow-sm" onClick={() => append({ itemName: '', weight: '', ratePerGram: '', price: '', gst: user?.gstPercentage || 3 })}>
                                            ➕ Quick Add (Here)
                                        </motion.button>
                                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="button" className="btn btn-sm btn-gold px-3 rounded-pill shadow-sm opacity-90" onClick={() => navigate('/data-entry', { state: { customerName: watchCustomerName, mobile: watchMobile, billNumber: watchBillNumber } })}>
                                            🧮 Add Another Entry
                                        </motion.button>
                                    </div>
                                </div>

                                <div className="cart-header row g-2 mb-2 d-none d-md-flex text-secondary small fw-bold text-uppercase">
                                    <div className="col-md-2">Item Name / Description</div>
                                    <div className="col-md-2">Weight</div>
                                    <div className="col-md-2">Rate/g (₹)</div>
                                    <div className="col-md-2 text-center">GST%</div>
                                    <div className="col-md-1 text-end">Tax</div>
                                    <div className="col-md-3 text-end">Price (Total)</div>
                                </div>

                                <AnimatePresence>
                                    {fields.map((field, index) => (
                                        <motion.div
                                            key={field.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                                            className="row g-2 align-items-center mb-3 pb-3 border-bottom border-light position-relative"
                                        >
                                            <div className="col-md-2">
                                                <input type="text" placeholder="e.g. Gold Chain" className="form-control form-control-glass bg-light" {...register(`items.${index}.itemName`, { required: true })} autoComplete="off" />
                                            </div>
                                            <div className="col-md-2">
                                                <input type="number" step="0.001" placeholder="0.00" className="form-control form-control-glass bg-light px-3 text-center" {...register(`items.${index}.weight`)} autoComplete="off" />
                                            </div>
                                            <div className="col-md-2">
                                                <input type="number" step="0.01" placeholder="0" className="form-control form-control-glass bg-light" {...register(`items.${index}.ratePerGram`)} autoComplete="off" />
                                            </div>
                                            <div className="col-md-2 px-md-3">
                                                <div className="d-flex align-items-center gap-2">
                                                    <input 
                                                        type="number" 
                                                        placeholder="GST%"
                                                        className="form-control form-control-glass bg-light text-center p-2 fw-bold text-primary" 
                                                        style={{ borderRadius: '12px', minWidth: '55px' }}
                                                        {...register(`items.${index}.gst`)}
                                                        autoComplete="off"
                                                    />
                                                    <span className="badge bg-primary-subtle text-primary border border-primary-subtle fw-bold d-none d-md-block" style={{ padding: '8px 8px', borderRadius: '10px', fontSize: '0.7rem' }}>%</span>
                                                </div>
                                            </div>
                                            <div className="col-md-1 text-end">
                                                <span className="small text-secondary fw-bold">₹{((parseFloat(watchItems[index]?.price) || 0) - ((parseFloat(watchItems[index]?.price) || 0) / (1 + (parseFloat(watchItems[index]?.gst) || 0) / 100))).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                            </div>
                                            <div className="col-md-3 d-flex align-items-center justify-content-end gap-2">
                                                <div className="input-group input-group-sm w-100">
                                                    <span className="input-group-text border-0 fw-bold text-secondary bg-transparent">₹</span>
                                                    <input type="number" step="0.01" className="form-control form-control-glass fw-bold text-success py-2 font-numeric" style={{ fontSize: '1rem' }} placeholder="0.00" {...register(`items.${index}.price`)} autoComplete="off" />
                                                </div>
                                                <button type="button" className="btn btn-link text-danger p-0 ms-1" onClick={() => remove(index)}>✖</button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>

                                {fields.length === 0 && (
                                    <div className="text-secondary text-center my-4 py-4 border rounded bg-light border-dashed">
                                        <p className="m-0 small">No items added yet. Click &quot;+ Add Item&quot; to begin.</p>
                                    </div>
                                )}

                                {fields.length > 0 && (
                                    <div className="d-flex justify-content-end mt-4">
                                        <button type="button" onClick={handleCalculateTotals} className="btn btn-warning fw-bold px-4 rounded-pill shadow-sm custom-hover-lift">
                                            ✅ Submit List to Summary ➡
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        </form>
                    </div>

                    <div className="col-12" ref={summaryRef}>
                        <motion.div
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
                            className="glass-panel p-4 border-0 shadow-lg mt-2"
                            style={{ borderRadius: '24px' }}
                        >
                            <h5 className="fw-bold mb-4 align-items-center d-flex gap-2">
                                📊 Summary & Payment
                            </h5>

                            {user?.shopAddress && (
                                <div className="alert alert-light border-0 small py-2 mb-3 d-flex align-items-start gap-2 shadow-sm" style={{ background: 'rgba(212, 175, 55, 0.03)' }}>
                                    <span style={{ fontSize: '1.2rem' }}>📍</span>
                                    <div>
                                        <div className="fw-bold text-uppercase opacity-50" style={{ fontSize: '0.6rem', letterSpacing: '1px' }}>Billing From</div>
                                        <div className="text-secondary" style={{ fontSize: '0.75rem', lineHeight: '1.2' }}>{user.shopAddress}</div>
                                    </div>
                                </div>
                            )}

                            <div className="bg-light p-3 border rounded-4 mb-4">
                                <div className="d-flex justify-content-between mb-3 align-items-center">
                                    <span className="text-secondary fw-semibold">Subtotal</span>
                                    <span className="fw-bold">₹ {subTotal.toLocaleString('en-IN')}</span>
                                </div>

                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <div className="d-flex align-items-center gap-2">
                                        <span className="text-secondary fw-semibold">Tax (GST %)</span>
                                        <button 
                                            type="button" 
                                            onClick={handleApplyGlobalGst}
                                            className="btn btn-sm btn-outline-primary border-0 p-0 px-1"
                                            title="Apply this rate to all items above"
                                            style={{ fontSize: '0.65rem' }}
                                        >
                                            [Apply to All]
                                        </button>
                                    </div>
                                    <input type="number" className="form-control form-control-sm text-end fw-bold bg-white text-primary" style={{ width: '60px' }} {...register('gst')} autoComplete="off" />
                                </div>

                                <div className="d-flex justify-content-between mb-4 align-items-center border-bottom pb-3">
                                    <span className="text-high-contrast fw-900 small text-uppercase tracking-widest">Tax (GST {watchGst}%)</span>
                                    <span className="small text-high-contrast fw-900">+ ₹ {gstAmount.toLocaleString('en-IN')}</span>
                                </div>


                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="text-danger fw-semibold">Discount</span>
                                    <input type="number" className="form-control form-control-sm text-end fw-bold border-danger-subtle text-danger bg-danger-subtle" style={{ width: '90px' }} {...register('discount')} autoComplete="off" />
                                </div>
                            </div>

                            <div className="d-flex justify-content-between align-items-center mb-4 p-3 bg-dark text-white rounded-4">
                                <span className="fw-bold small text-uppercase text-secondary tracking-widest">Payable</span>
                                <span className="fw-bold fs-3" style={{ color: 'var(--accent-primary)' }}>₹ {finalTotal.toLocaleString('en-IN')}</span>
                            </div>

                            {/* Payment Mode Toggle */}
                            <div className="mb-4">
                                <label className="form-label small fw-bold text-secondary text-uppercase tracking-tighter mb-2">Select Payment Mode</label>
                                <div className="d-flex gap-2">
                                    <button
                                        type="button"
                                        className={`btn flex-grow-1 fw-bold border-0 ${paymentMode === 'cash' ? 'btn-gold' : 'btn-light text-secondary'}`}
                                        onClick={() => setPaymentMode('cash')}
                                    >
                                        💵 Cash
                                    </button>
                                    <button
                                        type="button"
                                        className={`btn flex-grow-1 fw-bold border-0 ${paymentMode === 'upi' ? 'btn-gold' : 'btn-light text-secondary'}`}
                                        onClick={() => setPaymentMode('upi')}
                                    >
                                        📱 Digital UPI
                                    </button>
                                </div>
                            </div>

                            {/* Physical UPI Machine Section */}
                            {paymentMode === 'upi' && autoPrintUpi && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="upi-payment p-3 border border-primary-subtle rounded-4 mb-4 text-center overflow-hidden position-relative bg-light">
                                    {isSensing && (
                                        <motion.div
                                            initial={{ x: "-100%" }} animate={{ x: "100%" }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                            style={{ position: 'absolute', top: 0, left: 0, width: '20%', height: '3px', background: 'var(--accent-primary)' }}
                                        />
                                    )}
                                    <div className="mb-2 fs-1 text-primary">
                                        📲 ↔️ 📠
                                    </div>
                                    <h6 className="fw-bold mb-2 small text-uppercase text-dark">
                                        {isSensing ? (
                                            <><span className="spinner-grow spinner-grow-sm text-success me-2 pb-1"></span>Waiting for Physical UPI Machine...</>
                                        ) : (
                                            <>Connection to UPI Machine Ready</>
                                        )}
                                    </h6>
                                    <p className="small text-secondary m-0">
                                        {isSensing
                                            ? `Sent ₹${finalTotal.toLocaleString('en-IN')} to terminal. Ask customer to scan the machine.`
                                            : "Fill items & customer details to push amount to machine."
                                        }
                                    </p>
                                </motion.div>
                            )}

                            {paymentMode === 'upi' && !autoPrintUpi && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="upi-payment p-3 border border-light rounded-4 mb-4 text-center overflow-hidden position-relative bg-light">
                                    <div className="mb-2 fs-1 text-secondary">
                                        📲
                                    </div>
                                    <h6 className="fw-bold mb-2 small text-uppercase text-dark">
                                        Manual UPI Mode Active
                                    </h6>
                                    <p className="small text-secondary m-0">
                                        Auto-print is disabled. Collect payment manually, then click Generate to print.
                                    </p>
                                </motion.div>
                            )}

                            {!user?.upiId && paymentMode === 'upi' && autoPrintUpi && (
                                <div className="alert alert-warning small py-2 rounded-4 border-0 mb-4 shadow-sm">
                                    <i className="bi bi-info-circle me-1"></i> Add UPI details in <b>Settings</b> first to use automatic webhooks.
                                </div>
                            )}

                            {paymentMode === 'cash' || !autoPrintUpi ? (
                                <motion.button
                                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                    form="billingForm" type="submit"
                                    className="btn btn-advanced w-100 py-3 fs-5"
                                    disabled={isSaving || calculatedItems.length === 0}
                                >
                                    {isSaving ? 'Processing Securely...' : `Generate Bill & Print (${paymentMode.toUpperCase()}) 🖨️`}
                                </motion.button>

                            ) : (
                                <motion.div
                                    className={`btn w-100 py-3 fw-bold fs-5 shadow-sm rounded-pill position-relative overflow-hidden ${isSensing ? 'btn-primary text-white' : 'btn-secondary text-light opacity-50'}`}
                                >
                                    {isSensing ? (
                                        <span className="d-flex align-items-center justify-content-center gap-2">
                                            <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
                                            Syncing with Machine API...
                                        </span>
                                    ) : 'Complete form to push to machine'}
                                </motion.div>
                            )}

                            {/* Reprint last bill button */}
                            {printData && (
                                <motion.button
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    whileHover={{ scale: 1.01 }}
                                    type="button"
                                    className="btn btn-outline-secondary w-100 py-2 mt-2 d-flex align-items-center justify-content-center gap-2 fw-semibold"
                                    onClick={() => window.print()}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                                    Reprint Last Bill
                                </motion.button>
                            )}

                            {/* Printer Ready Badge */}
                            <div className="d-flex align-items-center justify-content-center gap-2 mt-3">
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 6px #22c55e' }}></span>
                                <small className="text-secondary" style={{ fontSize: '0.7rem' }}>🖨️ Printer: Ready — Browser will open the print dialog</small>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Hidden Receipt for Browser Printing */}
            <Receipt billData={printData} />
        </div>
    );
};

export default Billing;
