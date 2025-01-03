"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StalkUser = void 0;
const axios_1 = __importDefault(require("axios"));
const cheerio_1 = require("cheerio");
const api_1 = require("../../constants/api");
const params_1 = require("../../constants/params");
const crypto_1 = require("crypto");
const https_proxy_agent_1 = require("https-proxy-agent");
const socks_proxy_agent_1 = require("socks-proxy-agent");
const StalkUser = (username, cookie, postLimit, proxy) => new Promise(async (resolve) => {
    username = username.replace("@", "");
    (0, axios_1.default)(`${api_1._tiktokurl}/@${username}`, {
        method: "GET",
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Safari/537.36",
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
        .then(async ({ data }) => {
        const $ = (0, cheerio_1.load)(data);
        const result = JSON.parse($("script#__UNIVERSAL_DATA_FOR_REHYDRATION__").text());
        if (!result["__DEFAULT_SCOPE__"] &&
            !result["__DEFAULT_SCOPE__"]["webapp.user-detail"]) {
            return resolve({
                status: "error",
                message: "User not found!"
            });
        }
        const dataUser = result["__DEFAULT_SCOPE__"]["webapp.user-detail"]["userInfo"];
        const posts = await parsePosts(dataUser, postLimit, proxy);
        const { users, stats } = parseDataUser(dataUser, posts);
        let response = {
            status: "success",
            result: {
                users,
                stats,
                posts
            },
            totalPosts: posts.length
        };
        resolve(response);
    })
        .catch((e) => resolve({ status: "error", message: e.message }));
});
exports.StalkUser = StalkUser;
const getUserPosts = async (secUid, cursor = 0, count = 30, proxy) => {
    const { data } = await axios_1.default.get(`${(0, api_1._tiktokGetPosts)((0, params_1._getUserPostsParams)())}`, {
        headers: {
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.35",
            "X-tt-params": xttparams((0, params_1._xttParams)(secUid, cursor, count))
        },
        httpsAgent: (proxy &&
            (proxy.startsWith("http") || proxy.startsWith("https")
                ? new https_proxy_agent_1.HttpsProxyAgent(proxy)
                : proxy.startsWith("socks")
                    ? new socks_proxy_agent_1.SocksProxyAgent(proxy)
                    : undefined)) ||
            undefined
    });
    return data;
};
const parseDataUser = (dataUser, posts) => {
    const users = {
        uid: dataUser.user.id,
        username: dataUser.user.uniqueId,
        nickname: dataUser.user.nickname,
        avatarLarger: dataUser.user.avatarLarger,
        avatarThumb: dataUser.user.avatarThumb,
        avatarMedium: dataUser.user.avatarMedium,
        signature: dataUser.user.signature,
        verified: dataUser.user.verified,
        privateAccount: dataUser.user.privateAccount,
        region: dataUser.user.region,
        commerceUser: dataUser.user.commerceUserInfo.commerceUser,
        usernameModifyTime: dataUser.user.uniqueIdModifyTime,
        nicknameModifyTime: dataUser.user.nickNameModifyTime,
        bioLink: dataUser.user.bioLink,
        ttSeller: dataUser.user.ttSeller,
        followingVisibility: !!dataUser.user.followingVisibility,
        isOrganization: !!dataUser.user.isOrganization
    };
    const stats = {
        followerCount: dataUser.stats.followerCount,
        followingCount: dataUser.stats.followingCount,
        heartCount: dataUser.stats.heartCount,
        videoCount: dataUser.stats.videoCount,
        likeCount: dataUser.stats.diggCount,
        friendCount: dataUser.stats.friendCount,
        postCount: posts.length
    };
    return { users, stats };
};
const parsePosts = async (dataUser, postLimit, proxy) => {
    let hasMore = true;
    let cursor = null;
    const posts = [];
    while (hasMore) {
        let result = null;
        let counter = 0;
        for (let i = 0; i < 30; i++) {
            result = await getUserPosts(dataUser.user.secUid, cursor, 30, proxy);
            if (result !== "")
                break;
        }
        if (result === "")
            hasMore = false;
        result?.itemList?.forEach((v) => {
            const author = {
                id: v.author.id,
                username: v.author.uniqueId,
                nickname: v.author.nickname,
                avatarLarger: v.author.avatarLarger,
                avatarThumb: v.author.avatarThumb,
                avatarMedium: v.author.avatarMedium,
                signature: v.author.signature,
                verified: v.author.verified,
                openFavorite: v.author.openFavorite,
                privateAccount: v.author.privateAccount,
                isADVirtual: v.author.isADVirtual,
                isEmbedBanned: v.author.isEmbedBanned
            };
            if (v.imagePost) {
                const images = v.imagePost.images.map((img) => img.imageURL.urlList[0]);
                posts.push({
                    id: v.id,
                    desc: v.desc,
                    createTime: v.createTime,
                    digged: v.digged,
                    duetEnabled: v.duetEnabled,
                    forFriend: v.forFriend,
                    officalItem: v.officalItem,
                    originalItem: v.originalItem,
                    privateItem: v.privateItem,
                    shareEnabled: v.shareEnabled,
                    stitchEnabled: v.stitchEnabled,
                    stats: v.stats,
                    music: v.music,
                    author,
                    images
                });
            }
            else {
                const video = {
                    id: v.video.id,
                    duration: v.video.duration,
                    format: v.video.format,
                    bitrate: v.video.bitrate,
                    ratio: v.video.ratio,
                    playAddr: v.video.playAddr,
                    cover: v.video.cover,
                    originCover: v.video.originCover,
                    dynamicCover: v.video.dynamicCover,
                    downloadAddr: v.video.downloadAddr
                };
                posts.push({
                    id: v.id,
                    desc: v.desc,
                    createTime: v.createTime,
                    digged: v.digged,
                    duetEnabled: v.duetEnabled,
                    forFriend: v.forFriend,
                    officalItem: v.officalItem,
                    originalItem: v.originalItem,
                    privateItem: v.privateItem,
                    shareEnabled: v.shareEnabled,
                    stitchEnabled: v.stitchEnabled,
                    stats: v.stats,
                    music: v.music,
                    author,
                    video
                });
            }
        });
        if (postLimit !== 0) {
            let loopCount = Math.floor(postLimit / 30);
            if (counter >= loopCount)
                hasMore = false;
        }
        hasMore = result.hasMore;
        cursor = hasMore ? result.cursor : null;
        counter++;
    }
    return postLimit ? posts.slice(0, postLimit) : posts;
};
const xttparams = (params) => {
    const cipher = (0, crypto_1.createCipheriv)("aes-128-cbc", "webapp1.0+202106", "webapp1.0+202106");
    return Buffer.concat([cipher.update(params), cipher.final()]).toString("base64");
};
