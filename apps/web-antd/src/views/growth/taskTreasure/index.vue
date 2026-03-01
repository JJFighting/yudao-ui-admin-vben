<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { GrowthTaskApi } from '#/api/growth/taskTreasure';

import { Page, useVbenModal } from '@vben/common-ui';

import { message, Modal } from 'ant-design-vue';

import { TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteTaskActivity,
  getTaskActivityPage,
  updateTaskActivityStatus,
} from '#/api/growth/taskTreasure';

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
function handleEdit(row: GrowthTaskApi.Activity) {
  formModalApi.setData(row).open();
}

/** 删除活动 */
function handleDelete(row: GrowthTaskApi.Activity) {
  Modal.confirm({
    title: '确认删除',
    content: `确认删除任务宝活动「${row.name}」吗？`,
    async onOk() {
      await deleteTaskActivity(row.id!);
      message.success('删除成功');
      handleRefresh();
    },
  });
}

/** 更新状态 */
async function handleUpdateStatus(row: GrowthTaskApi.Activity, status: number) {
  await updateTaskActivityStatus(row.id!, status);
  message.success('操作成功');
  handleRefresh();
}

/** 推广 - 复制分享链接 */
function handleCopyShareLink(row: GrowthTaskApi.Activity) {
  const link = `${window.location.origin}/share?type=task&id=${row.shareCode}`;
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
          return await getTaskActivityPage({
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
  } as VxeTableGridOptions<GrowthTaskApi.Activity>,
});
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="handleRefresh" />
    <Grid table-title="任务宝活动">
      <template #toolbar-tools>
        <TableAction
          :actions="[
            {
              label: '新建任务宝活动',
              type: 'primary',
              icon: 'lucide:plus',
              auth: ['growth:task-activity:create'],
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
              auth: ['growth:task-activity:update'],
              onClick: handleEdit.bind(null, row),
            },
            {
              label: row.status === 1 ? '停止' : '启动',
              type: 'link',
              auth: ['growth:task-activity:update'],
              onClick: handleUpdateStatus.bind(null, row, row.status === 1 ? 2 : 1),
            },
            {
              label: '删除',
              type: 'link',
              danger: true,
              auth: ['growth:task-activity:delete'],
              onClick: handleDelete.bind(null, row),
            },
          ]"
        />
      </template>
    </Grid>
  </Page>
</template>
