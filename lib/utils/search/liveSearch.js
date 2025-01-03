"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchLive = void 0;
const axios_1 = __importDefault(require("axios"));
const api_1 = require("../../constants/api");
const params_1 = require("../../constants/params");
const socks_proxy_agent_1 = require("socks-proxy-agent");
const https_proxy_agent_1 = require("https-proxy-agent");
const SearchLive = async (keyword, cookie, page = 1, proxy) => new Promise(async (resolve) => {
    if (!cookie) {
        return resolve({
            status: "error",
            message: "Cookie is required!"
        });
    }
    (0, axios_1.default)((0, api_1._tiktokSearchLiveFull)((0, params_1._liveSearchParams)(keyword, page)), {
        method: "GET",
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0",
            cookie: typeof cookie === "object"
                ? cookie.map((v) => `${v.name}=${v.value}`).join("; ")
                : cookie
        },
        httpsAgent: (proxy &&
            (proxy.startsWith("http") || proxy.startsWith("https")
                ? new https_proxy_agent_1.HttpsProxyAgent(proxy)
                : proxy.startsWith("socks")
                    ? new socks_proxy_agent_1.SocksProxyAgent(proxy)
                    : undefined)) ||
            undefined
    })
        .then(({ data }) => {
        if (data.status_code === 2483)
            return resolve({ status: "error", message: "Invalid cookie!" });
        if (data.status_code !== 0)
            return resolve({
                status: "error",
                message: data.status_msg ||
                    "An error occurred! Please report this issue to the developer."
            });
        if (!data.data)
            return resolve({ status: "error", message: "Live not found!" });
        const result = [];
        data.data.forEach((v) => {
            const content = JSON.parse(v.live_info.raw_data);
            const liveInfo = {
                id: content.id,
                title: content.title,
                cover: content.cover?.url_list || [],
                squareCover: content.square_cover_img?.url_list || [],
                rectangleCover: content.rectangle_cover_img?.url_list || [],
                liveTypeThirdParty: content.live_type_third_party,
                hashtag: content.hashtag?.title || "",
                startTime: content.start_time,
                stats: {
                    totalUser: content.stats.total_user,
                    viewerCount: content.user_count,
                    likeCount: content.like_count
                },
                owner: {
                    uid: content.owner.id,
                    nickname: content.owner.nickname,
                    username: content.owner.display_id,
                    signature: content.owner.bio_description,
                    avatarThumb: content.owner.avatar_thumb?.url_list || [],
                    avatarMedium: content.owner.avatar_medium?.url_list || [],
                    avatarLarge: content.owner.avatar_large?.url_list || [],
                    modifyTime: content.owner.modify_time,
                    stats: {
                        followingCount: content.owner.follow_info.following_count,
                        followerCount: content.owner.follow_info.follower_count
                    },
                    isVerified: content.owner?.authentication_info?.custom_verify ===
                        "verified account" || false
                }
            };
            const roomInfo = {
                hasCommerceGoods: v.live_info.room_info.has_commerce_goods,
                isBattle: v.live_info.room_info.is_battle
            };
            result.push({ roomInfo, liveInfo });
        });
        resolve({
            status: "success",
            result,
            page,
            totalResults: data.result.length
        });
    })
        .catch((e) => {
        resolve({ status: "error", message: e.message });
    });
});
exports.SearchLive = SearchLive;
