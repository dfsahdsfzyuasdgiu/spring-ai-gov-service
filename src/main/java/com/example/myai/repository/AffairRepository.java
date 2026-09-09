package com.example.myai.repository;

import com.example.myai.model.AffairGuide;
import com.example.myai.model.AffairGuide.MaterialItem;
import com.example.myai.model.AffairGuide.ProcessStep;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Repository
public class AffairRepository {

    private final Map<Long, AffairGuide> store = new ConcurrentHashMap<>();
    private final AtomicLong idGen = new AtomicLong(200);

    public AffairRepository() {
        initSampleAffairs();
    }

    private void initSampleAffairs() {
        // 事项 1: 引进人才落户
        AffairGuide g1 = new AffairGuide();
        g1.setId(101L);
        g1.setAffairCode("HZ-HAINAN-001");
        g1.setAffairName("引进人才落户登记 (先落户后就业)");
        g1.setCategory("户籍管理");
        g1.setServiceObject("自然人");
        g1.setLegalLimitDays(15);
        g1.setPromisedLimitDays(1);
        g1.setQualifications("具有全日制大专及以上学历（含毕业5年内未就业高校毕业生），或持有中级及以上专业技术职称。");
        g1.setHandlingAddress("海口市各区政务服务中心公安办证中心窗口");
        g1.setOnlineHandleUrl("https://www.gjzwfw.gov.cn/");
        g1.getMaterials().add(new MaterialItem(1L, "申请人居民身份证原件", true, "电子证照已打通(免提交)", "可通过国家政务服务平台或海易办扫码出示"));
        g1.getMaterials().add(new MaterialItem(2L, "居民户口簿(个人单页及首页)", true, "纸质原件或扫描件", "集体户口需提供常住人口登记卡原件"));
        g1.getMaterials().add(new MaterialItem(3L, "全日制学历证书", true, "免提交(自动核验)", "学信网在线自动核验《教育部学历证书电子注册备案表》"));
        g1.getMaterials().add(new MaterialItem(4L, "落户地房产证明或公共集体户申请表", true, "电子证照/纸质", "无自有房产可申请落户于区公共集体户"));
        g1.getProcessSteps().add(new ProcessStep(1, "网上预审", "申请人提交材料，系统自动比对学信网信息", "10分钟"));
        g1.getProcessSteps().add(new ProcessStep(2, "受理签发", "公安户政民警后台核验并签发《准予迁入证明》", "4小时"));
        g1.getProcessSteps().add(new ProcessStep(3, "落户办结", "线上打印户口登记卡或选择免费邮政EMS寄递到家", "即时办结"));
        store.put(g1.getId(), g1);

        // 事项 2: 公积金购房提取
        AffairGuide g2 = new AffairGuide();
        g2.setId(102L);
        g2.setAffairCode("GJJ-EXTRACT-002");
        g2.setAffairName("购买自住住房提取住房公积金");
        g2.setCategory("住房保障");
        g2.setServiceObject("自然人");
        g2.setLegalLimitDays(3);
        g2.setPromisedLimitDays(1);
        g2.setQualifications("职工在海口市购买自住住房，购房合同已网签备案或已取得不动产权证未满3年。");
        g2.setHandlingAddress("海南省住房公积金管理局海口政务服务大厅各网点");
        g2.setOnlineHandleUrl("https://www.gjzwfw.gov.cn/");
        g2.getMaterials().add(new MaterialItem(1L, "申请人居民身份证", true, "电子证照免提交", "人脸识别自动授权"));
        g2.getMaterials().add(new MaterialItem(2L, "商品房买卖合同(含住建网签备案号)", true, "系统自动拉取", "已联网海口住建局，输入合同号自动调取合同"));
        g2.getMaterials().add(new MaterialItem(3L, "购房首付款发票凭单", true, "原件拍照上传", "需清晰可见发票代码与完税印章"));
        g2.getMaterials().add(new MaterialItem(4L, "结婚证(配偶共同提取时提供)", false, "容缺后补/电子调取", "仅提取本人公积金时无需提供"));
        g2.getMaterials().add(new MaterialItem(5L, "申请人一类银行储蓄卡", true, "在线填写卡号", "支持工农中建交及邮储等主流商业银行一类卡"));
        g2.getProcessSteps().add(new ProcessStep(1, "身份认证", "刷脸实名认证，调取公积金缴存状态", "即时"));
        g2.getProcessSteps().add(new ProcessStep(2, "房产联网核验", "自动核对海口住建网签数据与首付流水", "5分钟"));
        g2.getProcessSteps().add(new ProcessStep(3, "资金秒级划转", "审核通过后，公积金中心自动打款至银行卡", "最快2小时到账"));
        store.put(g2.getId(), g2);

        // 事项 3: 灵活就业医疗保险参保
        AffairGuide g3 = new AffairGuide();
        g3.setId(103L);
        g3.setAffairCode("YB-FLEX-003");
        g3.setAffairName("灵活就业人员职工基本医疗保险核定登记");
        g3.setCategory("医疗保险");
        g3.setServiceObject("自然人");
        g3.setLegalLimitDays(10);
        g3.setPromisedLimitDays(1);
        g3.setQualifications("年满16周岁至未达法定退休年龄的灵活就业人员、外卖骑手、自由职业者等。");
        g3.setHandlingAddress("各区医疗保障服务中心综合窗口或各街道便民服务中心");
        g3.setOnlineHandleUrl("https://www.gjzwfw.gov.cn/");
        g3.getMaterials().add(new MaterialItem(1L, "居民身份证或港澳台居住证", true, "电子证照/原件", "通过人脸核验自动读取"));
        g3.getMaterials().add(new MaterialItem(2L, "银行代扣协议或一类银联借记卡", true, "在线填报绑定", "每月定期批量扣款用于缴纳基本医疗保险"));
        g3.getMaterials().add(new MaterialItem(3L, "居住证明材料(非本地户籍人员)", false, "居住证免提交", "系统直连公安人口库核验居住证状态"));
        g3.getProcessSteps().add(new ProcessStep(1, "核定基数", "自主选择缴费档次(上年度社会平均工资60%-300%)", "3分钟"));
        g3.getProcessSteps().add(new ProcessStep(2, "系统登记", "医保部门确认参保资格，生成社保扣款核定单", "1小时"));
        g3.getProcessSteps().add(new ProcessStep(3, "税务代扣", "绑定税务代扣签约，完成首月保费缴纳", "次日生效"));
        store.put(g3.getId(), g3);

        // 事项 4: 企业开办一网通办
        AffairGuide g4 = new AffairGuide();
        g4.setId(104L);
        g4.setAffairCode("SJ-CORP-004");
        g4.setAffairName("内资有限责任公司设立登记 (企业开办‘一网通办’)");
        g4.setCategory("企业开办");
        g4.setServiceObject("企业法人");
        g4.setLegalLimitDays(5);
        g4.setPromisedLimitDays(1);
        g4.setQualifications("股东符合法定人数，有符合要求的公司名称、组织机构与公司章程，有确定的住所。");
        g4.setHandlingAddress("海口市政务服务中心二楼市监企业开办专区");
        g4.setOnlineHandleUrl("https://www.gjzwfw.gov.cn/");
        g4.getMaterials().add(new MaterialItem(1L, "公司章程", true, "在线智能生成标准模板", "系统根据股东构架智能生成规范章程"));
        g4.getMaterials().add(new MaterialItem(2L, "法定代表人及股东身份证明", true, "移动端电子签名", "所有关联人使用微信小程序完成‘电子营业执照’实名签字"));
        g4.getMaterials().add(new MaterialItem(3L, "住所(经营场所)使用承诺书", true, "免房产证原件", "只需如实申报地址信息并签署自主承诺书"));
        g4.getProcessSteps().add(new ProcessStep(1, "企业名称自主申报", "系统自动查重比对，秒级核准企业字号", "5分钟"));
        g4.getProcessSteps().add(new ProcessStep(2, "一网并联审批", "市监登记、印章刻制、税务申领、社保开户四合一并联流转", "0.5工作日"));
        g4.getProcessSteps().add(new ProcessStep(3, "领取开办大礼包", "免费领取电子营业执照及实体公章一套四枚", "窗口领取或免费寄递"));
        store.put(g4.getId(), g4);

        // 事项 5: 往来港澳通行证首次申领 (全国通办)
        AffairGuide g5 = new AffairGuide();
        g5.setId(105L);
        g5.setAffairCode("CRJ-GA-005");
        g5.setAffairName("内地居民往来港澳通行证及团队旅游签注申领 (全国通办)");
        g5.setCategory("出入境服务");
        g5.setServiceObject("自然人");
        g5.setLegalLimitDays(15);
        g5.setPromisedLimitDays(7);
        g5.setQualifications("内地居民拟赴香港或澳门旅游、探亲、访友、商务等，可在海口市任一公安出入境大厅就近申办，不受户籍地限制（全国通办）。");
        g5.setHandlingAddress("海口市公安局出入境管理支队接待大厅及各区公安办证中心出入境窗口");
        g5.setOnlineHandleUrl("https://s.nia.gov.cn/");
        g5.getMaterials().add(new MaterialItem(1L, "申请人居民身份证原件", true, "电子证照/实体原件", "未满16周岁未办理身份证的可交验户口簿原件"));
        g5.getMaterials().add(new MaterialItem(2L, "出入境证件数码相片及检测回执", true, "大厅免费拍摄/照相馆回执", "出入境办证大厅配备免费智能自助人像采集一体机"));
        g5.getMaterials().add(new MaterialItem(3L, "监护证明材料(仅未成年人提供)", false, "原件核验", "未满16周岁须监护人陪同并提交出生医学证明"));
        g5.getMaterials().add(new MaterialItem(4L, "海南省居住证", false, "非本地户籍可提供", "持有本地有效居住证人员可享受省内居民同等办结时效"));
        g5.getProcessSteps().add(new ProcessStep(1, "线上预约/现场取号", "国家移民管理局APP/微信小程序提前预约或大厅现场取号", "即时"));
        g5.getProcessSteps().add(new ProcessStep(2, "智慧一体机采集", "免填纸质申请表，刷身份证自动调取信息并采集指纹", "3分钟"));
        g5.getProcessSteps().add(new ProcessStep(3, "民警面见受理缴费", "民警面见核验身份材料，扫码缴纳工本费及签注费", "5分钟"));
        g5.getProcessSteps().add(new ProcessStep(4, "制证完成与寄递", "审批制证完毕后免费邮政EMS寄递到家或凭回执现场领取", "省内7个工作日"));
        store.put(g5.getId(), g5);

        // 事项 6: 跨省异地就医直接结算备案
        AffairGuide g6 = new AffairGuide();
        g6.setId(106L);
        g6.setAffairCode("YB-YDJY-006");
        g6.setAffairName("跨省异地就医住院与门诊直接结算备案");
        g6.setCategory("社保医保");
        g6.setServiceObject("自然人");
        g6.setLegalLimitDays(1);
        g6.setPromisedLimitDays(0);
        g6.setQualifications("参加基本医疗保险的异地长期居住人员（随迁老人、异地安置退休、常驻异地工作）及跨省临时就医人员。");
        g6.setHandlingAddress("海口市政务服务大厅医保专窗及各区医保服务网点");
        g6.setOnlineHandleUrl("https://fuwu.nhsa.gov.cn/");
        g6.getMaterials().add(new MaterialItem(1L, "医保电子凭证或居民身份证", true, "刷脸免证办", "国家医保APP直接授权认证"));
        g6.getMaterials().add(new MaterialItem(2L, "异地长期居住承诺书", true, "在线一键签署", "实行信用承诺制，无需提交当地居住证或房产证明"));
        g6.getProcessSteps().add(new ProcessStep(1, "线上申报", "登录国家医保服务平台APP或微信小程序填写就医地", "2分钟"));
        g6.getProcessSteps().add(new ProcessStep(2, "系统秒批", "大数据比对参保状态，自动通过并同步全国联网平台", "即时办结"));
        g6.getProcessSteps().add(new ProcessStep(3, "就医刷卡结算", "在就医地定点医药机构出示医保码或社保卡直接结算", "实时享受"));
        store.put(g6.getId(), g6);

        // 事项 7: 企业职工基本养老保险关系转移接续
        AffairGuide g7 = new AffairGuide();
        g7.setId(107L);
        g7.setAffairCode("SB-YLAO-007");
        g7.setAffairName("城镇企业职工基本养老保险关系跨省转移接续");
        g7.setCategory("社保医保");
        g7.setServiceObject("自然人");
        g7.setLegalLimitDays(15);
        g7.setPromisedLimitDays(5);
        g7.setQualifications("在原参保地已停保，且在现新就业地已建立基本养老保险账户并已实际缴费的流动就业人员。");
        g7.setHandlingAddress("海南省社会保险服务中心及各区社保经办大厅");
        g7.setOnlineHandleUrl("http://si.12333.gov.cn/");
        g7.getMaterials().add(new MaterialItem(1L, "申请人居民身份证", true, "电子证照调取", "实名核验免提供纸质件"));
        g7.getMaterials().add(new MaterialItem(2L, "新就业地社保缴费凭据", true, "系统自动校验", "两地社保系统自动比对账户，免开纸质凭证"));
        g7.getProcessSteps().add(new ProcessStep(1, "网上申请", "掌上12333或国家社会保险服务平台提交转移申请", "3分钟"));
        g7.getProcessSteps().add(new ProcessStep(2, "两地协同核验", "转入地向转出地发出联系函并核对缴费历史", "3个工作日"));
        g7.getProcessSteps().add(new ProcessStep(3, "基金划转确认", "转出地划转资金，转入地办结并短信反馈参保人", "2个工作日"));
        store.put(g7.getId(), g7);

        // 事项 8: 参保女职工生育津贴申领
        AffairGuide g8 = new AffairGuide();
        g8.setId(108L);
        g8.setAffairCode("YB-SYTZ-008");
        g8.setAffairName("城镇从业人员生育津贴申领 (免申即享)");
        g8.setCategory("社保医保");
        g8.setServiceObject("自然人");
        g8.setLegalLimitDays(10);
        g8.setPromisedLimitDays(3);
        g8.setQualifications("用人单位按规定为职工足额缴纳生育保险费，女职工分娩时符合国家生育政策。");
        g8.setHandlingAddress("海口市医疗保障局各分局服务大厅医保窗口");
        g8.setOnlineHandleUrl("https://www.gjzwfw.gov.cn/");
        g8.getMaterials().add(new MaterialItem(1L, "生育医学证明(出生证)", true, "拍照上传/电子证照调取", "医疗机构开具的正规出生医学证明"));
        g8.getMaterials().add(new MaterialItem(2L, "申领人一类银行借记卡", true, "在线填报卡号", "用于津贴资金拨付到账"));
        g8.getProcessSteps().add(new ProcessStep(1, "医院一站式结算", "分娩出院时在定点医院联网直接报销住院医疗费", "出院即办"));
        g8.getProcessSteps().add(new ProcessStep(2, "线上填报申报", "登录政务网医保专区上传出生证，系统自动核定计发天数", "5分钟"));
        g8.getProcessSteps().add(new ProcessStep(3, "津贴极速拨付", "医保经办机构核定无误后将津贴直接划入申请人银行卡", "3个工作日"));
        store.put(g8.getId(), g8);

        // 事项 9: 无房职工按月提取公积金支付房租
        AffairGuide g9 = new AffairGuide();
        g9.setId(109L);
        g9.setAffairCode("GJJ-RENT-009");
        g9.setAffairName("无房职工租房提取住房公积金 (按月转账)");
        g9.setCategory("住房保障");
        g9.setServiceObject("自然人");
        g9.setLegalLimitDays(3);
        g9.setPromisedLimitDays(1);
        g9.setQualifications("职工在海口连续足额缴存公积金满3个月，本人及配偶在工作地实际居住地无自有住房且租房居住。");
        g9.setHandlingAddress("海南省住房公积金管理局海口政务服务大厅");
        g9.setOnlineHandleUrl("https://www.gjzwfw.gov.cn/");
        g9.getMaterials().add(new MaterialItem(1L, "申请人居民身份证", true, "刷脸免证办", "人脸识别自动关联账户"));
        g9.getMaterials().add(new MaterialItem(2L, "无自有住房承诺书", true, "在线勾选承诺", "系统自动联网不动产登记中心核查房产"));
        g9.getMaterials().add(new MaterialItem(3L, "申请人一类银行储蓄卡", true, "在线绑定", "每月划转提取资金"));
        g9.getProcessSteps().add(new ProcessStep(1, "签约承诺", "登录公积金手机客户端或政务网签署租房提取协议", "3分钟"));
        g9.getProcessSteps().add(new ProcessStep(2, "不动产联网核验", "大数据实时核查职工家庭房产状态", "10分钟"));
        g9.getProcessSteps().add(new ProcessStep(3, "定额自动按月到账", "单身每人每月1500元自动转账至银行卡", "次日生效"));
        store.put(g9.getId(), g9);

        // 事项 10: 机动车驾驶证期满换证“警医邮”
        AffairGuide g10 = new AffairGuide();
        g10.setId(110L);
        g10.setAffairCode("JJ-DRV-010");
        g10.setAffairName("机动车驾驶证期满换证 (警医邮一网通办)");
        g10.setCategory("车辆驾驶");
        g10.setServiceObject("自然人");
        g10.setLegalLimitDays(3);
        g10.setPromisedLimitDays(1);
        g10.setQualifications("机动车驾驶证有效期满前90日内，无记满12分、逾期未审验等违法情形。");
        g10.setHandlingAddress("海口市公安局交警支队车管所及全市联网医院‘警医邮’网点");
        g10.setOnlineHandleUrl("https://gab.122.gov.cn/");
        g10.getMaterials().add(new MaterialItem(1L, "机动车驾驶人身体条件证明", true, "医院联网上传(免交纸质件)", "在任意联网医院或交警微体检一体机完成体检"));
        g10.getMaterials().add(new MaterialItem(2L, "申请人一寸白底免冠证件照", true, "体检机自动采集", "可直接使用微体检机拍照或上传电子版"));
        g10.getProcessSteps().add(new ProcessStep(1, "一站式微体检", "前往就近联网医院或邮政网点体检机采集视力听力数据", "5分钟"));
        g10.getProcessSteps().add(new ProcessStep(2, "交管12123申办", "手机登录交管12123APP确认邮寄地址并支付工本费10元", "2分钟"));
        g10.getProcessSteps().add(new ProcessStep(3, "车管所制证与寄递", "车管所后台审核制证，邮政EMS寄递到家，旧证交还邮递员", "1个工作日"));
        store.put(g10.getId(), g10);
    }

