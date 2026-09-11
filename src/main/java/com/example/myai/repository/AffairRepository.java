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

        // 1. 住房保障与住房公积金 (4 项)
        if (p.contains("公积金") && (p.contains("租房") || p.contains("无房") || p.contains("按月提取"))) {
            return findById(108L).orElse(null); // 个人住房公积金无房租赁按月提取
        }
        if (p.contains("公积金") && (p.contains("房贷") || p.contains("按揭") || p.contains("冲还") || p.contains("对冲"))) {
            return findById(109L).orElse(null); // 个人住房公积金按月冲还房贷本息提取
        }
        if (p.contains("实物配租") || (p.contains("公租房") && p.contains("轮候")) || (p.contains("公租房") && p.contains("户籍"))) {
            return findById(107L).orElse(null); // 本市户籍中等偏下收入家庭公租房实物配租轮候
        }
        if (p.contains("公租房") || p.contains("租赁补贴") || p.contains("租房补贴") || p.contains("住房保障") || (p.contains("租房") && p.contains("补贴"))) {
            return findById(101L).orElse(null); // 新就业无房职工公租房租赁补贴
        }
        if (p.contains("公积金")) {
            return findById(108L).orElse(null);
        }

        // 2. 户籍人口与人才服务 (5 项)
        if (p.contains("学历入户") || (p.contains("大学生") && p.contains("入户")) || (p.contains("高校") && p.contains("落户")) || (p.contains("毕业生") && p.contains("落户"))) {
            return findById(110L).orElse(null); // 全日制学历入户
        }
        if (p.contains("安家费") || p.contains("人才补贴") || (p.contains("新引进人才") && p.contains("补贴")) || (p.contains("人才") && p.contains("住房补贴"))) {
            return findById(111L).orElse(null); // 新引进人才住房补贴与安家费
        }
        if (p.contains("居住证") || p.contains("粤居码") || p.contains("居住登记")) {
            return findById(112L).orElse(null); // 广东省居住证首次申领与电子居住证签注
        }
        if (p.contains("新生儿") || p.contains("出生登记") || p.contains("婴儿落户") || p.contains("小孩入户") || p.contains("宝宝落户")) {
            return findById(113L).orElse(null); // 新生儿出生登记与落户
        }
        if (p.contains("积分入户") || p.contains("来穗") || (p.contains("积分") && p.contains("入户")) || p.contains("落户") || p.contains("入户广州") || p.contains("入户")) {
            return findById(102L).orElse(null); // 来穗人员积分制入户申报
        }

        // 3. 交通出行与车辆车管 (4 项)
        if (p.contains("节能车") || p.contains("节能指标")) {
            return findById(114L).orElse(null); // 节能车增量指标直接摇号
        }
        if (p.contains("驾驶证") || p.contains("驾照") || p.contains("换证") || p.contains("警医邮") || p.contains("期满换证")) {
            return findById(115L).orElse(null); // 驾驶证期满换证警医邮
        }
        if (p.contains("免检") || p.contains("检验标志") || p.contains("年审") || p.contains("年检")) {
            return findById(116L).orElse(null); // 免检车辆电子检验合格标志
        }
        if (p.contains("摇号") || p.contains("中小客车") || p.contains("车牌") || p.contains("指标") || p.contains("竞价") || p.contains("粤a") || p.contains("买车")) {
            return findById(103L).orElse(null); // 中小客车个人增量指标摇号
        }

        // 4. 出入境与跨境便民 (4 项)
        if (p.contains("再次签注") || p.contains("智能签注") || p.contains("立等可取") || p.contains("签注机")) {
            return findById(117L).orElse(null); // 赴港澳旅游再次签注智能机立等可取
        }
        if (p.contains("护照") || p.contains("普通护照")) {
            return findById(118L).orElse(null); // 中华人民共和国普通护照首次申领
        }
        if (p.contains("台湾") || p.contains("赴台") || p.contains("台胞") || p.contains("大通证")) {
            return findById(119L).orElse(null); // 大陆居民往来台湾通行证
        }
        if (p.contains("港澳") || p.contains("通行证") || p.contains("签注") || p.contains("出入境") || p.contains("香港") || p.contains("澳门")) {
            return findById(106L).orElse(null); // 往来港澳通行证及团队旅游签注全国通办
        }

        // 5. 医疗保障与健康互助 (5 项)
        if (p.contains("共济") || (p.contains("医保") && p.contains("家庭")) || (p.contains("医保") && p.contains("父母")) || (p.contains("医保") && p.contains("子女"))) {
            return findById(121L).orElse(null); // 职工医保个人账户家庭共济绑定
        }
        if (p.contains("异地就医") || p.contains("跨省就医") || p.contains("异地结算") || p.contains("异地就医备案")) {
            return findById(122L).orElse(null); // 跨省异地就医直接结算联网备案
        }
        if (p.contains("生育津贴") || p.contains("生育保险") || p.contains("产假") || p.contains("生小孩报销") || p.contains("分娩津贴")) {
            return findById(123L).orElse(null); // 职工生育保险待遇与生育津贴
        }
        if (p.contains("城乡居民医保") || p.contains("少儿医保") || p.contains("居民医保") || p.contains("学生医保")) {
            return findById(120L).orElse(null); // 城乡居民基本医疗保险年度参保
        }
        if (p.contains("灵活就业") || (p.contains("医保") && !p.contains("车")) || p.contains("看病报销") || p.contains("医疗保险")) {
            return findById(105L).orElse(null); // 灵活就业人员职工基本医疗保险参保
        }

        // 6. 就业创业与社会保险 (3 项)
        if (p.contains("失业金") || p.contains("失业保险") || p.contains("失业补助") || p.contains("被裁员") || p.contains("失业")) {
            return findById(124L).orElse(null); // 失业保险金按月申领
        }
        if (p.contains("技能补贴") || p.contains("技能提升") || p.contains("考证补贴") || p.contains("职业技能") || p.contains("职业资格")) {
            return findById(125L).orElse(null); // 职业技能提升补贴
        }
        if ((p.contains("高校毕业生") || p.contains("大学生")) && (p.contains("社保补贴") || p.contains("灵活就业补贴"))) {
            return findById(126L).orElse(null); // 高校毕业生灵活就业社会保险补贴
        }

        // 7. 营商环境与企业民营经济 (5 项)
        if (p.contains("个转企") || (p.contains("个体户") && (p.contains("转企业") || p.contains("转公司") || p.contains("升级")))) {
            return findById(127L).orElse(null); // 个转企直接登记
        }
        if (p.contains("食品经营") || p.contains("餐饮许可") || p.contains("食品许可") || (p.contains("开餐饮") && p.contains("证"))) {
            return findById(128L).orElse(null); // 食品经营许可告知承诺制
        }
        if (p.contains("高新技术") || p.contains("高企") || p.contains("高新企业") || p.contains("科技企业认定")) {
            return findById(129L).orElse(null); // 高新技术企业认定奖励补贴
        }
        if (p.contains("简易注销") || (p.contains("企业") && p.contains("注销")) || (p.contains("公司") && p.contains("注销")) || p.contains("营业执照注销")) {
            return findById(130L).orElse(null); // 企业简易注销登记
        }
        if (p.contains("开办企业") || p.contains("办企业") || p.contains("营业执照") || p.contains("刻章") || p.contains("印章") || p.contains("开公司") || p.contains("新办企业") || p.contains("注册公司")) {
            return findById(104L).orElse(null); // 开办企业一网通办与免费刻章
        }

        // 8. 老龄福利与青年关怀 (2 项)
        if (p.contains("老年人") || p.contains("老人卡") || p.contains("优待卡") || p.contains("长寿金") || p.contains("长寿保健金") || p.contains("老人乘车") || p.contains("高龄津贴")) {
            return findById(131L).orElse(null); // 广州老年人优待卡与长寿保健金
        }
        if (p.contains("青年驿站") || p.contains("人才驿站") || p.contains("免租住宿") || p.contains("求职住宿") || p.contains("人才公寓")) {
            return findById(132L).orElse(null); // 青年人才驿站免租住宿与人才公寓
        }

        // 9. 数据库动态模糊分词兜底检索
        List<AffairGuide> allGuides = findAll();
        AffairGuide bestAffair = null;
        int maxMatchCount = 0;
        for (AffairGuide g : allGuides) {
            int matchCount = 0;
            String name = g.getAffairName().toLowerCase();
            String cat = g.getCategory().toLowerCase();
            if (p.contains(name) || name.contains(p)) {
                matchCount += 10;
            }
            // 词段匹配
            for (int len = 4; len >= 2; len--) {
                for (int i = 0; i <= p.length() - len; i++) {
                    String sub = p.substring(i, i + len);
                    if (name.contains(sub)) {
                        matchCount += len;
                    }
                }
            }
            if (p.contains(cat)) {
                matchCount += 3;
            }
            if (matchCount > maxMatchCount && matchCount >= 4) {
                maxMatchCount = matchCount;
                bestAffair = g;
            }
        }

        return bestAffair;
    }
}
