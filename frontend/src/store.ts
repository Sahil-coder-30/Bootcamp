import { configureStore } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";

import authReducer from "./features/auth/slice/auth.slice";
import companiesReducer from "./features/companies/slice/companies.slice";
import intelligenceReducer from "./features/intelligence/slice/intelligence.slice";
import profileReducer from "./features/profile/slice/profile.slice";
import skillsReducer from "./features/skills/slice/skills.slice";
import talentCheckReducer from "./features/talentCheck/slice/talentCheck.slice";
import resumeReducer from "./features/resume/slice/resume.slice";
import jdReducer from "./features/jd/slice/jd.slice";
import skillMatchReducer from "./features/skillMatch/slice/skillMatch.slice";
import dashboardReducer from "./features/dashboard/slice/dashboard.slice";
import flowReducer from "./features/flow/slice/flow.slice";
import landingReducer from "./features/landing/slice/landing.slice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    companies: companiesReducer,
    intelligence: intelligenceReducer,
    profile: profileReducer,
    skills: skillsReducer,
    talentCheck: talentCheckReducer,
    resume: resumeReducer,
    jd: jdReducer,
    skillMatch: skillMatchReducer,
    dashboard: dashboardReducer,
    flow: flowReducer,
    landing: landingReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();

export default store;