    public List<AffairGuide> findAll() {
        return new ArrayList<>(store.values());
    }

    public Optional<AffairGuide> findById(Long id) {
        return Optional.ofNullable(store.get(id));
    }

    public List<AffairGuide> findByCategory(String category) {
        if (category == null || category.trim().isEmpty() || "全部".equals(category)) {
            return findAll();
        }
        List<AffairGuide> list = new ArrayList<>();
        for (AffairGuide g : store.values()) {
            if (category.equals(g.getCategory())) {
                list.add(g);
            }
        }
        return list;
    }

    /**
     * 根据市民咨询意图精准推荐政务事项导办卡片
     */
    public AffairGuide matchBestAffair(String prompt) {
        if (prompt == null || prompt.trim().isEmpty()) {
            return null;
        }
        String p = prompt.toLowerCase();
        // 1. 异地就医直接结算
        if (p.contains("异地就医") || p.contains("跨省就医") || p.contains("直接结算") || p.contains("外地看病") || p.contains("医保备案")) {
            return store.get(106L);
        }
        // 2. 养老保险/社保关系转移
        if (p.contains("养老保险") || p.contains("社保转移") || p.contains("养老金转移") || p.contains("转移接续")) {
            return store.get(107L);
        }
        // 3. 生育津贴申领
        if (p.contains("生育津贴") || p.contains("产假津贴") || p.contains("生小孩") || p.contains("生育保险")) {
            return store.get(108L);
        }
        // 4. 租房提取公积金
        if (p.contains("租房") && (p.contains("公积金") || p.contains("提取"))) {
            return store.get(109L);
        }
        // 5. 驾驶证换证
        if (p.contains("驾驶证") || p.contains("驾照") || p.contains("换证") || p.contains("车管所") || p.contains("期满")) {
            return store.get(110L);
        }
        // 6. 出入境/港澳/通行证/护照/签注/台胞证
        if (p.contains("港澳") || p.contains("通行证") || p.contains("护照") || p.contains("出入境") || p.contains("签注") || p.contains("去香港") || p.contains("去澳门")) {
            return store.get(105L);
        }
        // 7. 户籍/落户
        if (p.contains("落户") || p.contains("户口") || p.contains("引进人才") || p.contains("毕业") || p.contains("入户")) {
            return store.get(101L);
        }
        // 8. 公积金/买房/住房提取
        if (p.contains("公积金") || p.contains("提取") || (p.contains("买房") && p.contains("房产"))) {
            return store.get(102L);
        }
        // 9. 医保/社保/看病/参保
        if (p.contains("医保") || p.contains("参保") || p.contains("医疗保险") || p.contains("灵活就业") || p.contains("看病报销")) {
            return store.get(103L);
        }
        // 10. 开公司/企业/执照/营业执照
        if (p.contains("开公司") || p.contains("营业执照") || p.contains("企业开办") || p.contains("注册公司") || p.contains("个体户") || p.contains("个转企")) {
            return store.get(104L);
        }
        return null;
    }
}
