import { configureStore } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";

import companiesReducer from "./features/companies/slice/companies.slice";
import intelligenceReducer from "./features/intelligence/slice/intelligence.slice";
import skillsReducer from "./features/skills/slice/skills.slice";
import talentCheckReducer from "./features/talentCheck/slice/talentCheck.slice";
import skillMatchReducer from "./features/skillMatch/slice/skillMatch.slice";

export const store = configureStore({
  reducer: {
    companies: companiesReducer,
    intelligence: intelligenceReducer,
    skills: skillsReducer,
    talentCheck: talentCheckReducer,
    skillMatch: skillMatchReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();

export default store;
