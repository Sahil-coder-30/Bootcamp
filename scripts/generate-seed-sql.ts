import fs from "node:fs";
import path from "node:path";
import { SEED_COMPANIES } from "../src/data/seedCompanies";

const PROFICIENCY_LEVELS = [
  { proficiency_level_id: 1, proficiency_name: "Novice", proficiency_code: "NOV" },
  { proficiency_level_id: 2, proficiency_name: "Intermediate", proficiency_code: "INT" },
  { proficiency_level_id: 3, proficiency_name: "Proficient", proficiency_code: "PRO" },
  { proficiency_level_id: 4, proficiency_name: "Advanced", proficiency_code: "ADV" },
  { proficiency_level_id: 5, proficiency_name: "Expert", proficiency_code: "EXP" },
];

const profMap: Record<string, number> = {
  Novice: 1,
  Intermediate: 2,
  Proficient: 3,
  Advanced: 4,
  Expert: 5,
};

const SKILL_MASTER = [
  { skill_set_id: 1, skill_set_name: "Data Structures & Algorithms", short_name: "DSA" },
  { skill_set_id: 2, skill_set_name: "Object-Oriented Programming", short_name: "OOP" },
  { skill_set_id: 3, skill_set_name: "SQL & Databases", short_name: "SQL" },
  { skill_set_id: 4, skill_set_name: "Cloud Fundamentals (AWS/Azure)", short_name: "Cloud" },
  { skill_set_id: 5, skill_set_name: "Operating Systems", short_name: "OS" },
  { skill_set_id: 6, skill_set_name: "Computer Networks", short_name: "CN" },
  { skill_set_id: 7, skill_set_name: "Aptitude & Logical Reasoning", short_name: "Aptitude" },
  { skill_set_id: 8, skill_set_name: "Communication & Behavioral", short_name: "Soft Skills" },
  { skill_set_id: 9, skill_set_name: "Web Development Basics", short_name: "Web Dev" },
  { skill_set_id: 10, skill_set_name: "System Design (Intro)", short_name: "System Design" },
  { skill_set_id: 11, skill_set_name: "Git & Version Control", short_name: "Git" },
  { skill_set_id: 12, skill_set_name: "Generative AI Basics", short_name: "GenAI" },
];

