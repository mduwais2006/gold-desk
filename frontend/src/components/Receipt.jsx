import React, { forwardRef } from 'react';
import { getAppTime } from '../utils/timeUtils';

const Receipt = forwardRef(({ billData }, ref) => {
    if (!billData) return null;

    const { 
        customerName, 
        mobile, 
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
                <header className="a4-header">
                    <div className="a4-header-main">
                        {shopDetails?.logo && <img src={shopDetails.logo} alt="Logo" className="a4-logo" />}
                        <div className="a4-shop-info">
                            <h1 className="a4-shop-name">{(shopDetails?.name || 'GOLD DESK').toUpperCase()}</h1>
                            <p className="a4-shop-address">{shopDetails?.address || 'Premium Jewelry Excellence'}</p>
                        </div>
                    </div>
                    <div className="a4-invoice-meta">
                        <div className="meta-item"><span className="label text-uppercase fw-bold">Tax Invoice</span></div>
                        <div className="meta-item"><span className="label">Date:</span> {date}</div>
                        <div className="meta-item"><span className="label">Bill #:</span> {billData.billNumber || 'N/A'}</div>
                    </div>
                </header>

                <section className="a4-customer-section">
                    <div className="a4-billed-to">
                        <p className="section-title">Billed To:</p>
                        <h3 className="customer-name">{customerName || 'Valued Customer'}</h3>
                        <p className="customer-mobile">Mobile: {mobile || 'N/A'}</p>
                    </div>
                    <div className="a4-payment-info">
                         <p className="section-title">Payment Details:</p>
                         <p className="payment-mode">Mode: <span className="value">{(paymentMode || 'N/A').toUpperCase()}</span></p>
                    </div>
                </section>

                <table className="a4-table">
                    <thead>
                        <tr>
                            <th style={{ textAlign: 'left' }}>Item Details</th>
                            <th>Weight (g)</th>
                            <th>Rate/g</th>
                            <th>Tax</th>
                            <th style={{ textAlign: 'right' }}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => (
                            <tr key={index}>
                                <td className="item-name">{item.itemName}</td>
                                <td>{parseFloat(item.weight || 0).toFixed(3)}g</td>
                                <td>₹{parseFloat(item.ratePerGram || 0).toFixed(2)}</td>
                                <td>{gstPercentage || 0}%</td>
                                <td className="item-price" style={{ textAlign: 'right' }}>₹{parseFloat(item.price || 0).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="a4-summary-section">
                    <div className="a4-totals-box">
                        <div className="total-row"><span>Gross Subtotal</span><span>₹{parseFloat(subTotal || 0).toFixed(2)}</span></div>
                        <div className="total-row"><span>GST Amount ({gstPercentage || 0}%)</span><span>+ ₹{parseFloat(gst || 0).toFixed(2)}</span></div>
                        <div className="total-row"><span>Discount / Less</span><span>- ₹{parseFloat(Math.abs(discount || 0)).toFixed(2)}</span></div>
                        <div className="divider"></div>
                        <div className="total-row final"><span>Net Payable</span><span className="final-value">₹{parseFloat(finalTotal || 0).toFixed(2)}</span></div>
                    </div>
                </div>

                <footer className="a4-footer">
                    <div className="footer-top">
                        <p className="fw-bold">Terms & Conditions:</p>
                        <ul className="terms-list">
                            <li>All sales of gold/silver items are final.</li>
                            <li>Please verify the weight and purity before leaving the counter.</li>
                        </ul>
                    </div>
                    <div className="footer-bottom">
                        <p>Thank you for choosing GoldDesk! Visit again for premium collections.</p>
                        <p className="timestamp">Generated via GoldDesk SaaS Engine</p>
                    </div>
                </footer>
            </div>

            {/* --- Compact Thermal / Mobile Layout (Optimized for 80mm) --- */}
            <div className="receipt-thermal">
                <div className="thermal-header">
                    <h2 className="thermal-shop-name">{(shopDetails?.name || 'GOLD DESK').toUpperCase()}</h2>
                    <p className="thermal-shop-address">{shopDetails?.address}</p>
                    <p className="thermal-invoice-type">*** TAX INVOICE ***</p>
                    <div className="thermal-divider-heavy"></div>
                </div>

                <div className="thermal-meta">
                    <div className="meta-row"><span>Invoice:</span><span>{billData.billNumber || 'N/A'}</span></div>
                    <div className="meta-row"><span>Date:</span><span>{new Date().toLocaleDateString()}</span></div>
                    <div className="meta-row"><span>Time:</span><span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
                    <div className="thermal-divider-heavy"></div>
                </div>

                <div className="thermal-customer">
                    <p className="fw-bold fs-6">Customer: {customerName || 'CASH SALE'}</p>
                    <p>Mobile: {mobile || 'N/A'}</p>
                    <div className="thermal-divider-dashed"></div>
                </div>

                <div className="thermal-items">
                    <div className="items-header">
                        <span className="text-start">ITEM</span>
                        <span className="text-center">QTY</span>
                        <span className="text-end">AMOUNT</span>
                    </div>
                    <div className="thermal-divider-dashed"></div>
                    {items.map((item, index) => (
                        <div key={index} className="item-entry">
                            <div className="item-main">
                                <span className="name text-uppercase fw-bold">{item.itemName}</span>
                                <span className="qty">1</span>
                                <span className="price">₹{parseFloat(item.price || 0).toFixed(2)}</span>
                            </div>
                            <div className="item-sub-details">
                                {item.weight}g @ ₹{parseFloat(item.ratePerGram).toLocaleString()} / g
                            </div>
                        </div>
                    ))}
                    <div className="thermal-divider-heavy" style={{ marginTop: '5px' }}></div>
                </div>

                <div className="thermal-summary">
                    <div className="summary-row"><span>Sub Total:</span><span>₹{parseFloat(subTotal || 0).toFixed(2)}</span></div>
                    {gst > 0 && <div className="summary-row"><span>GST ({gstPercentage}%):</span><span>+₹{parseFloat(gst || 0).toFixed(2)}</span></div>}
                    {discount > 0 && <div className="summary-row"><span>Discount:</span><span>-₹{parseFloat(Math.abs(discount || 0)).toFixed(2)}</span></div>}
                    <div className="thermal-divider-heavy"></div>
                    <div className="summary-row grand-total"><span>NET TOTAL:</span><span>₹{parseFloat(finalTotal || 0).toFixed(2)}</span></div>
                    <div className="thermal-divider-heavy"></div>
                </div>

                <div className="thermal-footer">
                    <p className="fw-bold">Payment: {(paymentMode || 'CASH').toUpperCase()}</p>
                    <p className="visit-msg">~ Thank you for your business ~</p>
                    <p className="visit-msg">VISIT AGAIN!</p>
                </div>
            </div>
        </div>
    );
});

Receipt.displayName = 'Receipt';

export default Receipt;
