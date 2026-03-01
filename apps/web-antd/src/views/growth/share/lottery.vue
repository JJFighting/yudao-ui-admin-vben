<script lang="ts" setup>
import type { GrowthLotteryShareApi } from '#/api/growth/lotteryShare';

import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Button, message, Modal, Spin } from 'ant-design-vue';


import {
  getActivityByCode,
  drawLottery,
  getRemainingCount,
  getWinnerList,
  getGoogleSession,
  googleOAuthCallback,
} from '#/api/growth/lotteryShare';

const route = useRoute();
const router = useRouter();
const shareCode = computed(() => (route.query.id || route.query.state) as string);

const activity = ref<GrowthLotteryShareApi.Activity | null>(null);
const winners = ref<GrowthLotteryShareApi.WinnerRecord[]>([]);
const session = ref<GrowthLotteryShareApi.GoogleSession | null>(null);
const remainingCount = ref(0);
const loading = ref(true);
const drawing = ref(false);
const currentIndex = ref(-1); // 当前旋转到的格子索引
const isSpinning = ref(false);

// 九宫格位置: [0,1,2,3,-,4,5,6,7] (中间是GO按钮)
const gridPositions = [0, 1, 2, 7, -1, 3, 6, 5, 4]; // 映射奖品位置到九宫格

// 旋转顺序（顺时针）: 0,1,2,3,4,5,6,7
const spinOrder = [0, 1, 2, 4, 7, 6, 5, 3];

function getGridItem(gridIndex: number) {
  if (gridIndex === 4) return null; // GO 按钮
  const pos = gridPositions[gridIndex];
  if (pos === undefined || pos === -1) return null;
  const prizes = activity.value?.prizes || [];
  if (pos < prizes.length) {
    return prizes[pos];
  }
  return { name: activity.value?.noPrizeName || '谢谢参与', prizeType: 0 };
}

const bgColor = computed(() => {
  return activity.value?.styleConfig?.bgColor || '#6C5CE7';
});

const title = computed(() => {
  return activity.value?.styleConfig?.title || 'Lucky Draw';
});

const subtitle = computed(() => {
  return activity.value?.styleConfig?.subtitle || 'Grab your luck now!';
});

async function loadData() {
  try {
    loading.value = true;
    activity.value = await getActivityByCode(shareCode.value);

    if (!activity.value) {
      message.error('活动不存在');
      return;
    }

    // 加载中奖名单
    if (activity.value.showWinnerList) {
      winners.value = await getWinnerList(activity.value.id);
    }

    // 检查登录状态
    try {
      session.value = await getGoogleSession();
      if (session.value && activity.value) {
        remainingCount.value = await getRemainingCount(activity.value.id);
      }
    } catch {
      session.value = null;
    }
  } catch (e: any) {
    message.error(e?.message || '加载失败');
  } finally {
    loading.value = false;
  }
}

