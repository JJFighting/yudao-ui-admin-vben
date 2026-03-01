<script lang="ts" setup>
import type { GrowthTaskShareApi } from '#/api/growth/taskShare';

import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Button, message, Progress, Spin, Tag, Avatar } from 'ant-design-vue';

import {
  getTaskActivityByCode,
  getTaskProgress,
  getTaskRankList,
  getGoogleSession,
  googleOAuthCallback,
  submitTaskAssist,
} from '#/api/growth/taskShare';

const route = useRoute();
const router = useRouter();

// ========== URL 参数解析 ==========

/**
 * 分享链接格式: /share?type=task&id={shareCode}&inviter={userId}
 * OAuth 回调时: /share?code=xxx&state=task|{shareCode}|{inviterId}
 */
const shareCode = computed(() => {
  const state = route.query.state as string;
  if (state && state.startsWith('task|')) {
    return state.split('|')[1]!;
  }
  return (route.query.id as string) || '';
});

/** 邀请人 ID — 从 URL ?inviter= 或 OAuth state 第三段获取 */
const inviterId = computed(() => {
  // 优先从 URL 参数获取
  if (route.query.inviter) {
    return Number(route.query.inviter);
  }
  // OAuth 回调时从 state 解析: task|shareCode|inviterId
  const state = route.query.state as string;
  if (state && state.startsWith('task|')) {
    const parts = state.split('|');
    if (parts.length >= 3 && parts[2]) {
      return Number(parts[2]);
    }
  }
  return null;
});

// ========== 状态 ==========
const activity = ref<GrowthTaskShareApi.Activity | null>(null);
const session = ref<GrowthTaskShareApi.GoogleSession | null>(null);
const progressInfo = ref<GrowthTaskShareApi.ProgressInfo | null>(null);
const rankList = ref<GrowthTaskShareApi.RankItem[]>([]);
const loading = ref(true);

// ========== 样式 ==========
const bgColor = computed(() => activity.value?.styleConfig?.bgColor || '#FF6B35');
const title = computed(() => activity.value?.styleConfig?.title || '邀请好友助力');

// ========== 核心业务逻辑 ==========

async function loadData() {
  try {
    loading.value = true;
    activity.value = await getTaskActivityByCode(shareCode.value);

    if (!activity.value) {
      message.error('活动不存在');
      return;
    }

    // 检查登录状态
    try {
      session.value = await getGoogleSession();
      if (session.value && activity.value) {
        // 已登录 → 自动提交助力（如果有邀请人）
        await tryAutoAssist();
        // 加载我的进度
        progressInfo.value = await getTaskProgress(activity.value.id);
      }
    } catch {
      session.value = null;
    }

    // 加载排行榜
    if (activity.value.enableRankReward === 1) {
      try {
        rankList.value = await getTaskRankList(activity.value.id);
      } catch {
        rankList.value = [];
      }
    }
  } catch (e: any) {
    message.error(e?.message || '加载失败');
  } finally {
    loading.value = false;
  }
}

/**
 * 自动提交助力（裂变核心）
 * 条件: 已登录 + URL 中有 inviter 参数 + 活动存在
 */
async function tryAutoAssist() {
  if (!session.value || !activity.value || !inviterId.value) return;

  // 不能自己邀请自己
  if (session.value.userId === inviterId.value) return;

  try {
    await submitTaskAssist(activity.value.id, inviterId.value);
    message.success('🎉 助力成功！');
  } catch (e: any) {
    // 忽略重复助力等错误（唯一键约束），静默处理
    if (e?.message?.includes('Duplicate')) {
      // 已经助力过，无需提示
    } else if (e?.code !== 400) {
      // 非业务错误才提示
      console.warn('助力失败:', e?.message);
    }
  }
}

/**
 * Google 登录
 * state 格式: task|{shareCode}|{inviterId}
 * 回调后会自动恢复 inviter 信息并提交助力
 */
