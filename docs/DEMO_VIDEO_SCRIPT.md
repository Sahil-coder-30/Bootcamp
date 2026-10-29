# 15-Minute Demo Video Script: RADIX Talent Match

**Target Duration:** Exactly 15:00 minutes  
**Format:** Live screen share showing working software on `localhost:5173` with webcams of presenters. (Strict rule: show the working tool, not static slides).  
**Video File Name:** `Demo_Video.mp4`

---

## Timestamp & Presenter Overview

| Time | Presenter | Section | Focus & On-Screen Action |
| :--- | :--- | :--- | :--- |
| **0:00 – 1:30** | **Scrum Master** | Intro & Overview | Problem statement, 5-stage architecture, standout innovations |
| **1:30 – 4:00** | **Role 1** | JD Analytics | Uploading Google SWE JD, 12 categories, requirement weighting, precision/recall |
| **4:00 – 6:30** | **Role 2** | Resume Parsing | Uploading candidate resume (Ananya Rao), 2-column handling, evidence extraction |
| **6:30 – 9:00** | **Role 3** | Profile Builder | Pre-filled profile, editing Bloom level sliders, audit log, saving to DB |
| **9:00 – 11:30** | **Role 4** | Talent Check | Company bar benchmark (Google LLC), 12-category gap analysis, readiness score math |
| **11:30 – 14:00** | **Role 5** | Skill Matching | 7-stage cascade, counterfactual "+8 pts" impact, Ananya vs. Karthik comparison |
| **14:00 – 15:00** | **Scrum Master** | Wrap-Up & Retro | Integration challenge solved, honest limitations, future roadmap |

---

## Detailed Section-by-Section Script

### 1. Scrum Master: Introduction & High-Level Architecture (0:00 – 1:30)

**Speaker:** *Scrum Master*  
**On-Screen:** Landing page of the web application (`http://localhost:5173`) showing the 5-step workflow wizard.

> "Hello judges and evaluators! Welcome to our demonstration of **RADIX Talent Match**.
> 
> When engineering candidates apply for competitive tech roles, they face a universal frustration: black-box rejections. Job descriptions list dozens of buzzwords, and candidates have no way of knowing where they truly stand against a company's hiring bar, which deficits are fatal, and what skills would yield the highest return on their learning time.
> 
> Simple keyword-matching tools fail because they treat all skills equally and hallucinate false matches—like equating Java with JavaScript or misinterpreting a bullet point.
> 
> We built a production-grade, 5-stage pipeline combining deterministic Bloom-scale benchmarks with a 7-stage ontological matching cascade. Every single score produced by our platform is grounded in verbatim quotes from the source documents, complete with counterfactual gap prioritization that tells candidates: *'Learn Kubernetes, and your match increases by exactly 8 points.'*
> 
> Let's dive straight into the live system. I'll hand over to our JD Analytics engineer to show how we parse job requirements."

---

### 2. Role 1: JD Analytics (1:30 – 4:00)

**Speaker:** *Role 1 Owner*  
**On-Screen:** Navigate to `/jds` or Step 1 of the wizard. Drag-and-drop `google_swe.pdf`.

> "Thanks! Here we are on the JD Analytics interface. I'm uploading the official Google Software Engineer job description PDF.
> 
> *(Performs upload — UI displays processing spinner for ~1.5s, then renders parsed output)*
> 
> Notice how rapidly our FastAPI agent extracted the structured data. Instead of dumping raw text, our extractor classifies every requirement into one of **12 canonical Bloom computer science categories**—such as Coding, DSA, System Design, and Cloud.
> 
> Crucially, our system automatically segments requirements into **Must-Have** versus **Nice-to-Have** based on the JD structure. For instance:
> - *Data Structures & Algorithms* is tagged as **Must-Have** with required Bloom level **7 (Evaluation)**.
> - Look at the **Evidence Quote**: *'BS degree in Computer Science, with strong software development skills and experience in data structures or algorithms.'*
> 
> Every extracted entity is bound by our **Anti-Hallucination Gate**: if an entity lacks a direct quote (under 200 characters) from the source document, it is immediately pruned.
> 
> In our offline precision and recall evaluation against human-labeled ground truth across 2 JDs, we achieved **93.3% Precision** and **87.5% Recall**.
> 
> Now let's see how our resume parsing service analyzes the candidate."

