"""
samples.py
==========
Pre-computed golden resume extractions for the 4 core demo candidates:
Ananya Rao, Karthik Subramaniam, Priya Menon, Rohan Verma.
"""

from __future__ import annotations

from talent_match.contract import (
    CertificationEntry,
    EducationEntry,
    ExperienceEntry,
    HackathonEntry,
    ProjectEntry,
    ResumeContact,
    ResumeExtraction,
    Skill,
)
from talent_match.resume.levels import infer_levels

GOLDEN_PROFILES: dict[str, dict] = {
    "ananya": {
        "candidate": {
            "name": "Ananya Rao",
            "email": "ananya.rao@jssaten.ac.in",
            "phone": "+919876543210",
            "links": ["github.com/ananyarao", "linkedin.com/in/ananyarao"],
        },
        "role": "Systems / Software Engineer",
        "education": [
            {
                "degree": "B.Tech Computer Science and Engineering",
                "institution": "JSS Academy of Technical Education",
                "year": "2026",
                "score": "8.85 CGPA",
            }
        ],
        "experience": [
            {
                "title": "Software Engineering Intern",
                "org": "Acme Payments Infrastructure",
                "kind": "internship",
                "start": "2025-05",
                "end": "2025-07",
                "highlights": [
                    "Engineered a high-throughput Kafka-based event ingestion pipeline in Go.",
                    "Reduced cross-region transaction settlement latency by 40% under peak load.",
                    "Designed Redis distributed locking mechanisms to prevent double-spending.",
                ],
                "skills": ["Go", "Kafka", "Redis", "Distributed Systems", "Docker"],
            }
        ],
        "projects": [
            {
                "name": "Raft-KV: Distributed Key-Value Store",
                "description": (
                    "Implemented the Raft consensus algorithm from scratch in Go with "
                    "leader election and log replication handling 10k ops/sec."
                ),
                "skills": ["Go", "Raft", "gRPC", "Concurrency", "Linux"],
                "link": "github.com/ananyarao/raft-kv",
            },
            {
                "name": "Distributed Token Bucket Rate Limiter",
                "description": (
                    "Built a low-latency rate limiting service deployed across Docker "
                    "containers with Redis backend maintaining p99 < 5ms."
                ),
                "skills": ["Go", "Redis", "System Design", "Docker"],
                "link": "github.com/ananyarao/rate-limiter",
            },
        ],
        "hackathons": [
            {
                "name": "Smart India Hackathon (Hardware & Systems)",
                "result": "Winner",
                "year": "2024",
            }
        ],
        "certifications": [
            {
                "name": "AWS Certified Cloud Practitioner",
                "issuer": "Amazon Web Services",
                "year": "2025",
            }
        ],
        "skills": [
            Skill(
                skill_name="Go",
                category_code="COD",
                canonical_id="go",
                evidence="Built Kafka-based event pipeline in Go",
                confidence="high",
                section="experience",
            ),
            Skill(
                skill_name="Kafka",
                category_code="SYSD",
                canonical_id="kafka",
                evidence="High-throughput Kafka-based event ingestion pipeline",
                confidence="high",
                section="experience",
            ),
            Skill(
                skill_name="Distributed Systems",
                category_code="SYSD",
                canonical_id="distributed-systems",
                evidence="Engineered distributed locking mechanisms",
                confidence="high",
                section="experience",
            ),
            Skill(
                skill_name="Raft",
                category_code="SYSD",
                canonical_id="raft",
                evidence="Implemented Raft consensus algorithm from scratch",
                confidence="high",
                section="projects",
            ),
            Skill(
                skill_name="Redis",
                category_code="SYSD",
                canonical_id="redis",
                evidence="Redis backend maintaining p99 < 5ms",
                confidence="high",
                section="projects",
            ),
            Skill(
                skill_name="Docker",
                category_code="CLOUD",
                canonical_id="docker",
                evidence="Deployed across Docker containers",
                confidence="high",
                section="projects",
            ),
            Skill(
                skill_name="Linux",
                category_code="OS",
                canonical_id="linux",
                evidence="Linux kernel tuning and memory profiling",
                confidence="high",
                section="projects",
            ),
            Skill(
                skill_name="gRPC",
                category_code="NETW",
                canonical_id="grpc",
                evidence="Inter-service communication with gRPC",
                confidence="high",
                section="projects",
            ),
            Skill(
                skill_name="PostgreSQL",
                category_code="SQL",
                canonical_id="postgresql",
                evidence="Relational schema and foreign key indexing",
                confidence="medium",
                section="skills",
            ),
            Skill(
                skill_name="Data Structures & Algorithms",
                category_code="DSA",
                canonical_id="dsa",
                evidence="Solved 450+ LeetCode problems (Rating: 1980)",
                confidence="high",
                section="skills",
            ),
            Skill(
                skill_name="Git",
                category_code="SWE",
                canonical_id="git",
                evidence="Version control and GitHub Actions CI/CD",
                confidence="medium",
                section="skills",
            ),
            Skill(
                skill_name="C++",
                category_code="COD",
                canonical_id="cpp",
                evidence="Competitive programming and system benchmarks",
                confidence="medium",
                section="skills",
            ),
        ],
    },
    "karthik": {
        "candidate": {
            "name": "Karthik Subramaniam",
            "email": "karthik.sub@jssaten.ac.in",
            "phone": "+919812345678",
            "links": ["github.com/karthikdata", "linkedin.com/in/karthiksub"],
        },
        "role": "Data Engineer / Analytics Focus",
        "education": [
            {
                "degree": "B.Tech Information Technology",
                "institution": "JSS Academy of Technical Education",
                "year": "2026",
                "score": "8.50 CGPA",
            }
        ],
        "experience": [
            {
                "title": "Data Engineering Intern",
                "org": "QuantAnalytics Solutions",
                "kind": "internship",
                "start": "2025-06",
                "end": "2025-08",
                "highlights": [
                    (
                        "Architected automated ETL pipelines in Apache Spark and Python "
                        "processing 5M+ daily records."
                    ),
                    "Optimized PostgreSQL complex joins and partitioned tables cutting query runtime by 65%.",
                ],
                "skills": ["Python", "SQL", "PostgreSQL", "Apache Spark", "ETL"],
            }
        ],
        "projects": [
            {
                "name": "High-Throughput Analytics Warehouse",
                "description": (
                    "Designed star-schema dimensional models and complex PL/pgSQL stored procedures "
                    "handling 100M+ warehouse rows."
                ),
                "skills": ["SQL", "PostgreSQL", "Database Normalization", "Indexing"],
                "link": "github.com/karthikdata/analytics-wh",
            },
            {
                "name": "Customer Churn Prediction Platform",
                "description": (
                    "Trained XGBoost and Scikit-learn models on historical telemetry data "
                    "achieving 89% recall."
                ),
                "skills": ["Python", "Machine Learning", "Scikit-Learn", "PostgreSQL"],
                "link": "github.com/karthikdata/churn-ai",
            },
        ],
        "hackathons": [{"name": "Kaggle FinTech Prediction Challenge", "result": "Top 3%", "year": "2024"}],
        "certifications": [
            {"name": "Oracle Certified Professional: Database Developer", "issuer": "Oracle", "year": "2025"}
        ],
        "skills": [
            Skill(
                skill_name="SQL",
                category_code="SQL",
                canonical_id="sql",
                evidence="Optimized PostgreSQL complex joins and partitioned tables",
                confidence="high",
                section="experience",
            ),
            Skill(
                skill_name="PostgreSQL",
                category_code="SQL",
                canonical_id="postgresql",
                evidence="Designed star-schema dimensional models and PL/pgSQL",
                confidence="high",
                section="projects",
            ),
            Skill(
                skill_name="Python",
                category_code="COD",
                canonical_id="python",
                evidence="Automated ETL pipelines in Python",
                confidence="high",
                section="experience",
            ),
            Skill(
                skill_name="Machine Learning",
                category_code="AI",
                canonical_id="machine-learning",
                evidence="Trained XGBoost and Scikit-learn models achieving 89% recall",
                confidence="high",
                section="projects",
            ),
            Skill(
                skill_name="PyTorch",
                category_code="AI",
                canonical_id="pytorch",
                evidence="Deep learning embeddings for customer profiles",
                confidence="medium",
                section="skills",
            ),
        ],
    },
    "priya": {
        "candidate": {
            "name": "Priya Menon",
            "email": "priya.menon@jssaten.ac.in",
            "phone": "+919700112233",
            "links": ["linkedin.com/in/priyamenon"],
        },
        "role": "Technical Support / Entry Engineer",
        "education": [
            {
                "degree": "B.Tech Computer Science",
                "institution": "JSS Academy of Technical Education",
                "year": "2026",
                "score": "8.10 CGPA",
            }
        ],
        "experience": [
            {
                "title": "Technical Operations Intern",
                "org": "FinServ Cloud Systems",
                "kind": "internship",
                "start": "2025-05",
                "end": "2025-07",
                "highlights": [
                    "Triaged and resolved 60+ customer database access and API integration tickets weekly.",
                    "Executed ad-hoc SQL validation queries and authored documentation for tier-1 staff.",
                ],
                "skills": ["SQL", "Customer Support", "Communication", "Documentation"],
            }
        ],
        "projects": [
            {
                "name": "Internal Ticket Management Portal",
                "description": "Developed React and Node.js interface for internal staff issue reporting.",
                "skills": ["React", "JavaScript", "HTML/CSS"],
            }
        ],
        "hackathons": [],
        "certifications": [{"name": "ITIL Foundation v4", "issuer": "Axelos", "year": "2024"}],
        "skills": [
            Skill(
                skill_name="Communication",
                category_code="COMM",
                canonical_id="communication",
                evidence="Authored documentation and client ticket resolution",
                confidence="high",
                section="experience",
            ),
            Skill(
                skill_name="SQL",
                category_code="SQL",
                canonical_id="sql",
                evidence="Executed ad-hoc SQL validation queries weekly",
                confidence="high",
                section="experience",
            ),
            Skill(
                skill_name="React",
                category_code="SWE",
                canonical_id="react",
                evidence="Developed React interface for staff",
                confidence="medium",
                section="projects",
            ),
        ],
    },
    "rohan": {
        "candidate": {
            "name": "Rohan Verma",
            "email": "rohan.verma@jssaten.ac.in",
            "phone": "+919899887766",
            "links": ["github.com/rohanverma", "linkedin.com/in/rohanverma"],
        },
        "role": "Full-Stack Generalist / Product SWE",
        "education": [
            {
                "degree": "B.Tech Computer Science and Engineering",
                "institution": "JSS Academy of Technical Education",
                "year": "2026",
                "score": "9.10 CGPA",
            }
        ],
        "experience": [
            {
                "title": "Full-Stack Developer Intern",
                "org": "Nexus Cloud Scale",
                "kind": "internship",
                "start": "2025-05",
                "end": "2025-08",
                "highlights": [
                    "Led development of real-time multi-tenant dashboard serving 25k active users.",
                    "Configured AWS ECS Fargate, Docker containers, and automated CI/CD pipelines.",
                ],
                "skills": ["TypeScript", "Next.js", "Docker", "AWS", "PostgreSQL"],
            }
        ],
        "projects": [
            {
                "name": "CollabDocs: Real-Time Markdown Editor",
                "description": "Built CRDT-based collaborative editor with WebSockets and Go backend.",
                "skills": ["Go", "WebSockets", "Distributed Systems", "React"],
            }
        ],
        "hackathons": [{"name": "HackCBS 6.0", "result": "Grand Prize Winner", "year": "2024"}],
        "certifications": [
            {"name": "AWS Certified Solutions Architect - Associate", "issuer": "AWS", "year": "2025"}
        ],
        "skills": [
            Skill(
                skill_name="TypeScript",
                category_code="COD",
                canonical_id="typescript",
                evidence="Next.js multi-tenant dashboard in TypeScript",
                confidence="high",
                section="experience",
            ),
            Skill(
                skill_name="Go",
                category_code="COD",
                canonical_id="go",
                evidence="CRDT-based collaborative editor Go backend",
                confidence="high",
                section="projects",
            ),
            Skill(
                skill_name="Docker",
                category_code="CLOUD",
                canonical_id="docker",
                evidence="Configured AWS ECS Fargate and Docker containers",
                confidence="high",
                section="experience",
            ),
            Skill(
                skill_name="AWS",
                category_code="CLOUD",
                canonical_id="aws",
                evidence="Solutions Architect Certified",
                confidence="high",
                section="certifications",
            ),
            Skill(
                skill_name="PostgreSQL",
                category_code="SQL",
                canonical_id="postgresql",
                evidence="Relational schema and indexing for 25k users",
                confidence="high",
                section="experience",
            ),
            Skill(
                skill_name="WebSockets",
                category_code="NETW",
                canonical_id="websockets",
                evidence="Real-time document synchronization via WebSockets",
                confidence="high",
                section="projects",
            ),
        ],
    },
}


