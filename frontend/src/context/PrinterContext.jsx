import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-toastify';

const PrinterContext = createContext();

export const usePrinter = () => {
    const context = useContext(PrinterContext);
    if (!context) {
        throw new Error('usePrinter must be used within a PrinterProvider');
    }
    return context;
};

export const PrinterProvider = ({ children }) => {
    const [connectedDevice, setConnectedDevice] = useState(null);
    const [isPrinterActive, setIsPrinterActive] = useState(!!localStorage.getItem('posPrinter'));
    const [isReconnecting, setIsReconnecting] = useState(false);

    const setupDeviceListeners = (device) => {
        device.addEventListener('gattserverdisconnected', () => {
            console.warn('GATT Disconnected. Recovery will be attempted on next print.');
            // Do NOT remove the connectedDevice as we will use it to auto-reconnect on the next print
            window.dispatchEvent(new Event('printerStateChanged'));
        });
    };

    // Initial check for saved printer and attempt auto-connect (if supported)
    useEffect(() => {
        const attemptAutoReconnect = async () => {
            const savedPrinterId = localStorage.getItem('posPrinter');
            if (savedPrinterId && !connectedDevice && navigator.bluetooth && navigator.bluetooth.getDevices) {
                try {
                    setIsReconnecting(true);
                    const devices = await navigator.bluetooth.getDevices();
                    const device = devices.find(d => d.id === savedPrinterId);
                    
                    if (device) {
                        try {
                            await device.gatt.connect();
                            setupDeviceListeners(device);
                            setConnectedDevice(device);
                            setIsPrinterActive(true);
                        } catch {
                            // BT device paired but not in range — silently skip
                        }
                    }
                } catch {
                    // Silently ignore — BT is optional
                } finally {
                    setIsReconnecting(false);
                }
            }
        };

        attemptAutoReconnect();
    }, []);

    // Global listeners for storage changes (sync across tabs/windows)
    useEffect(() => {
        const syncState = () => {
            setIsPrinterActive(!!localStorage.getItem('posPrinter'));
        };
        window.addEventListener('storage', syncState);
        window.addEventListener('printerStateChanged', syncState);
        return () => {
            window.removeEventListener('storage', syncState);
            window.removeEventListener('printerStateChanged', syncState);
        };
    }, []);

    const reconnectDevice = async () => {
        // Return the cached device instance so that the printing utility can call device.gatt.connect() transparently.
        if (connectedDevice) return connectedDevice;

        const savedPrinterId = localStorage.getItem('posPrinter');
        if (savedPrinterId && navigator.bluetooth && navigator.bluetooth.getDevices) {
            try {
                setIsReconnecting(true);
                const devices = await navigator.bluetooth.getDevices();
                const device = devices.find(d => d.id === savedPrinterId);
                
                if (device) {
                    await device.gatt.connect();
                    setupDeviceListeners(device);
                    setConnectedDevice(device);
                    setIsPrinterActive(true);
                    return device;
                }
            } catch {
                // BT wake-up failed silently — browser print still works
            } finally {
                setIsReconnecting(false);
            }
        }
        return null;
    };

    const value = {
        connectedDevice,
        setConnectedDevice,
        isPrinterActive,
        setIsPrinterActive,
        isReconnecting,
        setupDeviceListeners,
        reconnectDevice
    };

    return (
        <PrinterContext.Provider value={value}>
            {children}
        </PrinterContext.Provider>
    );
};
