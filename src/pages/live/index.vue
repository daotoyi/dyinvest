<script setup lang="ts">
import AppIcon from "../../components/AppIcon.vue";
import AppShell from "../../components/AppShell.vue";
import PageHeader from "../../components/PageHeader.vue";

const connectionModes = [
  {
    code: "A",
    name: "导流与参数传递",
    desc: "生成策略参数，跳转合作券商交易入口。",
    state: "可优先评估",
  },
  {
    code: "B",
    name: "只读账户同步",
    desc: "同步资金、持仓与订单，不发起交易。",
    state: "实盘试点",
  },
  {
    code: "C",
    name: "实盘下单",
    desc: "平台发起订单，券商风控与网关执行。",
    state: "后置接入",
  },
];

const requirements = [
  {
    title: "持牌合作与业务边界",
    desc: "明确技术服务商、券商、用户之间的责任边界。",
    done: false,
  },
  {
    title: "券商正式接口与测试环境",
    desc: "交易、行情、账户接口均需正式授权。",
    done: false,
  },
  {
    title: "实时行情授权",
    desc: "明确展示、缓存、模拟成交和回测范围。",
    done: false,
  },
  {
    title: "用户适当性与授权",
    desc: "开户、风险测评、交易权限和可撤回授权。",
    done: false,
  },
  {
    title: "交易风控与对账",
    desc: "幂等订单、状态机、限额、停单与定时对账。",
    done: false,
  },
  {
    title: "安全与合规上线闸门",
    desc: "渗透测试、密钥管理、日志留存和事故演练。",
    done: false,
  },
];

function unavailable() {
  uni.showToast({
    title: "实盘接入尚在准备中",
    icon: "none",
  });
}
</script>

