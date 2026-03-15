import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../utils/api';

// CACHE EXPIRY: 5 Minutes (300,000 ms)
const CACHE_EXPIRY = 300000;

export const fetchAnalyticsData = createAsyncThunk(
    'analytics/fetchData',
    async (force = false, { getState, rejectWithValue }) => {
        const { analytics } = getState();
        const now = Date.now();

        // WARP SPEED CACHE: Return existing data if it's fresh enough (unless forced)
        if (!force && analytics.data?.stats && analytics.lastFetched && (now - analytics.lastFetched < CACHE_EXPIRY)) {
            console.log('⚡ WARP SPEED: Serving Analytics from Cache');
            return analytics.data;
        }

        try {
            const { data } = await api.get('/analytics');
            return data;
        } catch (error) {
            return rejectWithValue(error.response?.data || 'Failed to fetch analytics');
        }
    }
);

const analyticsSlice = createSlice({
    name: 'analytics',
    initialState: {
        data: [],
        status: 'idle', 
        lastFetched: null,
        error: null,
    },
    reducers: {
        clearCache: (state) => {
            state.lastFetched = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchAnalyticsData.pending, (state) => {
                // Only show loading if we don't have fresh data
                if (!state.lastFetched) state.status = 'loading';
            })
            .addCase(fetchAnalyticsData.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.data = action.payload;
                state.lastFetched = Date.now();
            })
            .addCase(fetchAnalyticsData.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload;
            });
    },
});

export const { clearCache } = analyticsSlice.actions;
export default analyticsSlice.reducer;
