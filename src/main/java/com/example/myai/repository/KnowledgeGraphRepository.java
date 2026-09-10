package com.example.myai.repository;

import com.example.myai.model.KnowledgeRelation;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Collections;
import java.util.List;

@Repository
public class KnowledgeGraphRepository {

    private static final Logger log = LoggerFactory.getLogger(KnowledgeGraphRepository.class);
    private final JdbcTemplate jdbcTemplate;

    public KnowledgeGraphRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private final RowMapper<KnowledgeRelation> rowMapper = new RowMapper<KnowledgeRelation>() {
        @Override
        public KnowledgeRelation mapRow(ResultSet rs, int rowNum) throws SQLException {
            return new KnowledgeRelation(
                    rs.getLong("id"),
                    rs.getString("source_type"),
                    rs.getString("source_id"),
                    rs.getString("source_name"),
                    rs.getString("relation_type"),
                    rs.getString("target_type"),
                    rs.getString("target_id"),
                    rs.getString("target_name"),
                    rs.getString("relation_desc")
            );
        }
    };

    /**
     * 查询全市政务知识图谱全部关联三元组
     */
    public List<KnowledgeRelation> findAll() {
        String sql = "SELECT * FROM gov_knowledge_relation ORDER BY id ASC";
        try {
            return jdbcTemplate.query(sql, rowMapper);
        } catch (Exception e) {
            log.error("查询政务知识图谱失败", e);
            return Collections.emptyList();
        }
    }

    /**
     * 查询指定源实体的关联
     */
    public List<KnowledgeRelation> findBySource(String sourceType, String sourceId) {
        String sql = "SELECT * FROM gov_knowledge_relation WHERE source_type = ? AND source_id = ? ORDER BY id ASC";
        try {
            return jdbcTemplate.query(sql, rowMapper, sourceType, sourceId);
        } catch (Exception e) {
            log.error("按源实体查询知识图谱异常", e);
            return Collections.emptyList();
        }
    }

    /**
     * 查询指定实体的所有双向关联（作为源或作为目标）
     */
    public List<KnowledgeRelation> findRelated(String entityType, String entityId) {
        String sql = "SELECT * FROM gov_knowledge_relation WHERE (source_type = ? AND source_id = ?) OR (target_type = ? AND target_id = ?) ORDER BY id ASC";
        try {
            return jdbcTemplate.query(sql, rowMapper, entityType, entityId, entityType, entityId);
        } catch (Exception e) {
            log.error("查询实体双向关联异常", e);
            return Collections.emptyList();
        }
    }

    /**
     * 根据事项或政策名称模糊查找图谱关联
     */
    public List<KnowledgeRelation> findByNameLike(String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return Collections.emptyList();
        }
        String sql = "SELECT * FROM gov_knowledge_relation WHERE source_name LIKE ? OR target_name LIKE ? ORDER BY id ASC";
        try {
            String pattern = "%" + keyword.trim() + "%";
            return jdbcTemplate.query(sql, rowMapper, pattern, pattern);
        } catch (Exception e) {
            log.error("模糊检索知识图谱异常: keyword={}", keyword, e);
            return Collections.emptyList();
        }
    }
}
