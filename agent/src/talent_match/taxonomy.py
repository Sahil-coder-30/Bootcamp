"""
taxonomy.py
===========
Canonical skill taxonomy, aliases, hierarchy, implication DAG, and false-friends blocking.
"""

from __future__ import annotations

import json
from typing import Literal
from pydantic import BaseModel, Field

CategoryCode = str  # 'COD' | 'DSA' | 'AI' | 'SQL' | 'SYSD' | 'CLOUD' | 'SWE' | 'NETW' | 'OS' | 'COMM' | 'APTI' | 'OOD' | 'OTHER'


class TaxonomyEntry(BaseModel):
    canonical_id: str
    display_name: str
    category_code: CategoryCode
    kind: Literal["language", "framework", "tool", "platform", "concept", "domain", "soft"]
    aliases: list[str] = Field(default_factory=list)
    parents: list[str] = Field(default_factory=list)
    implies: list[str] = Field(default_factory=list)
    related: list[str] = Field(default_factory=list)
    distinct_from: list[str] = Field(default_factory=list)
    maps_to_categories: list[CategoryCode] = Field(default_factory=list)
    learn_hint: str | None = None


TAXONOMY_VERSION = "tx-1.0"

SEED: list[TaxonomyEntry] = [
    # Languages
    TaxonomyEntry(
        canonical_id="python",
        display_name="Python",
        category_code="COD",
        kind="language",
        aliases=["py", "python3", "python 3", "cpython"],
        distinct_from=["cython"],
        learn_hint="Advanced Python: generators, async io, metaclasses, decorators, profiling.",
    ),
    TaxonomyEntry(
        canonical_id="javascript",
        display_name="JavaScript",
        category_code="COD",
        kind="language",
        aliases=["js", "es6", "ecmascript", "vanilla js", "modern javascript"],
        distinct_from=["java"],
        learn_hint="ESNext features, closures, event loop, Promise chaining, and async/await.",
    ),
    TaxonomyEntry(
        canonical_id="typescript",
        display_name="TypeScript",
        category_code="COD",
        kind="language",
        aliases=["ts"],
        implies=["javascript"],
        parents=["javascript"],
        learn_hint="Generics, utility types, discriminating unions, and tsconfig tuning.",
    ),
    TaxonomyEntry(
        canonical_id="java",
        display_name="Java",
        category_code="COD",
        kind="language",
        aliases=["java8", "java11", "java17", "java21", "core java", "j2se"],
        distinct_from=["javascript"],
        learn_hint="JVM internals, concurrency primitives, GC tuning, streams, and virtual threads.",
    ),
    TaxonomyEntry(
        canonical_id="cpp",
        display_name="C++",
        category_code="COD",
        kind="language",
        aliases=["c plus plus", "c++11", "c++14", "c++17", "c++20", "modern c++"],
        distinct_from=["c", "c#"],
        learn_hint="RAII, smart pointers, move semantics, templates, and memory alignment.",
    ),
    TaxonomyEntry(
        canonical_id="c",
        display_name="C",
        category_code="COD",
        kind="language",
        aliases=["c language", "ansi c"],
        distinct_from=["cpp", "c#"],
        learn_hint="Pointers, memory management, malloc/free, struct packing, and system calls.",
    ),
    TaxonomyEntry(
        canonical_id="csharp",
        display_name="C#",
        category_code="COD",
        kind="language",
        aliases=["c sharp", "c#.net"],
        distinct_from=["cpp", "c"],
        learn_hint="LINQ, async/await, memory management, and .NET Core runtime architecture.",
    ),
    TaxonomyEntry(
        canonical_id="golang",
        display_name="Go",
        category_code="COD",
        kind="language",
        aliases=["go", "golang"],
        learn_hint="Goroutines, channels, interfaces, sync package, and memory profiling with pprof.",
    ),
    TaxonomyEntry(
        canonical_id="rust",
        display_name="Rust",
        category_code="COD",
        kind="language",
        aliases=["rustlang"],
        learn_hint="Borrow checker, lifetimes, traits, unsafe Rust, and Tokio async runtime.",
    ),
    TaxonomyEntry(
        canonical_id="sql-lang",
        display_name="SQL",
        category_code="SQL",
        kind="language",
        aliases=["structured query language", "ansi sql"],
        distinct_from=["nosql"],
        learn_hint="Window functions, CTEs, query plan optimization, indexing strategies, and ACID transactions.",
    ),

    # Frameworks & Libs
    TaxonomyEntry(
        canonical_id="react",
        display_name="React",
        category_code="SWE",
        kind="framework",
        aliases=["reactjs", "react.js", "react js"],
        implies=["javascript"],
        distinct_from=["react-native"],
        learn_hint="Hooks lifecycle, custom hooks, React Server Components, context optimization.",
    ),
    TaxonomyEntry(
        canonical_id="react-native",
        display_name="React Native",
        category_code="SWE",
        kind="framework",
        aliases=["react native"],
        implies=["javascript", "react"],
        distinct_from=["react"],
        learn_hint="Bridge architecture, TurboModules, navigation, and native build setups.",
    ),
    TaxonomyEntry(
        canonical_id="nodejs",
        display_name="Node.js",
        category_code="SWE",
        kind="platform",
        aliases=["node", "node js", "nodejs"],
        implies=["javascript"],
        learn_hint="Event loop phases, streams, buffer management, clustering, and worker threads.",
    ),
    TaxonomyEntry(
        canonical_id="express",
        display_name="Express.js",
        category_code="SWE",
        kind="framework",
        aliases=["express", "expressjs"],
        implies=["nodejs", "javascript"],
        learn_hint="Middleware pipelines, error handling, route modularization, and security hardening.",
    ),
    TaxonomyEntry(
        canonical_id="spring-boot",
        display_name="Spring Boot",
        category_code="SWE",
        kind="framework",
        aliases=["spring", "springboot", "spring framework", "spring mvc"],
        implies=["java"],
        learn_hint="IoC container, Spring Security, Spring Data JPA, actuator, and transactional management.",
    ),
    TaxonomyEntry(
        canonical_id="django",
        display_name="Django",
        category_code="SWE",
        kind="framework",
        aliases=["django rest framework", "drf"],
        implies=["python"],
        learn_hint="ORM query optimization (select_related/prefetch_related), middleware, and authentication.",
    ),
    TaxonomyEntry(
        canonical_id="flask",
        display_name="Flask",
        category_code="SWE",
        kind="framework",
        aliases=["flask rest"],
        implies=["python"],
        learn_hint="Application factory pattern, blueprints, extensions, and WSGI deployment.",
    ),
    TaxonomyEntry(
        canonical_id="fastapi",
        display_name="FastAPI",
        category_code="SWE",
        kind="framework",
        aliases=["fast api"],
        implies=["python"],
        learn_hint="Pydantic models, dependency injection, async endpoints, OpenAPI auto-docs.",
    ),

    # Databases
    TaxonomyEntry(
        canonical_id="relational-databases",
        display_name="Relational Databases",
        category_code="SQL",
        kind="concept",
        aliases=["rdbms", "relational database", "relational db", "sql databases"],
        distinct_from=["nosql"],
        learn_hint="Normalization (1NF-3NF/BCNF), isolation levels, transaction logs (WAL), and query planners.",
    ),
    TaxonomyEntry(
        canonical_id="postgresql",
        display_name="PostgreSQL",
        category_code="SQL",
        kind="tool",
        aliases=["postgres", "psql", "postgre sql", "postgresql database"],
        parents=["relational-databases"],
        implies=["sql-lang"],
        related=["mysql"],
        distinct_from=["nosql", "mongodb"],
        learn_hint="EXPLAIN ANALYZE, indexing (B-Tree, GIN, GiST), JSONB queries, connection pooling (PgBouncer).",
    ),
    TaxonomyEntry(
        canonical_id="mysql",
        display_name="MySQL",
        category_code="SQL",
        kind="tool",
        aliases=["my sql", "mariadb"],
        parents=["relational-databases"],
        implies=["sql-lang"],
        related=["postgresql"],
        distinct_from=["nosql", "mongodb"],
        learn_hint="InnoDB storage engine, buffer pool tuning, replication, index optimization.",
    ),
    TaxonomyEntry(
        canonical_id="mongodb",
        display_name="MongoDB",
        category_code="SQL",
        kind="tool",
        aliases=["mongo", "mongo db"],
        parents=["nosql"],
        distinct_from=["postgresql", "mysql", "relational-databases"],
        learn_hint="Aggregation pipelines, compound indexes, replica sets, and sharding architecture.",
    ),
    TaxonomyEntry(
        canonical_id="nosql",
        display_name="NoSQL",
        category_code="SQL",
        kind="concept",
        aliases=["nosql databases", "document store"],
        distinct_from=["relational-databases", "sql-lang"],
        learn_hint="CAP theorem, document vs key-value vs column vs graph stores, BASE consistency.",
    ),
    TaxonomyEntry(
        canonical_id="redis",
        display_name="Redis",
        category_code="SYSD",
        kind="tool",
        aliases=["redis cache", "redis in-memory"],
        parents=["nosql"],
        learn_hint="Data structures (hashes, sorted sets, bitmaps), persistence (RDB, AOF), caching strategies, Lua scripts.",
    ),

    # Cloud & DevOps
    TaxonomyEntry(
        canonical_id="docker",
        display_name="Docker",
        category_code="CLOUD",
        kind="tool",
        aliases=["containerization", "containers", "dockerfile", "docker compose"],
        related=["kubernetes"],
        learn_hint="Multi-stage builds, layer caching, rootless containers, Docker compose networking.",
    ),
    TaxonomyEntry(
        canonical_id="kubernetes",
        display_name="Kubernetes",
        category_code="CLOUD",
        kind="platform",
        aliases=["k8s", "kube", "kubectl"],
        implies=["docker"],
        related=["docker"],
        learn_hint="Pods, Deployments, Services; deploy your Docker app on minikube. Next: Helm charts, CI/CD to cluster.",
    ),
    TaxonomyEntry(
        canonical_id="aws",
        display_name="AWS",
        category_code="CLOUD",
        kind="platform",
        aliases=["amazon web services", "amazon aws"],
        related=["gcp", "azure"],
        learn_hint="Core services: EC2, S3, IAM, Lambda, VPC, RDS, CloudWatch, and CloudFormation.",
    ),
    TaxonomyEntry(
        canonical_id="gcp",
        display_name="Google Cloud Platform",
        category_code="CLOUD",
        kind="platform",
        aliases=["gcp", "google cloud"],
        related=["aws", "azure"],
        learn_hint="GKE, Compute Engine, BigQuery, Cloud Run, Cloud Storage, and IAM policies.",
    ),
    TaxonomyEntry(
        canonical_id="azure",
        display_name="Microsoft Azure",
        category_code="CLOUD",
        kind="platform",
        aliases=["azure cloud", "ms azure"],
        related=["aws", "gcp"],
        learn_hint="Azure App Services, AKS, Azure Functions, Blob Storage, and Azure Entra ID.",
    ),
    TaxonomyEntry(
        canonical_id="git",
        display_name="Git",
        category_code="SWE",
        kind="tool",
        aliases=["version control", "github", "gitlab", "bitbucket", "git cli"],
        learn_hint="Rebase, interactive rebase, cherry-pick, merge conflict resolution, branch protection workflows.",
    ),
    TaxonomyEntry(
        canonical_id="ci-cd",
        display_name="CI/CD",
        category_code="CLOUD",
        kind="concept",
        aliases=["continuous integration", "continuous deployment", "github actions", "jenkins"],
        learn_hint="Pipeline automation, automated test stages, artifact builds, and deployment gates.",
    ),

    # Distributed Systems & System Design
    TaxonomyEntry(
        canonical_id="distributed-systems",
        display_name="Distributed Systems",
        category_code="SYSD",
        kind="concept",
        aliases=["distributed computing", "distributed architecture"],
        learn_hint="Consensus algorithms (Raft, Paxos), CAP theorem, distributed transactions, event-driven architecture.",
    ),
    TaxonomyEntry(
        canonical_id="kafka",
        display_name="Apache Kafka",
        category_code="SYSD",
        kind="tool",
        aliases=["kafka", "kafka event streaming", "kafka pipeline"],
        implies=["distributed-systems"],
        parents=["distributed-systems"],
        learn_hint="Partitions, consumer groups, offset management, exactly-once semantics, Kafka Streams.",
    ),
    TaxonomyEntry(
        canonical_id="system-design",
        display_name="System Design",
        category_code="SYSD",
        kind="concept",
        aliases=["system architecture", "high level design", "hld", "low level design", "lld"],
        learn_hint="Load balancing, horizontal scaling, caching layers, rate limiting, and database sharding.",
    ),
    TaxonomyEntry(
        canonical_id="microservices",
        display_name="Microservices",
        category_code="SYSD",
        kind="concept",
        aliases=["microservice architecture", "micro-services"],
        implies=["system-design"],
        learn_hint="API gateway, service discovery, saga pattern, circuit breakers, and distributed tracing.",
    ),

    # AI & ML
    TaxonomyEntry(
        canonical_id="machine-learning",
        display_name="Machine Learning",
        category_code="AI",
        kind="concept",
        aliases=["ml", "predictive modeling"],
        distinct_from=["mlops"],
        learn_hint="Feature engineering, cross-validation, bias-variance tradeoff, regularization, ensemble methods.",
    ),
    TaxonomyEntry(
        canonical_id="deep-learning",
        display_name="Deep Learning",
        category_code="AI",
        kind="concept",
        aliases=["dl", "neural networks"],
        parents=["machine-learning"],
        implies=["machine-learning"],
        learn_hint="Backpropagation, activations, CNNs, RNNs, Transformers, optimization (AdamW).",
    ),
    TaxonomyEntry(
        canonical_id="pytorch",
        display_name="PyTorch",
        category_code="AI",
        kind="framework",
        aliases=["torch"],
        implies=["python", "machine-learning", "deep-learning"],
        parents=["deep-learning"],
        learn_hint="Tensors, autograd, custom Dataset/DataLoader, nn.Module, model checkpoints, GPU acceleration.",
    ),
    TaxonomyEntry(
        canonical_id="tensorflow",
        display_name="TensorFlow",
        category_code="AI",
        kind="framework",
        aliases=["tf", "keras"],
        implies=["python", "machine-learning", "deep-learning"],
        parents=["deep-learning"],
        related=["pytorch"],
        learn_hint="Computational graphs, Keras API, tf.data, model serving, and quantization.",
    ),
    TaxonomyEntry(
        canonical_id="spark",
        display_name="Apache Spark",
        category_code="AI",
        kind="tool",
        aliases=["spark", "pyspark", "spark streaming"],
        implies=["distributed-systems"],
        learn_hint="RDDs, DataFrames, Catalyst optimizer, partitioning, shuffle operations, and broadcast variables.",
    ),
    TaxonomyEntry(
        canonical_id="pandas",
        display_name="Pandas",
        category_code="AI",
        kind="tool",
        aliases=["pandas library"],
        implies=["python"],
        learn_hint="Vectorized operations, merge/join/groupby, handling missing data, and memory optimization.",
    ),

    # DSA & Core CS
    TaxonomyEntry(
        canonical_id="dsa",
        display_name="Data Structures and Algorithms",
        category_code="DSA",
        kind="concept",
        aliases=[
            "data structures",
            "algorithms",
            "dsa",
            "data structures and algorithms",
            "algorithm design",
            "problem solving",
        ],
        maps_to_categories=["DSA"],
        learn_hint="Time/space complexity, trees, graphs, dynamic programming, heaps, and two-pointer techniques.",
    ),
    TaxonomyEntry(
        canonical_id="cs-fundamentals",
        display_name="Strong CS Fundamentals",
        category_code="SWE",
        kind="concept",
        aliases=["cs fundamentals", "computer science fundamentals", "core computer science"],
        maps_to_categories=["DSA", "OS", "NETW", "COD"],
        learn_hint="Operating systems concepts (processes, threads), networking fundamentals (TCP/IP), and algorithms.",
    ),
    TaxonomyEntry(
        canonical_id="operating-systems",
        display_name="Operating Systems",
        category_code="OS",
        kind="concept",
        aliases=["os", "operating system concepts", "linux internals"],
        maps_to_categories=["OS"],
        learn_hint="Process scheduling, virtual memory, paging, inter-process communication, file systems.",
    ),
    TaxonomyEntry(
        canonical_id="computer-networking",
        display_name="Computer Networking",
        category_code="NETW",
        kind="concept",
        aliases=["networking", "tcp/ip", "computer networks", "network protocols"],
        maps_to_categories=["NETW"],
        learn_hint="OSI model, TCP vs UDP, DNS resolution, HTTP/HTTPS handshake, sockets, and subnetting.",
    ),
    TaxonomyEntry(
        canonical_id="software-testing",
        display_name="Software Testing",
        category_code="SWE",
        kind="concept",
        aliases=["testing", "unit testing", "integration testing", "pytest", "junit"],
        learn_hint="Test pyramid, mocking, test fixtures, coverage analysis, and property-based testing.",
    ),
    TaxonomyEntry(
        canonical_id="communication",
        display_name="Communication",
        category_code="COMM",
        kind="soft",
        aliases=["communication skills", "written communication", "verbal communication"],
        maps_to_categories=["COMM"],
        learn_hint="Technical documentation, clear PR descriptions, cross-functional collaboration, presentation.",
    ),
]


