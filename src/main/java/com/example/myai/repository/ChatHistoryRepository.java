package com.example.myai.repository;

import com.example.myai.model.GovChatHistory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.Collections;
import java.util.List;

@Repository
public class ChatHistoryRepository {

    private static final Logger log = LoggerFactory.getLogger(ChatHistoryRepository.class);
    private final JdbcTemplate jdbcTemplate;

    public ChatHistoryRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private final RowMapper<GovChatHistory> rowMapper = new RowMapper<GovChatHistory>() {
        @Override
        public GovChatHistory mapRow(ResultSet rs, int rowNum) throws SQLException {
            GovChatHistory h = new GovChatHistory();
            h.setId(rs.getLong("id"));
            h.setSessionId(rs.getString("session_id"));
            h.setUserId(rs.getString("user_id"));
            h.setUserPrompt(rs.getString("user_prompt"));
            h.setAiReply(rs.getString("ai_reply"));
            h.setDocTitle(rs.getString("doc_title"));
            h.setDocNumber(rs.getString("doc_number"));
            Timestamp ts = rs.getTimestamp("create_time");
            if (ts != null) {
                h.setCreateTime(new java.util.Date(ts.getTime()));
            }
            return h;
        }
    };

    /**
     * 保存单条对话历史记录
     */
    public void save(GovChatHistory history) {
        String sql = "INSERT INTO gov_chat_history (session_id, user_id, user_prompt, ai_reply, doc_title, doc_number, create_time) VALUES (?, ?, ?, ?, ?, ?, ?)";
        try {
            Timestamp now = new Timestamp(System.currentTimeMillis());
            jdbcTemplate.update(sql,
                    history.getSessionId(),
                    history.getUserId() != null ? history.getUserId() : "citizen",
                    history.getUserPrompt(),
                    history.getAiReply(),
                    history.getDocTitle(),
                    history.getDocNumber(),
                    now);
        } catch (Exception e) {
            log.error("保存对话历史至关系数据库失败", e);
        }
    }

    /**
     * 按 sessionId 查询指定会话的最近多轮历史（按时间升序返回，用于组装上下文）
     */
    public List<GovChatHistory> findBySessionId(String sessionId, int limit) {
        if (sessionId == null || sessionId.trim().isEmpty()) {
            return Collections.emptyList();
        }
        String sql = "SELECT * FROM gov_chat_history WHERE session_id = ? ORDER BY id DESC LIMIT ?";
        try {
            List<GovChatHistory> list = jdbcTemplate.query(sql, rowMapper, sessionId, limit);
            Collections.reverse(list);
            return list;
        } catch (Exception e) {
            log.error("查询会话历史记录异常: sessionId={}", sessionId, e);
            return Collections.emptyList();
        }
    }

    /**
     * 查询全局最近对话记录
     */
    public List<GovChatHistory> findRecent(int limit) {
        String sql = "SELECT * FROM gov_chat_history ORDER BY id DESC LIMIT ?";
        try {
            return jdbcTemplate.query(sql, rowMapper, limit);
        } catch (Exception e) {
            log.error("查询全局最近对话历史异常", e);
            return Collections.emptyList();
        }
    }

    /**
     * 清空指定会话的历史记录
     */
    public int clearBySessionId(String sessionId) {
        if (sessionId == null || sessionId.trim().isEmpty()) {
            return 0;
        }
        String sql = "DELETE FROM gov_chat_history WHERE session_id = ?";
        try {
            return jdbcTemplate.update(sql, sessionId);
        } catch (Exception e) {
            log.error("清空会话历史失败: sessionId={}", sessionId, e);
            return 0;
        }
    }

    /**
     * 统计持久化的总对话咨询轮次
     */
    public int countTotal() {
        String sql = "SELECT COUNT(*) FROM gov_chat_history";
        try {
            Integer count = jdbcTemplate.queryForObject(sql, Integer.class);
            return count != null ? count : 0;
        } catch (Exception e) {
            return 0;
        }
    }
}
