// utility to physically send ESC/POS byte commands to a connected Web Bluetooth Printer
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const printReceiptBluetooth = async (device, data) => {
    if (!device || !device.gatt) {
        throw new Error("No active Bluetooth device found. Please pair printer in Settings.");
    }

    if (!device.gatt.connected) {
        try {
            await device.gatt.connect();
            // Stabilization delay: wait for GATT server to ready services
            await sleep(500);
        } catch (error) {
            throw new Error("Failed to reconnect to Bluetooth printer. Please ensure it is powered on and in range.");
        }
    } else {
        // Even if already connected, a small pause ensures previous operations have cleared
        await sleep(100);
    }

    try {
        // Find typical printer service - with retry logic for "GATT Unknown Error"
        let services;
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            try {
                services = await device.gatt.getPrimaryServices();
                break; // Success
            } catch (err) {
                attempts++;
                if (attempts >= maxAttempts) {
                    throw new Error("Hardware integration updated. Please go to Settings > System Hub, click 'Disconnect Machine', and 'Scan Bluetooth' again to re-pair the printer. (If multiple show up, select the one with BLE or LE in the name).");
                }
                console.warn(`GATT Service Discovery failed (Attempt ${attempts}/${maxAttempts}). Retrying in 500ms...`);
                await sleep(500);
            }
        }
        
        let targetCharacteristic = null;

        for (const service of services) {
            const characteristics = await service.getCharacteristics();
            // We want a characteristic that supports 'write'
            for (const char of characteristics) {
                if (char.properties.write || char.properties.writeWithoutResponse) {
                    targetCharacteristic = char;
                    break;
                }
            }
            if (targetCharacteristic) break;
        }

        if (!targetCharacteristic) {
            throw new Error("Could not find a writable characteristic on this printer.");
        }

        // ECS/POS Builder
        const encoder = new TextEncoder();
        let dataBuffer = [];

        const addCommand = (cmd) => dataBuffer.push(...cmd);
        const addText = (text) => dataBuffer.push(...encoder.encode(text));

        // Format Functions
        const init = [0x1B, 0x40];
        const center = [0x1B, 0x61, 0x01];
        const left = [0x1B, 0x61, 0x00];
        const boldOn = [0x1B, 0x45, 0x01];
        const boldOff = [0x1B, 0x45, 0x00];
        const feed = [0x0A]; // Line feed

        // --- Build Receipt ---
        addCommand(init);
        addCommand(center);
        addCommand(boldOn);
        addText((data.shopDetails?.name || "RETAIL SHOP").toUpperCase() + "\n");
        addCommand(boldOff);
        
        if (data.shopDetails?.address) {
            // Split by newline and print each line centered
            const addressLines = data.shopDetails.address.split('\n');
            addressLines.forEach(line => {
                if (line.trim()) {
                    addText(line.trim() + "\n");
                }
            });
        } else {
            addText("Thank you for your business!\n");
        }
        addText("\n");

        addCommand(left);
        addText(`Cust : ${data.customerName || 'N/A'}\n`);
        addText(`Mob  : ${data.mobile || 'N/A'}\n`);
        addText(`Date : ${new Date().toLocaleString()}\n`);
        addText("-".repeat(32) + "\n");

        addText("Item             Qty     Price\n");
        addText("-".repeat(32) + "\n");

        data.items.forEach(item => {
            const itemNameBase = (item.itemName || "Item").substring(0, 15).padEnd(16);
            const qty = "1".padEnd(4); 
            const priceStr = `₹${item.price.toFixed(2)}`.padStart(11);
            addText(`${itemNameBase} ${qty} ${priceStr}\n`);
            
            let itemDetails = `  (Wt: ${item.weight}g`;
            if (item.ratePerGram) itemDetails += `, Rate: ${item.ratePerGram}`;
            if (data.gstPercentage > 0) {
                const itemGst = (item.price * data.gstPercentage) / 100;
                itemDetails += `, GST ${data.gstPercentage}%: ₹${itemGst.toFixed(0)}`;
            }
            addText(itemDetails + ")\n");
        });

        addText("-".repeat(32) + "\n");
        addText(`Sub Total:       ₹${(data.subTotal || 0).toFixed(2)}\n`);
        if ((data.gst || 0) > 0) {
            const gstLabel = `Tax (GST ${data.gstPercentage || 0}%):`.padEnd(16);
            addText(`${gstLabel} +₹${(data.gst || 0).toFixed(2)}\n`);
        }
        if ((data.discount || 0) > 0) addText(`Discount:        -₹${Math.abs(data.discount || 0).toFixed(2)}\n`);

        addCommand(boldOn);
        addText(`TOTAL:           ₹${(data.finalTotal || 0).toFixed(2)}\n`);
        addCommand(boldOff);
        addText("-".repeat(32) + "\n");

        addCommand(center);
        addText(`Mode: ${(data.paymentMode || 'N/A').toUpperCase()}\n`);
        addText("Keep this receipt for returns.\n");
        addText("Visit Again!\n");

        // Feed lines to separate from tear bar
        addCommand(feed);
        addCommand(feed);
        addCommand(feed);

        // Send to Printer (Chunked because BLE has max payload limits, usually 20-512 bytes)
        const chunkSize = 100;
        for (let i = 0; i < dataBuffer.length; i += chunkSize) {
            const chunk = new Uint8Array(dataBuffer.slice(i, i + chunkSize));
            if (targetCharacteristic.properties.write) {
                await targetCharacteristic.writeValue(chunk);
            } else {
                await targetCharacteristic.writeValueWithoutResponse(chunk);
            }
            // slight delay to prevent hardware buffer overflow
            await new Promise(r => setTimeout(r, 20));
        }

        return true;
    } catch (err) {
        console.error("Bluetooth Print Error:", err);
        throw err;
    }
};

// utility to resolve "Unknown Device" by reading the actual device name from GATT Generic Access Service (0x1800)
export const resolveDeviceName = async (device) => {
    if (!device || !device.gatt || !device.gatt.connected) return null;
    
    try {
        await sleep(200); // Brief pause before GATT read
        // Generic Access Service (standard UUID 0x1800)
        const service = await device.gatt.getPrimaryService(0x1800);
        // Device Name Characteristic (standard UUID 0x2A00)
        const characteristic = await service.getCharacteristic(0x2A00);
        const value = await characteristic.readValue();
        const decoder = new TextDecoder('utf-8');
        const name = decoder.decode(value);
        return name || null;
    } catch (error) {
        console.warn("Could not resolve device name via GATT:", error);
        return null;
    }
};