const SKILL_TOPICS = [
  // DSA (1)
  { skill_set_id: 1, level_number: 1, topics: "Arrays, Linear Search, Basic Math" },
  { skill_set_id: 1, level_number: 2, topics: "Binary Search, Bubble/Insertion Sort, Strings" },
  { skill_set_id: 1, level_number: 3, topics: "Recursion, Merge Sort, Quick Sort, Hashing" },
  { skill_set_id: 1, level_number: 4, topics: "Two Pointers, Sliding Window, Linked Lists" },
  { skill_set_id: 1, level_number: 5, topics: "Stacks, Queues, Binary Trees Traversal" },
  { skill_set_id: 1, level_number: 6, topics: "Binary Search Trees, Heaps, Priority Queues" },
  { skill_set_id: 1, level_number: 7, topics: "Graph BFS/DFS, Topological Sort, Disjoint Set" },
  { skill_set_id: 1, level_number: 8, topics: "Dynamic Programming 1D/2D, Dijkstra, Shortest Path" },
  { skill_set_id: 1, level_number: 9, topics: "Segment Trees, Trie, Advanced DP on Trees" },
  { skill_set_id: 1, level_number: 10, topics: "Hard LeetCode Patterns, Bit Manipulation, Network Flow" },

  // OOP (2)
  { skill_set_id: 2, level_number: 1, topics: "Classes, Objects, Basic Methods" },
  { skill_set_id: 2, level_number: 2, topics: "Encapsulation, Access Specifiers, Constructors" },
  { skill_set_id: 2, level_number: 3, topics: "Inheritance, Method Overriding, Method Overloading" },
  { skill_set_id: 2, level_number: 4, topics: "Polymorphism, Abstract Classes, Interfaces" },
  { skill_set_id: 2, level_number: 5, topics: "Composition vs Inheritance, Static Members" },
  { skill_set_id: 2, level_number: 6, topics: "Exception Handling, Generics / Templates" },
  { skill_set_id: 2, level_number: 7, topics: "SOLID Principles (Single Responsibility, Open-Closed)" },
  { skill_set_id: 2, level_number: 8, topics: "Design Patterns (Singleton, Factory, Observer)" },
  { skill_set_id: 2, level_number: 9, topics: "Behavioral Patterns (Strategy, Command, State)" },
  { skill_set_id: 2, level_number: 10, topics: "Clean Architecture, Domain-Driven Design Basics" },

  // SQL & Databases (3)
  { skill_set_id: 3, level_number: 1, topics: "SELECT, WHERE, ORDER BY, Basic Data Types" },
  { skill_set_id: 3, level_number: 2, topics: "Aggregate Functions (COUNT, SUM, AVG), GROUP BY, HAVING" },
  { skill_set_id: 3, level_number: 3, topics: "INNER JOIN, LEFT/RIGHT JOIN, FULL OUTER JOIN" },
  { skill_set_id: 3, level_number: 4, topics: "Subqueries, Primary & Foreign Keys, Constraints" },
  { skill_set_id: 3, level_number: 5, topics: "Normalization (1NF, 2NF, 3NF, BCNF), ER Diagrams" },
  { skill_set_id: 3, level_number: 6, topics: "Indexes (B-Tree, Hash), EXPLAIN Query Plans" },
  { skill_set_id: 3, level_number: 7, topics: "Transactions, ACID Properties, Isolation Levels" },
  { skill_set_id: 3, level_number: 8, topics: "Window Functions (ROW_NUMBER, RANK, DENSE_RANK, LAG/LEAD)" },
  { skill_set_id: 3, level_number: 9, topics: "Stored Procedures, Triggers, Views, Query Optimization" },
  { skill_set_id: 3, level_number: 10, topics: "Sharding, Partitioning, Replication, NoSQL Comparison" },

  // Cloud Fundamentals (4)
  { skill_set_id: 4, level_number: 1, topics: "Cloud Concepts (IaaS, PaaS, SaaS, Public/Private)" },
  { skill_set_id: 4, level_number: 2, topics: "Regions, Availability Zones, Edge Locations" },
  { skill_set_id: 4, level_number: 3, topics: "Compute (AWS EC2, Azure VMs, Lambda serverless)" },
  { skill_set_id: 4, level_number: 4, topics: "Storage (AWS S3, EBS, Azure Blob Storage)" },
  { skill_set_id: 4, level_number: 5, topics: "Networking (VPC, Subnets, Route Tables, Security Groups)" },
  { skill_set_id: 4, level_number: 6, topics: "IAM (Users, Roles, Policies, Principle of Least Privilege)" },
  { skill_set_id: 4, level_number: 7, topics: "Load Balancers (ALB), Auto Scaling Groups" },
  { skill_set_id: 4, level_number: 8, topics: "Managed Databases (RDS, DynamoDB, CosmosDB)" },
  { skill_set_id: 4, level_number: 9, topics: "Container Orchestration (ECS, EKS, Kubernetes Basics)" },
  { skill_set_id: 4, level_number: 10, topics: "Cloud Architecture, Disaster Recovery, Cost Optimization" },

  // OS (5)
  { skill_set_id: 5, level_number: 1, topics: "OS Roles, System Calls, Kernel vs User Space" },
  { skill_set_id: 5, level_number: 2, topics: "Process vs Thread, PCB, Context Switching" },
  { skill_set_id: 5, level_number: 3, topics: "Process Scheduling (FCFS, SJF, Round Robin, Priority)" },
  { skill_set_id: 5, level_number: 4, topics: "Inter-Process Communication (Pipes, Shared Memory, Sockets)" },
  { skill_set_id: 5, level_number: 5, topics: "Concurrency, Race Conditions, Critical Section Problem" },
  { skill_set_id: 5, level_number: 6, topics: "Mutex, Semaphores, Monitors, Deadlock Conditions" },
  { skill_set_id: 5, level_number: 7, topics: "Deadlock Avoidance (Banker's Algorithm), Detection" },
  { skill_set_id: 5, level_number: 8, topics: "Memory Management, Paging, Page Replacement (LRU, FIFO)" },
  { skill_set_id: 5, level_number: 9, topics: "Virtual Memory, Segmentation, Thrashing, Page Faults" },
  { skill_set_id: 5, level_number: 10, topics: "File Systems (ext4, NTFS), Disk Scheduling (SCAN, C-SCAN)" },

  // Computer Networks (6)
  { skill_set_id: 6, level_number: 1, topics: "Network Topologies, LAN/WAN, Bandwidth vs Latency" },
  { skill_set_id: 6, level_number: 2, topics: "OSI Model 7 Layers, TCP/IP Model 4 Layers" },
  { skill_set_id: 6, level_number: 3, topics: "Data Link Layer, MAC Addresses, Framing, CSMA/CD" },
  { skill_set_id: 6, level_number: 4, topics: "IP Addressing, IPv4 vs IPv6, Subnetting (CIDR)" },
  { skill_set_id: 6, level_number: 5, topics: "Routing Protocols (Distance Vector, Link State, OSPF, BGP)" },
  { skill_set_id: 6, level_number: 6, topics: "Transport Layer: TCP vs UDP, Socket Programming Basics" },
  { skill_set_id: 6, level_number: 7, topics: "TCP 3-Way Handshake, Flow Control, Congestion Control" },
  { skill_set_id: 6, level_number: 8, topics: "Application Protocols: HTTP, HTTPS, DNS, DHCP, FTP" },
  { skill_set_id: 6, level_number: 9, topics: "Network Security: SSL/TLS Handshake, Firewalls, NAT" },
  { skill_set_id: 6, level_number: 10, topics: "WebSockets, HTTP/2, HTTP/3 (QUIC), CDN Architecture" },

  // Aptitude & Logical Reasoning (7)
  { skill_set_id: 7, level_number: 1, topics: "Percentages, Ratios, Proportions, Averages" },
  { skill_set_id: 7, level_number: 2, topics: "Profit & Loss, Simple & Compound Interest" },
  { skill_set_id: 7, level_number: 3, topics: "Time, Speed & Distance, Relative Speed, Trains & Boats" },
  { skill_set_id: 7, level_number: 4, topics: "Time & Work, Pipes & Cisterns" },
  { skill_set_id: 7, level_number: 5, topics: "Permutations, Combinations, Probability Basics" },
  { skill_set_id: 7, level_number: 6, topics: "Number Series, Coding-Decoding, Blood Relations" },
  { skill_set_id: 7, level_number: 7, topics: "Direction Sense, Seating Arrangements (Linear & Circular)" },
  { skill_set_id: 7, level_number: 8, topics: "Syllogisms, Data Sufficiency, Logical Deductions" },
  { skill_set_id: 7, level_number: 9, topics: "Data Interpretation (Tables, Bar Graphs, Pie Charts)" },
  { skill_set_id: 7, level_number: 10, topics: "Advanced Puzzle Solving, Critical Reasoning" },

  // Communication & Behavioral (8)
  { skill_set_id: 8, level_number: 1, topics: "Active Listening, Clarity in Speech, Professional Etiquette" },
  { skill_set_id: 8, level_number: 2, topics: "Email Writing, Formal Documentation, Meeting Notes" },
  { skill_set_id: 8, level_number: 3, topics: "Self Introduction (Elevator Pitch), Resume Walkthrough" },
  { skill_set_id: 8, level_number: 4, topics: "Group Discussion Participation, Structuring Arguments" },
  { skill_set_id: 8, level_number: 5, topics: "STAR Method (Situation, Task, Action, Result) for Interviews" },
  { skill_set_id: 8, level_number: 6, topics: "Handling Conflict, Giving & Receiving Constructive Feedback" },
  { skill_set_id: 8, level_number: 7, topics: "Cross-Cultural Communication, Remote Team Collaboration" },
  { skill_set_id: 8, level_number: 8, topics: "Client Presentation Skills, Storytelling with Data" },
  { skill_set_id: 8, level_number: 9, topics: "Negotiation, Stakeholder Management Basics" },
  { skill_set_id: 8, level_number: 10, topics: "Executive Communication, Crisis Communication" },

  // Web Development Basics (9)
  { skill_set_id: 9, level_number: 1, topics: "HTML5 Semantic Tags, Forms, Elements, Audio/Video" },
  { skill_set_id: 9, level_number: 2, topics: "CSS3 Selectors, Box Model, Colors, Typography" },
  { skill_set_id: 9, level_number: 3, topics: "Flexbox, Grid, Responsive Design, Media Queries" },
  { skill_set_id: 9, level_number: 4, topics: "JavaScript ES6+: let/const, Arrow Functions, Destructuring" },
  { skill_set_id: 9, level_number: 5, topics: "DOM Manipulation, Event Listeners, Bubbling & Capturing" },
  { skill_set_id: 9, level_number: 6, topics: "Async JS: Callbacks, Promises, async/await, Fetch API" },
  { skill_set_id: 9, level_number: 7, topics: "REST APIs, HTTP Methods, Headers, Status Codes, JSON" },
  { skill_set_id: 9, level_number: 8, topics: "React Basics: JSX, Components, Props, useState, useEffect" },
  { skill_set_id: 9, level_number: 9, topics: "Client-side Routing, Global State Management (Context / Redux)" },
  { skill_set_id: 9, level_number: 10, topics: "Web Security (CORS, XSS, CSRF), Web Performance & SEO" },

  // System Design (Intro) (10)
  { skill_set_id: 10, level_number: 1, topics: "Monolith vs Microservices Architecture" },
  { skill_set_id: 10, level_number: 2, topics: "Vertical Scaling vs Horizontal Scaling" },
  { skill_set_id: 10, level_number: 3, topics: "Load Balancing Strategies (Round Robin, Least Connection)" },
  { skill_set_id: 10, level_number: 4, topics: "Caching (Redis, Memcached), Cache Invalidation (LRU, TTL)" },
  { skill_set_id: 10, level_number: 5, topics: "Database Replication (Primary-Replica), Read Replicas" },
  { skill_set_id: 10, level_number: 6, topics: "CAP Theorem, Eventual Consistency vs Strong Consistency" },
  { skill_set_id: 10, level_number: 7, topics: "Message Queues (Kafka, RabbitMQ), Pub/Sub Pattern" },
  { skill_set_id: 10, level_number: 8, topics: "API Gateways, Rate Limiting, Authentication / JWT" },
  { skill_set_id: 10, level_number: 9, topics: "Design a URL Shortener (TinyURL), Unique ID Generation" },
  { skill_set_id: 10, level_number: 10, topics: "Design Rate Limiter, Notification Service, Chat App Basics" },

  // Git & Version Control (11)
  { skill_set_id: 11, level_number: 1, topics: "git init, status, add, commit, log" },
  { skill_set_id: 11, level_number: 2, topics: "git branch, checkout, switch, basic branching workflow" },
  { skill_set_id: 11, level_number: 3, topics: "git remote, push, pull, fetch, cloning repos" },
  { skill_set_id: 11, level_number: 4, topics: "git merge, resolving merge conflicts, .gitignore" },
  { skill_set_id: 11, level_number: 5, topics: "Pull Requests, Code Reviews, GitHub / GitLab Workflows" },
  { skill_set_id: 11, level_number: 6, topics: "git diff, git stash (save, pop, apply, drop)" },
  { skill_set_id: 11, level_number: 7, topics: "git rebase (interactive rebase, squash commits)" },
  { skill_set_id: 11, level_number: 8, topics: "git reset (--soft, --mixed, --hard) vs git revert" },
  { skill_set_id: 11, level_number: 9, topics: "git cherry-pick, git tag, semantic versioning" },
  { skill_set_id: 11, level_number: 10, topics: "Git Hooks, GitHub Actions CI/CD Integration, Git Bisect" },

  // Generative AI Basics (12)
  { skill_set_id: 12, level_number: 1, topics: "AI vs ML vs Deep Learning vs Generative AI" },
  { skill_set_id: 12, level_number: 2, topics: "Transformer Architecture Overview, Attention Mechanism" },
  { skill_set_id: 12, level_number: 3, topics: "Tokens, Context Window, Temperature, Top-p Parameters" },
  { skill_set_id: 12, level_number: 4, topics: "Prompt Engineering (Zero-shot, Few-shot, Chain-of-Thought)" },
  { skill_set_id: 12, level_number: 5, topics: "LLM APIs (OpenAI, Gemini, Anthropic), Structured Outputs" },
  { skill_set_id: 12, level_number: 6, topics: "Embeddings, Vector Databases (Pinecone, pgvector), Cosine Sim" },
  { skill_set_id: 12, level_number: 7, topics: "RAG (Retrieval-Augmented Generation) Architecture & Pipeline" },
  { skill_set_id: 12, level_number: 8, topics: "Function Calling, Tools, AI Agents (ReAct Framework)" },
  { skill_set_id: 12, level_number: 9, topics: "Fine-tuning vs RAG vs In-Context Learning, LoRA Basics" },
  { skill_set_id: 12, level_number: 10, topics: "AI Safety, Hallucination Mitigation, Evaluation (Ragas)" },
];

