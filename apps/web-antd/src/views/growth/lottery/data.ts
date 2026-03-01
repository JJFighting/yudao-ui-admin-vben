import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { h } from 'vue';

import { Tag } from 'ant-design-vue';

const statusMap: Record<number, { label: string; color: string }> = {
    0: { label: '草稿', color: 'default' },
    1: { label: '进行中', color: 'processing' },
    2: { label: '已结束', color: 'error' },
};

/** 列表的搜索表单 */
export function useGridFormSchema(): VbenFormSchema[] {
    return [
        {
            fieldName: 'name',
            label: '活动名称',
            component: 'Input',
            componentProps: {
                placeholder: '搜索活动名称',
                allowClear: true,
            },
        },
        {
            fieldName: 'status',
            label: '活动状态',
            component: 'Select',
            componentProps: {
                options: [
                    { label: '全部', value: undefined },
                    { label: '草稿', value: 0 },
                    { label: '进行中', value: 1 },
                    { label: '已结束', value: 2 },
                ],
                placeholder: '请选择状态',
                allowClear: true,
            },
        },
    ];
}

/** 列表的字段 */
export function useGridColumns(): VxeTableGridOptions['columns'] {
    return [
        {
            field: 'name',
            title: '活动名称',
            minWidth: 180,
        },
        {
            field: 'status',
            title: '活动状态',
            minWidth: 100,
            slots: {
                default: ({ row }) => {
                    const item = statusMap[row.status as number] || statusMap[0];
                    return h(Tag, { color: item?.color }, () => item?.label);
                },
            },
        },
        {
            field: 'participantWinner',
            title: '中奖人数/参与人数',
            minWidth: 140,
            slots: {
                default: ({ row }) => {
                    return `${row.totalWinners || 0}/${row.totalParticipants || 0}`;
                },
            },
        },
        {
            field: 'activityTime',
            title: '活动时间',
            minWidth: 300,
            slots: {
                default: ({ row }) => {
                    if (row.isLongTerm === 1) return '长期有效';
                    const start = row.startTime || '';
                    const end = row.endTime || '';
                    return `${start} 至 ${end}`;
                },
            },
        },
        {
            title: '操作',
            width: 200,
            fixed: 'right',
            slots: { default: 'actions' },
        },
    ];
}
