import { configureStore } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";

import companiesReducer from "./features/companies/slice/companies.slice";
import intelligenceReducer from "./features/intelligence/slice/intelligence.slice";
import profileReducer from "./features/profile/slice/profile.slice";
import skillsReducer from "./features/skills/slice/skills.slice";
import talentCheckReducer from "./features/talentCheck/slice/talentCheck.slice";
import resumeReducer from "./features/resume/slice/resume.slice";

export const store = configureStore({
  reducer: {
    companies: companiesReducer,
    intelligence: intelligenceReducer,
    profile: profileReducer,
    skills: skillsReducer,
    talentCheck: talentCheckReducer,
    resume: resumeReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();

export default store;
