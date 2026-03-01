import type { PageParam, PageResult } from '@vben/request';

import { requestClient } from '#/api/request';

export namespace GrowthTaskApi {
    /** 多阶任务 */
    export interface Stage {
        id?: number;
        stageLevel?: number;
        requiredInviteCount: number;
        rewardType?: number;
        rewardName: string;
        rewardImage?: string;
        rewardValue?: string;
        rewardQuantity?: number;
        awardedCount?: number;
    }

    /** 排行榜奖品 */
    export interface RankReward {
        id?: number;
        rankStart: number;
        rankEnd: number;
        rewardType?: number;
        rewardName: string;
        rewardImage?: string;
        rewardValue?: string;
    }

    /** 任务宝活动信息 */
    export interface Activity {
        id?: number;
        name: string;
        shareCode?: string;
        status?: number;
        description?: string;
        rules?: string;
        posterConfig?: Record<string, any>;
        styleConfig?: Record<string, any>;
        startTime?: string;
        endTime?: string;
        isLongTerm?: number;
        enableRankReward?: number;
        totalParticipants?: number;
        totalInvites?: number;
        createTime?: string;
        stages?: Stage[];
        rankRewards?: RankReward[];
    }

    /** 活动创建/更新请求 */
    export interface ActivitySaveReq {
        id?: number;
        name: string;
        description?: string;
        rules?: string;
        posterConfig?: Record<string, any>;
        styleConfig?: Record<string, any>;
        startTime?: string;
        endTime?: string;
        isLongTerm?: number;
        enableRankReward?: number;
        stages?: Stage[];
        rankRewards?: RankReward[];
    }
}

/** 查询任务宝活动分页 */
export function getTaskActivityPage(params: PageParam) {
    return requestClient.get<PageResult<GrowthTaskApi.Activity>>(
        '/growth/task-activity/page',
        { params },
    );
}

/** 查询任务宝活动详情 */
export function getTaskActivity(id: number) {
    return requestClient.get<GrowthTaskApi.Activity>(
        `/growth/task-activity/get?id=${id}`,
    );
}

/** 创建任务宝活动 */
export function createTaskActivity(data: GrowthTaskApi.ActivitySaveReq) {
    return requestClient.post('/growth/task-activity/create', data);
}

/** 更新任务宝活动 */
export function updateTaskActivity(data: GrowthTaskApi.ActivitySaveReq) {
    return requestClient.put('/growth/task-activity/update', data);
}

/** 删除任务宝活动 */
export function deleteTaskActivity(id: number) {
    return requestClient.delete(`/growth/task-activity/delete?id=${id}`);
}

/** 更新任务宝活动状态 */
export function updateTaskActivityStatus(id: number, status: number) {
    return requestClient.put(
        `/growth/task-activity/update-status?id=${id}&status=${status}`,
    );
}
