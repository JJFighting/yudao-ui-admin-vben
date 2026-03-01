<script lang="ts" setup>
import type { GrowthLotteryApi } from '#/api/growth/lottery';

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
  Slider,
  Space,
  Table,
  Popconfirm,
  message,
  Card,
  Row,
  Col,
  Radio,
} from 'ant-design-vue';


import {
  createLotteryActivity,
  updateLotteryActivity,
  getLotteryActivity,
} from '#/api/growth/lottery';

const emit = defineEmits<{ success: [] }>();

const [Modal, modalApi] = useVbenModal({
  async onOpenChange(isOpen: boolean) {
    if (!isOpen) return;
    const data = modalApi.getData<GrowthLotteryApi.Activity>();
    if (data?.id) {
      isEdit.value = true;
      modalTitle.value = '编辑抽奖活动';
      const detail = await getLotteryActivity(data.id);
      formData.value = {
        id: detail.id,
        name: detail.name || '',
        styleConfig: detail.styleConfig || defaultStyleConfig(),
        entryType: detail.entryType ?? 0,
        frequencyType: detail.frequencyType ?? 1,
        dailyDrawCount: detail.dailyDrawCount ?? 1,
        dailyShareExtraCount: detail.dailyShareExtraCount ?? 0,
        totalDrawCount: detail.totalDrawCount ?? 0,
        startTime: detail.startTime,
        endTime: detail.endTime,
        isLongTerm: detail.isLongTerm || 0,
        showCountdown: detail.showCountdown || 0,
        showWinnerList: detail.showWinnerList ?? 1,
        showBrandLogo: detail.showBrandLogo ?? 1,
        noPrizeName: detail.noPrizeName || '谢谢参与',
        noPrizeImage: detail.noPrizeImage || '',
        prizes: detail.prizes?.map((p) => ({ ...p })) || [],
      };
    } else {
      isEdit.value = false;
      modalTitle.value = '新建抽奖活动';
      formData.value = createDefaultFormData();
    }
    currentStep.value = 0;
  },
});

const isEdit = ref(false);
const modalTitle = ref('新建抽奖活动');
const currentStep = ref(0);
const loading = ref(false);

interface FormData {
  id?: number;
  name: string;
  styleConfig: Record<string, any>;
  entryType: number;
  frequencyType: number;
  dailyDrawCount: number;
  dailyShareExtraCount: number;
  totalDrawCount: number;
  startTime?: string;
  endTime?: string;
  isLongTerm: number;
  showCountdown: number;
  showWinnerList: number;
  showBrandLogo: number;
  noPrizeName: string;
  noPrizeImage: string;
  prizes: GrowthLotteryApi.Prize[];
}

function defaultStyleConfig() {
  return {
    title: 'Lucky Draw',
    titleSize: 100,
    subtitle: 'Grab your luck now!',
    subtitleSize: 100,
    bgStyle: 'color',
    bgColor: '#6C5CE7',
  };
}

function createDefaultFormData(): FormData {
  return {
    name: '',
    styleConfig: defaultStyleConfig(),
    entryType: 0,
    frequencyType: 1,
    dailyDrawCount: 1,
    dailyShareExtraCount: 0,
    totalDrawCount: 0,
    isLongTerm: 0,
    showCountdown: 0,
    showWinnerList: 1,
    showBrandLogo: 1,
    noPrizeName: '谢谢参与',
    noPrizeImage: '',
    prizes: [],
  };
}

const formData = ref<FormData>(createDefaultFormData());

const steps = [
  { title: '编辑抽奖样式' },
  { title: '奖品设置' },
  { title: '编辑抽奖规则' },
];

function handleNext() {
  if (currentStep.value < 2) {
    currentStep.value++;
  }
}

function handlePrev() {
  if (currentStep.value > 0) {
    currentStep.value--;
  }
}

function handleAddPrize() {
  if (formData.value.prizes.length >= 8) {
    message.warning('最多添加8个奖品');
    return;
  }
  formData.value.prizes.push({
    name: '奖品',
    prizeType: 1,
    image: '',
    quantity: 1,
    probability: 50,
    sort: formData.value.prizes.length + 1,
  });
}

function handleRemovePrize(index: number) {
  formData.value.prizes.splice(index, 1);
}

function handleCopyPrize(index: number) {
  if (formData.value.prizes.length >= 8) {
    message.warning('最多添加8个奖品');
    return;
  }
  const copy = { ...formData.value.prizes[index]! };
  delete copy.id;
  copy.name = copy.name || '奖品';
  copy.sort = formData.value.prizes.length + 1;
  formData.value.prizes.push(copy);
}

