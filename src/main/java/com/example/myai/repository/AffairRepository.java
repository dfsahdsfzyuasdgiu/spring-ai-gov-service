package com.example.myai.repository;

import com.example.myai.model.AffairGuide;
import com.example.myai.model.AffairGuide.MaterialItem;
import com.example.myai.model.AffairGuide.ProcessStep;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Repository
public class AffairRepository {

    private static final Logger log = LoggerFactory.getLogger(AffairRepository.class);
    private final JdbcTemplate jdbcTemplate;
    private final Map<Long, AffairGuide> cache = new ConcurrentHashMap<>();
    private final AtomicLong idGen = new AtomicLong(200);

    public AffairRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * 从关系数据库查询全部广州市政务服务办事指南（含申报材料清单与流程步骤）
     */
    public List<AffairGuide> findAll() {
        try {
            String sqlGuides = "SELECT * FROM gov_affair_guide ORDER BY id ASC";
            List<AffairGuide> guides = jdbcTemplate.query(sqlGuides, (rs, rowNum) -> {
                AffairGuide g = new AffairGuide();
                g.setId(rs.getLong("id"));
                g.setAffairCode(rs.getString("affair_code"));
                g.setAffairName(rs.getString("affair_name"));
                g.setCategory(rs.getString("category"));
                g.setServiceObject(rs.getString("service_object"));
                g.setLegalLimitDays(rs.getInt("legal_limit_days"));
                g.setPromisedLimitDays(rs.getInt("promised_limit_days"));
                g.setQualifications(rs.getString("qualifications"));
                g.setHandlingAddress(rs.getString("handling_address"));
                g.setOnlineHandleUrl(rs.getString("online_handle_url"));
                return g;
            });

            if (!guides.isEmpty()) {
                // 加载材料
                String sqlMat = "SELECT * FROM gov_affair_material ORDER BY affair_id ASC, id ASC";
                Map<Long, List<MaterialItem>> matMap = new HashMap<>();
                jdbcTemplate.query(sqlMat, rs -> {
                    long aid = rs.getLong("affair_id");
                    matMap.computeIfAbsent(aid, k -> new ArrayList<>()).add(new MaterialItem(
                            rs.getLong("id"),
                            rs.getString("name"),
                            rs.getBoolean("mandatory"),
                            rs.getString("format"),
                            rs.getString("sample_tip")
                    ));
                });

                // 加载步骤
                String sqlProc = "SELECT * FROM gov_affair_process ORDER BY affair_id ASC, step_no ASC";
                Map<Long, List<ProcessStep>> procMap = new HashMap<>();
                jdbcTemplate.query(sqlProc, rs -> {
                    long aid = rs.getLong("affair_id");
                    procMap.computeIfAbsent(aid, k -> new ArrayList<>()).add(new ProcessStep(
                            rs.getInt("step_no"),
                            rs.getString("step_name"),
                            rs.getString("description"),
                            rs.getString("time_cost")
                    ));
                });

                for (AffairGuide g : guides) {
                    if (matMap.containsKey(g.getId())) {
                        g.setMaterials(matMap.get(g.getId()));
                    }
                    if (procMap.containsKey(g.getId())) {
                        g.setProcessSteps(procMap.get(g.getId()));
                    }
                    cache.put(g.getId(), g);
                }
                return guides;
            }
        } catch (Exception e) {
            log.error("从关系数据库加载办事指南失败，读取缓存", e);
        }

        return new ArrayList<>(cache.values());
    }

    public Optional<AffairGuide> findById(Long id) {
        if (id == null) return Optional.empty();
        if (cache.containsKey(id)) {
            return Optional.of(cache.get(id));
        }
        findAll(); // 触发全量加载
        return Optional.ofNullable(cache.get(id));
    }

    public List<AffairGuide> findByCategory(String category) {
        if (category == null || category.trim().isEmpty() || "全部".equals(category)) {
            return findAll();
        }
        List<AffairGuide> all = findAll();
        List<AffairGuide> filtered = new ArrayList<>();
        for (AffairGuide g : all) {
            if (category.equals(g.getCategory())) {
                filtered.add(g);
            }
        }
        return filtered;
    }

    /**
     * 根据市民咨询意图精准推荐广州市政务服务事项导办卡片
     */
    public AffairGuide matchBestAffair(String prompt) {
        if (prompt == null || prompt.trim().isEmpty()) {
            return null;
        }
        String p = prompt.toLowerCase();
        // 1. 公租房租赁补贴申领 (ID: 101)
        if (p.contains("公租房") || p.contains("租赁补贴") || p.contains("租房补贴") || p.contains("住房保障") || (p.contains("租房") && p.contains("补贴"))) {
            return findById(101L).orElse(null);
        }
        // 2. 来穗人员积分制入户申报 (ID: 102)
        if (p.contains("积分入户") || p.contains("来穗") || (p.contains("积分") && p.contains("入户")) || p.contains("落户") || p.contains("入户广州") || p.contains("入户")) {
            return findById(102L).orElse(null);
        }
        // 3. 中小客车指标摇号 (ID: 103)
        if (p.contains("摇号") || p.contains("中小客车") || p.contains("车牌") || p.contains("指标") || p.contains("竞价") || p.contains("粤a") || p.contains("买车")) {
            return findById(103L).orElse(null);
        }
        // 4. 企业开办与免费刻章 (ID: 104)
        if (p.contains("开办企业") || p.contains("办企业") || p.contains("营业执照") || p.contains("刻章") || p.contains("印章") || p.contains("开公司") || p.contains("新办企业")) {
            return findById(104L).orElse(null);
        }
        // 5. 灵活就业人员职工医保 (ID: 105)
        if (p.contains("灵活就业") || (p.contains("医保") && !p.contains("车")) || p.contains("看病报销") || p.contains("医疗保险")) {
            return findById(105L).orElse(null);
        }
        // 6. 往来港澳通行证及团队旅游签注全国通办 (ID: 106)
        if (p.contains("港澳") || p.contains("通行证") || p.contains("签注") || p.contains("出入境") || p.contains("香港") || p.contains("澳门") || p.contains("护照")) {
            return findById(106L).orElse(null);
        }

        return null;
    }
}
