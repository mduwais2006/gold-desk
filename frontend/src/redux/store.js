import { configureStore } from '@reduxjs/toolkit';
import analyticsReducer from './analyticsSlice';
import goldRatesReducer from './goldRatesSlice';

export const store = configureStore({
    reducer: {
        analytics: analyticsReducer,
        goldRates: goldRatesReducer
    }
});
