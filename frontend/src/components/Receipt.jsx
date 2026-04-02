import React, { forwardRef } from 'react';
import { getAppTime } from '../utils/timeUtils';

const Receipt = forwardRef(({ billData }, ref) => {
    if (!billData) return null;

    const { 
        customerName, 
        mobile, 
        staffName, // Added
        items, 
        subTotal, 
        gst, 
        gstPercentage, 
        discount, 
        finalTotal, 
        paymentMode, 
        shopDetails 
    } = billData;

    const date = getAppTime().toLocaleString();

    return (
        <div ref={ref} className="receipt-container">
            {/* --- Professional A4 Layout --- */}
            <div className="receipt-a4">
                <header className="a4-header" style={{ borderBottom: '2px solid #000' }}>
                    <div className="a4-header-main">
                        {shopDetails?.logo && <img src={shopDetails.logo} alt="Logo" className="a4-logo" />}
                        <div className="a4-shop-info">
                            <h1 className="a4-shop-name" style={{ color: '#000' }}>{(shopDetails?.name || 'GOLD DESK').toUpperCase()}</h1>
                            <p className="a4-shop-address" style={{ color: '#000' }}>{shopDetails?.address || 'Premium Jewelry Excellence'}</p>
                        </div>
                    </div>
                    <div className="a4-invoice-meta">
                        <div className="meta-item"><span className="label text-uppercase fw-bold" style={{ color: '#000' }}>Tax Invoice</span></div>
                        <div className="meta-item"><span className="label">Date:</span> {date}</div>
                        <div className="meta-item"><span className="label">Bill #:</span> {billData.billNumber || 'N/A'}</div>
                    </div>
                </header>

                <section className="a4-customer-section" style={{ background: '#fff', border: '1px solid #000', borderRadius: '0' }}>
                    <div className="a4-billed-to">
                        <p className="section-title" style={{ color: '#000' }}>Billed To:</p>
                        <h3 className="customer-name">{customerName || 'Valued Customer'}</h3>
                        <p className="customer-mobile">Mobile: {mobile || 'N/A'}</p>
                    </div>
                    <div className="a4-payment-info" style={{ textAlign: 'right' }}>
                         <p className="section-title" style={{ color: '#000' }}>Payment Details:</p>
                         <p className="payment-mode">Mode: <span className="value">{(paymentMode || 'N/A').toUpperCase()}</span></p>
                         <p className="staff-info">Staff: <span className="value">{staffName || 'Admin'}</span></p>
                    </div>
                </section>

                <table className="a4-table" style={{ border: '1px solid #000' }}>
                    <thead style={{ borderBottom: '2px solid #000' }}>
                        <tr>
                            <th style={{ textAlign: 'left', background: '#fff', color: '#000', borderRight: '1px solid #000' }}>Item Details</th>
                            <th style={{ background: '#fff', color: '#000', borderRight: '1px solid #000' }}>Weight (g)</th>
                            <th style={{ background: '#fff', color: '#000', borderRight: '1px solid #000' }}>Rate/g</th>
                            <th style={{ background: '#fff', color: '#000', borderRight: '1px solid #000' }}>Tax</th>
                            <th style={{ textAlign: 'right', background: '#fff', color: '#000' }}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => (
                            <tr key={index} style={{ borderBottom: '1px solid #000' }}>
                                <td className="item-name" style={{ borderRight: '1px solid #000' }}>{item.itemName}</td>
                                <td style={{ borderRight: '1px solid #000', textAlign: 'center' }}>{parseFloat(item.weight || 0).toFixed(3)}g</td>
                                <td style={{ borderRight: '1px solid #000', textAlign: 'center' }}>₹{parseFloat(item.ratePerGram || 0).toFixed(2)}</td>
                                <td style={{ borderRight: '1px solid #000', textAlign: 'center' }}>{gstPercentage || 0}%</td>
                                <td className="item-price" style={{ textAlign: 'right' }}>₹{parseFloat(item.price || 0).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="a4-summary-section">
                    <div className="a4-totals-box" style={{ border: '1px solid #000', background: '#fff' }}>
                        <div className="total-row"><span>Gross Subtotal</span><span>₹{parseFloat(subTotal || 0).toFixed(2)}</span></div>
                        <div className="total-row"><span>GST Amount ({gstPercentage || 0}%)</span><span>+ ₹{parseFloat(gst || 0).toFixed(2)}</span></div>
                        <div className="total-row"><span>Discount (Less)</span><span>- ₹{parseFloat(Math.abs(discount || 0)).toFixed(2)}</span></div>
                        <div className="divider" style={{ borderTop: '1px solid #000' }}></div>
                        <div className="total-row final"><span>Net Payable</span><span className="final-value" style={{ color: '#000' }}>₹{parseFloat(finalTotal || 0).toFixed(2)}</span></div>
                    </div>
                </div>

                <footer className="a4-footer" style={{ marginTop: '40px', borderTop: '1px solid #000', paddingTop: '20px' }}>
                    <div className="footer-top">
                        <p className="fw-bold">Terms & Conditions:</p>
                        <ul className="terms-list">
                            <li>All sales of gold/silver items are final.</li>
                            <li>Please verify the weight and purity before leaving the counter.</li>
                        </ul>
                    </div>
                    <div className="footer-bottom" style={{ textAlign: 'center' }}>
                        <p>Thank you for choosing {(shopDetails?.name || 'GoldDesk').toUpperCase()}! Visit again.</p>
                        <p className="timestamp">Generated via GoldDesk SaaS Engine</p>
                    </div>
                </footer>
            </div>

            {/* --- Compact Thermal / Mobile Layout (Optimized for 80mm B&W) --- */}
            <div className="receipt-thermal" style={{ color: '#000', background: '#fff', padding: '10px' }}>
                <div className="thermal-header" style={{ textAlign: 'center' }}>
                    <h2 className="thermal-shop-name" style={{ margin: '0', fontSize: '1.4rem' }}>{(shopDetails?.name || 'GOLD DESK').toUpperCase()}</h2>
                    <p className="thermal-shop-address" style={{ fontSize: '0.8rem', margin: '2px 0' }}>{shopDetails?.address}</p>
                    <p className="thermal-invoice-type" style={{ fontWeight: 'bold', margin: '5px 0' }}>*** TAX INVOICE ***</p>
                    <div className="thermal-divider-heavy" style={{ borderTop: '2px solid #000', margin: '5px 0' }}></div>
                </div>

                <div className="thermal-meta" style={{ fontSize: '0.9rem' }}>
                    <div className="meta-row" style={{ display: 'flex', justifyContent: 'space-between' }}><span>Invoice:</span><span>{billData.billNumber || 'N/A'}</span></div>
                    <div className="meta-row" style={{ display: 'flex', justifyContent: 'space-between' }}><span>Date:</span><span>{new Date().toLocaleDateString()}</span></div>
                    <div className="meta-row" style={{ display: 'flex', justifyContent: 'space-between' }}><span>Staff:</span><span>{staffName || 'Admin'}</span></div>
                    <div className="thermal-divider-heavy" style={{ borderTop: '2px solid #000', margin: '5px 0' }}></div>
                </div>

                <div className="thermal-customer" style={{ fontSize: '0.9rem', margin: '10px 0' }}>
                    <p style={{ fontWeight: 'bold', margin: '0' }}>Customer: {customerName || 'CASH SALE'}</p>
                    <p style={{ margin: '0' }}>Mobile: {mobile || 'N/A'}</p>
                    <div className="thermal-divider-dashed" style={{ borderTop: '1px dashed #000', margin: '5px 0' }}></div>
                </div>

                <div className="thermal-items" style={{ fontSize: '0.9rem' }}>
                    <div className="items-header" style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                        <span style={{ width: '50%' }}>ITEM</span>
                        <span style={{ width: '20%', textAlign: 'center' }}>QTY</span>
                        <span style={{ width: '30%', textAlign: 'right' }}>PRICE</span>
                    </div>
                    <div className="thermal-divider-dashed" style={{ borderTop: '1px dashed #000', margin: '5px 0' }}></div>
                    {items.map((item, index) => (
                        <div key={index} className="item-entry" style={{ margin: '5px 0' }}>
                            <div className="item-main" style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                                <span className="name text-uppercase" style={{ width: '60%' }}>{item.itemName}</span>
                                <span className="qty" style={{ width: '10%' }}>1</span>
                                <span className="price" style={{ width: '30%', textAlign: 'right' }}>₹{parseFloat(item.price || 0).toFixed(2)}</span>
                            </div>
                            <div className="item-sub-details" style={{ fontSize: '0.75rem' }}>
                                {item.weight}g @ ₹{parseFloat(item.ratePerGram).toLocaleString()} / g
                            </div>
                        </div>
                    ))}
                    <div className="thermal-divider-heavy" style={{ borderTop: '2px solid #000', margin: '5px 0' }}></div>
                </div>

                <div className="thermal-summary" style={{ fontSize: '1rem' }}>
                    <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between' }}><span>Sub Total:</span><span>₹{parseFloat(subTotal || 0).toFixed(2)}</span></div>
                    {gst > 0 && <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between' }}><span>GST ({gstPercentage}%):</span><span>+₹{parseFloat(gst || 0).toFixed(2)}</span></div>}
                    {discount > 0 && <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}><span>Discount:</span><span>-₹{parseFloat(Math.abs(discount || 0)).toFixed(2)}</span></div>}
                    <div className="thermal-divider-heavy" style={{ borderTop: '2px solid #000', margin: '5px 0' }}></div>
                    <div className="summary-row grand-total" style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '900', fontSize: '1.2rem' }}><span>NET TOTAL:</span><span>₹{parseFloat(finalTotal || 0).toFixed(2)}</span></div>
                    <div className="thermal-divider-heavy" style={{ borderTop: '2px solid #000', margin: '5px 0' }}></div>
                </div>

                <div className="thermal-footer" style={{ textAlign: 'center', marginTop: '10px', fontSize: '0.85rem' }}>
                    <p style={{ fontWeight: 'bold' }}>Payment: {(paymentMode || 'CASH').toUpperCase()}</p>
                    <p>~ Thank you for your business ~</p>
                    <p style={{ fontWeight: 'bold' }}>VISIT AGAIN!</p>
                </div>
            </div>
        </div>
    );
});

Receipt.displayName = 'Receipt';

export default Receipt;
