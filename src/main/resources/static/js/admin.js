const { createApp, ref, onMounted } = Vue;

createApp({
    setup() {
        const stats = ref({});
        const activeTab = ref('orders');
        const orderList = ref([]);
        const policyList = ref([]);
        const affairList = ref([]);

        const showReplyModal = ref(false);
        const activeOrder = ref({});
        const replyText = ref('');

        // 刷新状态与反馈
        const isRefreshing = ref(false);
        const lastRefreshTime = ref('');
        const refreshToast = ref('');
        let toastTimer = null;

        // 身份鉴权与权限拦截
        const currentUser = ref(null);
        const isAuthorized = ref(false);

        const checkAuth = () => {
            try {
                const cached = localStorage.getItem('gov_current_user');
                if (cached) {
                    const u = JSON.parse(cached);
                    currentUser.value = u;
                    if (u && u.role === 'ADMIN') {
                        isAuthorized.value = true;
                        return;
                    }
                }
            } catch (e) {
                console.error('鉴权校验异常', e);
            }
            isAuthorized.value = false;
        };

        const quickAdminAuth = () => {
            const adminUser = {
                username: 'admin',
                name: '系统超级管理员',
                role: 'ADMIN',
                roleName: '超级管理员',
                token: 'token-admin-' + Date.now()
            };
            localStorage.setItem('gov_current_user', JSON.stringify(adminUser));
            currentUser.value = adminUser;
            isAuthorized.value = true;
            refreshAll();
        };

        const logout = () => {
            localStorage.removeItem('gov_current_user');
            window.location.href = '/index.html';
        };

        let pieChartInstance = null;
        let lineChartInstance = null;

        const loadStats = async () => {
            try {
                const res = await fetch('/api/v1/gov/dashboard/stats');
                const json = await res.json();
                if (json.code === 200) {
                    stats.value = json.data;
                    renderCharts(json.data);
                }
            } catch (e) {
                console.error('加载大屏统计失败', e);
            }
        };

        const loadOrders = async () => {
            try {
                const res = await fetch('/api/v1/gov/work-order/list');
                const json = await res.json();
                if (json.code === 200) {
                    orderList.value = json.data;
                }
            } catch (e) {
                console.error('加载工单失败', e);
            }
        };

        const loadPolicies = async () => {
            try {
                const res = await fetch('/api/v1/gov/policies');
                const json = await res.json();
                if (json.code === 200) {
                    policyList.value = json.data;
                }
            } catch (e) {
                console.error('加载政策失败', e);
            }
        };

        const loadAffairs = async () => {
            try {
                const res = await fetch('/api/v1/gov/affairs');
                const json = await res.json();
                if (json.code === 200) {
                    affairList.value = json.data;
                }
            } catch (e) {
                console.error('加载事项失败', e);
            }
        };

        const renderCharts = (data) => {
            // 饼图：诉求分类占比
            const pieDom = document.getElementById('pieChart');
            if (pieDom && data.categoryDistribution) {
                if (!pieChartInstance) {
                    pieChartInstance = echarts.init(pieDom);
                }
                pieChartInstance.setOption({
                    tooltip: { trigger: 'item', formatter: '{b}: {c}次 ({d}%)' },
                    legend: { bottom: '2%', left: 'center' },
                    color: ['#165dff', '#00b42a', '#ff7d00', '#722ed1'],
                    series: [
                        {
                            name: '分类占比',
                            type: 'pie',
                            radius: ['40%', '70%'],
                            avoidLabelOverlap: false,
                            itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
                            label: { show: false },
                            data: data.categoryDistribution
                        }
                    ]
                });
            }

            // 折线图：近7天受理趋势
            const lineDom = document.getElementById('lineChart');
            if (lineDom && data.trendDates && data.trendCounts) {
                if (!lineChartInstance) {
                    lineChartInstance = echarts.init(lineDom);
                }
                lineChartInstance.setOption({
                    tooltip: { trigger: 'axis' },
                    grid: { top: '15%', left: '3%', right: '4%', bottom: '8%', containLabel: true },
                    xAxis: {
                        type: 'category',
                        boundaryGap: false,
                        data: data.trendDates
                    },
                    yAxis: { type: 'value', name: '受理人次' },
                    series: [
                        {
                            name: '智能受理量',
                            type: 'line',
                            smooth: true,
                            data: data.trendCounts,
                            lineStyle: { width: 3, color: '#165dff' },
                            areaStyle: {
                                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                    { offset: 0, color: 'rgba(22, 93, 255, 0.35)' },
                                    { offset: 1, color: 'rgba(22, 93, 255, 0.02)' }
                                ])
                            }
                        }
                    ]
                });
            }
        };

        const openReplyModal = (order) => {
            activeOrder.value = order;
            replyText.value = order.replyContent || '';
            showReplyModal.value = true;
        };

        const submitReply = async () => {
            if (!replyText.value.trim()) {
                alert('请填写官方答复内容');
                return;
            }
            try {
                const res = await fetch(`/api/v1/gov/work-order/${activeOrder.value.id}/reply`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ replyContent: replyText.value })
                });
                const json = await res.json();
                if (json.code === 200) {
                    alert('✅ 工单办结成功！已生成正式答复记录并归档。');
                    showReplyModal.value = false;
                    loadOrders();
                    loadStats();
                } else {
                    alert('答复失败: ' + json.message);
                }
            } catch (e) {
                alert('处理工单异常: ' + e.message);
            }
        };

        const refreshAll = async () => {
            if (isRefreshing.value) return;
            isRefreshing.value = true;
            try {
                await Promise.all([
                    loadStats(),
                    loadOrders(),
                    loadPolicies(),
                    loadAffairs()
                ]);
                const now = new Date();
                const timeStr = now.toTimeString().split(' ')[0];
                lastRefreshTime.value = timeStr;
                refreshToast.value = `大屏监控指标与工单数据已同步刷新完成！（${timeStr}）`;
                if (toastTimer) clearTimeout(toastTimer);
                toastTimer = setTimeout(() => {
                    refreshToast.value = '';
                }, 2500);
            } catch (e) {
                console.error('刷新异常', e);
            } finally {
                setTimeout(() => {
                    isRefreshing.value = false;
                }, 500);
            }
        };

        onMounted(() => {
            checkAuth();
            if (isAuthorized.value) {
                refreshAll();
            }
            window.addEventListener('resize', () => {
                if (pieChartInstance) pieChartInstance.resize();
                if (lineChartInstance) lineChartInstance.resize();
            });
        });

        return {
            stats,
            activeTab,
            orderList,
            policyList,
            affairList,
            showReplyModal,
            activeOrder,
            replyText,
            currentUser,
            isAuthorized,
            isRefreshing,
            lastRefreshTime,
            refreshToast,
            quickAdminAuth,
            logout,
            openReplyModal,
            submitReply,
            refreshAll
        };
    }
}).mount('#adminApp');
