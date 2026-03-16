// utility to physically send ESC/POS byte commands to a connected Web Bluetooth Printer
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Deep Reset Strategy:
 * If a GATT operation fails with "GATT Error Unknown" or "NotSupportedError",
 * we disconnect the device, wait 1 second, and force a fresh connection.
 */
const performGattOperation = async (device, operationFn) => {
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
        try {
            // Ensure connection
            if (!device.gatt.connected) {
                await device.gatt.connect();
                await sleep(800); // Wait for services to resolve after physical link
            }
            return await operationFn(device);
        } catch (err) {
            attempts++;
            const errorMsg = err.message || "";
            const isGattError = errorMsg.includes("GATT") || errorMsg.includes("NotSupported");

            if (isGattError && attempts < maxAttempts) {
                console.warn(`[GATT] Hardware busy or out of sync. Attempting Deep Reset (${attempts}/${maxAttempts})...`);
                try {
                    if (device.gatt.connected) device.gatt.disconnect();
                } catch (e) {}
                await sleep(1500); // Chill out period for hardware buffer
                continue;
            }
            throw err;
        }
    }
};

export const printReceiptBluetooth = async (device, data) => {
    if (!device || !device.gatt) {
        throw new Error("No active Bluetooth device found. Please pair printer in Settings.");
    }

    return await performGattOperation(device, async (connectedDevice) => {
        // Find typical printer service - Skip Generic Access (0x1800) and Attribute (0x1801)
        const allServices = await connectedDevice.gatt.getPrimaryServices();
        const services = allServices.filter(s => 
            !s.uuid.includes("1800") && 
            !s.uuid.includes("1801")
        );
        
        if (services.length === 0) {
            throw new Error("No printer services found. Access denied or device incompatible.");
        }

        let targetCharacteristic = null;
        for (const service of services) {
            try {
                const characteristics = await service.getCharacteristics();
                // Prefer writeWithoutResponse for ESC/POS stability
                targetCharacteristic = characteristics.find(c => c.properties.writeWithoutResponse) || 
                                     characteristics.find(c => c.properties.write);
                if (targetCharacteristic) break;
            } catch (e) {
                continue; // Move to next service if discovery fails on this one
            }
        }

        if (!targetCharacteristic) {
            throw new Error("Could not find a writable channel on this printer.");
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
        const feed = [0x0A];

        // --- Build Receipt ---
        addCommand(init);
        addCommand(center);
        addCommand(boldOn);
        addText((data.shopDetails?.name || "RETAIL SHOP").toUpperCase() + "\n");
        addCommand(boldOff);
        
        if (data.shopDetails?.address) {
            const addressLines = data.shopDetails.address.split('\n');
            addressLines.forEach(line => {
                if (line.trim()) addText(line.trim() + "\n");
            });
        }
        addText("\n");

        addCommand(left);
        addText(`Cust : ${data.customerName || 'N/A'}\n`);
        addText(`Mob  : ${data.mobile || 'N/A'}\n`);
        addText(`Date : ${new Date().toLocaleString()}\n`);
        addText("-".repeat(32) + "\n");

        addText("Item             Qty     Price\n");
        addText("-".repeat(32) + "\n");

        (data.items || []).forEach(item => {
            const itemNameBase = (item.itemName || "Item").substring(0, 15).padEnd(16);
            const qty = "1".padEnd(4); 
            const priceStr = `₹${(item.price || 0).toFixed(2)}`.padStart(11);
            addText(`${itemNameBase} ${qty} ${priceStr}\n`);
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

        // Feed
        addCommand(feed);
        addCommand(feed);
        addCommand(feed);

        // Send to Printer (Chunked)
        const chunkSize = 100;
        for (let i = 0; i < dataBuffer.length; i += chunkSize) {
            const chunk = new Uint8Array(dataBuffer.slice(i, i + chunkSize));
            if (targetCharacteristic.properties.writeWithoutResponse) {
                await targetCharacteristic.writeValueWithoutResponse(chunk);
            } else {
                await targetCharacteristic.writeValue(chunk);
            }
            await sleep(35); // Slightly higher delay for thermal buffer stability
        }

        return true;
    });
};

// utility to resolve "Unknown Device" by reading the actual device name from GATT Generic Access Service (0x1800)
export const resolveDeviceName = async (device) => {
    if (!device || !device.gatt) return null;
    
    try {
        return await performGattOperation(device, async (connectedDevice) => {
            await sleep(300);
            const service = await connectedDevice.gatt.getPrimaryService(0x1800);
            const characteristic = await service.getCharacteristic(0x2A00);
            const value = await characteristic.readValue();
            const name = new TextDecoder('utf-8').decode(value);
            return name || null;
        });
    } catch (error) {
        console.warn("Could not resolve device name via GATT:", error);
        return null;
    }
};
