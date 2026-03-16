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
                        <div className="meta-item"><span className="label">TAX INVOICE</span></div>
                        <div className="meta-item"><span className="label">Date:</span> {date}</div>
                        <div className="meta-item"><span className="label">Bill #:</span> {billData.billNumber || 'N/A'}</div>
                    </div>
                </header>

                <section className="a4-customer-section">
                    <div className="a4-billed-to">
                        <p className="section-title">Billed To:</p>
                        <h3 className="customer-name">{customerName}</h3>
                        <p className="customer-mobile">Mobile: {mobile}</p>
                    </div>
                    <div className="a4-payment-info">
                         <p className="section-title">Payment Details:</p>
                         <p className="payment-mode">Mode: <span className="value">{(paymentMode || 'N/A').toUpperCase()}</span></p>
                    </div>
                </section>

                <table className="a4-table">
                    <thead>
                        <tr>
                            <th>Item Details</th>
                            <th>Weight (g)</th>
                            <th>Rate/g</th>
                            <th>GST</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => (
                            <tr key={index}>
                                <td className="item-name">{item.itemName}</td>
                                <td>{parseFloat(item.weight || 0).toFixed(3)}g</td>
                                <td>₹{parseFloat(item.ratePerGram || 0).toFixed(2)}</td>
                                <td>{gstPercentage || 0}%</td>
                                <td className="item-price">₹{parseFloat(item.price || 0).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="a4-summary-section">
                    <div className="a4-totals-box">
                        <div className="total-row"><span>Subtotal</span><span>₹{parseFloat(subTotal || 0).toFixed(2)}</span></div>
                        <div className="total-row"><span>Tax (GST {gstPercentage || 0}%)</span><span>+ ₹{parseFloat(gst || 0).toFixed(2)}</span></div>
                        <div className="total-row"><span>Discount</span><span>- ₹{parseFloat(discount || 0).toFixed(2)}</span></div>
                        <div className="total-row final"><span>Final Total</span><span className="final-value">₹{parseFloat(finalTotal || 0).toFixed(2)}</span></div>
                    </div>
                </div>

                <footer className="a4-footer">
                    <p>Thank you for shopping with us!</p>
                    <p className="footer-small">All sales are final. Visit again!</p>
                </footer>
            </div>

            {/* --- Compact Thermal / Mobile Layout --- */}
            <div className="receipt-thermal">
                <div className="thermal-header">
                    <h2 className="thermal-shop-name">{(shopDetails?.name || 'GOLD DESK').toUpperCase()}</h2>
                    <p className="thermal-shop-address">{shopDetails?.address}</p>
                    <div className="thermal-divider-dashed"></div>
                </div>

                <div className="thermal-customer">
                    <p>Bill: {billData.billNumber || 'N/A'}</p>
                    <p>Cust: {customerName}</p>
                    <p>Mob: {mobile}</p>
                    <p>Date: {date}</p>
                    <div className="thermal-divider-dashed"></div>
                </div>

                <div className="thermal-items">
                    <div className="items-header">
                        <span>Item</span>
                        <span>Qty</span>
                        <span>Price</span>
                    </div>
                    {items.map((item, index) => (
                        <div key={index} className="item-row">
                            <div className="item-main">
                                <span className="name">{item.itemName}</span>
                                <span className="qty">1</span>
                                <span className="price">₹{parseFloat(item.price || 0).toFixed(2)}</span>
                            </div>
                            <div className="item-details">
                                {item.weight}g @ ₹{item.ratePerGram}
                            </div>
                        </div>
                    ))}
                    <div className="thermal-divider-dashed"></div>
                </div>

                <div className="thermal-summary">
                    <div className="summary-row"><span>Sub Total:</span><span>₹{parseFloat(subTotal || 0).toFixed(2)}</span></div>
                    {gst > 0 && <div className="summary-row"><span>Tax (GST {gstPercentage}%):</span><span>+₹{parseFloat(gst || 0).toFixed(2)}</span></div>}
                    {discount > 0 && <div className="summary-row"><span>Discount:</span><span>-₹{parseFloat(discount || 0).toFixed(2)}</span></div>}
                    <div className="summary-row total"><span>TOTAL:</span><span>₹{parseFloat(finalTotal || 0).toFixed(2)}</span></div>
                    <div className="thermal-divider-dashed"></div>
                </div>

                <div className="thermal-footer">
                    <p>Mode: {(paymentMode || 'N/A').toUpperCase()}</p>
                    <p>Thank you for your business!</p>
                    <p>Visit Again!</p>
                </div>
            </div>
        </div>
    );
});

Receipt.displayName = 'Receipt';

export default Receipt;
