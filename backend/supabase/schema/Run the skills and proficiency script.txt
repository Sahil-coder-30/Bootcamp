-- ============================================================================
-- 01_master_tables.sql
-- Creates the four core normalized tables for the skill areas database
-- Run this script first in your Supabase SQL Editor
-- ============================================================================


-- ============================================================================
-- Table: skill_set_master
-- Primary reference table for all skill areas
-- ============================================================================
CREATE TABLE IF NOT EXISTS skill_set_master (
    skill_set_id SERIAL PRIMARY KEY,
    skill_set_name VARCHAR(100) NOT NULL UNIQUE,
    short_name VARCHAR(10) NOT NULL UNIQUE,
    skill_set_description TEXT
);

-- Create index for faster lookups by name
CREATE INDEX IF NOT EXISTS idx_skill_set_name ON skill_set_master(skill_set_name);
CREATE INDEX IF NOT EXISTS idx_skill_set_short_name ON skill_set_master(short_name);

-- ============================================================================
-- Table: proficiency_levels
-- Reference table for proficiency levels (1-10)
-- ============================================================================
CREATE TABLE IF NOT EXISTS proficiency_levels (
    proficiency_level_id INTEGER PRIMARY KEY CHECK (proficiency_level_id BETWEEN 1 AND 10),
    proficiency_name VARCHAR(50) NOT NULL,
    proficiency_code VARCHAR(5) NOT NULL,
    proficiency_description TEXT
);

-- Create index for faster lookups by code
CREATE INDEX IF NOT EXISTS idx_proficiency_code ON proficiency_levels(proficiency_code);

