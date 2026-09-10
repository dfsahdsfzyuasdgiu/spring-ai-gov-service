package com.example.myai.repository;

import com.example.myai.model.PolicyDoc;
import com.example.myai.model.PolicyDoc.PolicyClause;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Repository
public class PolicyRepository {

    private static final Logger log = LoggerFactory.getLogger(PolicyRepository.class);
    private final JdbcTemplate jdbcTemplate;
    private final Map<Long, PolicyDoc> cache = new ConcurrentHashMap<>();
    private final AtomicLong idGen = new AtomicLong(100);

    public PolicyRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * 从关系数据库加载全部广州市官方政策法规及分条款
     */
    public List<PolicyDoc> findAll() {
        try {
            String sqlDocs = "SELECT * FROM gov_policy_doc ORDER BY id ASC";
            List<PolicyDoc> docs = jdbcTemplate.query(sqlDocs, (rs, rowNum) -> {
                PolicyDoc doc = new PolicyDoc();
                doc.setId(rs.getLong("id"));
                doc.setDocNumber(rs.getString("doc_number"));
                doc.setTitle(rs.getString("title"));
                doc.setCategory(rs.getString("category"));
                doc.setIssuerDept(rs.getString("issuer_dept"));
                doc.setPublishDate(rs.getString("publish_date"));
                doc.setEffectiveDate(rs.getString("effective_date"));
                doc.setStatus(rs.getInt("status"));
                doc.setSummary(rs.getString("summary"));
                return doc;
            });

            if (!docs.isEmpty()) {
                String sqlClauses = "SELECT * FROM gov_policy_clause ORDER BY policy_id ASC, id ASC";
                Map<Long, List<PolicyClause>> clauseMap = new HashMap<>();
                jdbcTemplate.query(sqlClauses, rs -> {
                    long policyId = rs.getLong("policy_id");
                    String clauseNo = rs.getString("clause_no");
                    String clauseText = rs.getString("clause_text");
                    clauseMap.computeIfAbsent(policyId, k -> new ArrayList<>())
                            .add(new PolicyClause(clauseNo, clauseText));
                });

                for (PolicyDoc doc : docs) {
                    List<PolicyClause> cl = clauseMap.get(doc.getId());
                    if (cl != null) {
                        doc.setClauses(cl);
                    }
                    cache.put(doc.getId(), doc);
                }
                return docs;
            }
        } catch (Exception e) {
            log.error("从关系数据库加载政策公文失败，降级读取缓存", e);
        }

        return new ArrayList<>(cache.values());
    }

    public Optional<PolicyDoc> findById(Long id) {
        if (id == null) return Optional.empty();
        if (cache.containsKey(id)) {
            return Optional.of(cache.get(id));
        }
        try {
            String sql = "SELECT * FROM gov_policy_doc WHERE id = ?";
            List<PolicyDoc> list = jdbcTemplate.query(sql, (rs, rowNum) -> {
                PolicyDoc doc = new PolicyDoc();
                doc.setId(rs.getLong("id"));
                doc.setDocNumber(rs.getString("doc_number"));
                doc.setTitle(rs.getString("title"));
                doc.setCategory(rs.getString("category"));
                doc.setIssuerDept(rs.getString("issuer_dept"));
                doc.setPublishDate(rs.getString("publish_date"));
                doc.setEffectiveDate(rs.getString("effective_date"));
                doc.setStatus(rs.getInt("status"));
                doc.setSummary(rs.getString("summary"));
                return doc;
            }, id);

            if (!list.isEmpty()) {
                PolicyDoc doc = list.get(0);
                String sqlClauses = "SELECT * FROM gov_policy_clause WHERE policy_id = ? ORDER BY id ASC";
                List<PolicyClause> clauses = jdbcTemplate.query(sqlClauses, (rs, rowNum) ->
                        new PolicyClause(rs.getString("clause_no"), rs.getString("clause_text")), id);
                doc.setClauses(clauses);
                cache.put(doc.getId(), doc);
                return Optional.of(doc);
            }
        } catch (Exception e) {
            log.error("按ID查询政策公文异常: id={}", id, e);
        }
        return Optional.empty();
    }

    public List<PolicyDoc> findByCategory(String category) {
        if (category == null || category.trim().isEmpty() || "全部".equals(category)) {
            return findAll();
        }
        List<PolicyDoc> all = findAll();
        List<PolicyDoc> filtered = new ArrayList<>();
        for (PolicyDoc doc : all) {
            if (category.equals(doc.getCategory())) {
                filtered.add(doc);
            }
        }
        return filtered;
    }

    public PolicyDoc save(PolicyDoc doc) {
        if (doc.getId() == null) {
            doc.setId(idGen.incrementAndGet());
        }
        cache.put(doc.getId(), doc);
        try {
            String sql = "MERGE INTO gov_policy_doc (id, doc_number, title, category, issuer_dept, publish_date, effective_date, status, summary) KEY(id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
            jdbcTemplate.update(sql,
                    doc.getId(),
                    doc.getDocNumber(),
                    doc.getTitle(),
                    doc.getCategory(),
                    doc.getIssuerDept(),
                    doc.getPublishDate(),
                    doc.getEffectiveDate(),
                    doc.getStatus(),
                    doc.getSummary());

            if (doc.getClauses() != null) {
                jdbcTemplate.update("DELETE FROM gov_policy_clause WHERE policy_id = ?", doc.getId());
                for (PolicyClause c : doc.getClauses()) {
                    jdbcTemplate.update("INSERT INTO gov_policy_clause (policy_id, clause_no, clause_text) VALUES (?, ?, ?)",
                            doc.getId(), c.getClauseNo(), c.getClauseText());
                }
            }
        } catch (Exception e) {
            log.error("保存政策公文到关系数据库异常: id={}", doc.getId(), e);
        }
        return doc;
    }
}