class TaxonomyIndex:
    def __init__(self, entries: list[TaxonomyEntry]):
        self.entries = {e.canonical_id: e for e in entries}
        self.alias_map: dict[str, str] = {}
        self._ancestors_cache: dict[str, frozenset[str]] = {}
        self._implies_cache: dict[str, frozenset[str]] = {}

        from talent_match.skill_match.normalize import normalize

        for e in entries:
            norm_display = normalize(e.display_name)
            self.alias_map[norm_display] = e.canonical_id
            self.alias_map[e.canonical_id.lower()] = e.canonical_id
            for alias in e.aliases:
                norm_alias = normalize(alias)
                if norm_alias:
                    self.alias_map[norm_alias] = e.canonical_id

        # Precompute graph closures
        for cid in self.entries:
            self._ancestors_cache[cid] = self._build_ancestors(cid)
            self._implies_cache[cid] = self._build_implies(cid)

    def _build_ancestors(self, cid: str, visited: set[str] | None = None) -> frozenset[str]:
        if visited is None:
            visited = set()
        if cid in visited or cid not in self.entries:
            return frozenset()
        visited.add(cid)
        result = set()
        for p in self.entries[cid].parents:
            result.add(p)
            result.update(self._build_ancestors(p, visited))
        return frozenset(result)

    def _build_implies(self, cid: str, visited: set[str] | None = None) -> frozenset[str]:
        if visited is None:
            visited = set()
        if cid in visited or cid not in self.entries:
            return frozenset()
        visited.add(cid)
        result = set()
        for imp in self.entries[cid].implies:
            result.add(imp)
            result.update(self._build_implies(imp, visited))
        return frozenset(result)

    def get(self, cid: str) -> TaxonomyEntry | None:
        return self.entries.get(cid)

    def resolve(self, name: str, category_hint: str | None = None) -> str | None:
        from talent_match.skill_match.normalize import normalize

        norm = normalize(name)
        if norm in self.alias_map:
            return self.alias_map[norm]
        norm_no_space = norm.replace(" ", "")
        for alias, cid in self.alias_map.items():
            if alias.replace(" ", "") == norm_no_space:
                return cid
        return None

    def ancestors(self, cid: str) -> frozenset[str]:
        return self._ancestors_cache.get(cid, frozenset())

    def implies_closure(self, cid: str) -> frozenset[str]:
        return self._implies_cache.get(cid, frozenset())

    def is_distinct(self, cid_a: str, cid_b: str) -> bool:
        if cid_a == cid_b:
            return False
        ea = self.entries.get(cid_a)
        eb = self.entries.get(cid_b)
        if ea and cid_b in ea.distinct_from:
            return True
        if eb and cid_a in eb.distinct_from:
            return True
        return False

    def relation(self, cand_cid: str, jd_cid: str) -> str | None:
        """
        Determines taxonomy relation:
        - 'instance_of': candidate skill is an instance / descendant of JD skill (e.g. Postgres -> relational-databases)
        - 'implies': candidate skill directly or transitively implies JD skill (e.g. Spring Boot -> Java)
        - 'general_form': candidate skill is ancestor / general form of JD skill (e.g. SQL -> Postgres)
        - 'sibling': both share an immediate common parent (e.g. MySQL & Postgres share relational-databases)
        """
        if cand_cid == jd_cid:
            return "same"

        # Check candidate implies JD
        if jd_cid in self.implies_closure(cand_cid):
            return "implies"

        # Check candidate is instance of JD (JD is ancestor of candidate)
        if jd_cid in self.ancestors(cand_cid):
            return "instance_of"

        # Check candidate is general form of JD (candidate is ancestor of JD)
        if cand_cid in self.ancestors(jd_cid):
            return "general_form"

        # Check siblings
        cand_entry = self.entries.get(cand_cid)
        jd_entry = self.entries.get(jd_cid)
        if cand_entry and jd_entry:
            cand_parents = set(cand_entry.parents)
            jd_parents = set(jd_entry.parents)
            if cand_parents and cand_parents.intersection(jd_parents):
                return "sibling"
            if jd_cid in cand_entry.related or cand_cid in jd_entry.related:
                return "sibling"

        return None


# Global singleton instance
taxonomy_index = TaxonomyIndex(SEED)


def get(cid: str) -> TaxonomyEntry | None:
    return taxonomy_index.get(cid)


def resolve(name: str, category_hint: str | None = None) -> str | None:
    return taxonomy_index.resolve(name, category_hint)


def ancestors(cid: str) -> frozenset[str]:
    return taxonomy_index.ancestors(cid)


def implies_closure(cid: str) -> frozenset[str]:
    return taxonomy_index.implies_closure(cid)


def is_distinct(a: str, b: str) -> bool:
    return taxonomy_index.is_distinct(a, b)


def relation(cand_cid: str, jd_cid: str) -> str | None:
    return taxonomy_index.relation(cand_cid, jd_cid)