async function handleSave() {
  try {
    loading.value = true;
    const data: GrowthLotteryApi.ActivitySaveReq = {
      ...formData.value,
    };
    if (isEdit.value) {
      await updateLotteryActivity(data);
      message.success('更新成功');
    } else {
      await createLotteryActivity(data);
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

const prizeTypeOptions = [
  { label: '奖金', value: 1 },
  { label: '优惠券', value: 2 },
  { label: '实物', value: 3 },
  { label: '积分', value: 4 },
];

const prizeColumns = [
  { title: '序号', dataIndex: 'sort', width: 60 },
  { title: '奖品名称', dataIndex: 'name', width: 150 },
  { title: '奖品类型', dataIndex: 'prizeType', width: 100 },
  { title: '数量', dataIndex: 'quantity', width: 100 },
  { title: '中奖概率', dataIndex: 'probability', width: 130 },
  { title: '操作', key: 'action', width: 150 },
];


</script>

<template>
  <Modal :title="modalTitle" class="w-[900px]" :footer="false">
    <Steps :current="currentStep" :items="steps" class="mb-6" />

    <!-- 步骤 1: 编辑抽奖样式 -->
    <div v-show="currentStep === 0">
      <Row :gutter="24">
        <Col :span="14">
          <Card title="活动预览" size="small">
            <div
              class="lottery-preview"
              :style="{ backgroundColor: formData.styleConfig.bgColor || '#6C5CE7' }"
            >
              <div class="preview-title" :style="{ fontSize: (formData.styleConfig.titleSize / 100 * 32) + 'px' }">
                {{ formData.styleConfig.title || 'Lucky Draw' }}
              </div>
              <div class="preview-subtitle" :style="{ fontSize: (formData.styleConfig.subtitleSize / 100 * 14) + 'px' }">
                {{ formData.styleConfig.subtitle || 'Grab your luck now!' }}
              </div>
              <div class="preview-grid">
                <div v-for="i in 9" :key="i" class="grid-item" :class="{ 'go-btn': i === 5 }">
                  {{ i === 5 ? 'GO' : (formData.prizes[i > 5 ? i - 2 : i - 1]?.name || '奖品') }}
                </div>
              </div>
            </div>
          </Card>
        </Col>
        <Col :span="10">
          <Form layout="vertical">
            <FormItem label="标题">
              <Input v-model:value="formData.styleConfig.title" placeholder="Lucky Draw" />
            </FormItem>
            <FormItem label="标题大小">
              <Slider v-model:value="formData.styleConfig.titleSize" :min="50" :max="200" />
            </FormItem>
            <FormItem label="副标题">
              <Input v-model:value="formData.styleConfig.subtitle" placeholder="Grab your luck now!" />
            </FormItem>
            <FormItem label="副标题大小">
              <Slider v-model:value="formData.styleConfig.subtitleSize" :min="50" :max="200" />
            </FormItem>
            <FormItem>
              <Checkbox :checked="formData.showWinnerList === 1" @update:checked="(v: boolean) => formData.showWinnerList = v ? 1 : 0">显示中奖名单</Checkbox>
            </FormItem>
            <FormItem>
              <Checkbox :checked="formData.showBrandLogo === 1" @update:checked="(v: boolean) => formData.showBrandLogo = v ? 1 : 0">显示品牌logo</Checkbox>
            </FormItem>
            <FormItem label="背景颜色">
              <Input v-model:value="formData.styleConfig.bgColor" type="color" style="width: 60px; height: 32px;" />
            </FormItem>
          </Form>
        </Col>
      </Row>
    </div>

    <!-- 步骤 2: 奖品设置 -->
    <div v-show="currentStep === 1">
      <Card title="奖品设置" size="small" class="mb-4">
        <Table :dataSource="formData.prizes" :columns="prizeColumns" :pagination="false" rowKey="sort" size="small">
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.dataIndex === 'sort'">{{ index + 1 }}</template>
            <template v-if="column.dataIndex === 'name'">
              <Input v-model:value="record.name" placeholder="奖品名称" size="small" />
            </template>
            <template v-if="column.dataIndex === 'prizeType'">
              <Select v-model:value="record.prizeType" :options="prizeTypeOptions" size="small" style="width: 90px" />
            </template>
            <template v-if="column.dataIndex === 'quantity'">
              <InputNumber v-model:value="record.quantity" :min="0" size="small" style="width: 80px" />
            </template>
            <template v-if="column.dataIndex === 'probability'">
              <Space>
                <InputNumber v-model:value="record.probability" :min="0" :max="100" :precision="2" size="small" style="width: 80px" />
                <span>%</span>
              </Space>
            </template>
            <template v-if="column.key === 'action'">
              <Space>
                <a @click="handleCopyPrize(index)">复制</a>
                <Popconfirm title="确定删除？" @confirm="handleRemovePrize(index)">
                  <a class="text-red-500">删除</a>
                </Popconfirm>
              </Space>
            </template>
          </template>
        </Table>
        <Button type="dashed" block class="mt-3" @click="handleAddPrize">
          + 添加奖品 ({{ formData.prizes.length }}/8)
        </Button>
      </Card>

      <Card title="未中奖设置" size="small">
        <FormItem label="名称">
          <Input v-model:value="formData.noPrizeName" placeholder="谢谢参与" style="width: 250px" />
        </FormItem>
      </Card>
    </div>

    <!-- 步骤 3: 编辑抽奖规则 -->
    <div v-show="currentStep === 2">
      <Row :gutter="24">
        <Col :span="14">
          <Card title="基本信息" size="small" class="mb-4">
            <Form layout="vertical">
              <FormItem label="活动名称" required>
                <Input v-model:value="formData.name" placeholder="请输入活动名称" />
              </FormItem>
              <FormItem label="参与门槛">
                <Radio.Group v-model:value="formData.entryType">
                  <Radio :value="0">订阅抽奖：提交邮箱发起抽奖</Radio>
                  <br />
                  <Radio :value="1">登录抽奖：必须登录才可抽奖</Radio>
                </Radio.Group>
              </FormItem>
              <FormItem label="参与次数">
                <Radio.Group v-model:value="formData.frequencyType">
                  <div>
                    <Radio :value="1">一天N次</Radio>
                    <div v-if="formData.frequencyType === 1" class="ml-6 mt-1">
                      <Space>每人每天抽 <InputNumber v-model:value="formData.dailyDrawCount" :min="1" size="small" style="width: 60px" /> 次</Space>
                      <br />
                      <Space class="mt-1">每天分享最多额外抽 <InputNumber v-model:value="formData.dailyShareExtraCount" :min="0" size="small" style="width: 60px" /> 次</Space>
                    </div>
                  </div>
                  <Radio :value="2">一人N次</Radio>
                  <div v-if="formData.frequencyType === 2" class="ml-6 mt-1">
                    <Space>每人总共可抽 <InputNumber v-model:value="formData.totalDrawCount" :min="1" size="small" style="width: 60px" /> 次</Space>
                  </div>
                </Radio.Group>
              </FormItem>
            </Form>
          </Card>

          <Card title="抽奖活动时间" size="small">
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
                <Checkbox :checked="formData.isLongTerm === 1" @update:checked="(v: boolean) => formData.isLongTerm = v ? 1 : 0">长期</Checkbox>
              </FormItem>
              <FormItem>
                <Checkbox :checked="formData.showCountdown === 1" @update:checked="(v: boolean) => formData.showCountdown = v ? 1 : 0">展示倒计时</Checkbox>
              </FormItem>
            </Form>
          </Card>
        </Col>
        <Col :span="10">
          <Card title="抽奖规则" size="small">
            <ul class="rule-preview">
              <li>{{ formData.entryType === 0 ? '订阅后即可获得抽奖机会' : '登录后即可获得抽奖机会' }}</li>
              <li v-if="formData.frequencyType === 1">
                每天可抽奖{{ formData.dailyDrawCount }}次
              </li>
              <li v-else>
                总共可抽奖{{ formData.totalDrawCount }}次
              </li>
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
      <Button v-if="currentStep < 2" type="primary" @click="handleNext">下一步</Button>
      <Button v-if="currentStep === 2" type="primary" :loading="loading" @click="handleSave">保存</Button>
    </div>
  </Modal>
</template>

<style scoped>
.lottery-preview {
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  color: white;
  min-height: 300px;
}
.preview-title {
  font-size: 32px;
  font-weight: bold;
  margin-bottom: 4px;
}
.preview-subtitle {
  font-size: 14px;
  margin-bottom: 16px;
  opacity: 0.9;
}
.preview-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  max-width: 220px;
  margin: 0 auto;
}
.grid-item {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 12px 4px;
  font-size: 12px;
  text-align: center;
}
.go-btn {
  background: linear-gradient(135deg, #ff6b35, #f7c431);
  font-weight: bold;
  font-size: 16px;
}
.rule-preview {
  padding-left: 16px;
}
.rule-preview li {
  margin-bottom: 4px;
}
</style>
