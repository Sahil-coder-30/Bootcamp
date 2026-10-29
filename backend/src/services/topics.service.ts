/**
 * topics.service.ts
 * Fetches skill_set_topics from DB or falls back to local data/topics.
 */

import { supabase } from "./supabase.service.js";

// Topic ladders fallback for 12 categories
export const TOPICS_FALLBACK: Record<string, Record<string, string>> = {
  COD: {
    "1": "Syntax, basic variables, loops, conditionals",
    "2": "Functions, arrays, basic string manipulations",
    "3": "Modular programming, error handling, standard libraries",
    "4": "File I/O, regex, data serialization (JSON, YAML)",
    "5": "Object-oriented programming, interfaces, closures",
    "6": "Concurrency, multithreading, async/await patterns",
    "7": "Memory management, profiling, garbage collection internals",
    "8": "Design patterns, clean architecture, SOLID principles",
    "9": "Compiler optimizations, runtime internals, low-level tuning",
    "10": "Language design, custom runtimes, zero-copy architecture",
  },
  DSA: {
    "1": "Time and space complexity (Big O notation)",
    "2": "Linear data structures: arrays, linked lists, stacks, queues",
    "3": "Binary search, basic sorting algorithms (Merge, Quick)",
    "4": "Hash tables, collision resolution, hash maps",
    "5": "Trees, BST, binary heap, priority queues",
    "6": "Graph representations, BFS, DFS, topological sort",
    "7": "Dynamic programming (memoization, tabulation), greedy algorithms",
    "8": "Advanced graphs: Dijkstra, Bellman-Ford, Union-Find, MST",
    "9": "Segment trees, Fenwick trees, Trie, suffix arrays",
    "10": "NP-hard problems, approximation algorithms, randomized algorithms",
  },
  SQL: {
    "1": "Basic SELECT, WHERE, ORDER BY, aggregate functions",
    "2": "JOINs (INNER, LEFT, RIGHT), GROUP BY, HAVING",
    "3": "Subqueries, constraints, primary and foreign keys",
    "4": "Normalization (1NF, 2NF, 3NF), index basics (B-Tree)",
    "5": "Transactions, ACID properties, isolation levels",
    "6": "Complex window functions, CTEs (WITH clause)",
    "7": "Query execution plans (EXPLAIN), index tuning, composite indexes",
    "8": "Partitioning, sharding concepts, write-ahead logging (WAL)",
    "9": "Database internals, buffer pools, MVCC implementation",
    "10": "Distributed consensus in databases, distributed transactions (2PC)",
  },
  SYSD: {
    "1": "Client-server architecture, HTTP/HTTPS, REST basics",
    "2": "Load balancing algorithms, reverse proxies (Nginx)",
    "3": "Caching strategies (Redis, Memcached), cache invalidation",
    "4": "Stateless servers, horizontal vs vertical scaling",
    "5": "Relational vs NoSQL trade-offs, CAP theorem",
    "6": "Message queues and pub/sub (Kafka, RabbitMQ)",
    "7": "Microservices design patterns, API gateways, circuit breakers",
    "8": "Database replication, failover, leader-follower architecture",
    "9": "Distributed consensus, consistent hashing, rate limiting",
    "10": "Global multi-region active-active architectures, disaster recovery",
  },
  CLOUD: {
    "1": "Cloud computing basics (IaaS, PaaS, SaaS)",
    "2": "Docker fundamentals: containers, images, Dockerfile",
    "3": "Cloud compute and storage (EC2/S3, GCE/GCS)",
    "4": "Networking in cloud: VPCs, subnets, security groups",
    "5": "CI/CD pipelines, automated testing and build triggers",
    "6": "Kubernetes core: Pods, Deployments, Services, ConfigMaps",
    "7": "Infrastructure as Code (Terraform, CloudFormation)",
    "8": "Observability: Prometheus, Grafana, ELK/OpenSearch",
    "9": "Kubernetes advanced: Helm, Ingress controllers, cluster autoscaling",
    "10": "Service mesh (Istio), zero-trust network architectures, multi-cloud",
  },
  SWE: {
    "1": "Git basics: clone, add, commit, push, pull",
    "2": "Branching workflows, pull requests, code reviews",
    "3": "Unit testing basics, assertions, test runners",
    "4": "Integration testing, mocking, test fixtures",
    "5": "REST API design standards, error handling patterns",
    "6": "Refactoring techniques, code smell identification",
    "7": "TDD, test coverage analysis, CI integration",
    "8": "Release management, semantic versioning, feature flags",
    "9": "Static analysis, security vulnerability scanning, SAST/DAST",
    "10": "Software architectural governance, enterprise framework standards",
  },
};

export async function getTopicsByCategory(): Promise<Record<string, Record<string, string>>> {
  const result: Record<string, Record<string, string>> = { ...TOPICS_FALLBACK };

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("skill_set_topics")
        .select("skill_set_id, level, topics");

      if (!error && data && data.length > 0) {
        const idToCode: Record<number, string> = {
          1: "COD", 2: "DSA", 3: "APTI", 4: "COMM", 5: "OOD", 6: "AI",
          7: "SQL", 8: "SYSD", 9: "CLOUD", 10: "SWE", 11: "NETW", 12: "OS"
        };
        for (const row of data) {
          const code = idToCode[row.skill_set_id];
          if (code && row.topics) {
            if (!result[code]) result[code] = {};
            result[code][String(row.level)] = row.topics;
          }
        }
      }
    } catch {
      // Use fallback
    }
  }

  return result;
}