function handleGoogleLogin() {
  // 使用 Google OAuth implicit flow
  const clientId = '859983860673-o2uekrofrnke1luaclgenbqerglibuqo.apps.googleusercontent.com';
  const redirectUri = encodeURIComponent(`${window.location.origin}/share`);
  const scope = encodeURIComponent('openid email profile');
  const state = shareCode.value;
  const authUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}&access_type=offline&prompt=consent`;
  window.location.href = authUrl;
}

async function handleDraw() {
  if (!session.value) {
    handleGoogleLogin();
    return;
  }

  if (remainingCount.value <= 0) {
    message.warning('今日抽奖次数已用完');
    return;
  }

  if (isSpinning.value) return;

  try {
    drawing.value = true;
    isSpinning.value = true;

    // 先调用抽奖API
    const result = await drawLottery(activity.value!.id);

    // 执行旋转动画
    await spinAnimation(result);

    // 更新剩余次数
    remainingCount.value = result.remainingCount;

    // 显示结果
    if (result.isWinner) {
      Modal.success({
        title: '🎉 恭喜中奖！',
        content: `您获得了：${result.prizeName}`,
      });
    } else {
      Modal.info({
        title: '未中奖',
        content: result.prizeName || '谢谢参与，下次好运！',
      });
    }

    // 刷新中奖名单
    if (activity.value && activity.value.showWinnerList) {
      winners.value = await getWinnerList(activity.value.id);
    }
  } catch (e: any) {
    if (e?.code === 401) {
      handleGoogleLogin();
    } else {
      message.error(e?.message || '抽奖失败');
    }
  } finally {
    drawing.value = false;
    isSpinning.value = false;
  }
}

async function spinAnimation(result: GrowthLotteryShareApi.DrawResult) {
  // 找到中奖奖品在九宫格中的位置
  let targetSpinIndex = 0; // 默认第一个格子
  if (result.prizeId) {
    const prizeIndex = activity.value?.prizes?.findIndex((p) => p.id === result.prizeId) ?? 0;
    targetSpinIndex = spinOrder.findIndex((i) => i === prizeIndex);
    if (targetSpinIndex < 0) targetSpinIndex = 0;
  } else {
    // 未中奖，随机停在一个"谢谢参与"位置
    const noWinPositions = spinOrder.filter((pos) => {
      const prizes = activity.value?.prizes || [];
      return pos >= prizes.length;
    });
    targetSpinIndex = spinOrder.indexOf(noWinPositions[0] ?? 0);
  }

  // 转3-4圈 + 到目标位置
  const totalSteps = spinOrder.length * 3 + targetSpinIndex + 1;

  for (let step = 0; step < totalSteps; step++) {
    const spinIdx = step % spinOrder.length;
    const gridIdx = spinOrder[spinIdx] ?? 0;
    // 映射回九宫格索引
    currentIndex.value = gridPositions.indexOf(gridIdx);
    if (currentIndex.value === -1 || currentIndex.value === undefined) currentIndex.value = 4; // fallback

    // 逐渐变慢
    const baseDelay = 60;
    const slowdown = step > totalSteps - 10 ? (step - (totalSteps - 10)) * 30 : 0;
    await new Promise((r) => setTimeout(r, baseDelay + slowdown));
  }
}

function handleShare() {
  const url = window.location.href;
  navigator.clipboard.writeText(url);
  message.success('链接已复制，快分享给好友吧！');
}

// 检查OAuth回调
async function checkOAuthCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  if (code) {
    try {
      const redirectUri = `${window.location.origin}/share`;
      await googleOAuthCallback(code, redirectUri);
      // 用 router.replace 清除 code 参数，保留 id 参数（触发 Vue Router 响应式更新）
      const activityId = urlParams.get('state') || shareCode.value;
      await router.replace({ path: '/share', query: { id: activityId } });
      await loadData();
    } catch (e: any) {
      message.error('登录失败，请重试');
    }
    return;
  }
}

onMounted(async () => {
  await checkOAuthCallback();
  await loadData();
});

// 规则文本
const ruleText = computed(() => {
  if (!activity.value) return [];
  const rules: string[] = [];
  const rc = activity.value.ruleConfig || {};

  if (rc.participationType === 'subscribe') {
    rules.push('1. 订阅后即可获得抽奖机会');
  } else {
    rules.push('1. 登录后即可获得抽奖机会');
  }

  if (rc.frequencyType === 'daily') {
    rules.push(`2. 每天可抽奖${rc.dailyDrawCount || 1}次`);
  } else {
    rules.push(`2. 总共可抽奖${rc.totalDrawCount || 1}次`);
  }

  return rules;
});
</script>

<template>
  <div class="lottery-page" :style="{ '--bg-color': bgColor }">
    <Spin :spinning="loading" tip="加载中...">
      <div v-if="activity" class="lottery-container">
        <!-- 头部 -->
        <div class="lottery-header" :style="{ background: `linear-gradient(180deg, ${bgColor}, ${bgColor}dd)` }">
          <div class="header-title">{{ title }}</div>
          <div class="header-subtitle">{{ subtitle }}</div>
        </div>

        <!-- 九宫格 -->
        <div class="lottery-board">
          <div class="grid-wrapper">
            <div
              v-for="(_, idx) in 9"
              :key="idx"
              class="grid-cell"
              :class="{
                'go-cell': idx === 4,
                'active-cell': currentIndex === idx && isSpinning,
              }"
              @click="idx === 4 ? handleDraw() : undefined"
            >
              <template v-if="idx === 4">
                <div class="go-button" :class="{ spinning: isSpinning }">
                  <span class="go-text">GO</span>
                  <span class="go-arrows">&gt;&gt;&gt;</span>
                </div>
              </template>
              <template v-else>
                <div class="prize-icon">
                  <span v-if="getGridItem(idx)?.prizeType && getGridItem(idx)!.prizeType > 0">🎁</span>
                  <span v-else>💝</span>
                </div>
                <div class="prize-name">{{ getGridItem(idx)?.name || '奖品' }}</div>
              </template>
            </div>
          </div>

          <div class="draw-info">
            Draw chances <span class="draw-count">{{ session ? remainingCount : 0 }}</span>
          </div>

          <div class="action-buttons">
            <Button class="share-btn" size="large" @click="handleShare">
              🔗 Share
            </Button>
            <Button class="gift-btn" size="large" @click="handleDraw">
              🎁
            </Button>
          </div>
        </div>

        <!-- 中奖名单 -->
        <div v-if="activity.showWinnerList && winners.length" class="winner-section">
          <div class="section-title">🏆 Winner list 🏆</div>
          <div class="winner-list">
            <div v-for="(winner, idx) in winners" :key="idx" class="winner-item">
              <span class="winner-name">{{ winner.userEmail }}</span>
              <span class="winner-prize">{{ winner.prizeName }}</span>
            </div>
          </div>
        </div>

        <!-- 抽奖规则 -->
        <div class="rules-section">
          <div class="section-title">🎯 Lucky draw rules 🎯</div>
          <div class="rules-content">
            <div class="rules-block">
              <strong>【Lucky draw rules】</strong>
              <p v-for="(rule, idx) in ruleText" :key="idx">{{ rule }}</p>
            </div>
            <div class="rules-block">
              <strong>【Start and end time】</strong>
              <p v-if="activity.isPermanent === 1">长期有效</p>
              <p v-else>{{ activity.startTime }} - {{ activity.endTime }}</p>
            </div>
          </div>
        </div>

        <!-- 未登录提示 -->
        <div v-if="!session" class="login-prompt">
          <Button type="primary" size="large" block @click="handleGoogleLogin">
            🔑 Sign in with Google to draw
          </Button>
        </div>
      </div>

      <div v-else-if="!loading" class="not-found">
        <h2>活动不存在或已失效</h2>
      </div>
    </Spin>
  </div>
</template>

<style scoped>
.lottery-page {
  min-height: 100vh;
  background: #f5f5f5;
  font-family: 'Inter', sans-serif;
}

.lottery-container {
  max-width: 430px;
  margin: 0 auto;
  padding-bottom: 24px;
}

.lottery-header {
  text-align: center;
  padding: 40px 20px 60px;
  color: white;
  border-radius: 0 0 24px 24px;
}

.header-title {
  font-size: 36px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.header-subtitle {
  font-size: 14px;
  opacity: 0.9;
  margin-top: 4px;
}

.lottery-board {
  margin: -30px 16px 16px;
  background: linear-gradient(180deg, #ffd700, #e6a800);
  border-radius: 16px;
  padding: 20px 16px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.grid-wrapper {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}

.grid-cell {
  background: white;
  border-radius: 12px;
  padding: 16px 8px;
  text-align: center;
  transition: all 0.15s ease;
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.active-cell {
  background: #ff6b35 !important;
  color: white;
  transform: scale(1.05);
  box-shadow: 0 0 12px rgba(255, 107, 53, 0.6);
}

.go-cell {
  background: linear-gradient(135deg, #ff6b35, #f7c431) !important;
  cursor: pointer;
}

.go-cell:hover {
  transform: scale(1.05);
}

.go-button {
  color: white;
  font-size: 28px;
  font-weight: 800;
}

.go-text {
  display: block;
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.go-arrows {
  font-size: 14px;
  opacity: 0.8;
}

.spinning .go-arrows {
  animation: pulse 0.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.8; }
  50% { opacity: 0.3; }
}

.prize-icon {
  font-size: 24px;
  margin-bottom: 4px;
}

.prize-name {
  font-size: 11px;
  color: #666;
  line-height: 1.2;
}

.active-cell .prize-name {
  color: white;
}

.draw-info {
  text-align: center;
  color: #8b6914;
  font-size: 14px;
  margin-bottom: 12px;
}

.draw-count {
  color: #ff4444;
  font-weight: 700;
  margin-left: 4px;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.share-btn {
  flex: 1;
  background: white;
  border: none;
  border-radius: 24px;
  height: 44px;
}

.gift-btn {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: #8b4513;
  color: white;
  border: none;
}

.winner-section,
.rules-section {
  margin: 0 16px 16px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 12px;
  padding: 16px;
  color: white;
}

.section-title {
  text-align: center;
  font-weight: 700;
  font-size: 16px;
  margin-bottom: 12px;
}

.winner-item {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 13px;
  opacity: 0.9;
}

.rules-content {
  font-size: 13px;
  line-height: 1.6;
}

.rules-block {
  margin-bottom: 12px;
}

.rules-block p {
  margin: 2px 0;
}

.login-prompt {
  margin: 0 16px;
  padding: 16px;
}

.not-found {
  text-align: center;
  padding: 80px 20px;
  color: #999;
}
</style>
