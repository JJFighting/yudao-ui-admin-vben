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

export namespace GrowthLotteryShareApi {
    /** 分享页活动信息 */
    export interface Activity {
        id: number;
        name: string;
        shareCode: string;
        status: number;
        styleConfig?: Record<string, any>;
        ruleConfig?: Record<string, any>;
        startTime?: string;
        endTime?: string;
        isPermanent?: number;
        showCountdown?: number;
        showWinnerList?: number;
        showBrandLogo?: number;
        noPrizeName?: string;
        noPrizeImage?: string;
        participantCount?: number;
        winnerCount?: number;
        prizes?: Prize[];
    }

    export interface Prize {
        id: number;
        name: string;
        prizeType: number;
        image?: string;
        sort: number;
    }

    /** 抽奖结果 */
    export interface DrawResult {
        isWinner: number;
        prizeName: string;
        prizeId?: number;
        remainingCount: number;
    }

    /** 中奖记录 */
    export interface WinnerRecord {
        userName: string;
        userEmail: string;
        prizeName: string;
        createTime: string;
    }

    /** Google Session 信息 */
    export interface GoogleSession {
        userId: number;
        email: string;
        name: string;
        picture: string;
    }
}

/** 根据分享码获取活动信息 */
export function getActivityByCode(code: string) {
    return appRequestClient.get<GrowthLotteryShareApi.Activity>(
        `/growth/app/lottery/get-by-code?code=${code}`,
    );
}

/** 执行抽奖 */
export function drawLottery(activityId: number) {
    return appRequestClient.post<GrowthLotteryShareApi.DrawResult>(
        `/growth/app/lottery/draw?activityId=${activityId}`,
    );
}

/** 获取剩余抽奖次数 */
export function getRemainingCount(activityId: number) {
    return appRequestClient.get<number>(
        `/growth/app/lottery/remaining-count?activityId=${activityId}`,
    );
}

/** 获取中奖名单 */
export function getWinnerList(activityId: number, limit = 20) {
    return appRequestClient.get<GrowthLotteryShareApi.WinnerRecord[]>(
        `/growth/app/lottery/winners?activityId=${activityId}&limit=${limit}`,
    );
}

/** 获取 Google Session */
export function getGoogleSession() {
    return appRequestClient.get<GrowthLotteryShareApi.GoogleSession>(
        '/growth/app/auth/google/session',
    );
}

/** Google OAuth 回调 */
export function googleOAuthCallback(code: string, redirectUri: string) {
    return appRequestClient.post<Record<string, any>>(
        `/growth/app/auth/google/callback?code=${code}&redirectUri=${redirectUri}`,
    );
}

/** 登出 */
export function googleLogout() {
    return appRequestClient.post('/growth/app/auth/google/logout');
}