---

### 3. Role 2: Resume Parsing (4:00 – 6:30)

**Speaker:** *Role 2 Owner*  
**On-Screen:** Navigate to `/resumes` or Step 2. Upload `ananya-rao.pdf`.

> "Thank you. Now let's test our Resume Parsing engine with Ananya Rao's resume.
> 
> Resumes are notoriously noisy—candidates use multi-column layouts, graphics, and arbitrary section headings. To solve this, our pipeline utilizes layout-aware text coordinate extraction via PyMuPDF. It reconstructs the logical reading flow before applying our Pydantic extraction chain.
> 
> *(Uploads resume — structured profile cards appear on screen)*
> 
> As you can see:
> 1. Contact details, education (B.Tech CSE, 8.7 CGPA), and work experience as an SDE Intern are cleanly isolated.
> 2. Every skill identified—like Python, Go, and PostgreSQL—carries an exact evidence snippet from her projects and internships.
> 3. Even in complex two-column sections, our parser didn't jumble lines together. In our test with DOCX vs PDF versions of the exact same candidate resume, our parser produced 100% identical extracted skill payloads.
> 
> Furthermore, it infers an initial Bloom proficiency rating (from 1 to 10) for each of the 12 categories. For Ananya, her competitive programming background gives her an inferred level of 7 in COD and DSA, while her containerization exposure rates her at level 3 in CLOUD.
> 
> Now, let's see how this populates the candidate's verified profile."

---

### 4. Role 3: Profile Builder (6:30 – 9:00)

**Speaker:** *Role 3 Owner*  
**On-Screen:** Navigate to `/profiles` or Step 3. Show Ananya Rao's editable profile screen.

> "Welcome to the Profile Builder. Raw parsed data should never be committed directly to hiring decisions without candidate agency and verification.
> 
> Here, the candidate's profile is automatically pre-filled from the Role 2 extraction. 
> 
> Notice the **12 Skill Category Sliders**:
> - Each slider is initialized with the inferred Bloom rating and displays the source badge `resume_inferred`.
> - If Ananya has recently deepened her knowledge in System Design, she can adjust the slider from level 4 to level 5.
> - When she moves the slider, watch the provenance change from `resume_inferred` to `self` with a prompt to provide updated context.
> 
> Everything here is validated against our shared Zod schema on the Node backend and Pydantic on the agent. We also enforce optimistic concurrency control (`If-Match` headers) so multiple updates never overwrite each other.
> 
> Once Ananya confirms her profile, we save it into Supabase. Now we have a validated, canonical candidate profile ready for automated company benchmarking and role matching."

---

### 5. Role 4: Talent Check (9:00 – 11:30)

**Speaker:** *Role 4 Owner*  
**On-Screen:** Navigate to `/talent-check` or Step 4. Select Candidate: *Ananya Rao*, Select Company: *Google LLC*.

> "Now we trigger **Talent Check**—our company readiness assessment engine.
> 
> Talent Check does not evaluate against a single job posting; instead, it benchmarks the candidate against the calibrated **Company Skill Bar** across all 12 categories. These bars are stored in Supabase with snapshot fallbacks.
> 
> *(Clicks 'Run Talent Check' — Radar chart and readiness card render)*
> 
> For Google LLC, Ananya achieves a **Readiness Score of 78/100 (Verdict: Almost Ready)**.
> 
> Look at the breakdown:
> - **Coding & DSA:** She exceeds Google's hiring bar (Level 7 vs. Level 6 required).
> - **DevOps & Cloud:** Here is a noticeable shortfall (Level 3 candidate vs. Level 6 company bar).
> - **System Design:** Level 4 candidate vs. Level 6 company bar.
> 
> **How is 'Ready' defined?**  
> We don't just calculate a simple arithmetic average. Our deterministic mathematical scoring function applies non-linear penalties for core skill deficits. Having a severe shortfall in a primary category like DSA or System Design drops readiness significantly more than a shortfall in an auxiliary category.
> 
> Crucially, look at the bottom section: **Recommended Learning Topics**. Pulled directly from our `skill_set_topics` database, the system tells Ananya exactly what topics to study to reach Level 6 in Cloud—specifically: *Distributed logging, Kubernetes cluster management, and Terraform.*
> 
> Now, let's look at the ultimate test: job-specific Skill Matching."

