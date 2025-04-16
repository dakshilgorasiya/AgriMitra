import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
const API_URL = import.meta.env.VITE_BACKEND_URL;


export const loginUser = createAsyncThunk(
    'auth/loginUser',
    async (credentials, thunkAPI) => {
        try {
            const response = await axios.post(`${API_URL}/user/login`, credentials, {
                withCredentials: true,
            });
            return response.data;
        } catch (error) {
            return thunkAPI.rejectWithValue(error.response.data);
        }
    }
);

export const signupUser = createAsyncThunk(
    'auth/signupUser',
    async (userData, thunkAPI) => {
        try {
            // console.log(userData);
            const response = await axios.post(`${API_URL}/user/register`, userData, {
                withCredentials: true
            });

            return response.data;
        } catch (error) {
            return thunkAPI.rejectWithValue(error.response.data);
        }
    }
);

export const updateAvatar = createAsyncThunk(
    '/user/update-avatar',
    async (formData, thunkAPI) => {
        try {
            const response = await axios.patch(
                `${API_URL}/user/update-avatar`,
                formData,
                {
                    withCredentials: true, // Ensure cookies are sent with the request
                    headers: { 'Content-Type': 'multipart/form-data' }
                }
            );
            return response.data;
        } catch (error) {
            return thunkAPI.rejectWithValue(error.response.data);
        }
    }
);

export const completeProfile = createAsyncThunk(
    '/user/complete-profile',
    async (userData, thunkAPI) => {
        try {
            // console.log(userData);
            const response = await axios.patch(
                `${API_URL}/user/complete-profile`,
                userData,
                {
                    withCredentials: true,
                }
            );
            return response.data;
        } catch (error) {
            return thunkAPI.rejectWithValue(error.response.data);
        }
    }
);
const refreshAccessToken = async () => {
    try {
        const res = await axios.get(`${API_URL}/user/refresh-token`, {
            withCredentials: true,
        });
        return res.data;
    } catch (error) {
        console.error("Token refresh failed:", error);
        throw error;
    }
};
export const getUser = createAsyncThunk(
    '/user/get-user',
    async (_, thunkAPI) => {
        try {
            // Try to fetch the user
            const response = await axios.get(`${API_URL}/user/current-user`, {
                withCredentials: true,
            });
            return response.data;
        } catch (error) {
            if (error.response && error.response.status === 401) {

                try {
                    const resp = await refreshAccessToken();
                    // console.log("Token refreshed successfully:", resp);
                    const retryResponse = await axios.get(`${API_URL}/user/current-user`, {
                        withCredentials: true,
                    });
                    return retryResponse.data;
                } catch (refreshError) {
                    // console.error("Refresh failed, logging out...");
                    thunkAPI.dispatch(logout()); // Log the user out if refresh fails
                    return thunkAPI.rejectWithValue("Session expired. Please log in again.");
                }
            }

            // If it's another error, just reject it normally
            return thunkAPI.rejectWithValue(error.response?.data || "An error occurred");
        }
    }
);

export const forgetPassword = createAsyncThunk(
    '/user/forget-password',
    async (email, thunkAPI) => {
        // console.log(email);
        try {
            const response = await axios.post(
                `${API_URL}/user/forgot-password`,
                email,
                {
                    withCredentials: true,
                }
            );
            return response.data;
        } catch (error) {
            return thunkAPI.rejectWithValue(error.response.data);
        }
    }
);

export const logoutUser = createAsyncThunk(
    '/user/logout',
    async (_, thunkAPI) => {
        try {
            const response = await axios.post(`${API_URL}/user/logout`, {}, {
                withCredentials: true,
            });
            return response.data;
        } catch (error) {
            return thunkAPI.rejectWithValue(error.response.data);
        }
    }
);

export const resetPassword = createAsyncThunk(
    '/user/reset-password',
    async ({ id, newPassword, confirmPassword }, thunkAPI) => {
        try {
            const response = await axios.post(`${API_URL}/user/reset-password/${id}`, {
                password: newPassword,
                confirmPassword
            }, {
                withCredentials: true,
            });
            return response.data;
        } catch (error) {
            return thunkAPI.rejectWithValue(error.response.data);
        }
    }
);

const authSlice = createSlice({
    name: 'auth',
    initialState: {
        user: null,
        loading: true,
        error: null,
    },
    reducers: {
        setUser: (state, action) => {
            state.user = action.payload;
            state.loading = false;
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(loginUser.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(loginUser.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload.data;
            })
            .addCase(loginUser.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Signup
            .addCase(signupUser.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(signupUser.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload.data;
            })
            .addCase(signupUser.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Update Avatar
            .addCase(updateAvatar.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateAvatar.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload.data;
            })
            .addCase(updateAvatar.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Complete Profile
            .addCase(completeProfile.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(completeProfile.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload.data;
            })
            .addCase(completeProfile.rejected, (state, action) => {
                state.loading = false;
                state.error = action
            })
            // Forget Password
            .addCase(forgetPassword.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(forgetPassword.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(forgetPassword.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Get User
            .addCase(getUser.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(getUser.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload.data;
            })
            .addCase(getUser.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Logout
            .addCase(logoutUser.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(logoutUser.fulfilled, (state) => {
                state.loading = false;
                state.user = null;
            })
            .addCase(logoutUser.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Reset Password
            .addCase(resetPassword.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(resetPassword.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(resetPassword.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });


    },
});

export const { logout, setUser } = authSlice.actions;
export default authSlice.reducer;