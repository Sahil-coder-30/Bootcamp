import {
  Award, Briefcase, Building2, Compass, Cpu, DollarSign, Globe, Handshake, Heart, LineChart,
  Mail, MapPin, Newspaper, Rocket, Shield, ShieldCheck, Star, Swords, Target, TrendingUp, Users, Wallet,
  type LucideIcon,
} from "lucide-react";
import { titleCaseFromCode, type CompanyProfile } from "@/lib/companyData";

export type FieldType = "auto" | "url" | "video" | "rating" | "list" | "paragraph";

export interface IntelField {
  key: string;
  label: string;
  type: FieldType;
  value?: string;
}

export interface IntelSection {
  id: string;
  title: string;
  icon: LucideIcon;
  fields: IntelField[];
}

const f = (key: string, type: FieldType = "auto", label?: string): IntelField => ({
  key,
  type,
  label: label ?? titleCaseFromCode(key),
});

const SCHEMA: Omit<IntelSection, "id">[] = [
  { title: "Company Identity", icon: Building2, fields: [f("name"), f("short_name"), f("category"), f("company_type", "auto", "Placement Category"), f("incorporation_year"), f("nature_of_company"), f("employee_size"), f("headquarters_address", "auto", "Headquarters")] },
  { title: "Overview & Vision", icon: Compass, fields: [f("overview_text", "paragraph", "Overview"), f("vision_statement", "paragraph", "Vision"), f("mission_statement", "paragraph", "Mission"), f("core_values", "list"), f("history_timeline", "list", "History & Timeline")] },
  { title: "Leadership", icon: Users, fields: [f("ceo_name", "auto", "CEO"), f("ceo_linkedin_url", "url", "CEO LinkedIn"), f("key_leaders", "list"), f("board_members", "list"), f("warm_intro_pathways", "list"), f("decision_maker_access", "paragraph")] },
  { title: "Funding & Financials", icon: DollarSign, fields: [f("annual_revenue"), f("annual_profit"), f("revenue_mix", "list"), f("valuation"), f("yoy_growth_rate", "auto", "YoY Growth Rate"), f("profitability_status"), f("key_investors", "list"), f("recent_funding_rounds"), f("total_capital_raised"), f("burn_rate"), f("runway_months"), f("burn_multiplier")] },
  { title: "Global Presence", icon: Globe, fields: [f("operating_countries", "list"), f("office_count"), f("office_locations", "list"), f("global_exposure", "list")] },
  { title: "Products & Services", icon: Briefcase, fields: [f("offerings_description", "list", "Offerings"), f("focus_sectors", "list"), f("pain_points_addressed", "list"), f("top_customers", "list"), f("product_pipeline", "list"), f("case_studies", "list")] },
  { title: "Technology Stack", icon: Cpu, fields: [f("tech_stack", "list"), f("ai_ml_adoption_level", "paragraph", "AI/ML Adoption"), f("r_and_d_investment", "auto", "R&D Investment"), f("intellectual_property", "list"), f("cybersecurity_posture", "list"), f("tech_adoption_rating"), f("automation_level")] },
  { title: "Partnerships & Ecosystem", icon: Handshake, fields: [f("technology_partners", "list"), f("partnership_ecosystem", "list"), f("industry_associations", "list"), f("event_participation", "list")] },
  { title: "Competitive Landscape", icon: Swords, fields: [f("key_competitors", "list"), f("market_share_percentage", "auto", "Market Share"), f("competitive_advantages", "list"), f("unique_differentiators", "list"), f("weaknesses_gaps", "list", "Weaknesses & Gaps"), f("benchmark_vs_peers", "list")] },
  { title: "Market Opportunity", icon: Target, fields: [f("tam", "auto", "TAM"), f("sam", "auto", "SAM"), f("som", "auto", "SOM"), f("future_projections", "paragraph"), f("strategic_priorities", "list"), f("innovation_roadmap", "list"), f("go_to_market_strategy", "list")] },
  { title: "Core Value Proposition & ESG", icon: Heart, fields: [f("core_value_proposition", "list"), f("esg_ratings", "list", "ESG Ratings"), f("sustainability_csr", "list", "Sustainability & CSR"), f("carbon_footprint", "paragraph"), f("ethical_sourcing", "list")] },
  { title: "Culture & Work Life", icon: Users, fields: [f("work_culture_summary", "list", "Work Culture"), f("manager_quality"), f("psychological_safety"), f("feedback_culture", "list"), f("diversity_metrics", "list"), f("diversity_inclusion_score", "list", "Diversity & Inclusion"), f("ethical_standards", "list"), f("burnout_risk"), f("mission_clarity"), f("crisis_behavior", "paragraph")] },
  { title: "Recent News & Milestones", icon: Newspaper, fields: [f("recent_news", "list"), f("awards_recognitions", "list", "Awards & Recognitions"), f("layoff_history")] },
  { title: "Sales & Customer Metrics", icon: LineChart, fields: [f("sales_motion"), f("customer_acquisition_cost", "auto", "Customer Acquisition Cost (CAC)"), f("customer_lifetime_value", "auto", "Customer Lifetime Value (LTV)"), f("cac_ltv_ratio", "auto", "CAC : LTV Ratio"), f("churn_rate"), f("net_promoter_score", "auto", "Net Promoter Score"), f("customer_concentration_risk", "paragraph"), f("customer_testimonials", "list")] },
  { title: "Risk & Compliance", icon: Shield, fields: [f("regulatory_status", "list"), f("legal_issues", "paragraph"), f("supply_chain_dependencies", "list"), f("geopolitical_risks", "list"), f("macro_risks", "list"), f("key_challenges_needs", "list", "Key Challenges"), f("exit_strategy_history", "list")] },
  { title: "Work Location & Commute", icon: MapPin, fields: [f("remote_policy_details", "auto", "Remote Policy"), f("typical_hours"), f("overtime_expectations"), f("weekend_work"), f("flexibility_level", "list"), f("location_centrality"), f("public_transport_access", "list"), f("cab_policy", "list"), f("airport_commute_time"), f("office_zone_type")] },
  { title: "Safety & Wellbeing", icon: ShieldCheck, fields: [f("area_safety", "list"), f("safety_policies", "list"), f("infrastructure_safety", "list"), f("emergency_preparedness", "list"), f("health_support", "list")] },
  { title: "Career Growth & Learning", icon: TrendingUp, fields: [f("training_spend"), f("onboarding_quality"), f("learning_culture", "list"), f("exposure_quality"), f("mentorship_availability", "list"), f("internal_mobility"), f("promotion_clarity", "list"), f("tools_access", "list"), f("role_clarity"), f("early_ownership"), f("work_impact", "list"), f("execution_thinking_balance"), f("cross_functional_exposure", "list"), f("company_maturity"), f("exit_opportunities", "list"), f("skill_relevance"), f("hiring_velocity", "list"), f("employee_turnover"), f("avg_retention_tenure", "auto", "Average Retention Tenure")] },
  { title: "Brand & Reputation", icon: Award, fields: [f("brand_value"), f("brand_sentiment_score", "paragraph", "Brand Sentiment"), f("client_quality", "list"), f("external_recognition"), f("network_strength", "list"), f("marketing_video_url", "video", "Marketing Video")] },
  { title: "Compensation & Benefits", icon: Wallet, fields: [f("fixed_vs_variable_pay", "auto", "Fixed vs Variable Pay"), f("bonus_predictability"), f("esops_incentives", "list", "ESOPs & Incentives"), f("family_health_insurance", "list"), f("relocation_support", "list"), f("lifestyle_benefits", "list"), f("leave_policy", "list")] },
  { title: "Digital Presence & Ratings", icon: Star, fields: [f("website_url", "url", "Website"), f("website_quality", "paragraph"), f("website_rating", "rating"), f("website_traffic_rank", "list"), f("social_media_followers"), f("glassdoor_rating", "rating"), f("indeed_rating", "rating"), f("google_rating", "rating"), f("linkedin_url", "url", "LinkedIn"), f("twitter_handle", "auto", "Twitter / X"), f("facebook_url", "url", "Facebook"), f("instagram_url", "url", "Instagram")] },
  { title: "Contact Information", icon: Mail, fields: [f("primary_contact_email"), f("primary_phone_number"), f("contact_person_name"), f("contact_person_title"), f("contact_person_email"), f("contact_person_phone")] },
];

export function buildIntelligenceSections(profile?: CompanyProfile): IntelSection[] {
  return SCHEMA.map((s, i) => ({
    ...s,
    id: `section-${i}`,
    fields: s.fields.map((field) => ({ ...field, value: profile?.[field.key] })),
  }));
}

export { Rocket };
