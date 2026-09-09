package com.example.myai.service;

import com.example.myai.model.PolicyDoc;
import com.example.myai.model.PolicyDoc.PolicyClause;
import com.example.myai.repository.PolicyRepository;
import org.springframework.stereotype.Service;

import java.io.Serializable;
import java.util.*;

/**
 * 政务混合 RAG 检索增强服务（多路召回 + 相关度打分 + 防幻觉阈值过滤）
 */
@Service
public class GovRagService {

    private final PolicyRepository policyRepository;

    public GovRagService(PolicyRepository policyRepository) {
        this.policyRepository = policyRepository;
    }

    public static class MatchedClause implements Serializable {
        private String docTitle;
        private String docNumber;
        private String issuerDept;
        private String clauseNo;
        private String clauseText;
        private double score;

        public MatchedClause(String docTitle, String docNumber, String issuerDept, String clauseNo, String clauseText, double score) {
            this.docTitle = docTitle;
            this.docNumber = docNumber;
            this.issuerDept = issuerDept;
            this.clauseNo = clauseNo;
            this.clauseText = clauseText;
            this.score = score;
        }

        public String getDocTitle() { return docTitle; }
        public String getDocNumber() { return docNumber; }
        public String getIssuerDept() { return issuerDept; }
        public String getClauseNo() { return clauseNo; }
        public String getClauseText() { return clauseText; }
        public double getScore() { return score; }
    }

    public static class RagMatchResult {
        private List<MatchedClause> topClauses = new ArrayList<>();
        private boolean reliableMatch;

        public RagMatchResult(List<MatchedClause> topClauses, boolean reliableMatch) {
            this.topClauses = topClauses;
            this.reliableMatch = reliableMatch;
        }

        public List<MatchedClause> getTopClauses() { return topClauses; }
        public boolean isReliableMatch() { return reliableMatch; }
    }

    /**
     * 对群众输入进行多路语义与关键词相关度检索
     */
    public RagMatchResult retrieveContext(String userPrompt, String preferredCategory) {
        if (userPrompt == null || userPrompt.trim().isEmpty()) {
            return new RagMatchResult(Collections.emptyList(), false);
        }

        List<PolicyDoc> candidateDocs = policyRepository.findAll();
        List<MatchedClause> matchedList = new ArrayList<>();

        // 提取问题中的核心特征词组
        List<String> keywords = extractKeywords(userPrompt);

        for (PolicyDoc doc : candidateDocs) {
            double categoryBoost = (preferredCategory != null && preferredCategory.equals(doc.getCategory())) ? 1.3 : 1.0;

            for (PolicyClause clause : doc.getClauses()) {
                double score = calculateClauseScore(userPrompt, keywords, doc.getTitle(), clause.getClauseText(), categoryBoost);
                if (score > 0.15) {
                    matchedList.add(new MatchedClause(
                            doc.getTitle(),
                            doc.getDocNumber(),
                            doc.getIssuerDept(),
                            clause.getClauseNo(),
                            clause.getClauseText(),
                            score
                    ));
                }
            }
        }

        matchedList.sort((a, b) -> Double.compare(b.getScore(), a.getScore()));

        // 取 Top-3 最相关的政策切片
        int limit = Math.min(3, matchedList.size());
        List<MatchedClause> top3 = limit > 0 ? matchedList.subList(0, limit) : Collections.emptyList();

        // 防幻觉保护门槛：最高分 >= 0.35 认定为有明确法定政策依据
        boolean isReliable = !top3.isEmpty() && top3.get(0).getScore() >= 0.35;

        return new RagMatchResult(top3, isReliable);
    }

    private double calculateClauseScore(String prompt, List<String> keywords, String docTitle, String clauseText, double categoryBoost) {
        double score = 0.0;
        String text = (docTitle + " " + clauseText).toLowerCase();
        String p = prompt.toLowerCase();

        // 1. 完全词段包含加权
        for (String kw : keywords) {
            if (text.contains(kw)) {
                score += (kw.length() >= 4 ? 0.3 : 0.15);
            }
        }

        // 2. 连续子串匹配
        for (int len = Math.min(6, p.length()); len >= 3; len--) {
            for (int i = 0; i <= p.length() - len; i++) {
                String sub = p.substring(i, i + len);
                if (text.contains(sub)) {
                    score += 0.1 * (len - 2);
                }
            }
        }

        return score * categoryBoost;
    }

    private List<String> extractKeywords(String input) {
        List<String> kws = new ArrayList<>();
        String[] terms = {"落户", "户口", "公积金", "提取", "医保", "社保", "开公司", "营业执照",
                          "学历", "毕业生", "买房", "自住住房", "灵活就业", "报销", "企业开办",
                          "港澳", "通行证", "护照", "出入境", "签注", "台胞证", "旅游签注", "全国通办",
                          "证明", "身份证", "材料", "流程", "代扣", "补办", "挂失", "条件",
                          "异地就医", "直接结算", "跨省就医", "备案", "生育津贴", "生育", "产假",
                          "养老金", "养老保险", "转移", "接续", "个转企", "驾驶证", "驾照",
                          "期满换证", "车管所", "租房", "租房提取", "支付房租", "换证", "体检"};
        for (String t : terms) {
            if (input.contains(t)) {
                kws.add(t);
            }
        }
        return kws;
    }
}