<template>
  <AppShell secondary>
    <view class="page-canvas page-canvas--secondary">
      <view class="page-content">
        <PageHeader
          back
          title="实盘接入"
          eyebrow="Live trading readiness"
          subtitle="首版不接真实券商。以下说明正式接入前的业务、数据与技术要求。"
        >
          <template #action>
            <view class="live-status">
              <view class="live-status__dot" />
              <text>未接入</text>
            </view>
          </template>
        </PageHeader>

        <view class="live-hero">
          <view class="live-hero__copy">
            <text class="eyebrow">Current status</text>
            <text class="live-hero__title">模拟优先，实盘另设上线闸门</text>
            <text class="live-hero__desc">
              平台不会收集券商登录密码，也不会通过模拟点击券商 App 的方式发起交易。正式实盘需要与持牌券商合作并使用授权接口。
            </text>
          </view>
          <view class="live-hero__badge">
            <AppIcon name="shield" :size="25" color="#946617" />
            <view>
              <text>实盘状态</text>
              <text>待商务与合规确认</text>
            </view>
          </view>
        </view>

        <view class="mode-section">
          <view class="section-heading">
            <view class="section-heading__copy">
              <text class="section-heading__title">三种接入路径</text>
              <text class="section-heading__meta">按平台责任与技术复杂度逐步推进</text>
            </view>
          </view>
          <view class="mode-grid">
            <view
              v-for="mode in connectionModes"
              :key="mode.code"
              class="mode-card card"
            >
              <view class="mode-card__head">
                <view class="mode-card__code mono">{{ mode.code }}</view>
                <view class="chip" :class="mode.code === 'A' ? 'chip--teal' : 'chip--amber'">
                  {{ mode.state }}
                </view>
              </view>
              <text class="mode-card__title">{{ mode.name }}</text>
              <text class="mode-card__desc">{{ mode.desc }}</text>
              <view class="mode-card__line" />
              <text class="mode-card__foot">
                {{ mode.code === "A" ? "平台不接触账户与订单" : mode.code === "B" ? "需要券商授权和数据安全" : "需要完整交易系统与风控" }}
              </text>
            </view>
          </view>
        </view>

        <view class="live-layout">
          <view class="requirements-panel card">
            <view class="requirements-panel__head">
              <view>
                <text class="requirements-panel__title">上线前检查清单</text>
                <text class="requirements-panel__meta">当前完成 0 / {{ requirements.length }}</text>
              </view>
              <view class="chip chip--amber">未就绪</view>
            </view>
            <view class="requirement-list">
              <view
                v-for="(item, index) in requirements"
                :key="item.title"
                class="requirement-row"
              >
                <view class="requirement-row__index mono">{{ String(index + 1).padStart(2, "0") }}</view>
                <view class="requirement-row__copy">
                  <text class="requirement-row__title">{{ item.title }}</text>
                  <text class="requirement-row__desc">{{ item.desc }}</text>
                </view>
                <view class="requirement-row__state">
                  <AppIcon name="circleDashed" :size="16" color="#95a09c" />
                  <text>待确认</text>
                </view>
              </view>
            </view>
          </view>

          <view class="security-panel card">
            <view class="security-panel__icon">
              <AppIcon name="lock" :size="23" color="#0e6f5c" />
            </view>
            <text class="security-panel__title">账户安全底线</text>
            <view class="security-list">
              <view class="security-item">
                <AppIcon name="check" :size="14" color="#0e6f5c" />
                <text>不保存券商登录密码</text>
              </view>
              <view class="security-item">
                <AppIcon name="check" :size="14" color="#0e6f5c" />
                <text>使用券商受限授权令牌</text>
              </view>
              <view class="security-item">
                <AppIcon name="check" :size="14" color="#0e6f5c" />
                <text>交易密钥独立托管</text>
              </view>
              <view class="security-item">
                <AppIcon name="check" :size="14" color="#0e6f5c" />
                <text>订单、成交与账户定时对账</text>
              </view>
              <view class="security-item">
                <AppIcon name="check" :size="14" color="#0e6f5c" />
                <text>全局停单与人工接管</text>
              </view>
            </view>
            <view class="security-panel__note">
              <AppIcon name="info" :size="13" color="#7b8783" />
              <text>正式密钥、证书和券商网关不会进入客户端。</text>
            </view>
          </view>
        </view>

        <view class="connection-flow">
          <view class="section-heading">
            <view class="section-heading__copy">
              <text class="section-heading__title">正式接入流程</text>
              <text class="section-heading__meta">从商务确认到小额试点的顺序</text>
            </view>
          </view>
          <view class="flow-grid">
            <view class="flow-step">
              <view class="flow-step__index mono">01</view>
              <text class="flow-step__title">商务与合规</text>
              <text class="flow-step__desc">确认牌照边界、客户范围和行情授权。</text>
            </view>
            <view class="flow-step">
              <view class="flow-step__index mono">02</view>
              <text class="flow-step__title">接口联调</text>
              <text class="flow-step__desc">完成账户、行情、订单和回报接入。</text>
            </view>
            <view class="flow-step">
              <view class="flow-step__index mono">03</view>
              <text class="flow-step__title">只读试点</text>
              <text class="flow-step__desc">先同步账户，验证授权与对账一致性。</text>
            </view>
            <view class="flow-step">
              <view class="flow-step__index mono">04</view>
              <text class="flow-step__title">小额实盘</text>
              <text class="flow-step__desc">用手工小额订单验证全链路与异常处理。</text>
            </view>
          </view>
        </view>

        <view class="live-action">
          <view class="live-action__copy">
            <text class="live-action__title">合作券商接入准备中</text>
            <text class="live-action__desc">
              当前版本只提供学习、策略分析和本地模拟，不会发起任何真实交易。
            </text>
          </view>
          <button class="button-secondary" @tap="unavailable">
            <AppIcon name="link" :size="16" color="#17211e" />
            <text>发起券商授权</text>
          </button>
        </view>
      </view>
    </view>
  </AppShell>
</template>

<style scoped lang="scss">
.live-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 9px;
  border: 1px solid #ead8b5;
  border-radius: 5px;
  background: #fdf9f1;
  color: #946617;
  font-size: 9px;
  font-weight: 650;
}

.live-status__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--amber);
}

.live-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 26px;
  padding: 25px;
  border: 1px solid #e8dabf;
  border-radius: 8px;
  background: #fdf9f1;
}

.live-hero__copy {
  display: flex;
  max-width: 720px;
  flex-direction: column;
}

.live-hero__title {
  margin-top: 5px;
  color: var(--ink);
  font-size: 23px;
  font-weight: 750;
}

.live-hero__desc {
  margin-top: 7px;
  color: #746a53;
  font-size: 11px;
  line-height: 1.7;
}

.live-hero__badge {
  display: flex;
  min-width: 190px;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border: 1px solid #ead8b5;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.7);
}

.live-hero__badge view {
  display: flex;
  flex-direction: column;
}

