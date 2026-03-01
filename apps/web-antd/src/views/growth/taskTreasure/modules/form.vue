<script lang="ts" setup>
import type { GrowthTaskApi } from '#/api/growth/taskTreasure';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import {
  Button,
  Steps,
  Form,
  FormItem,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Checkbox,
  Space,
  Table,
  Popconfirm,
  message,
  Card,
  Row,
  Col,
  Textarea,
} from 'ant-design-vue';

import {
  createTaskActivity,
  updateTaskActivity,
  getTaskActivity,
} from '#/api/growth/taskTreasure';

const emit = defineEmits<{ success: [] }>();

const [Modal, modalApi] = useVbenModal({
  async onOpenChange(isOpen: boolean) {
    if (!isOpen) return;
    const data = modalApi.getData<GrowthTaskApi.Activity>();
    if (data?.id) {
      isEdit.value = true;
      modalTitle.value = '编辑任务宝活动';
      const detail = await getTaskActivity(data.id);
      formData.value = {
        id: detail.id,
        name: detail.name || '',
        description: detail.description || '',
        rules: detail.rules || '',
        posterConfig: detail.posterConfig || defaultPosterConfig(),
        styleConfig: detail.styleConfig || defaultStyleConfig(),
        startTime: detail.startTime,
        endTime: detail.endTime,
        isLongTerm: detail.isLongTerm || 0,
        enableRankReward: detail.enableRankReward || 0,
        stages: detail.stages?.map((s) => ({ ...s })) || [],
        rankRewards: detail.rankRewards?.map((r) => ({ ...r })) || [],
      };
    } else {
      isEdit.value = false;
      modalTitle.value = '新建任务宝活动';
      formData.value = createDefaultFormData();
    }
    currentStep.value = 0;
  },
});

const isEdit = ref(false);
const modalTitle = ref('新建任务宝活动');
const currentStep = ref(0);
const loading = ref(false);

interface FormData {
  id?: number;
  name: string;
  description: string;
  rules: string;
  posterConfig: Record<string, any>;
  styleConfig: Record<string, any>;
  startTime?: string;
  endTime?: string;
  isLongTerm: number;
  enableRankReward: number;
  stages: GrowthTaskApi.Stage[];
  rankRewards: GrowthTaskApi.RankReward[];
}

function defaultPosterConfig() {
  return {
    bgImage: '',
    avatarX: 50,
    avatarY: 50,
    qrcodeX: 50,
    qrcodeY: 80,
  };
}

function defaultStyleConfig() {
  return {
    title: '邀请好友助力',
    bgColor: '#FF6B35',
  };
}

function createDefaultFormData(): FormData {
  return {
    name: '',
    description: '',
    rules: '1. 分享海报给好友\n2. 好友扫码助力\n3. 达到指定人数领取奖品',
    posterConfig: defaultPosterConfig(),
    styleConfig: defaultStyleConfig(),
    isLongTerm: 0,
    enableRankReward: 0,
    stages: [
      { stageLevel: 1, requiredInviteCount: 3, rewardType: 1, rewardName: '小礼品' },
      { stageLevel: 2, requiredInviteCount: 5, rewardType: 1, rewardName: '大礼品' },
    ],
    rankRewards: [],
  };
}

const formData = ref<FormData>(createDefaultFormData());

const steps = [
  { title: '基本设置' },
  { title: '多阶任务' },
  { title: '排行榜奖品' },
  { title: '活动时间' },
];

function handleNext() {
  if (currentStep.value < steps.length - 1) {
    currentStep.value++;
  }
}

function handlePrev() {
  if (currentStep.value > 0) {
    currentStep.value--;
  }
}

// ===== 阶段管理 =====
function handleAddStage() {
  const nextLevel = formData.value.stages.length + 1;
  formData.value.stages.push({
    stageLevel: nextLevel,
    requiredInviteCount: nextLevel * 3,
    rewardType: 1,
    rewardName: '',
  });
}

function handleRemoveStage(index: number) {
  formData.value.stages.splice(index, 1);
  // 重新排序
  formData.value.stages.forEach((s, i) => (s.stageLevel = i + 1));
}

// ===== 排行榜奖品管理 =====
function handleAddRankReward() {
  formData.value.rankRewards.push({
    rankStart: 1,
    rankEnd: 1,
    rewardType: 1,
    rewardName: '',
  });
}

function handleRemoveRankReward(index: number) {
  formData.value.rankRewards.splice(index, 1);
}

