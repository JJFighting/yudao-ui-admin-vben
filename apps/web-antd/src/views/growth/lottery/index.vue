<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { GrowthLotteryApi } from '#/api/growth/lottery';

import { ref } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';

import { message, Modal } from 'ant-design-vue';

import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteLotteryActivity,
  getLotteryActivityPage,
  updateLotteryActivityStatus,
} from '#/api/growth/lottery';

import { useGridColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

/** 刷新表格 */
function handleRefresh() {
  gridApi.query();
}

/** 新建活动 */
function handleCreate() {
  formModalApi.setData(null).open();
}

/** 编辑活动 */
function handleEdit(row: GrowthLotteryApi.Activity) {
  formModalApi.setData(row).open();
}

/** 删除活动 */
function handleDelete(row: GrowthLotteryApi.Activity) {
  Modal.confirm({
    title: '确认删除',
    content: `确认删除活动「${row.name}」吗？`,
    async onOk() {
      await deleteLotteryActivity(row.id!);
      message.success('删除成功');
      handleRefresh();
    },
  });
}

/** 更新状态 */
async function handleUpdateStatus(row: GrowthLotteryApi.Activity, status: number) {
  await updateLotteryActivityStatus(row.id!, status);
  message.success('操作成功');
  handleRefresh();
}

/** 推广 - 复制分享链接 */
function handleCopyShareLink(row: GrowthLotteryApi.Activity) {
  const link = `${window.location.origin}/share/${row.shareCode}`;
  navigator.clipboard.writeText(link);
  message.success('分享链接已复制');
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useGridFormSchema(),
  },
  gridOptions: {
    columns: useGridColumns(),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          return await getLotteryActivityPage({
            pageNo: page.currentPage,
            pageSize: page.pageSize,
            ...formValues,
          });
        },
      },
    },
    rowConfig: {
      keyField: 'id',
      isHover: true,
    },
    toolbarConfig: {
      refresh: true,
      search: true,
    },
  } as VxeTableGridOptions<GrowthLotteryApi.Activity>,
});
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="handleRefresh" />
    <Grid table-title="抽奖活动">
      <template #toolbar-tools>
        <TableAction
          :actions="[
            {
              label: '新建抽奖活动',
              type: 'primary',
              icon: 'lucide:plus',
              auth: ['growth:lottery-activity:create'],
              onClick: handleCreate,
            },
          ]"
        />
      </template>

      <template #actions="{ row }">
        <TableAction
          :actions="[
            {
              label: '推广',
              type: 'link',
              icon: 'lucide:share-2',
              onClick: handleCopyShareLink.bind(null, row),
            },
          ]"
          :drop-down-actions="[
            {
              label: '编辑',
              type: 'link',
              auth: ['growth:lottery-activity:update'],
              onClick: handleEdit.bind(null, row),
            },
            {
              label: row.status === 1 ? '停止' : '启动',
              type: 'link',
              auth: ['growth:lottery-activity:update'],
              onClick: handleUpdateStatus.bind(null, row, row.status === 1 ? 2 : 1),
            },
            {
              label: '删除',
              type: 'link',
              danger: true,
              auth: ['growth:lottery-activity:delete'],
              onClick: handleDelete.bind(null, row),
            },
          ]"
        />
      </template>
    </Grid>
  </Page>
</template>