.live-hero__badge view text:first-child {
  color: var(--muted);
  font-size: 8px;
}

.live-hero__badge view text:last-child {
  margin-top: 2px;
  color: #71551d;
  font-size: 10px;
  font-weight: 700;
}

.mode-section {
  margin-top: 25px;
}

.mode-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.mode-card {
  display: flex;
  flex-direction: column;
  padding: 17px;
}

.mode-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.mode-card__code {
  color: var(--muted-light);
  font-size: 18px;
  font-weight: 700;
}

.mode-card__title {
  margin-top: 15px;
  color: var(--ink);
  font-size: 14px;
  font-weight: 700;
}

.mode-card__desc {
  margin-top: 4px;
  color: var(--muted);
  font-size: 10px;
  line-height: 1.55;
}

.mode-card__line {
  height: 1px;
  margin: 14px 0 10px;
  background: var(--line);
}

.mode-card__foot {
  color: var(--muted-light);
  font-size: 8px;
}

.live-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 14px;
  align-items: start;
  margin-top: 16px;
}

.requirements-panel {
  padding: 20px;
}

.requirements-panel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.requirements-panel__title {
  color: var(--ink);
  font-size: 15px;
  font-weight: 730;
}

.requirements-panel__meta {
  display: block;
  margin-top: 2px;
  color: var(--muted);
  font-size: 9px;
}

.requirement-list {
  margin-top: 13px;
  border-top: 1px solid var(--line);
}

.requirement-row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 64px;
  border-bottom: 1px solid var(--line);
}

.requirement-row__index {
  width: 24px;
  flex: 0 0 auto;
  color: var(--muted-light);
  font-size: 9px;
}

.requirement-row__copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.requirement-row__title {
  color: var(--ink);
  font-size: 11px;
  font-weight: 650;
}

.requirement-row__desc {
  margin-top: 2px;
  color: var(--muted);
  font-size: 8px;
}

.requirement-row__state {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--muted-light);
  font-size: 8px;
  white-space: nowrap;
}

.security-panel {
  padding: 19px;
}

.security-panel__icon {
  display: flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  background: var(--teal-wash);
}

.security-panel__title {
  display: block;
  margin-top: 12px;
  color: var(--ink);
  font-size: 14px;
  font-weight: 720;
}

.security-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 14px;
}

.security-item {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--muted);
  font-size: 9px;
}

.security-panel__note {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
  color: var(--muted-light);
  font-size: 8px;
  line-height: 1.5;
}

.connection-flow {
  margin-top: 24px;
}

.flow-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}

.flow-step {
  position: relative;
  display: flex;
  min-height: 145px;
  flex-direction: column;
  padding: 18px;
  border-right: 1px solid var(--line);
}

.flow-step:last-child {
  border-right: 0;
}

.flow-step__index {
  color: var(--teal);
  font-size: 10px;
  font-weight: 650;
}

.flow-step__title {
  margin-top: 23px;
  color: var(--ink);
  font-size: 12px;
  font-weight: 700;
}

.flow-step__desc {
  margin-top: 4px;
  color: var(--muted);
  font-size: 9px;
  line-height: 1.55;
}

.live-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-top: 18px;
  padding: 16px 18px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
}

.live-action__copy {
  display: flex;
  flex-direction: column;
}

.live-action__title {
  color: var(--ink);
  font-size: 12px;
  font-weight: 700;
}

.live-action__desc {
  margin-top: 2px;
  color: var(--muted);
  font-size: 9px;
}

@media (max-width: 1000px) {
  .live-layout {
    grid-template-columns: minmax(0, 1fr) 260px;
  }
}

@media (max-width: 900px) {
  .live-status {
    display: none;
  }

  .live-hero {
    align-items: flex-start;
    flex-direction: column;
    gap: 16px;
    padding: 18px;
  }

  .live-hero__title {
    font-size: 20px;
  }

  .live-hero__badge {
    width: 100%;
  }

  .mode-grid,
  .live-layout {
    grid-template-columns: 1fr;
  }

  .flow-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .flow-step:nth-child(2) {
    border-right: 0;
  }

  .flow-step:nth-child(-n + 2) {
    border-bottom: 1px solid var(--line);
  }

  .live-action {
    align-items: flex-start;
    flex-direction: column;
  }

  .live-action .button-secondary {
    width: 100%;
  }
}
</style>
