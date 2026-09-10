import {configureStore} from "@reduxjs/toolkit";
import codingReducer from "../features/coding/codingSlice"

export const store = configureStore({
    reducer: {
        coding: codingReducer
    }
})