function handleGoogleLogin() {
  const clientId = '859983860673-o2uekrofrnke1luaclgenbqerglibuqo.apps.googleusercontent.com';
  const redirectUri = encodeURIComponent(`${window.location.origin}/share`);
  const scope = encodeURIComponent('openid email profile');
  // state 携带活动码和邀请人 ID，OAuth 回调后可恢复裂变关系
  const inviterPart = inviterId.value ? `|${inviterId.value}` : '';
  const state = `task|${shareCode.value}${inviterPart}`;
  const authUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}&access_type=offline&prompt=consent`;
  window.location.href = authUrl;
}

/** OAuth 回调处理 */
async function checkOAuthCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  if (code) {
    try {
      const redirectUri = `${window.location.origin}/share`;
      await googleOAuthCallback(code, redirectUri);
      // 从 state 恢复参数: task|shareCode|inviterId
      const stateParam = urlParams.get('state') || '';
      const parts = stateParam.split('|');
      const activityShareCode = parts.length > 1 ? parts[1] : stateParam;
      const inviterParam = parts.length > 2 ? parts[2] : undefined;

      const query: Record<string, string> = { type: 'task', id: activityShareCode! };
      if (inviterParam) query.inviter = inviterParam;

      await router.replace({ path: '/share', query });
    } catch {
      message.error('登录失败，请重试');
    }
    return;
  }
}

/**
 * 分享给好友 — 生成带有自己 userId 的裂变链接
 * 格式: /share?type=task&id={shareCode}&inviter={myUserId}
 */
function handleShare() {
  if (!session.value) {
    handleGoogleLogin();
    return;
  }
  const url = `${window.location.origin}/share?type=task&id=${shareCode.value}&inviter=${session.value.userId}`;
  navigator.clipboard.writeText(url);
  message.success('裂变链接已复制，分享给好友即可获得助力！');
}

function getStageProgress(stage: GrowthTaskShareApi.Stage) {
  if (!progressInfo.value) return 0;
  const count = progressInfo.value.inviteCount || 0;
  return Math.min(100, Math.round((count / stage.requiredInviteCount) * 100));
}

onMounted(async () => {
  await checkOAuthCallback();
  await loadData();
});
</script>

<template>
  <div class="task-page" :style="{ '--bg-color': bgColor }">
    <Spin :spinning="loading" tip="加载中...">
      <div v-if="activity" class="task-container">
        <!-- 头部 -->
        <div class="task-header" :style="{ background: `linear-gradient(180deg, ${bgColor}, ${bgColor}dd)` }">
          <div class="header-title">{{ title }}</div>
          <div class="header-subtitle">{{ activity.name }}</div>
        </div>

        <!-- 邀请进度 -->
        <div class="task-progress-card">
          <div class="progress-title">📊 我的邀请进度</div>
          <div class="progress-count">
            已邀请 <span class="count-num">{{ progressInfo?.inviteCount || 0 }}</span> 人
          </div>

          <!-- 多阶任务 -->
          <div v-if="activity.stages" class="stage-list">
            <div v-for="stage in activity.stages" :key="stage.id" class="stage-item">
              <div class="stage-header">
                <span class="stage-level">第{{ stage.stageLevel }}阶</span>
                <span class="stage-target">邀请{{ stage.requiredInviteCount }}人</span>
                <Tag v-if="progressInfo?.stageProgresses?.find((p) => p.stageId === stage.id)?.achieved" color="success">✅ 已达成</Tag>
              </div>
              <Progress
                :percent="getStageProgress(stage)"
                :strokeColor="bgColor"
                size="small"
              />
              <div class="stage-reward">🎁 {{ stage.rewardName }}</div>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="action-area">
          <Button v-if="session" type="primary" size="large" block class="share-btn" @click="handleShare">
            🔗 分享给好友（获得助力）
          </Button>
          <Button v-else type="primary" size="large" block @click="handleGoogleLogin">
            🔑 Sign in with Google
          </Button>
        </div>

        <!-- 排行榜 -->
        <div v-if="activity.enableRankReward === 1 && rankList.length" class="rank-section">
          <div class="section-title">🏆 邀请排行榜</div>
          <div class="rank-list">
            <div v-for="item in rankList" :key="item.rank" class="rank-item">
              <div class="rank-num" :class="{ 'top-3': item.rank <= 3 }">
                {{ item.rank <= 3 ? ['🥇','🥈','🥉'][item.rank - 1] : item.rank }}
              </div>
              <Avatar :src="item.userPicture" size="small" />
              <span class="rank-name">{{ item.userName || '匿名用户' }}</span>
              <span class="rank-count">{{ item.inviteCount }}人</span>
            </div>
          </div>
        </div>

        <!-- 活动规则 -->
        <div class="rules-section">
          <div class="section-title">📋 活动规则</div>
          <div class="rules-content" v-if="activity.rules">
            <p v-for="(line, idx) in activity.rules.split('\n')" :key="idx">{{ line }}</p>
          </div>
          <div class="rules-content" v-else>
            <p>1. 分享海报给好友</p>
            <p>2. 好友扫码助力</p>
            <p>3. 达到指定人数即可领取奖品</p>
          </div>
        </div>
      </div>

      <div v-else-if="!loading" class="not-found">
        <h2>活动不存在或已失效</h2>
      </div>
    </Spin>
  </div>
</template>

<style scoped>
.task-page { min-height: 100vh; background: #f5f5f5; font-family: 'Inter', sans-serif; }
.task-container { max-width: 430px; margin: 0 auto; padding-bottom: 24px; }
.task-header { text-align: center; padding: 40px 20px 50px; color: white; border-radius: 0 0 24px 24px; }
.header-title { font-size: 32px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.2); }
.header-subtitle { font-size: 14px; opacity: 0.9; margin-top: 4px; }
.task-progress-card { margin: -20px 16px 16px; background: white; border-radius: 16px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
.progress-title { font-size: 16px; font-weight: 600; margin-bottom: 8px; }
.progress-count { font-size: 14px; color: #666; margin-bottom: 16px; }
.count-num { font-size: 24px; font-weight: 700; color: var(--bg-color); margin: 0 4px; }
.stage-list { display: flex; flex-direction: column; gap: 12px; }
.stage-item { background: #f9f9f9; border-radius: 12px; padding: 12px; }
.stage-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.stage-level { font-weight: 600; color: var(--bg-color); }
.stage-target { font-size: 13px; color: #999; }
.stage-reward { font-size: 13px; color: #666; margin-top: 4px; }
.action-area { margin: 0 16px 16px; }
.share-btn { height: 48px; border-radius: 24px; font-size: 16px; font-weight: 600; background: var(--bg-color); border-color: var(--bg-color); }
.rank-section, .rules-section { margin: 0 16px 16px; background: rgba(0, 0, 0, 0.6); border-radius: 12px; padding: 16px; color: white; }
.section-title { text-align: center; font-weight: 700; font-size: 16px; margin-bottom: 12px; }
.rank-list { display: flex; flex-direction: column; gap: 8px; }
.rank-item { display: flex; align-items: center; gap: 8px; padding: 4px 0; }
.rank-num { width: 28px; text-align: center; font-weight: 700; }
.top-3 { font-size: 18px; }
.rank-name { flex: 1; font-size: 13px; }
.rank-count { font-size: 13px; color: #ffd700; font-weight: 600; }
.rules-content { font-size: 13px; line-height: 1.6; }
.rules-content p { margin: 2px 0; }
.not-found { text-align: center; padding: 80px 20px; color: #999; }
</style>
