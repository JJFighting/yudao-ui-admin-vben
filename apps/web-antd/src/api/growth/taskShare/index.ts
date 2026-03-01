import { defaultResponseInterceptor, RequestClient } from '@vben/request';

// 分享页使用独立的 App API 客户端（/app-api 前缀，对应芋道 app 包 Controller）
const appRequestClient = new RequestClient({
    baseURL: '/app-api',
    responseReturn: 'data',
});

// 添加 tenant-id 请求头
appRequestClient.addRequestInterceptor({
    fulfilled: (config) => {
        config.headers['tenant-id'] = '1';
        return config;
    },
});

// 解包响应数据（code=0 表示成功，提取 data 字段）
appRequestClient.addResponseInterceptor(
    defaultResponseInterceptor({
        codeField: 'code',
        dataField: 'data',
        successCode: 0,
    }),
);

export namespace GrowthTaskShareApi {
    /** 分享页活动信息 */
    export interface Activity {
        id: number;
        name: string;
        shareCode: string;
        status: number;
        description?: string;
        rules?: string;
        posterConfig?: Record<string, any>;
        styleConfig?: Record<string, any>;
        startTime?: string;
        endTime?: string;
        isLongTerm?: number;
        enableRankReward?: number;
        totalParticipants?: number;
        stages?: Stage[];
    }

    export interface Stage {
        id: number;
        stageLevel: number;
        requiredInviteCount: number;
        rewardName: string;
        rewardImage?: string;
    }

    export interface StageProgress {
        stageId: number;
        stageLevel: number;
        requiredInviteCount: number;
        rewardName: string;
        achieved: boolean;
        rewardStatus?: number;
    }

    export interface ProgressInfo {
        inviteCount: number;
        stageProgresses: StageProgress[];
    }

    export interface RankItem {
        rank: number;
        userId: number;
        userName: string;
        userPicture?: string;
        inviteCount: number;
    }

    export interface GoogleSession {
        userId: number;
        email: string;
        name: string;
        picture: string;
    }
}

/** 根据分享码获取任务宝活动信息 */
export function getTaskActivityByCode(code: string) {
    return appRequestClient.get<GrowthTaskShareApi.Activity>(
        `/growth/app/task/get-by-code?code=${code}`,
    );
}

/** 提交助力 */
export function submitTaskAssist(activityId: number, inviterId: number) {
    return appRequestClient.post<boolean>(
        `/growth/app/task/assist?activityId=${activityId}&inviterId=${inviterId}`,
    );
}

/** 查看我的进度 */
export function getTaskProgress(activityId: number) {
    return appRequestClient.get<GrowthTaskShareApi.ProgressInfo>(
        `/growth/app/task/progress?activityId=${activityId}`,
    );
}

/** 查看排行榜 */
export function getTaskRankList(activityId: number, limit = 20) {
    return appRequestClient.get<GrowthTaskShareApi.RankItem[]>(
        `/growth/app/task/rank?activityId=${activityId}&limit=${limit}`,
    );
}

/** 获取 Google Session（复用 lottery 的 auth 端点） */
export function getGoogleSession() {
    return appRequestClient.get<GrowthTaskShareApi.GoogleSession>(
        '/growth/app/auth/google/session',
    );
}

/** Google OAuth 回调 */
export function googleOAuthCallback(code: string, redirectUri: string) {
    return appRequestClient.post<Record<string, any>>(
        `/growth/app/auth/google/callback?code=${code}&redirectUri=${redirectUri}`,
    );
}
