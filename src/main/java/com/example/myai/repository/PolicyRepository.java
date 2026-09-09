package com.example.myai.repository;

import com.example.myai.model.PolicyDoc;
import com.example.myai.model.PolicyDoc.PolicyClause;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Repository
public class PolicyRepository {

    private final Map<Long, PolicyDoc> store = new ConcurrentHashMap<>();
    private final AtomicLong idGen = new AtomicLong(100);

    public PolicyRepository() {
        initSamplePolicies();
    }

    private void initSamplePolicies() {
        // 1. 人才落户政策
        PolicyDoc p1 = new PolicyDoc();
        p1.setId(1L);
        p1.setDocNumber("琼府办〔2024〕15号");
        p1.setTitle("海口市关于进一步优化落实引进人才落户若干措施的实施细则");
        p1.setCategory("户籍管理");
        p1.setIssuerDept("海口市人民政府办公厅、市公安局");
        p1.setPublishDate("2024-03-15");
        p1.setEffectiveDate("2024-04-01");
        p1.setStatus(1);
        p1.setSummary("明确全日制大专及以上学历毕业生、中级以上职称专业技术人才‘先落户后就业’政策及申报条件。");
        p1.getClauses().add(new PolicyClause("第二条【适用对象】", "符合下列条件之一的人才，可选择在海口市城镇地区落户：\n(一) 全日制大专及以上学历毕业生（含应届毕业生及毕业5年内未就业高校毕业生）；\n(二) 取得中级及以上专业技术职称或二级/技师以上职业资格证书的人员；\n(三) 年龄在55周岁以下的高级人才或硕士研究生以上学历人员。"));
        p1.getClauses().add(new PolicyClause("第四条【所需材料】", "申请人才落户需提交下列核验证明：\n1. 申请人居民身份证、居民户口簿原件；\n2. 全日制学历证书及学信网《教育部学历证书电子注册备案表》；\n3. 落户在自有房产的，提供不动产权属证书；无房产的，可落户至拟落户区政府公共集体户或合法租赁住所社区集体户。"));
        p1.getClauses().add(new PolicyClause("第七条【极简审批承诺】", "推行人才落户‘秒批秒办’与‘全省通办’，凡通过‘海易办’或全国一体化政务服务平台核验电子证照齐全的，公安窗口承诺在1个工作日内完成户口迁移手续核发。"));
        store.put(p1.getId(), p1);

        // 2. 住房公积金提取政策
        PolicyDoc p2 = new PolicyDoc();
        p2.setId(2L);
        p2.setDocNumber("琼公积金〔2024〕8号");
        p2.setTitle("海口住房公积金个人住房提取与贷款经办服务规程");
        p2.setCategory("住房保障");
        p2.setIssuerDept("海南省住房公积金管理局海口分局");
        p2.setPublishDate("2024-05-10");
        p2.setEffectiveDate("2024-06-01");
        p2.setStatus(1);
        p2.setSummary("规范职工购买自住住房、偿还商贷、无房租赁提取公积金的办理频次与额度上限。");
        p2.getClauses().add(new PolicyClause("第三条【购房提取条件】", "职工购买自住商品住房的，自购房合同网签备案或取得不动产权证书之日起3年内，本人及配偶可申请一次性提取住房公积金账户余额，累计提取总额不得超过实际支付的购房首付款或购房总价款。"));
        p2.getClauses().add(new PolicyClause("第五条【提取必备材料】", "办理购房提取住房公积金应备齐：\n1. 申请人及配偶居民身份证、结婚证；\n2. 经住建部门网签备案的商品房买卖合同或不动产权证书；\n3. 购房首付款统一税务发票或转账凭证；\n4. 申请人一类银行借记卡卡号。"));
        p2.getClauses().add(new PolicyClause("第九条【离职封存提取】", "职工与单位解除劳动关系且账户已封存满6个月，在异地未继续缴存的，可通过手机在线办理公积金销户全额提取，资金实时划转至绑定的银行卡。"));
        store.put(p2.getId(), p2);

        // 3. 灵活就业医疗保险政策
        PolicyDoc p3 = new PolicyDoc();
        p3.setId(3L);
        p3.setDocNumber("琼医保规〔2023〕11号");
        p3.setTitle("海南省城镇从业人员基本医疗保险与灵活就业人员参保实施办法");
        p3.setCategory("医疗保险");
        p3.setIssuerDept("海南省医疗保障局、省财政厅");
        p3.setPublishDate("2023-11-20");
        p3.setEffectiveDate("2024-01-01");
        p3.setStatus(1);
        p3.setSummary("明确无雇工个体工商户、非全日制从业人员及新业态从业者参加职工医保的缴费基数与待遇享受期。");
        p3.getClauses().add(new PolicyClause("第四条【参保范围】", "年满16周岁且未达到法定退休年龄的灵活就业人员、外卖骑手、网络主播、网约车司机等新业态人员，无论是否具备本地户籍，均可在就业地参加城镇从业人员基本医疗保险。"));
        p3.getClauses().add(new PolicyClause("第六条【缴费基数与待遇】", "灵活就业人员以全省上一年度城镇单位就业人员月平均工资的60%至300%为基数自主选择申报，缴费比例为6%。连续正常缴费满3个月后，自第4个月起开始享受统筹基金门诊及住院报销待遇。"));
        p3.getClauses().add(new PolicyClause("第八条【申报材料清单】", "办理灵活就业参保需提供：\n1. 居民身份证正反面电子照片或原件；\n2. 本人实名制银行扣费账户授权书；\n3. 非本地户籍人员提供有效期内居住证或就失业登记凭证。"));
        store.put(p3.getId(), p3);

        // 4. 企业开办政策
        PolicyDoc p4 = new PolicyDoc();
        p4.setId(4L);
        p4.setDocNumber("海市监〔2024〕03号");
        p4.setTitle("海口市推进企业开办全程电子化‘一网通办’改革实施方案");
        p4.setCategory("企业开办");
        p4.setIssuerDept("海口市市场监督管理局、市行政审批服务局");
        p4.setPublishDate("2024-02-18");
        p4.setEffectiveDate("2024-03-01");
        p4.setStatus(1);
        p4.setSummary("实现企业设立登记、公章刻制、申领发票、社保开户、公积金开户、银行开户预约‘半天办结、零成本、零跑动’。");
        p4.getClauses().add(new PolicyClause("第一条【一网通办全流程】", "申请人通过政务服务网‘企业开办一网通办’专区提交材料，营业执照设立核准后，系统自动并联触发免费公章刻制（一套四枚）、电子发票申领及社保用工备案，实现0.5个工作日内全部办结。"));
        p4.getClauses().add(new PolicyClause("第三条【开办申报材料清单】", "有限责任公司设立仅需提交：\n1. 公司章程（提供标准行业模板）；\n2. 全体股东、法定代表人、执行董事及监事身份证件（在线电子签名认证）；\n3. 住所（经营场所）使用承诺书（免提交房产租赁原件证明）。"));
        store.put(p4.getId(), p4);

        // 5. 出入境证件与往来港澳通行证政策
        PolicyDoc p5 = new PolicyDoc();
        p5.setId(5L);
        p5.setDocNumber("国移发〔2023〕18号");
        p5.setTitle("国家移民管理局关于全面实施出入境证件‘全国通办’及进一步优化便民服务措施的规定");
        p5.setCategory("出入境服务");
        p5.setIssuerDept("国家移民管理局、海南省公安厅出入境管理局");
        p5.setPublishDate("2023-05-15");
        p5.setEffectiveDate("2023-05-15");
        p5.setStatus(1);
        p5.setSummary("明确内地居民申请往来港澳通行证及团队旅游签注‘全国通办’，免提交户籍及居住证明，实行免填表与7个工作日办结。");
        p5.getClauses().add(new PolicyClause("第一条【出入境证件全国通办】", "内地居民可在全国任一公安机关出入境管理窗口申办普通护照、往来港澳通行证及团队旅游签注，不受户籍地限制，申办手续与户籍地一致，无须回原籍地办理。"));
        p5.getClauses().add(new PolicyClause("第二条【往来港澳通行证必备材料清单】", "内地居民申请往来港澳通行证及赴香港/澳门旅游签注，仅需提交：\n1. 申请人居民身份证原件（未满16周岁未办理身份证的可交验户口簿）；\n2. 符合标准的人像采集照片及数码检测回执（窗口提供免费人像采集）；\n3. 未满16周岁申请人须由监护人陪同并提交出生医学证明等监护关系凭据。"));
        p5.getClauses().add(new PolicyClause("第四条【办结时限与智能速办】", "海南省户籍居民及持有有效居住证人员，办结时限为7个工作日；跨省异地申办时限为20个自然日。出入境大厅全面布设智能签注一体机，团队旅游再次签注实现‘立等可取’。"));
        store.put(p5.getId(), p5);

        // 6. 养老保险关系跨省转移接续政策
        PolicyDoc p6 = new PolicyDoc();
        p6.setId(6L);
        p6.setDocNumber("人社部规〔2023〕3号");
        p6.setTitle("城镇企业职工基本养老保险关系跨省转移接续一网通办规程");
        p6.setCategory("社保医保");
        p6.setIssuerDept("人力资源社会保障部、海南省社会保险服务中心");
        p6.setPublishDate("2023-08-12");
        p6.setEffectiveDate("2023-09-01");
        p6.setStatus(1);
        p6.setSummary("明确参保职工跨省流动就业时，养老保险关系免开纸质参保缴费凭证，全国统一平台线上申请全流程5个工作日办结。");
        p6.getClauses().add(new PolicyClause("第二条【全流程网办无纸化】", "参保人员跨省流动就业，在新就业地建立基本养老保险关系并缴费后，即可登录国家社会保险公共服务平台或‘海易办’APP申请转移接续，无需往返两地社保经办窗口开具纸质凭证。"));
        p6.getClauses().add(new PolicyClause("第四条【经办时限承诺】", "转入地与转出地社会保险经办机构通过全国社保信息比对系统协同办理，核验信息及划转基金全流程承诺在5个工作日内办结并短信告知参保人。"));
        store.put(p6.getId(), p6);

        // 7. 跨省异地就医直接结算政策
        PolicyDoc p7 = new PolicyDoc();
        p7.setId(7L);
        p7.setDocNumber("医保发〔2022〕22号");
        p7.setTitle("国家医疗保障局关于进一步做好基本医疗保险跨省异地就医直接结算工作的通知");
        p7.setCategory("社保医保");
        p7.setIssuerDept("国家医疗保障局、财政部、海南省医疗保障局");
        p7.setPublishDate("2022-06-30");
        p7.setEffectiveDate("2023-01-01");
        p7.setStatus(1);
        p7.setSummary("落实跨省异地长期居住人员及临时就医人员直接结算备案，高血压、糖尿病等门诊慢特病跨省免垫资直接报销。");
        p7.getClauses().add(new PolicyClause("第一条【自助备案即时生效】", "跨省异地长期居住人员（异地安置退休、异地居住、常驻异地工作）及临时外出就医人员，通过‘国家医保服务平台’APP或微信小程序提交备案申请，实行承诺制即时办结、实时生效。"));
        p7.getClauses().add(new PolicyClause("第三条【报销待遇标准】", "跨省直接结算执行‘就医地目录、参保地待遇’原则。异地长期居住人员在备案地定点医疗机构就医，享受与参保地本地完全相同的门诊慢特病及住院报销比例，无需个人垫付后回原籍报销。"));
        store.put(p7.getId(), p7);

        // 8. 参保职工生育保险与生育津贴申领政策
        PolicyDoc p8 = new PolicyDoc();
        p8.setId(8L);
        p8.setDocNumber("琼医保规〔2023〕14号");
        p8.setTitle("海南省城镇从业人员生育保险待遇及生育津贴申领经办细则");
        p8.setCategory("社保医保");
        p8.setIssuerDept("海南省医疗保障局、省社保中心");
        p8.setPublishDate("2023-09-18");
        p8.setEffectiveDate("2023-10-01");
        p8.setStatus(1);
        p8.setSummary("参保女职工分娩医疗费用在定点医院联网‘一站式’直接结报，生育津贴由用人单位或个人线上申报‘免申即享’3日拨付。");
        p8.getClauses().add(new PolicyClause("第二条【津贴发放标准】", "参保女职工顺产享受98天生育津贴，难产或剖宫产增加15天，多胞胎每多生一个婴儿增加15天。津贴计发基数为职工所在用人单位上年度职工月平均工资。"));
        p8.getClauses().add(new PolicyClause("第五条【极简材料申报】", "生育医疗费在全省定点医院出院即结算；申领生育津贴仅需在线上传《出生医学证明》及本人一类银行卡，无需提供结婚证和准生证。"));
        store.put(p8.getId(), p8);

        // 9. 支持个体工商户转型升级为企业（“个转企”）扶持政策
        PolicyDoc p9 = new PolicyDoc();
        p9.setId(9L);
        p9.setDocNumber("琼市监规〔2023〕8号");
        p9.setTitle("海南省促进个体工商户转型升级为企业若干措施实施办法");
        p9.setCategory("企业营商");
        p9.setIssuerDept("海南省市场监督管理局、省发改委");
        p9.setPublishDate("2023-07-20");
        p9.setEffectiveDate("2023-08-01");
        p9.setStatus(1);
        p9.setSummary("支持个体工商户依法直接转型为有限责任公司，最大限度保留原商号字号、行业特征和经营资历，免收换照规费。");
        p9.getClauses().add(new PolicyClause("第三条【保留原商号与字号】", "个体工商户转型为有限责任公司的，在不违反企业名称禁限用规则的前提下，允许最大限度保留原个体工商户名称中的字号与行业特征，延续历史商业信誉。"));
        p9.getClauses().add(new PolicyClause("第六条【一窗受理一网通办】", "各区政务大厅设立‘个转企’服务专窗，注销原个体工商户与设立新公司实行‘证照联办、并联审批’，全流程0.5个工作日办结，免费刻制新公章一套。"));
        store.put(p9.getId(), p9);

        // 10. 机动车驾驶证期满换证“警医邮”网办便民规定
        PolicyDoc p10 = new PolicyDoc();
        p10.setId(10L);
        p10.setDocNumber("公交管〔2020〕310号");
        p10.setTitle("机动车驾驶证期满换证‘警医邮’远程体检与网办实施规范");
        p10.setCategory("车辆驾驶");
        p10.setIssuerDept("公安部交通管理局、海南省公安厅交警总队");
        p10.setPublishDate("2020-11-15");
        p10.setEffectiveDate("2020-11-20");
        p10.setStatus(1);
        p10.setSummary("驾驶人在具备资质的联网医疗机构或警医一体机体检合格后，通过手机‘交管12123’APP即可申请期满换证，新证邮寄送达。");
        p10.getClauses().add(new PolicyClause("第一条【期满换证时限要求】", "机动车驾驶人应当于机动车驾驶证有效期满前90日内，向机动车驾驶证核发地或者核发地以外的车辆管理所申请换证。"));
        p10.getClauses().add(new PolicyClause("第三条【体检数据联网免纸质】", "驾驶人前往辖区联网医院或交警服务大厅智能微体检机完成视力、听力等项目检查，医疗机构自动将《机动车驾驶人身体条件证明》上传至全国交管平台，市民无需携带纸质体检表。"));
        store.put(p10.getId(), p10);

        // 11. 无房职工租房提取住房公积金政策
        PolicyDoc p11 = new PolicyDoc();
        p11.setId(11L);
        p11.setDocNumber("琼公积金规〔2023〕6号");
        p11.setTitle("海南省住房公积金管理局关于进一步支持租购并举提取住房公积金支付房租的暂行规定");
        p11.setCategory("住房保障");
        p11.setIssuerDept("海南省住房公积金管理局");
        p11.setPublishDate("2023-06-15");
        p11.setEffectiveDate("2023-07-01");
        p11.setStatus(1);
        p11.setSummary("职工连续足额缴存满3个月且在工作地无自有住房的，承诺制按月提取公积金支付房租，单身职工最高1500元/月，夫妻最高3000元/月。");
        p11.getClauses().add(new PolicyClause("第二条【租房提取准入条件】", "职工连续足额缴存住房公积金满3个月，本人及配偶在工作地实际居住地无自有住房且租赁住房的，即可申请提取住房公积金支付房租。"));
        p11.getClauses().add(new PolicyClause("第四条【额度标准与零材料办】", "未提供房屋租赁备案合同的，实行限额承诺制提取：海口地区单身缴存职工最高提取限额为1500元/月，夫妻双方最高3000元/月；系统通过大数据自动核查不动产登记，全程零纸质材料、按月自动转账到卡。"));
        store.put(p11.getId(), p11);
    }

    public List<PolicyDoc> findAll() {
        return new ArrayList<>(store.values());
    }

    public Optional<PolicyDoc> findById(Long id) {
        return Optional.ofNullable(store.get(id));
    }

    public List<PolicyDoc> findByCategory(String category) {
        if (category == null || category.trim().isEmpty() || "全部".equals(category)) {
            return findAll();
        }
        List<PolicyDoc> list = new ArrayList<>();
        for (PolicyDoc doc : store.values()) {
            if (category.equals(doc.getCategory())) {
                list.add(doc);
            }
        }
        return list;
    }

    public PolicyDoc save(PolicyDoc doc) {
        if (doc.getId() == null) {
            doc.setId(idGen.incrementAndGet());
        }
        store.put(doc.getId(), doc);
        return doc;
    }
}
