const { createApp, ref, computed, nextTick, onMounted } = Vue;

createApp({
    setup() {
        const sessionId = ref('session-' + Math.random().toString(36).substring(2, 10));
        const currentCategory = ref('户籍管理');
        const categories = ref(['户籍管理', '出入境服务', '社保医保', '住房保障', '企业开办', '车辆驾驶', '12345民情']);

        const hotQuestions = ref([
            // 户籍管理
            { category: '户籍管理', text: '我是全日制大专生，在海口怎么落户？需要什么材料？' },
            { category: '户籍管理', text: '毕业超过5年的高校毕业生，如何通过技能证书办理落户？' },
            { category: '户籍管理', text: '居民身份证在海口丢失，外省户籍能否异地补办身份证？' },
            { category: '户籍管理', text: '夫妻结婚后，外省户籍配偶如何办理随迁投靠落户？' },
            // 出入境服务
            { category: '出入境服务', text: '在海口办理往来港澳通行证需要带什么材料？外地户口可以办吗？' },
            { category: '出入境服务', text: '普通护照首次申领需要什么材料？多久可以拿到护照？' },
            { category: '出入境服务', text: '去香港和澳门旅游，再次申请签注可以在智能机上立等可取吗？' },
            // 社保医保
            { category: '社保医保', text: '退休老人常住海口，如何办理跨省异地就医直接结算备案？' },
            { category: '社保医保', text: '外省跨省离职后，如何把原省份的养老保险关系转移到海南？' },
            { category: '社保医保', text: '参保女职工顺产或剖宫产生小孩，如何申领生育津贴？' },
            { category: '社保医保', text: '没有单位的自由职业者和外卖员怎么在海口参加职工医保？' },
            { category: '社保医保', text: '医保个人账户家庭共济如何绑定家庭成员（父母/配偶/子女）？' },
            // 住房保障
            { category: '住房保障', text: '购买自住商品房如何提取住房公积金？需要哪些证明材料？' },
            { category: '住房保障', text: '在海口没有自有住房且在外租房，如何按月提取公积金付房租？' },
            { category: '住房保障', text: '离职之后公积金封存满6个月能全额提取吗？' },
            // 企业开办
            { category: '企业开办', text: '注册一家新的有限责任公司需要几天？材料要准备什么？' },
            { category: '企业开办', text: '个体工商户升级为有限责任公司（个转企），原店铺名字能保留吗？' },
            { category: '企业开办', text: '开办餐饮店需要办理食品经营许可证吗？如何网上申报？' },
            // 车辆驾驶
            { category: '车辆驾驶', text: '机动车驾驶证即将期满6年，如何在线体检办理期满换证并邮寄？' },
            { category: '车辆驾驶', text: '在外省考的驾驶证，能否直接在海口车管所申请转入换证？' },
            // 12345民情
            { category: '12345民情', text: '老旧小区加装电梯能否申请提取本人及配偶的住房公积金？' },
            { category: '12345民情', text: '高校毕业生离校未就业，毕业档案与报到证应该如何托管？' },
            { category: '12345民情', text: '灵活就业人员医保中途断缴3个月，补缴后报销待遇怎么计算？' }
        ]);

        // 真实民情诉求与办结典型案例公开库
        const realGovCases = ref([
            {
                dept: '市医保局',
                status: '已办结',
                title: '【医保直通】跨省异地就医直接结算备案办理',
                summary: '北京退休常住海口的老人，需在海口定点医院门诊看病并长期开药，询问如何直接刷医保卡报销免垫资。',
                reply: '海口市医疗保障局已协助通过“国家医保服务平台”开通长期异地居住备案，实行承诺制秒批即时生效，在海口直接享受原参保地同等报销比例。',
                prompt: '退休老人常住海口，如何办理跨省异地就医直接结算备案？'
            },
            {
                dept: '省社保中心',
                status: '已办结',
                title: '【养老保险】跨省离职后社保养老金关系转移接续',
                summary: '群众此前在深圳参保5年，现入职海口重点园区，询问是否需回深圳开具参保缴费凭证。',
                reply: '省社保服务中心已通过全国社保转移平台实现免凭证跨省网办，转入地与转出地后台协同核验，5个工作日内完成基金划转与账户合并。',
                prompt: '外省跨省离职后，如何把原省份的养老保险关系转移到海南？'
            },
            {
                dept: '市公安户政',
                status: '已办结',
                title: '【人才落户】全日制大专应届毕业生无自有房产落户',
                summary: '刚毕业全日制大专生来海口就业创业，在本地暂无亲友房产，咨询如何办理落户。',
                reply: '公安窗口依据《海口市引进人才落户细则》，凭身份证与学信网学历认证直接办理落户至辖区政府公共集体户，1个工作日办结并免费寄递户口卡。',
                prompt: '我是全日制大专生，在海口怎么落户？需要什么材料？'
            },
            {
                dept: '公积金中心',
                status: '已办结',
                title: '【住房公积金】无房青年按月提取公积金冲抵房租',
                summary: '在海口无自有住房且在外租房的青年职工，申请按月提取公积金减轻租金支出压力。',
                reply: '公积金管理局实行租房零材料定额承诺制，单身职工每月最高1500元，夫妻最高3000元，大数据自动核验房产，按月定期打卡到账。',
                prompt: '在海口没有自有住房且在外租房，如何按月提取公积金付房租？'
            },
            {
                dept: '公安交管',
                status: '已办结',
                title: '【车管便民】人在外地期满换证“警医邮”网办',
                summary: '群众驾驶证即将期满，因长期在外地出差，询问如何免回海口原籍办理期满换发新证。',
                reply: '通过就近联网医院或智能微体检机体检合格后，数据实时同步全国交管系统，在“交管12123”手机APP申请期满换证，新证邮寄送达。',
                prompt: '机动车驾驶证即将期满6年，如何在线体检办理期满换证并邮寄？'
            },
            {
                dept: '市场监管',
                status: '已办结',
                title: '【营商改革】知名餐饮个体户“个转企”升级保留原字号',
                summary: '海口老牌特色餐饮个体工商户扩大规模拟转为有限公司，担心原知名商号老字号丢失。',
                reply: '市市场监管局开启“个转企”绿色通道，证照联办允许最大限度保留原字号与行业特征，0.5个工作日核发新营业执照并赠送一套公章。',
                prompt: '个体工商户升级为有限责任公司（个转企），原店铺名字能保留吗？'
            }
        ]);

        const sidebarTab = ref('hot'); // 'hot' 或 'cases'
        const showCasesModal = ref(false);

        const clickCaseCard = (c) => {
            inputQuestion.value = c.prompt;
            sendMessage();
        };

        const filteredHotQuestions = computed(() => {
            return hotQuestions.value.filter(q => q.category === currentCategory.value);
        });

        const inputQuestion = ref('');
        const isGenerating = ref(false);
        const chatScrollBox = ref(null);

        // 初始欢迎消息
        const messageList = ref([
            {
                role: 'assistant',
                content: '您好！我是海南政务智能服务专员【小政】。\n\n本平台已深度接入省政务法规库与一体化事项指南，支持：\n1. 官方红头文件政策严格溯源（防幻觉）；\n2. 办事指南智能导办（申报材料自检、承诺时限说明与在线申办）；\n3. 12345 民情诉求一键转接。\n\n请问您今天需要咨询或办理什么业务？',
                citation: null,
                guideCard: null,
                showOrderCard: false,
                rated: 0,
                rateTip: ''
            }
        ]);

        const showCitationModal = ref(false);
        const activeCitation = ref({});

        const show12345Modal = ref(false);
        const isTriaging = ref(false);
        const aiTriageResult = ref(null);
        const workOrderForm = ref({
            userName: '张伟',
            userPhone: '13876543210',
            category: '户籍管理',
            appealContent: '',
            assignedDept: '',
            summary: ''
        });

        // 一网通办在线智能申报与预约直通车
        const showApplyModal = ref(false);
        const activeApplyAffair = ref(null);
        const applyForm = ref({
            applicantName: '张伟',
            applicantPhone: '13876543210',
            applicantIdCard: '460100199508081234',
            selectedBranch: '',
            appointmentDate: '明天上午 09:00 - 11:30 (绿色专窗)',
            notes: '一网通办免填表网上预审'
        });

        const openApplyModal = (guideCard) => {
            const affair = guideCard || {
                affairName: '出入境/政务服务在线申办',
                affairCode: 'CRJ-GA-005',
                promisedLimitDays: 7,
                handlingAddress: '海口市公安局出入境管理支队接待大厅',
                onlineHandleUrl: 'https://s.nia.gov.cn/'
            };
            activeApplyAffair.value = affair;
            applyForm.value.selectedBranch = affair.handlingAddress || '海口市公安局出入境管理支队接待大厅';
            showApplyModal.value = true;
        };

        const submitOnlineApply = () => {
            const affair = activeApplyAffair.value || {
                affairName: '政务事项申办与预约',
                promisedLimitDays: 7
            };
            const todayStr = new Date().toISOString().slice(0,10).replace(/-/g,'');
            const randomCode = Math.floor(1000 + Math.random() * 9000);
            const applyNo = `ZW-YY-${todayStr}-${randomCode}`;
            alert(`🎉 线上预约预审成功！\n\n事项名称：${affair.affairName}\n受理预约号：${applyNo}\n承诺办结时限：${affair.promisedLimitDays} 个工作日\n预约网点：${applyForm.value.selectedBranch}\n预约时段：${applyForm.value.appointmentDate}\n\n已向您的手机号码发送预约确认短信。请届时携带已自检核验的身份证原件及相片回执前往现场绿色通道办理！`);
            showApplyModal.value = false;
        };

        // ===== 统一身份认证与权限状态控制 =====
        const currentUser = ref(null);
        try {
            const cachedUser = localStorage.getItem('gov_current_user');
            if (cachedUser) {
                currentUser.value = JSON.parse(cachedUser);
            }
        } catch (e) {
            console.error('读取登录态异常', e);
        }

        const showAuthModal = ref(false);
        const authMode = ref('login');       // 'login' 或 'register'
        const loginMethod = ref('pwd');     // 'pwd' 或 'sms'
        const smsCountdown = ref(0);
        let smsTimer = null;

        // 图形验证码
        const captchaList = ['7W9X', '3M5K', '8A2F', '6H4P', '9E3D', '4R8B'];
        const currentCaptcha = ref('8K3M');
        const refreshCaptcha = () => {
            const idx = Math.floor(Math.random() * captchaList.length);
            currentCaptcha.value = captchaList[idx];
        };

        // 统一账号密码登录表单 (管理员与市民共用)
        const loginForm = ref({
            account: '',
            password: '',
            captcha: ''
        });

        // 手机验证码快捷登录表单
        const smsLoginForm = ref({
            phone: '',
            code: ''
        });

        // 实名建档注册表单
        const registerForm = ref({
            username: '',
            name: '',
            idCard: '',
            phone: '',
            password: ''
        });

        const openAuthModal = () => {
            authMode.value = 'login';
            loginMethod.value = 'pwd';
            refreshCaptcha();
            showAuthModal.value = true;
        };

        // 统一账号密码登录处理 (管理员与普通市民统一入口，后台自动路由角色)
        const handleUnifiedLogin = async () => {
            if (!loginForm.value.account || !loginForm.value.account.trim()) {
                alert('请输入登录账号（用户名/手机号/身份证号）');
                return;
            }
            if (!loginForm.value.password || !loginForm.value.password.trim()) {
                alert('请输入登录密码');
                return;
            }
            if (loginForm.value.captcha && loginForm.value.captcha.trim().toLowerCase() !== currentCaptcha.value.toLowerCase()) {
                alert('图形验证码输入错误，请重新输入');
                refreshCaptcha();
                return;
            }

            try {
                const res = await fetch('/api/v1/gov/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        account: loginForm.value.account.trim(),
                        password: loginForm.value.password.trim(),
                        loginType: 'PASSWORD'
                    })
                });
                const json = await res.json();
                if (json.code === 200) {
                    currentUser.value = json.data;
                    localStorage.setItem('gov_current_user', JSON.stringify(json.data));
                    showAuthModal.value = false;
                    loginForm.value.password = '';
                    loginForm.value.captcha = '';
                    alert(`✅ 登录成功！欢迎【${json.data.name}】进入系统。`);
                } else {
                    alert('登录失败: ' + json.message);
                    refreshCaptcha();
                }
            } catch (e) {
                alert('网络通信异常: ' + e.message);
            }
        };

        // 手机短信快捷登录处理
        const handleSmsLogin = async () => {
            if (!smsLoginForm.value.phone || smsLoginForm.value.phone.trim().length !== 11) {
                alert('请输入有效的11位手机号码');
                return;
            }
            if (!smsLoginForm.value.code || !smsLoginForm.value.code.trim()) {
                alert('请输入短信验证码');
                return;
            }

            try {
                const res = await fetch('/api/v1/gov/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        phone: smsLoginForm.value.phone.trim(),
                        code: smsLoginForm.value.code.trim(),
                        loginType: 'SMS'
                    })
                });
                const json = await res.json();
                if (json.code === 200) {
                    currentUser.value = json.data;
                    localStorage.setItem('gov_current_user', JSON.stringify(json.data));
                    showAuthModal.value = false;
                    smsLoginForm.value.code = '';
                    alert(`✅ 登录成功！欢迎您，${json.data.name}。`);
                } else {
                    alert('登录失败: ' + json.message);
                }
            } catch (e) {
                alert('网络通信异常: ' + e.message);
            }
        };

        // 实名注册建档处理
        const handleRegister = async () => {
            if (!registerForm.value.username || !registerForm.value.username.trim()) {
                alert('请设置用户名');
                return;
            }
            if (!registerForm.value.name || !registerForm.value.name.trim()) {
                alert('请输入公民真实姓名');
                return;
            }
            if (!registerForm.value.idCard || !registerForm.value.idCard.trim()) {
                alert('请输入18位居民身份证号码');
                return;
            }
            if (!registerForm.value.phone || registerForm.value.phone.trim().length !== 11) {
                alert('请输入11位手机号码');
                return;
            }
            if (!registerForm.value.password || registerForm.value.password.trim().length < 6) {
                alert('密码长度不得少于6位');
                return;
            }

            try {
                const res = await fetch('/api/v1/gov/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(registerForm.value)
                });
                const json = await res.json();
                if (json.code === 200) {
                    currentUser.value = json.data;
                    localStorage.setItem('gov_current_user', JSON.stringify(json.data));
                    showAuthModal.value = false;
                    alert(`🎉 实名建档注册成功！已为您自动登录，欢迎【${json.data.name}】。`);
                } else {
                    alert('注册失败: ' + json.message);
                }
            } catch (e) {
                alert('网络通信异常: ' + e.message);
            }
        };

        const sendMockSms = () => {
            if (!smsLoginForm.value.phone || smsLoginForm.value.phone.trim().length !== 11) {
                alert('请先输入正确的11位手机号码');
                return;
            }
            if (smsCountdown.value > 0) return;
            smsLoginForm.value.code = '888888';
            smsCountdown.value = 60;
            smsTimer = setInterval(() => {
                smsCountdown.value--;
                if (smsCountdown.value <= 0) {
                    clearInterval(smsTimer);
                }
            }, 1000);
            alert('📱 短信验证码已发送至您的手机！\n已自动填入：888888');
        };

        const logout = () => {
            currentUser.value = null;
            localStorage.removeItem('gov_current_user');
            alert('已安全退出登录');
        };

        const scrollToBottom = () => {
            nextTick(() => {
                if (chatScrollBox.value) {
                    chatScrollBox.value.scrollTop = chatScrollBox.value.scrollHeight;
                }
            });
        };

        const selectCategory = (cat) => {
            currentCategory.value = cat;
        };

        const sendQuickPrompt = (text) => {
            inputQuestion.value = text;
            sendMessage();
        };

        const sendMessage = async () => {
            const query = inputQuestion.value.trim();
            if (!query || isGenerating.value) return;

            // 1. 推入用户提问
            messageList.value.push({
                role: 'user',
                content: query
            });
            inputQuestion.value = '';
            scrollToBottom();

            // 2. 实名登录鉴权拦截：未登录前回答请先登录，并附带登录接口按钮
            if (!currentUser.value) {
                messageList.value.push({
                    role: 'assistant',
                    content: '您好！为了落实国家政务服务“高效办成一件事”实名制办件与个人信息安全保护规范，请您先完成实名登录后，再进行智能咨询与业务导办。',
                    requireLogin: true,
                    citation: null,
                    guideCard: null,
                    showOrderCard: false,
                    rated: 0,
                    rateTip: ''
                });
                scrollToBottom();
                return;
            }

            // 3. 已登录状态，准备 AI 消息占位并调用后端 SSE
            const aiMsg = {
                role: 'assistant',
                content: '',
                requireLogin: false,
                citation: null,
                guideCard: null,
                clarifyCard: null,
                recommendCard: null,
                showOrderCard: false,
                rated: 0,
                rateTip: ''
            };
            messageList.value.push(aiMsg);
            isGenerating.value = true;
            scrollToBottom();

            try {
                const response = await fetch('/api/v1/gov/chat/stream', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sessionId: sessionId.value,
                        prompt: query,
                        category: currentCategory.value === '全部' ? null : currentCategory.value,
                        token: currentUser.value.token
                    })
                });

                if (!response.ok) {
                    throw new Error('网络请求异常: ' + response.status);
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder('utf-8');
                let buffer = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop(); // 保留未完整的片段

                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed || !trimmed.startsWith('data:')) continue;

                        const rawData = trimmed.substring(5).trim();
                        if (rawData === '[DONE]') {
                            break;
                        }

                        try {
                            const chunkObj = JSON.parse(rawData);
                            if (chunkObj.type === 'chunk' && chunkObj.content) {
                                aiMsg.content += chunkObj.content;
                                scrollToBottom();
                            } else if (chunkObj.type === 'citation' && chunkObj.data) {
                                aiMsg.citation = chunkObj.data;
                            } else if (chunkObj.type === 'guide_card' && chunkObj.data) {
                                // 为材料添加勾选状态
                                if (chunkObj.data.materials) {
                                    chunkObj.data.materials.forEach(m => m.checked = false);
                                }
                                aiMsg.guideCard = chunkObj.data;
                                scrollToBottom();
                            } else if (chunkObj.type === 'clarify_card' && chunkObj.data) {
                                aiMsg.clarifyCard = chunkObj.data;
                                scrollToBottom();
                            } else if (chunkObj.type === 'recommend_card' && chunkObj.data) {
                                aiMsg.recommendCard = chunkObj.data;
                                scrollToBottom();
                            } else if (chunkObj.type === 'order_card') {
                                aiMsg.showOrderCard = true;
                                scrollToBottom();
                            }
                        } catch (e) {
                            // 非 JSON 格式普通文本兜底
                            if (rawData) {
                                aiMsg.content += rawData;
                                scrollToBottom();
                            }
                        }
                    }
                }
            } catch (err) {
                console.error('SSE 读取失败:', err);
                aiMsg.content += '\n\n[系统提示：网络连接超时，已为您开启 12345 诉求登记通道]';
                aiMsg.showOrderCard = true;
            } finally {
                isGenerating.value = false;
                scrollToBottom();
            }
        };

        const openCitationModal = (citation) => {
            activeCitation.value = citation;
            showCitationModal.value = true;
        };

        const openWorkOrderModal = (presetContent = '') => {
            aiTriageResult.value = null;
            if (presetContent) {
                workOrderForm.value.appealContent = presetContent;
            }
            if (currentUser.value) {
                workOrderForm.value.userName = currentUser.value.name;
                workOrderForm.value.userPhone = currentUser.value.phone;
            }
            show12345Modal.value = true;
        };

        const doAiTriage = async () => {
            const content = workOrderForm.value.appealContent.trim();
            if (!content) {
                alert('请先输入您的诉求内容，以便 AI 进行研判');
                return;
            }
            isTriaging.value = true;
            try {
                const res = await fetch('/api/v1/gov/work-order/ai-triage', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ appealContent: content })
                });
                const json = await res.json();
                if (json.code === 200 && json.data) {
                    aiTriageResult.value = json.data;
                    if (json.data.suggestedCategory) {
                        workOrderForm.value.category = json.data.suggestedCategory;
                    }
                    if (json.data.suggestedDept) {
                        workOrderForm.value.assignedDept = json.data.suggestedDept;
                    }
                    if (json.data.summary) {
                        workOrderForm.value.summary = json.data.summary;
                    }
                } else {
                    alert('AI 研判异常: ' + json.message);
                }
            } catch (e) {
                alert('AI 研判网络异常: ' + e.message);
            } finally {
                isTriaging.value = false;
            }
        };

        const checkMaterialCompletion = (guideCard) => {
            if (!guideCard || !guideCard.materials) return;
            const mandatoryList = guideCard.materials.filter(m => m.mandatory);
            const checkedMandatory = mandatoryList.filter(m => m.checked);
            
            if (checkedMandatory.length === mandatoryList.length) {
                alert(`🎉 恭喜！您已备齐全部 ${mandatoryList.length} 项必备申请材料，可直接点击“一网通办立即申办”提交预审！`);
            } else {
                alert(`⚠️ 申报材料核验提醒：必备材料共 ${mandatoryList.length} 项，您已勾选 ${checkedMandatory.length} 项。尚缺 ${mandatoryList.length - checkedMandatory.length} 项，请核实备齐后再行申办。`);
            }
        };

        const rateMessage = async (msg, rating) => {
            if (msg.rated !== 0) return;
            msg.rated = rating;
            msg.rateTip = rating > 0 ? '感谢您的点赞支持！' : '已记录差评，我们将派单核查！';
            try {
                await fetch('/api/v1/gov/chat/feedback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sessionId: sessionId.value,
                        rating: rating,
                        reason: rating < 0 ? '群众反馈回答未彻底解决诉求' : '回答满意'
                    })
                });
            } catch (e) {
                console.error('评价提交失败', e);
            }
        };

        const submitWorkOrder = async () => {
            if (!workOrderForm.value.appealContent.trim()) {
                alert('请填写具体诉求事实');
                return;
            }
            if (aiTriageResult.value) {
                workOrderForm.value.assignedDept = aiTriageResult.value.suggestedDept;
                workOrderForm.value.summary = aiTriageResult.value.summary;
            }
            try {
                const res = await fetch('/api/v1/gov/work-order/submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(workOrderForm.value)
                });
                const json = await res.json();
                if (json.code === 200) {
                    alert(`✅ 12345 诉求登记成功！\n工单流水号：${json.data.orderNo}\n承办部门：${json.data.assignedDept}\n我们已向您的手机号码发送进度查询短信。`);
                    show12345Modal.value = false;
                    workOrderForm.value.appealContent = '';
                    aiTriageResult.value = null;
                } else {
                    alert('提报失败：' + json.message);
                }
            } catch (e) {
                alert('提报工单异常：' + e.message);
            }
        };

        return {
            sessionId,
            categories,
            currentCategory,
            filteredHotQuestions,
            inputQuestion,
            messageList,
            isGenerating,
            chatScrollBox,
            showCitationModal,
            activeCitation,
            show12345Modal,
            workOrderForm,
            isTriaging,
            aiTriageResult,
            doAiTriage,
            showApplyModal,
            activeApplyAffair,
            applyForm,
            openApplyModal,
            submitOnlineApply,
            currentUser,
            showAuthModal,
            authMode,
            loginMethod,
            smsCountdown,
            currentCaptcha,
            refreshCaptcha,
            loginForm,
            smsLoginForm,
            registerForm,
            openAuthModal,
            handleUnifiedLogin,
            handleSmsLogin,
            handleRegister,
            sendMockSms,
            logout,
            selectCategory,
            sendQuickPrompt,
            sendMessage,
            openCitationModal,
            openWorkOrderModal,
            checkMaterialCompletion,
            rateMessage,
            submitWorkOrder,
            realGovCases,
            clickCaseCard,
            sidebarTab,
            showCasesModal
        };
    }
}).mount('#app');
