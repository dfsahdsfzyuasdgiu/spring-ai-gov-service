-- 基于 SpringBoot+SpringAi 的智能政务咨询系统 · 核心数据表结构 DDL
-- 包含：政策法规公文表、政务事项办事指南表、多轮对话历史表、政务知识图谱关联表

-- 1. 政策法规公文表
CREATE TABLE IF NOT EXISTS gov_policy_doc (
    id BIGINT PRIMARY KEY,
    doc_number VARCHAR(100) NOT NULL,
    title VARCHAR(300) NOT NULL,
    category VARCHAR(100) NOT NULL,
    issuer_dept VARCHAR(200) NOT NULL,
    publish_date VARCHAR(50),
    effective_date VARCHAR(50),
    status INT DEFAULT 1,
    summary TEXT
);

-- 2. 政策法规条款表
CREATE TABLE IF NOT EXISTS gov_policy_clause (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    policy_id BIGINT NOT NULL,
    clause_no VARCHAR(100) NOT NULL,
    clause_text TEXT NOT NULL,
    CONSTRAINT fk_clause_policy FOREIGN KEY (policy_id) REFERENCES gov_policy_doc(id) ON DELETE CASCADE
);

-- 3. 政务办事指南事项表
CREATE TABLE IF NOT EXISTS gov_affair_guide (
    id BIGINT PRIMARY KEY,
    affair_code VARCHAR(100) NOT NULL,
    affair_name VARCHAR(300) NOT NULL,
    category VARCHAR(100) NOT NULL,
    service_object VARCHAR(100) DEFAULT '自然人',
    legal_limit_days INT DEFAULT 15,
    promised_limit_days INT DEFAULT 1,
    qualifications TEXT,
    handling_address VARCHAR(500),
    online_handle_url VARCHAR(500)
);

-- 4. 办事指南申报材料表
CREATE TABLE IF NOT EXISTS gov_affair_material (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    affair_id BIGINT NOT NULL,
    name VARCHAR(300) NOT NULL,
    mandatory BOOLEAN DEFAULT TRUE,
    format VARCHAR(100),
    sample_tip VARCHAR(500),
    CONSTRAINT fk_material_affair FOREIGN KEY (affair_id) REFERENCES gov_affair_guide(id) ON DELETE CASCADE
);

-- 5. 办事指南流程步骤表
CREATE TABLE IF NOT EXISTS gov_affair_process (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    affair_id BIGINT NOT NULL,
    step_no INT NOT NULL,
    step_name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    time_cost VARCHAR(100),
    CONSTRAINT fk_process_affair FOREIGN KEY (affair_id) REFERENCES gov_affair_guide(id) ON DELETE CASCADE
);

-- 6. 对话历史持久化表 (支持 Spring AI 上下文管理与回溯)
CREATE TABLE IF NOT EXISTS gov_chat_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL,
    user_id VARCHAR(100),
    user_prompt TEXT NOT NULL,
    ai_reply TEXT NOT NULL,
    doc_title VARCHAR(300),
    doc_number VARCHAR(100),
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. 政务知识图谱关联表 (实体-关系-实体 三元组)
CREATE TABLE IF NOT EXISTS gov_knowledge_relation (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    source_type VARCHAR(50) NOT NULL,
    source_id VARCHAR(100) NOT NULL,
    source_name VARCHAR(300) NOT NULL,
    relation_type VARCHAR(50) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id VARCHAR(100) NOT NULL,
    target_name VARCHAR(300) NOT NULL,
    relation_desc VARCHAR(500)
);

-- 8. 幂等添加外键约束（针对既有表环境）
ALTER TABLE gov_policy_clause ADD CONSTRAINT IF NOT EXISTS fk_clause_policy FOREIGN KEY (policy_id) REFERENCES gov_policy_doc(id) ON DELETE CASCADE;
ALTER TABLE gov_affair_material ADD CONSTRAINT IF NOT EXISTS fk_material_affair FOREIGN KEY (affair_id) REFERENCES gov_affair_guide(id) ON DELETE CASCADE;
ALTER TABLE gov_affair_process ADD CONSTRAINT IF NOT EXISTS fk_process_affair FOREIGN KEY (affair_id) REFERENCES gov_affair_guide(id) ON DELETE CASCADE;