-- ============================================================================
-- Table: skill_set_topics
-- Normalized topics for each skill/level combination
-- ============================================================================
CREATE TABLE IF NOT EXISTS skill_set_topics (
    topic_id SERIAL PRIMARY KEY,
    skill_set_id INTEGER NOT NULL REFERENCES skill_set_master(skill_set_id) ON DELETE CASCADE,
    level_number INTEGER NOT NULL CHECK (level_number BETWEEN 1 AND 10),
    topics TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique topic per skill/level combination
    CONSTRAINT unique_topic_per_skill_level UNIQUE (skill_set_id, level_number, topics)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_skill_set_topics_skill ON skill_set_topics(skill_set_id);
CREATE INDEX IF NOT EXISTS idx_skill_set_topics_level ON skill_set_topics(level_number);

-- ============================================================================
-- Table: company_skill_levels
-- Stores company requirements per skill area
-- ============================================================================
CREATE TABLE IF NOT EXISTS company_skill_levels (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    skill_set_id INTEGER NOT NULL REFERENCES skill_set_master(skill_set_id) ON DELETE CASCADE,
    required_level INTEGER NOT NULL CHECK (required_level BETWEEN 1 AND 10),
    required_proficiency_level_id INTEGER NOT NULL REFERENCES proficiency_levels(proficiency_level_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique skill requirement per company
    CONSTRAINT unique_company_skill UNIQUE (company_id, skill_set_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_company_skill_levels_company ON company_skill_levels(company_id);
CREATE INDEX IF NOT EXISTS idx_company_skill_levels_skill ON company_skill_levels(skill_set_id);




-----------------------------------
-----------------------------------


-- ============================================================================
-- 02_staging_tables.sql
-- Creates staging tables for denormalized data ingestion
-- Run this script after 01_master_tables.sql
-- ============================================================================

-- ============================================================================
-- Staging Table: staging_skill_topics
-- Accepts denormalized skill topic data with semicolon-separated topics
-- Format: Skill Area | Levels | Topic (semicolon-separated)
-- ============================================================================
CREATE TABLE IF NOT EXISTS staging_skill_topics (
    id SERIAL PRIMARY KEY,
    skill_area TEXT NOT NULL,                    -- e.g., "Coding"
    levels TEXT NOT NULL,                         -- e.g., "Level 1" or "1"
    topics TEXT NOT NULL,                         -- e.g., "Topic1; Topic2; Topic3"
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for unprocessed records
CREATE INDEX IF NOT EXISTS idx_staging_skill_topics_unprocessed 
    ON staging_skill_topics(processed) WHERE processed = FALSE;

-- ============================================================================
-- Staging Table: staging_company_skill_levels
-- Accepts denormalized company skills data matching Excel/CSV format
-- Each skill area has its own column with "level-proficiency_code" format
-- ============================================================================
CREATE TABLE IF NOT EXISTS staging_company_skill_levels (
    id SERIAL PRIMARY KEY,
    companies TEXT NOT NULL,                                      -- Company name
    coding TEXT,                                                  -- e.g., "5-AP"
    data_structures_and_algorithms TEXT,                          -- e.g., "4-AP"
    object_oriented_programming_and_design TEXT,                  -- e.g., "3-AP"
    aptitude_and_problem_solving TEXT,                            -- e.g., "5-AP"
    communication_skills TEXT,                                    -- e.g., "5-AP"
    ai_native_engineering TEXT,                                   -- e.g., "4-AP"
    devops_and_cloud TEXT,                                        -- e.g., "4-CU"
    sql_and_design TEXT,                                          -- e.g., "4-CU"
    software_engineering TEXT,                                    -- e.g., "5-AP"
    system_design_and_architecture TEXT,                          -- e.g., "3-CU"
    computer_networking TEXT,                                     -- e.g., "3-CU"
    operating_system TEXT,                                        -- e.g., "3-CU"
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for unprocessed records
CREATE INDEX IF NOT EXISTS idx_staging_company_skill_levels_unprocessed 
    ON staging_company_skill_levels(processed) WHERE processed = FALSE;

-- ============================================================================
-- Comments for documentation
-- ============================================================================
COMMENT ON TABLE staging_skill_topics IS 'Staging table for importing denormalized skill topics from CSV/Excel';
COMMENT ON COLUMN staging_skill_topics.skill_area IS 'Skill area name, must match skill_set_master.skill_set_name';
COMMENT ON COLUMN staging_skill_topics.levels IS 'Level number, accepts "Level X" format or plain integer 1-10';
COMMENT ON COLUMN staging_skill_topics.topics IS 'Semicolon-separated list of topics to be split into individual rows';

COMMENT ON TABLE staging_company_skill_levels IS 'Staging table for importing denormalized company skills from CSV/Excel';
COMMENT ON COLUMN staging_company_skill_levels.companies IS 'Company name';
COMMENT ON COLUMN staging_company_skill_levels.coding IS 'Value in format "level-proficiency_code" e.g., "5-AP"';




-----------------------------------
-----------------------------------




-- ============================================================================
-- 03_skills_functions.sql
-- Creates functions and triggers for automatic ETL processing
-- Run this script after 01_master_tables.sql and 02_staging_tables.sql
-- ============================================================================

-- ============================================================================
-- Helper Function: parse_level_number
-- Converts "Level X" or "X" to integer, validates 1-10 range
-- ============================================================================
CREATE OR REPLACE FUNCTION parse_level_number(level_text TEXT)
RETURNS INTEGER AS $$
DECLARE
    level_num INTEGER;
    cleaned_text TEXT;
BEGIN
    -- Clean the input: trim whitespace
    cleaned_text := TRIM(level_text);
    
    -- Remove "Level " prefix (case insensitive) if present
    cleaned_text := REGEXP_REPLACE(cleaned_text, '^[Ll]evel\s*', '', 'i');
    
    -- Remove any remaining non-numeric characters except digits
    cleaned_text := REGEXP_REPLACE(cleaned_text, '[^0-9]', '', 'g');
    
    -- Convert to integer
    IF cleaned_text = '' OR cleaned_text IS NULL THEN
        RAISE EXCEPTION 'Invalid level format: "%". Expected "Level X" or a number 1-10.', level_text;
    END IF;
    
    level_num := cleaned_text::INTEGER;
    
    -- Validate range
    IF level_num < 1 OR level_num > 10 THEN
        RAISE EXCEPTION 'Level must be between 1 and 10. Got: %', level_num;
    END IF;
    
    RETURN level_num;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- Helper Function: get_skill_set_id
-- Looks up skill_set_id from skill_set_master by name
-- ============================================================================
CREATE OR REPLACE FUNCTION get_skill_set_id(skill_name TEXT)
RETURNS INTEGER AS $$
DECLARE
    result_id INTEGER;
BEGIN
    SELECT skill_set_id INTO result_id
    FROM skill_set_master
    WHERE LOWER(TRIM(skill_set_name)) = LOWER(TRIM(skill_name));
    
    IF result_id IS NULL THEN
        RAISE EXCEPTION 'Skill area not found: "%"', skill_name;
    END IF;
    
    RETURN result_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- Helper Function: get_proficiency_level_id
-- Looks up proficiency_level_id from proficiency_levels by code
-- ============================================================================
CREATE OR REPLACE FUNCTION get_proficiency_level_id(prof_code TEXT)
RETURNS INTEGER AS $$
DECLARE
    result_id INTEGER;
BEGIN
    SELECT proficiency_level_id INTO result_id
    FROM proficiency_levels
    WHERE UPPER(TRIM(proficiency_code)) = UPPER(TRIM(prof_code))
    LIMIT 1;
    
    IF result_id IS NULL THEN
        RAISE EXCEPTION 'Proficiency code not found: "%"', prof_code;
    END IF;
    
    RETURN result_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- Helper Function: parse_skill_value
-- Parses "level-proficiency_code" format (e.g., "5-AP" or "5 – AP")
-- Returns TABLE with required_level and proficiency_code
-- ============================================================================
CREATE OR REPLACE FUNCTION parse_skill_value(skill_value TEXT)
RETURNS TABLE(required_level INTEGER, proficiency_code TEXT) AS $$
DECLARE
    parts TEXT[];
    level_part TEXT;
    prof_part TEXT;
    cleaned_value TEXT;
BEGIN
    IF skill_value IS NULL OR TRIM(skill_value) = '' THEN
        RETURN;
    END IF;
    
    -- Clean the input and normalize different dash types
    cleaned_value := TRIM(skill_value);
    cleaned_value := REGEXP_REPLACE(cleaned_value, '\s*[–—-]\s*', '-', 'g');  -- Normalize dashes
    
    -- Split by hyphen
    parts := STRING_TO_ARRAY(cleaned_value, '-');
    
    IF array_length(parts, 1) < 2 THEN
        RAISE EXCEPTION 'Invalid skill value format: "%". Expected "level-proficiency_code" (e.g., "5-AP")', skill_value;
    END IF;
    
    level_part := TRIM(parts[1]);
    prof_part := TRIM(parts[2]);
    
    -- Parse level number
    required_level := parse_level_number(level_part);
    proficiency_code := prof_part;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- Helper Function: get_or_create_company
-- Gets company_id or creates new company if not exists
-- ============================================================================
CREATE OR REPLACE FUNCTION get_or_create_company(company_name_input TEXT)
RETURNS INTEGER AS $$
DECLARE
    result_id INTEGER;
BEGIN
    -- Try to find existing company
    SELECT company_id INTO result_id
    FROM companies
    WHERE LOWER(TRIM(name)) = LOWER(TRIM(company_name_input));
    
    -- Create if not exists
    IF result_id IS NULL THEN
        INSERT INTO companies (name)
        VALUES (TRIM(company_name_input))
        RETURNING company_id INTO result_id;
    END IF;
    
    RETURN result_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Trigger Function: process_staging_skill_topics
-- Automatically processes new rows in staging_skill_topics
-- Splits semicolon-separated topics into individual rows
-- ============================================================================
CREATE OR REPLACE FUNCTION process_staging_skill_topics()
RETURNS TRIGGER AS $$
DECLARE
    v_skill_set_id INTEGER;
    v_level_number INTEGER;
    v_topic TEXT;
    v_topics TEXT[];
BEGIN
    -- Skip if already processed
    IF NEW.processed = TRUE THEN
        RETURN NEW;
    END IF;
    
    BEGIN
        -- Get skill_set_id
        v_skill_set_id := get_skill_set_id(NEW.skill_area);
        
        -- Parse level number
        v_level_number := parse_level_number(NEW.levels);
        
        -- Split topics by semicolon
        v_topics := STRING_TO_ARRAY(NEW.topics, ';');
        
        -- Insert each topic as a separate row
        FOREACH v_topic IN ARRAY v_topics
        LOOP
            v_topic := TRIM(v_topic);
            
            -- Skip empty topics
            IF v_topic IS NOT NULL AND v_topic != '' THEN
                INSERT INTO skill_set_topics (skill_set_id, level_number, topics)
                VALUES (v_skill_set_id, v_level_number, v_topic)
                ON CONFLICT (skill_set_id, level_number, topics) DO NOTHING;
            END IF;
        END LOOP;
        
        -- Mark as processed
        NEW.processed := TRUE;
        NEW.processed_at := NOW();
        NEW.error_message := NULL;
        
    EXCEPTION WHEN OTHERS THEN
        -- Log error but don't fail the insert
        NEW.processed := FALSE;
        NEW.error_message := SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Trigger Function: process_staging_company_skill_levels
-- Automatically processes new rows in staging_company_skill_levels
-- Maps each skill column to company_skill_levels table
-- ============================================================================
CREATE OR REPLACE FUNCTION process_staging_company_skill_levels()
RETURNS TRIGGER AS $$
DECLARE
    v_company_id INTEGER;
    v_skill_set_id INTEGER;
    v_required_level INTEGER;
    v_proficiency_code TEXT;
    v_proficiency_level_id INTEGER;
    skill_mapping RECORD;
BEGIN
    -- Skip if already processed
    IF NEW.processed = TRUE THEN
        RETURN NEW;
    END IF;
    
    BEGIN
        -- Get or create company
        v_company_id := get_or_create_company(NEW.companies);
        
        -- Process each skill column using a loop
        FOR skill_mapping IN 
            SELECT skill_name, skill_value FROM (
                VALUES 
                    ('Coding', NEW.coding),
                    ('Data Structures and Algorithms', NEW.data_structures_and_algorithms),
                    ('Object-Oriented Programming and Design', NEW.object_oriented_programming_and_design),
                    ('Aptitude and Problem Solving', NEW.aptitude_and_problem_solving),
                    ('Communication Skills', NEW.communication_skills),
                    ('AI Native Engineering', NEW.ai_native_engineering),
                    ('DevOps and Cloud', NEW.devops_and_cloud),
                    ('SQL and Design', NEW.sql_and_design),
                    ('Software Engineering', NEW.software_engineering),
                    ('System Design and Architecture', NEW.system_design_and_architecture),
                    ('Computer Networking', NEW.computer_networking),
                    ('Operating System', NEW.operating_system)
            ) AS t(skill_name, skill_value)
            WHERE skill_value IS NOT NULL AND TRIM(skill_value) != ''
        LOOP
            -- Get skill_set_id
            v_skill_set_id := get_skill_set_id(skill_mapping.skill_name);
            
            -- Parse the skill value (e.g., "5-AP")
            SELECT pv.required_level, pv.proficiency_code 
            INTO v_required_level, v_proficiency_code
            FROM parse_skill_value(skill_mapping.skill_value) pv;
            
            -- Get proficiency_level_id
            v_proficiency_level_id := get_proficiency_level_id(v_proficiency_code);
            
            -- Insert into company_skill_levels
            INSERT INTO company_skill_levels (company_id, skill_set_id, required_level, required_proficiency_level_id)
            VALUES (v_company_id, v_skill_set_id, v_required_level, v_proficiency_level_id)
            ON CONFLICT (company_id, skill_set_id) 
            DO UPDATE SET 
                required_level = EXCLUDED.required_level,
                required_proficiency_level_id = EXCLUDED.required_proficiency_level_id;
        END LOOP;
        
        -- Mark as processed
        NEW.processed := TRUE;
        NEW.processed_at := NOW();
        NEW.error_message := NULL;
        
    EXCEPTION WHEN OTHERS THEN
        -- Log error but don't fail the insert
        NEW.processed := FALSE;
        NEW.error_message := SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Create Triggers
-- ============================================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trg_process_staging_skill_topics ON staging_skill_topics;
DROP TRIGGER IF EXISTS trg_process_staging_company_skill_levels ON staging_company_skill_levels;

-- Trigger for staging_skill_topics
CREATE TRIGGER trg_process_staging_skill_topics
    BEFORE INSERT ON staging_skill_topics
    FOR EACH ROW
    EXECUTE FUNCTION process_staging_skill_topics();

-- Trigger for staging_company_skill_levels
CREATE TRIGGER trg_process_staging_company_skill_levels
    BEFORE INSERT ON staging_company_skill_levels
    FOR EACH ROW
    EXECUTE FUNCTION process_staging_company_skill_levels();








-----------------------------------
-----------------------------------


-- ============================================================================
-- 04_seed_data.sql
-- Populates master tables with initial reference data
-- Run this script after all previous scripts
-- ============================================================================

-- ============================================================================
-- Seed: skill_set_master
-- 12 core skill areas
-- ============================================================================
INSERT INTO skill_set_master (skill_set_id, skill_set_name, short_name, skill_set_description)
VALUES 
    (1, 'Coding', 'COD', 'The foundational ability to write clean, efficient, and functional code in one or more programming languages to implement software solutions.'),
    (2, 'Data Structures and Algorithms', 'DSA', 'Knowledge of fundamental data structures (arrays, trees, graphs, etc.) and algorithms (searching, sorting, traversal) to solve computational problems efficiently, with an understanding of time and space complexity.'),
    (3, 'Aptitude and Problem Solving', 'APTI', 'The capacity for logical reasoning, quantitative analysis, and breaking down complex, ambiguous problems into solvable components.'),
    (4, 'Communication Skills', 'COMM', 'The ability to articulate ideas clearly and concisely, both verbally and in writing, to collaborate effectively with team members, stakeholders, and clients.'),
    (5, 'Object-Oriented Programming and Design', 'OOD', 'Expertise in applying OOP principles (encapsulation, inheritance, polymorphism, abstraction) and design patterns to create modular, reusable, and maintainable software.'),
    (6, 'AI Native Engineering', 'AI', 'The practice of building software with AI as a core component, encompassing prompt engineering, integration of AI models (LLMs, ML), and developing applications that leverage generative AI and machine learning capabilities.'),
    (7, 'SQL and Design', 'SQL', 'Proficiency in writing and optimizing SQL queries, combined with the ability to design, normalize, and manage relational database schemas for data integrity and performance.'),
    (8, 'System Design and Architecture', 'SYSD', 'The skill of designing large-scale, scalable, reliable, and high-performance software systems, including defining components, their interactions, and selecting appropriate architectural patterns.'),
    (9, 'DevOps and Cloud', 'CLOUD', 'Knowledge of practices that combine software development and IT operations (CI/CD, IaC, monitoring) and experience with cloud platforms (AWS, Azure, GCP) for deploying and managing applications.'),
    (10, 'Software Engineering', 'SWE', 'A broad understanding of the full software development lifecycle (SDLC), including requirements analysis, design, implementation, testing, deployment, and maintenance, following engineering best practices.'),
    (11, 'Computer Networking', 'NETW', 'Understanding of network protocols (TCP/IP, HTTP, DNS), network architecture, and concepts related to data communication, routing, and security across distributed systems.'),
    (12, 'Operating System', 'OS', 'Knowledge of core operating system concepts such as process and thread management, memory management, file systems, concurrency, and system calls.')
ON CONFLICT (skill_set_id) DO UPDATE SET
    skill_set_name = EXCLUDED.skill_set_name,
    short_name = EXCLUDED.short_name,
    skill_set_description = EXCLUDED.skill_set_description;

-- Reset sequence to avoid conflicts
SELECT setval('skill_set_master_skill_set_id_seq', (SELECT MAX(skill_set_id) FROM skill_set_master));

-- ============================================================================
-- Seed: proficiency_levels
-- 10 proficiency levels (pairs of levels with same proficiency type)
-- ============================================================================
INSERT INTO proficiency_levels (proficiency_level_id, proficiency_name, proficiency_code, proficiency_description)
VALUES 
    (1, 'Conceptual Understanding', 'CU', 'Awareness and comprehension of fundamental facts, concepts, and terminology. The ability to recall or recognize ideas in a basic form.'),
    (2, 'Conceptual Understanding', 'CU', 'Awareness and comprehension of fundamental facts, concepts, and terminology. The ability to recall or recognize ideas in a basic form.'),
    (3, 'Application', 'AP', 'The ability to use learned knowledge, concepts, and techniques in new, concrete situations to solve straightforward problems.'),
    (4, 'Application', 'AP', 'The ability to use learned knowledge, concepts, and techniques in new, concrete situations to solve straightforward problems.'),
    (5, 'Analysis and Synthesis', 'AS', 'The capacity to deconstruct complex information into constituent parts, understand their relationships, and combine elements to form a new, coherent whole.'),
    (6, 'Analysis and Synthesis', 'AS', 'The capacity to deconstruct complex information into constituent parts, understand their relationships, and combine elements to form a new, coherent whole.'),
    (7, 'Evaluation', 'EV', 'The ability to make judgments, critique, and defend opinions based on criteria and standards through logical examination and comparison.'),
    (8, 'Evaluation', 'EV', 'The ability to make judgments, critique, and defend opinions based on criteria and standards through logical examination and comparison.'),
    (9, 'Creation', 'CR', 'The skill to generate, design, or construct original work, solutions, or processes by planning, producing, and integrating novel ideas.'),
    (10, 'Creation', 'CR', 'The skill to generate, design, or construct original work, solutions, or processes by planning, producing, and integrating novel ideas.')
ON CONFLICT (proficiency_level_id) DO UPDATE SET
    proficiency_name = EXCLUDED.proficiency_name,
    proficiency_code = EXCLUDED.proficiency_code,
    proficiency_description = EXCLUDED.proficiency_description;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Verify skill_set_master data
-- SELECT * FROM skill_set_master ORDER BY skill_set_id;

-- Verify proficiency_levels data
-- SELECT * FROM proficiency_levels ORDER BY proficiency_level_id;
