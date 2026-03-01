import type { PageParam, PageResult } from '@vben/request';

import { requestClient } from '#/api/request';

export namespace GrowthLotteryApi {
  /** 抽奖活动信息 */
  export interface Activity {
    id?: number;
    name: string;
    shareCode?: string;
    status?: number;
    styleConfig?: Record<string, any>;
    entryType?: number;
    frequencyType?: number;
    dailyDrawCount?: number;
    dailyShareExtraCount?: number;
    totalDrawCount?: number;
    startTime?: string;
    endTime?: string;
    isLongTerm?: number;
    showCountdown?: number;
    showWinnerList?: number;
    showBrandLogo?: number;
    noPrizeName?: string;
    noPrizeImage?: string;
    totalParticipants?: number;
    totalWinners?: number;
    createTime?: string;
    prizes?: Prize[];
  }

  /** 奖品信息 */
  export interface Prize {
    id?: number;
    name: string;
    prizeType?: number;
    image?: string;
    quantity?: number;
    awardedCount?: number;
    probability?: number;
    prizeValue?: string;
    sort?: number;
  }

  /** 活动创建/更新请求 */
  export interface ActivitySaveReq {
    id?: number;
    name: string;
    styleConfig?: Record<string, any>;
    entryType?: number;
    frequencyType?: string;
    dailyDrawCount?: number;
    dailyShareExtraCount?: number;
    totalDrawCount?: number;
    startTime?: string;
    endTime?: string;
    isLongTerm?: number;
    showCountdown?: number;
    showWinnerList?: number;
    showBrandLogo?: number;
    noPrizeName?: string;
    noPrizeImage?: string;
    prizes?: Prize[];
  }
}

/** 查询抽奖活动分页 */
export function getLotteryActivityPage(params: PageParam) {
  return requestClient.get<PageResult<GrowthLotteryApi.Activity>>(
    '/growth/lottery-activity/page',
    { params },
  );
}

/** 查询抽奖活动详情 */
export function getLotteryActivity(id: number) {
  return requestClient.get<GrowthLotteryApi.Activity>(
    `/growth/lottery-activity/get?id=${id}`,
  );
}

/** 创建抽奖活动 */
export function createLotteryActivity(data: GrowthLotteryApi.ActivitySaveReq) {
  return requestClient.post('/growth/lottery-activity/create', data);
}

/** 更新抽奖活动 */
export function updateLotteryActivity(data: GrowthLotteryApi.ActivitySaveReq) {
  return requestClient.put('/growth/lottery-activity/update', data);
}

/** 删除抽奖活动 */
export function deleteLotteryActivity(id: number) {
  return requestClient.delete(`/growth/lottery-activity/delete?id=${id}`);
}

/** 更新抽奖活动状态 */
export function updateLotteryActivityStatus(id: number, status: number) {
  return requestClient.put(
    `/growth/lottery-activity/update-status?id=${id}&status=${status}`,
  );
}
