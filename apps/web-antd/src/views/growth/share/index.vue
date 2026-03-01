<script lang="ts" setup>
/**
 * 分享页分发组件
 * 根据 ?type 参数加载对应的分享页面：
 * - lottery (默认): 抽奖活动
 * - task: 任务宝活动
 *
 * OAuth 回调时通过 state 参数判断类型：
 * - state=shareCode → lottery (向后兼容)
 * - state=task|shareCode → task
 */
import { computed, defineAsyncComponent } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

// 判断活动类型：优先从 query.type 获取，其次从 OAuth state 参数推断
const activityType = computed(() => {
  if (route.query.type) return route.query.type as string;
  // OAuth 回调：检查 state 参数格式
  const state = route.query.state as string;
  if (state && state.startsWith('task|')) return 'task';
  return 'lottery';
});

const LotteryPage = defineAsyncComponent(() => import('./lottery.vue'));
const TaskPage = defineAsyncComponent(() => import('./task.vue'));

const currentComponent = computed(() => {
  switch (activityType.value) {
    case 'task':
      return TaskPage;
    default:
      return LotteryPage;
  }
});
</script>

<template>
  <component :is="currentComponent" />
</template>
