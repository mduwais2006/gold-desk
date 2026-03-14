import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../utils/api';

export const fetchAnalyticsData = createAsyncThunk(
    'analytics/fetchData',
    async (_, { rejectWithValue }) => {
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
        status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
        error: null,
    },
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchAnalyticsData.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(fetchAnalyticsData.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.data = action.payload;
            })
            .addCase(fetchAnalyticsData.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload;
            });
    },
});

export default analyticsSlice.reducer;