---

### 6. Role 5: Skill Matching (11:30 – 14:00)

**Speaker:** *Role 5 Owner*  
**On-Screen:** Navigate to `/skill-match` or Step 5. Match *Ananya Rao* against *Google SWE JD*, then compare with *Karthik Subramaniam*. Open the "How Computed" drawer.

> "Now for **Skill Matching**, our Role 5 feature. This is where we match a candidate's specific profile directly against a target Job Description.
> 
> *(Runs match for Ananya against Google SWE)*
> 
> Ananya scores **78/100** on Google SWE. But pay attention to *how* that score was determined:
> 
> Look at our **7-Stage Ontological Cascade**:
> 1. **Exact Matches:** Python and Git matched immediately via canonical tokenization.
> 2. **Implied & Graph Matches:** The JD demanded *Relational Databases*; Ananya listed *PostgreSQL*. Our taxonomy graph recognized PostgreSQL as an `instance_of` Relational Databases and awarded full credit!
> 3. **False-Friends Protection:** If a candidate has Java and the JD asks for JavaScript, our cascade applies a strict hard-block—preventing catastrophic false matches that plague typical LLM agents.
> 
> Now, look at the **Missing Skills & Gap Prioritizer**:
> - The top missing skill is **Kubernetes** (Must-Have).
> - Notice the green badge: **Counterfactual Impact: +8 points**. Our counterfactual engine reran the scoring formula and determined that if Ananya closes this single gap, her match score jumps from 78 to 86!
> 
> Let me click the **'How Computed' Drawer**:
> Here is the complete mathematical transparency: Must-Have coverage weight (60%), Nice-to-Have coverage (25%), Bloom Level Fit factor (15%), and alt-group deduplication.
> 
> Now watch what happens when we switch candidates to **Karthik Subramaniam**, who has a data science resume:
> *(Selects Karthik — Match score recalculates to 49/100)*
> His score drops to 49% because his core Software Engineering and Systems requirements are missing, while his Python and ML match. This proves our scoring is truly discriminative and matches the expected fit from the hackathon brief!"

---

### 7. Scrum Master: Retrospective, Challenges & Wrap-Up (14:00 – 15:00)

**Speaker:** *Scrum Master*  
**On-Screen:** Display the `/skill-match/matrix` Batch View showing all 4 candidates evaluated across all companies, then switch to webcam.

> "To bring it all together: here you can see our **Batch Matrix View**, validating that Ananya, Karthik, Priya, and Rohan each receive distinct, calibrated scores that perfectly match their real-world profile strengths.
> 
> **Key Challenge Faced & Solved:**  
> Our biggest engineering hurdle was contract drift between the Python agent and TypeScript backend. We resolved this by adopting a single source of truth in `00-shared-contract.md`, codifying Pydantic v2 models, and automating TypeScript schema validation.
> 
> **Honest Limitations:**  
> Our current system relies on digital text streams; pure image-based scans without OCR layers require an external pre-processing step.
> 
> **Next Steps:**  
> We plan to introduce automated coding interview mock scenarios dynamically generated from each candidate's counterfactual gap list.
> 
> Thank you for your time, and we look forward to your questions!"

---

## Filming & Submission Checklist
- [ ] Record in 1080p, ensure microphone audio is clear across all presenters.
- [ ] Ensure video stops before 15:00 (strict cut-off at 15:00).
- [ ] Save output as `Demo_Video.mp4`.
- [ ] Export `HACKATHON_SOLUTION_DOCUMENT.md` as `Solution_Document.pdf`.
- [ ] Zip project root as `Code.zip` (exclude `node_modules`, `.venv`, and API keys).
- [ ] Place all files into Google Drive folder `TeamName_RADIX_TalentMatch` and set permissions to **Anyone with the link - Viewer**.