function escapeSql(str: string): string {
  return str.replace(/'/g, "''");
}

let sql = `-- Supabase Schema & Seed Script
-- Generated for JSS Academy Placement Intelligence Platform
-- Sets up tables, RLS policies, and seed data for:
-- 1. proficiency_levels
-- 2. skill_set_master
-- 3. skill_set_topics
-- 4. company_json
-- 5. company_skill_levels

BEGIN;

-- ============================================================================
-- 1. DDL: Ensure Tables Exist with Primary Keys & Foreign Keys
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.proficiency_levels (
  proficiency_level_id INTEGER PRIMARY KEY,
  proficiency_name TEXT NOT NULL,
  proficiency_code TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.skill_set_master (
  skill_set_id INTEGER PRIMARY KEY,
  skill_set_name TEXT NOT NULL,
  short_name TEXT
);

CREATE TABLE IF NOT EXISTS public.skill_set_topics (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  skill_set_id INTEGER NOT NULL REFERENCES public.skill_set_master(skill_set_id) ON DELETE CASCADE,
  level_number INTEGER NOT NULL,
  topics TEXT NOT NULL,
  CONSTRAINT uq_skill_level UNIQUE (skill_set_id, level_number)
);

CREATE TABLE IF NOT EXISTS public.company_json (
  company_id BIGINT PRIMARY KEY,
  short_json JSONB NOT NULL,
  full_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.company_skill_levels (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES public.company_json(company_id) ON DELETE CASCADE,
  skill_set_id INTEGER NOT NULL REFERENCES public.skill_set_master(skill_set_id) ON DELETE CASCADE,
  required_level INTEGER NOT NULL,
  required_proficiency_level_id INTEGER REFERENCES public.proficiency_levels(proficiency_level_id),
  CONSTRAINT uq_company_skill UNIQUE (company_id, skill_set_id)
);

-- ============================================================================
-- 2. Enable RLS and Configure Read/Write Policies
-- ============================================================================

ALTER TABLE public.proficiency_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_set_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_set_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_json ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_skill_levels ENABLE ROW LEVEL SECURITY;

-- Allow public read access (anon & authenticated)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'proficiency_levels' AND policyname = 'Public read proficiency_levels') THEN
    CREATE POLICY "Public read proficiency_levels" ON public.proficiency_levels FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'skill_set_master' AND policyname = 'Public read skill_set_master') THEN
    CREATE POLICY "Public read skill_set_master" ON public.skill_set_master FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'skill_set_topics' AND policyname = 'Public read skill_set_topics') THEN
    CREATE POLICY "Public read skill_set_topics" ON public.skill_set_topics FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'company_json' AND policyname = 'Public read company_json') THEN
    CREATE POLICY "Public read company_json" ON public.company_json FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'company_skill_levels' AND policyname = 'Public read company_skill_levels') THEN
    CREATE POLICY "Public read company_skill_levels" ON public.company_skill_levels FOR SELECT USING (true);
  END IF;
END $$;

-- ============================================================================
-- 3. Populate proficiency_levels
-- ============================================================================
`;

sql += `INSERT INTO public.proficiency_levels (proficiency_level_id, proficiency_name, proficiency_code) VALUES\n`;
sql += PROFICIENCY_LEVELS.map(
  (p) => `  (${p.proficiency_level_id}, '${escapeSql(p.proficiency_name)}', '${escapeSql(p.proficiency_code)}')`
).join(",\n");
sql += `\nON CONFLICT (proficiency_level_id) DO UPDATE SET\n  proficiency_name = EXCLUDED.proficiency_name,\n  proficiency_code = EXCLUDED.proficiency_code;\n\n`;

sql += `-- ============================================================================
-- 4. Populate skill_set_master
-- ============================================================================
INSERT INTO public.skill_set_master (skill_set_id, skill_set_name, short_name) VALUES\n`;
sql += SKILL_MASTER.map(
  (s) => `  (${s.skill_set_id}, '${escapeSql(s.skill_set_name)}', '${escapeSql(s.short_name)}')`
).join(",\n");
sql += `\nON CONFLICT (skill_set_id) DO UPDATE SET\n  skill_set_name = EXCLUDED.skill_set_name,\n  short_name = EXCLUDED.short_name;\n\n`;

sql += `-- ============================================================================
-- 5. Populate skill_set_topics
-- ============================================================================
INSERT INTO public.skill_set_topics (skill_set_id, level_number, topics) VALUES\n`;
sql += SKILL_TOPICS.map(
  (t) => `  (${t.skill_set_id}, ${t.level_number}, '${escapeSql(t.topics)}')`
).join(",\n");
sql += `\nON CONFLICT (skill_set_id, level_number) DO UPDATE SET\n  topics = EXCLUDED.topics;\n\n`;

sql += `-- ============================================================================
-- 6. Populate company_json (6 Companies)
-- ============================================================================
`;

for (const company of SEED_COMPANIES) {
  const shortJson = JSON.stringify(company.short_json);
  const fullJson = JSON.stringify(company.full_json);
  sql += `INSERT INTO public.company_json (company_id, short_json, full_json)\n`;
  sql += `VALUES (${company.company_id}, '${escapeSql(shortJson)}'::jsonb, '${escapeSql(fullJson)}'::jsonb)\n`;
  sql += `ON CONFLICT (company_id) DO UPDATE SET\n`;
  sql += `  short_json = EXCLUDED.short_json,\n`;
  sql += `  full_json = EXCLUDED.full_json,\n`;
  sql += `  updated_at = NOW();\n\n`;
}

sql += `-- ============================================================================
-- 7. Populate company_skill_levels
-- ============================================================================
INSERT INTO public.company_skill_levels (company_id, skill_set_id, required_level, required_proficiency_level_id) VALUES\n`;

const skillLevelRows: string[] = [];
for (const company of SEED_COMPANIES) {
  for (const skill of company.skill_levels) {
    const profId = profMap[skill.required_proficiency] || 3;
    skillLevelRows.push(
      `  (${company.company_id}, ${skill.skill_set_id}, ${skill.required_level}, ${profId})`
    );
  }
}
sql += skillLevelRows.join(",\n");
sql += `\nON CONFLICT (company_id, skill_set_id) DO UPDATE SET\n  required_level = EXCLUDED.required_level,\n  required_proficiency_level_id = EXCLUDED.required_proficiency_level_id;\n\n`;

sql += `COMMIT;\n`;

fs.writeFileSync(path.resolve(process.cwd(), "supabase/seed.sql"), sql);
console.log("Successfully generated supabase/seed.sql with complete schema and seed data!");
