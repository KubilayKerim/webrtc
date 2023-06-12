import { configureStore } from '@reduxjs/toolkit'
import pollReducer from './Slices/pollSlice'
import userReducer from './Slices/userIdSlice'
export const store = configureStore({
  reducer: {
    poll: pollReducer,
    userId: userReducer
},
})

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch