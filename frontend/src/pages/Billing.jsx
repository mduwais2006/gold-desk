import React, { useState, useEffect, useMemo } from 'react';
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
import LoadingSequence from '../components/LoadingSequence';


const Billing = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { connectedDevice, setConnectedDevice, isPrinterActive, setIsPrinterActive, isReconnecting, reconnectDevice } = usePrinter();
    const [isSaving, setIsSaving] = useState(false);
    const [paymentMode, setPaymentMode] = useState('cash'); // 'cash' or 'upi'
    const [isSensing, setIsSensing] = useState(false);
    const autoPrintUpi = localStorage.getItem('autoPrintUpi') !== 'false';

    // Auto-load draft if returning from Data Entry calculator
    const savedDraft = JSON.parse(localStorage.getItem('billingFormDraft') || 'null');

    // Setup form
    const { register, control, handleSubmit, watch, reset, setValue } = useForm({
        defaultValues: savedDraft || {
            customerName: '',
            mobile: '',
            discount: '',
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

    // Force an initial sync on mount for any saved drafts
    useEffect(() => {
        setTimeout(() => handleCalculateTotals(), 500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    // Live Auto-Save to prevent data loss when navigating to Calculator
    useEffect(() => {
        const debounce = setTimeout(() => {
            localStorage.setItem('billingFormDraft', JSON.stringify({
                customerName: watchCustomerName,
                mobile: watchMobile,
                discount: watchDiscount,
                gst: watchGst,
                items: watchItems
            }));
        }, 500);
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
                    // Automatically sync newly fetched items to the summary
                    setTimeout(() => handleCalculateTotals(), 500);
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
            // Refresh totals once settings land
            setTimeout(() => handleCalculateTotals(), 200);
        }
    }, [user, setValue, watchGst, savedDraft]);

    // Sync printer state for UI
    useEffect(() => {
        // No local state syncing needed as we use context
    }, []);

    // Automotive Auto-Bill Generator engine (Simulates physical SoundBox hardware/Webhook)
    useEffect(() => {
        let timer = null;
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
            timer = setTimeout(() => {
                toast.success('🔊 Webhook Synced: Payment Received from UPI Machine! Printing bill...');
                handleSubmit(onSubmit)();
                setIsSensing(false);
            }, 6000); // Emulates waiting for external physical machine
        } else {
            setIsSensing(false);
        }

        return () => {
            if (timer) clearTimeout(timer);
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

            await api.post('/bills', payload);

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

            // Fallback & Digital Record (PDF)
            await generateInvoicePdf({ ...payload, gstPercentage: parseFloat(data.gst) || 0 });

            if (printedOnHardware) {
                toast.success('Bill Generated & Printed Successfully! 📠');
            } else {
                toast.info('Digital Bill Generated Successfully! 🖨️');
            }

            localStorage.removeItem('billingFormDraft'); // Clear saved draft
            reset({
                customerName: '', mobile: '', discount: '', gst: '',
                items: []
            }); // Hard reset
            setSubmittedItems([]); // Reset summary UI too
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to generate bill');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isPrinterActive && !isReconnecting) {
        return (
            <div className="d-flex">
                <Sidebar />
                <div className="main-content flex-grow-1 d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="text-center glass-panel p-5 rounded-5 shadow-lg border-0 position-relative overflow-hidden"
                        style={{ maxWidth: '500px' }}
                    >
                        <div className="position-absolute top-0 start-0 w-100 bg-warning" style={{ height: '6px' }}></div>
                        <h1 className="display-1 mb-4" style={{ filter: 'drop-shadow(0px 10px 15px rgba(212,175,55,0.3))' }}>📠🔌</h1>
                        <h3 className="fw-900 mb-3 text-uppercase tracking-tighter text-black-force">Hardware Lock</h3>
                        <p className="text-secondary mb-4 fs-6 fw-bold">
                            To maintain premium security and synchronous performance, the Billing Engine is locked until your <b className="text-accent-primary">Physical POS Printer</b> is officially connected.
                        </p>
                        <button
                            className="btn btn-advanced w-100 py-3 d-flex align-items-center justify-content-center gap-2"
                            onClick={() => navigate('/settings')}
                        >
                            <span className="spinner-grow spinner-grow-sm text-dark"></span>
                            Connect Machine in Settings
                        </button>
                    </motion.div>

                </div>
            </div>
        );
    }

    if (isReconnecting) {
        return <LoadingSequence text="Syncing with Hardware..." fullScreen={true} />;
    }

    return (
        <div className="d-flex theme-colorful">

            <Sidebar />
            <div className="main-content flex-grow-1">
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
                    <div>
                        <h2 className="fw-bold m-0">Premium Checkout</h2>
                        <p className="text-secondary small m-0">Generate professional tax invoices instantly</p>
                    </div>
                    {user?.shopLogo && <img src={user.shopLogo} alt="Shop Logo" style={{ maxHeight: '50px', objectFit: 'contain' }} />}
                </motion.div>

                <div className="row g-4 mb-4">
                    <div className="col-xl-8 col-lg-7">
                        <form id="billingForm" onSubmit={handleSubmit(onSubmit)}>
                            {/* Customer Details */}
                            <motion.div
                                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}
                                className="glass-panel p-4 border-0 mb-4 shadow-sm"
                            >
                                <div className="d-flex align-items-center gap-2 mb-4">
                                    <div className="bg-warning-subtle p-2 rounded-3 text-warning">👤</div>
                                    <h5 className="fw-bold m-0 text-high-contrast">Customer Information</h5>
                                </div>
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label className="form-label small fw-900 text-high-contrast text-uppercase tracking-wider">Customer Name</label>
                                        <input type="text" className="form-control form-control-glass bg-light" placeholder="Enter Full Name" {...register('customerName', { required: true })} />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label small fw-900 text-high-contrast text-uppercase tracking-wider">Mobile Number</label>
                                        <input type="tel" className="form-control form-control-glass bg-light" placeholder="+91 00000 00000" {...register('mobile', { required: true })} />
                                    </div>
                                </div>
                            </motion.div>


                            {/* Cart Items */}
                            <motion.div
                                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
                                className="glass-panel p-4 border-0 shadow-sm"
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
                                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="button" className="btn btn-sm btn-gold px-3 rounded-pill shadow-sm opacity-90" onClick={() => navigate('/data-entry', { state: { customerName: watchCustomerName, mobile: watchMobile } })}>
                                            🧮 Add Another Entry
                                        </motion.button>
                                    </div>
                                </div>

                                <div className="cart-header row g-2 mb-2 d-none d-md-flex text-secondary small fw-bold text-uppercase">
                                    <div className="col-md-4">Item Name / Description</div>
                                    <div className="col-md-2">Weight (g)</div>
                                    <div className="col-md-2">Rate/g (₹)</div>
                                    <div className="col-md-1 text-center">GST%</div>
                                    <div className="col-md-1 text-end">Tax</div>
                                    <div className="col-md-2 text-end">Price</div>
                                </div>

                                <AnimatePresence>
                                    {fields.map((field, index) => (
                                        <motion.div
                                            key={field.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                                            className="row g-2 align-items-center mb-3 pb-3 border-bottom border-light position-relative"
                                        >
                                            <div className="col-md-4">
                                                <input type="text" placeholder="e.g. Gold Chain" className="form-control form-control-glass bg-light" {...register(`items.${index}.itemName`, { required: true })} />
                                            </div>
                                            <div className="col-md-2">
                                                <input type="number" step="0.001" placeholder="0.00" className="form-control form-control-glass bg-light" {...register(`items.${index}.weight`)} />
                                            </div>
                                            <div className="col-md-2">
                                                <input type="number" step="0.01" placeholder="0" className="form-control form-control-glass bg-light" {...register(`items.${index}.ratePerGram`)} />
                                            </div>
                                            <div className="col-md-1">
                                                <div className="input-group input-group-sm">
                                                    <input 
                                                        type="number" 
                                                        placeholder="GST%"
                                                        className="form-control form-control-glass bg-light text-center p-1 fw-bold text-primary" 
                                                        {...register(`items.${index}.gst`)}
                                                    />
                                                    <span className="input-group-text border-0 small p-1 bg-transparent text-primary fw-bold">%</span>
                                                </div>
                                            </div>
                                            <div className="col-md-1 text-end">
                                                <span className="small text-secondary fw-bold">₹{((parseFloat(watchItems[index]?.price) || 0) - ((parseFloat(watchItems[index]?.price) || 0) / (1 + (parseFloat(watchItems[index]?.gst) || 0) / 100))).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                            </div>
                                            <div className="col-md-2 d-flex align-items-center justify-content-end gap-2">
                                                <div className="input-group input-group-sm w-100">
                                                    <span className="input-group-text border-0 fw-bold text-secondary">₹</span>
                                                    <input type="number" step="0.01" className="form-control form-control-glass fw-bold text-success" placeholder="0.00" {...register(`items.${index}.price`)} />
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

                    <div className="col-xl-4 col-lg-5">
                        <motion.div
                            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
                            className="glass-panel p-4 border-0 position-sticky shadow-lg"
                            style={{ top: '20px', borderRadius: '24px' }}
                        >
                            <h5 className="fw-bold mb-4 align-items-center d-flex gap-2">
                                📊 Summary & Payment
                            </h5>

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
                                    <input type="number" className="form-control form-control-sm text-end fw-bold bg-white text-primary" style={{ width: '60px' }} {...register('gst')} />
                                </div>

                                <div className="d-flex justify-content-between mb-4 align-items-center border-bottom pb-3">
                                    <span className="text-high-contrast fw-900 small text-uppercase tracking-widest">Tax (GST {watchGst}%)</span>
                                    <span className="small text-high-contrast fw-900">+ ₹ {gstAmount.toLocaleString('en-IN')}</span>
                                </div>


                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="text-danger fw-semibold">Discount</span>
                                    <input type="number" className="form-control form-control-sm text-end fw-bold border-danger-subtle text-danger bg-danger-subtle" style={{ width: '90px' }} {...register('discount')} />
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
                                    {isSaving ? 'Processing Securely...' : `Generate Bill (${paymentMode.toUpperCase()}) 🧾`}
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

                            <small className="text-center d-block mt-3 text-secondary opacity-50">Authorized Invoice Generation</small>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Billing;