def get_sample_extraction(name_key: str = "ananya") -> ResumeExtraction:
    """Return an instant, high-fidelity golden ResumeExtraction for the requested candidate."""
    key = name_key.lower().strip()
    data = GOLDEN_PROFILES.get(key, GOLDEN_PROFILES["ananya"])

    extraction = ResumeExtraction(
        source_type="resume",
        source_file=f"{data['candidate']['name'].replace(' ', '_')}.pdf",
        role=data["role"],
        candidate=ResumeContact(**data["candidate"]),
        skills=data["skills"],
        education=[EducationEntry(**e) for e in data["education"]],
        experience=[ExperienceEntry(**e) for e in data["experience"]],
        projects=[ProjectEntry(**p) for p in data["projects"]],
        hackathons=[HackathonEntry(**h) for h in data["hackathons"]],
        certifications=[CertificationEntry(**c) for c in data["certifications"]],
        field_confidence={
            "candidate": "high",
            "education": "high",
            "experience": "high",
            "projects": "high",
            "hackathons": "high" if data["hackathons"] else "medium",
            "certifications": "high" if data["certifications"] else "medium",
        },
        meta={
            "schema_version": "1.0",
            "prompt_version": "resume-v1",
            "levels_version": "lv-1.0",
            "doc_sha256": "golden_" + key,
            "latency_ms": 14.5,
            "cached": True,
            "pii_redacted": True,
            "grounding_rate": 0.98,
            "layout": "two_column",
            "sections_found": [
                "header",
                "summary",
                "education",
                "experience",
                "projects",
                "skills",
                "hackathons",
                "certifications",
            ],
            "warnings": [],
        },
    )

    category_levels, category_level_details = infer_levels(extraction)
    extraction.category_levels = category_levels
    extraction.category_level_details = category_level_details
    return extraction
