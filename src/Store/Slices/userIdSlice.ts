import { createSlice } from '@reduxjs/toolkit';

const userIdSlice = createSlice({
  name: 'userId',
  initialState: null,
  reducers: {
    setStoreUserID: (state, action) => {
      return action.payload;
    },
  },
});

export const { setStoreUserID } = userIdSlice.actions;

export default userIdSlice.reducer;