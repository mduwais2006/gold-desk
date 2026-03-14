// utility to physically send ESC/POS byte commands to a connected Web Bluetooth Printer
export const printReceiptBluetooth = async (device, data) => {
    if (!device || !device.gatt) {
        throw new Error("No active Bluetooth device found. Please pair printer in Settings.");
    }

    if (!device.gatt.connected) {
        try {
            await device.gatt.connect();
        } catch (error) {
            throw new Error("Failed to reconnect to Bluetooth printer. Please ensure it is powered on and in range.");
        }
    }

    try {
        // Find typical printer service
        let services;
        try {
            services = await device.gatt.getPrimaryServices();
        } catch (serviceErr) {
            throw new Error("Hardware integration updated. Please go to Settings > System Hub, click 'Disconnect Machine', and 'Scan Bluetooth' again to re-pair the printer. (If multiple show up, select the one with BLE or LE in the name).");
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
        addText(`Cust : ${data.customerName}\n`);
        addText(`Mob  : ${data.mobile}\n`);
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
        addText(`Sub Total:       ₹${data.subTotal.toFixed(2)}\n`);
        if (data.gst > 0) {
            const gstLabel = `Tax (GST ${data.gstPercentage}%):`.padEnd(16);
            addText(`${gstLabel} +₹${data.gst.toFixed(2)}\n`);
        }
        if (data.discount > 0) addText(`Discount:        -₹${Math.abs(data.discount).toFixed(2)}\n`);

        addCommand(boldOn);
        addText(`TOTAL:           ₹${data.finalTotal.toFixed(2)}\n`);
        addCommand(boldOff);
        addText("-".repeat(32) + "\n");

        addCommand(center);
        addText(`Mode: ${data.paymentMode.toUpperCase()}\n`);
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