const rewardTypeOptions = [
  { label: '实物', value: 1 },
  { label: '优惠券', value: 2 },
  { label: '红包', value: 3 },
  { label: '积分', value: 4 },
];

const stageColumns = [
  { title: '阶段', dataIndex: 'stageLevel', width: 60 },
  { title: '邀请人数', dataIndex: 'requiredInviteCount', width: 100 },
  { title: '奖品类型', dataIndex: 'rewardType', width: 100 },
  { title: '奖品名称', dataIndex: 'rewardName', width: 150 },
  { title: '奖品数量', dataIndex: 'rewardQuantity', width: 100 },
  { title: '操作', key: 'action', width: 80 },
];

const rankRewardColumns = [
  { title: '排名起始', dataIndex: 'rankStart', width: 100 },
  { title: '排名结束', dataIndex: 'rankEnd', width: 100 },
  { title: '奖品类型', dataIndex: 'rewardType', width: 100 },
  { title: '奖品名称', dataIndex: 'rewardName', width: 150 },
  { title: '操作', key: 'action', width: 80 },
];

async function handleSave() {
  if (!formData.value.name) {
    message.warning('请输入活动名称');
    return;
  }
  if (formData.value.stages.length === 0) {
    message.warning('请至少添加一个任务阶段');
    return;
  }
  try {
    loading.value = true;
    const data: GrowthTaskApi.ActivitySaveReq = {
      ...formData.value,
    };
    if (isEdit.value) {
      await updateTaskActivity(data);
      message.success('更新成功');
    } else {
      await createTaskActivity(data);
      message.success('创建成功');
    }
    emit('success');
    modalApi.close();
  } catch (e: any) {
    message.error(e?.message || '保存失败');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <Modal :title="modalTitle" class="w-[900px]" :footer="false">
    <Steps :current="currentStep" :items="steps" class="mb-6" />

    <!-- 步骤 1: 基本设置 -->
    <div v-show="currentStep === 0">
      <Card title="活动信息" size="small" class="mb-4">
        <Form layout="vertical">
          <FormItem label="活动名称" required>
            <Input v-model:value="formData.name" placeholder="请输入活动名称" />
          </FormItem>
          <FormItem label="活动描述">
            <Textarea v-model:value="formData.description" placeholder="请输入活动描述" :rows="3" />
          </FormItem>
          <FormItem label="活动规则">
            <Textarea v-model:value="formData.rules" placeholder="请输入活动规则" :rows="4" />
          </FormItem>
        </Form>
      </Card>

      <Card title="样式设置" size="small">
        <Form layout="vertical">
          <Row :gutter="16">
            <Col :span="12">
              <FormItem label="活动标题">
                <Input v-model:value="formData.styleConfig.title" placeholder="邀请好友助力" />
              </FormItem>
            </Col>
            <Col :span="12">
              <FormItem label="背景颜色">
                <Input v-model:value="formData.styleConfig.bgColor" type="color" style="width: 60px; height: 32px;" />
              </FormItem>
            </Col>
          </Row>
        </Form>
      </Card>
    </div>

    <!-- 步骤 2: 多阶任务 -->
    <div v-show="currentStep === 1">
      <Card title="多阶任务配置" size="small" class="mb-4">
        <template #extra>
          <span class="text-gray-500 text-sm">阶位越高，奖励越丰厚</span>
        </template>
        <Table :dataSource="formData.stages" :columns="stageColumns" :pagination="false" rowKey="stageLevel" size="small">
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.dataIndex === 'stageLevel'">
              <span class="font-bold">第{{ record.stageLevel }}阶</span>
            </template>
            <template v-if="column.dataIndex === 'requiredInviteCount'">
              <InputNumber v-model:value="record.requiredInviteCount" :min="1" size="small" style="width: 80px" />
            </template>
            <template v-if="column.dataIndex === 'rewardType'">
              <Select v-model:value="record.rewardType" :options="rewardTypeOptions" size="small" style="width: 90px" />
            </template>
            <template v-if="column.dataIndex === 'rewardName'">
              <Input v-model:value="record.rewardName" placeholder="奖品名称" size="small" />
            </template>
            <template v-if="column.dataIndex === 'rewardQuantity'">
              <InputNumber v-model:value="record.rewardQuantity" :min="0" size="small" style="width: 80px" />
            </template>
            <template v-if="column.key === 'action'">
              <Popconfirm title="确定删除？" @confirm="handleRemoveStage(index)">
                <a class="text-red-500">删除</a>
              </Popconfirm>
            </template>
          </template>
        </Table>
        <Button type="dashed" block class="mt-3" @click="handleAddStage">
          + 添加阶段 ({{ formData.stages.length }})
        </Button>
      </Card>
    </div>

    <!-- 步骤 3: 排行榜奖品 -->
    <div v-show="currentStep === 2">
      <Card title="排行榜奖品" size="small" class="mb-4">
        <template #extra>
          <Checkbox :checked="formData.enableRankReward === 1" @update:checked="(v: boolean) => formData.enableRankReward = v ? 1 : 0">
            开启排行榜奖品
          </Checkbox>
        </template>
        <div v-if="formData.enableRankReward === 1">
          <Table :dataSource="formData.rankRewards" :columns="rankRewardColumns" :pagination="false" size="small">
            <template #bodyCell="{ column, record, index }">
              <template v-if="column.dataIndex === 'rankStart'">
                <InputNumber v-model:value="record.rankStart" :min="1" size="small" style="width: 80px" />
              </template>
              <template v-if="column.dataIndex === 'rankEnd'">
                <InputNumber v-model:value="record.rankEnd" :min="1" size="small" style="width: 80px" />
              </template>
              <template v-if="column.dataIndex === 'rewardType'">
                <Select v-model:value="record.rewardType" :options="rewardTypeOptions" size="small" style="width: 90px" />
              </template>
              <template v-if="column.dataIndex === 'rewardName'">
                <Input v-model:value="record.rewardName" placeholder="奖品名称" size="small" />
              </template>
              <template v-if="column.key === 'action'">
                <Popconfirm title="确定删除？" @confirm="handleRemoveRankReward(index)">
                  <a class="text-red-500">删除</a>
                </Popconfirm>
              </template>
            </template>
          </Table>
          <Button type="dashed" block class="mt-3" @click="handleAddRankReward">
            + 添加排行榜奖品
          </Button>
        </div>
        <div v-else class="text-center text-gray-400 py-6">
          请勾选"开启排行榜奖品"后进行配置
        </div>
      </Card>
    </div>

    <!-- 步骤 4: 活动时间 -->
    <div v-show="currentStep === 3">
      <Row :gutter="24">
        <Col :span="14">
          <Card title="活动时间" size="small" class="mb-4">
            <Form layout="vertical">
              <Row :gutter="16">
                <Col :span="12">
                  <FormItem label="开始时间">
                    <DatePicker v-model:value="formData.startTime" show-time placeholder="选择开始时间" style="width: 100%" valueFormat="YYYY-MM-DD HH:mm:ss" />
                  </FormItem>
                </Col>
                <Col :span="12">
                  <FormItem label="结束时间">
                    <DatePicker v-model:value="formData.endTime" show-time placeholder="选择结束时间" style="width: 100%" valueFormat="YYYY-MM-DD HH:mm:ss" />
                  </FormItem>
                </Col>
              </Row>
              <FormItem>
                <Checkbox :checked="formData.isLongTerm === 1" @update:checked="(v: boolean) => formData.isLongTerm = v ? 1 : 0">长期有效</Checkbox>
              </FormItem>
            </Form>
          </Card>
        </Col>
        <Col :span="10">
          <Card title="活动规则预览" size="small">
            <ul class="rule-preview">
              <li>分享海报给好友，好友扫码即可助力</li>
              <li v-for="stage in formData.stages" :key="stage.stageLevel">
                邀请{{ stage.requiredInviteCount }}人可获得「{{ stage.rewardName || '奖品' }}」
              </li>
              <li v-if="formData.enableRankReward === 1">根据邀请人数排名，可获得额外奖品</li>
            </ul>
            <div class="mt-3 font-bold">活动时间</div>
            <ul>
              <li v-if="formData.isLongTerm === 1">长期有效</li>
              <li v-else>{{ formData.startTime || '未设置' }} 至 {{ formData.endTime || '未设置' }}</li>
            </ul>
          </Card>
        </Col>
      </Row>
    </div>

    <!-- 底部按钮 -->
    <div class="flex justify-end mt-4 gap-2">
      <Button @click="modalApi.close()">取消</Button>
      <Button v-if="currentStep > 0" @click="handlePrev">上一步</Button>
      <Button v-if="currentStep < steps.length - 1" type="primary" @click="handleNext">下一步</Button>
      <Button v-if="currentStep === steps.length - 1" type="primary" :loading="loading" @click="handleSave">保存</Button>
    </div>
  </Modal>
</template>

<style scoped>
.rule-preview {
  padding-left: 16px;
}
.rule-preview li {
  margin-bottom: 4px;
}
</style>
