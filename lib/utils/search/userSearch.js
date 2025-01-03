"use strict"
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod }
  }
Object.defineProperty(exports, "__esModule", { value: true })
exports.SearchUser = exports.generateURLXbogus = void 0
const axios_1 = __importDefault(require("axios"))
const api_1 = require("../../constants/api")
const params_1 = require("../../constants/params")
const https_proxy_agent_1 = require("https-proxy-agent")
const socks_proxy_agent_1 = require("socks-proxy-agent")
const xbogus_1 = __importDefault(require("../../../helper/xbogus"))
const userAgent =
  "Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/111.0"
const generateURLXbogus = (username, page) => {
  const url =
    "https://www.tiktok.com/api/search/user/full/?" +
    (0, params_1._userSearchParams)(username, page)
  const xbogusParams = (0, xbogus_1.default)(url, userAgent)
  const urlXbogus =
    "https://www.tiktok.com/api/search/user/full/?" +
    (0, params_1._userSearchParams)(username, page, xbogusParams)
  return urlXbogus
}
exports.generateURLXbogus = generateURLXbogus
const SearchUser = (username, cookie, page = 1, proxy) =>
  new Promise(async (resolve) => {
    let additionalMetadata
    if (!cookie) {
      return resolve({
        status: "error",
        message: "Cookie is required!"
      })
    }
    ;(0, axios_1.default)((0, exports.generateURLXbogus)(username, page), {
      method: "GET",
      headers: {
        "User-Agent": userAgent,
        cookie:
          typeof cookie === "object"
            ? cookie.map((v) => `${v.name}=${v.value}`).join("; ")
            : cookie
      },
      httpsAgent:
        (proxy &&
          (proxy.startsWith("http") || proxy.startsWith("https")
            ? new https_proxy_agent_1.HttpsProxyAgent(proxy)
            : proxy.startsWith("socks")
            ? new socks_proxy_agent_1.SocksProxyAgent(proxy)
            : undefined)) ||
        undefined
    })
      .then(({ data }) => {
        additionalMetadata = data
        if (data.status_code === 2483)
          return resolve({ status: "error", message: "Invalid cookie!" })
        if (data.status_code !== 0)
          return resolve({
            status: "error",
            message:
              data.status_msg ||
              "An error occurred! Please report this issue to the developer.",
            data: JSON.stringify(data, null, 2)
          })
        if (!data.user_list)
          return resolve({ status: "error", message: "User not found!" })
        const result = []
        for (let i = 0; i < data.user_list.length; i++) {
          const user = data.user_list[i]
          result.push({
            uid: user.user_info.uid,
            username: user.user_info.unique_id,
            nickname: user.user_info.nickname,
            signature: user.user_info.signature,
            followerCount: user.user_info.follower_count,
            avatarThumb: user.user_info.avatar_thumb,
            isVerified: user.custom_verify !== "",
            secUid: user.user_info.sec_uid,
            url: `${api_1._tiktokurl}/@${user.user_info.unique_id}`
          })
        }
        resolve({
          status: "success",
          result,
          page,
          totalResults: result.length
        })
      })
      .catch((e) => {
        resolve({
          status: "error",
          message: e.message,
          additionalMetadata: JSON.stringify(additionalMetadata, null, 2)
        })
      })
  })
exports.SearchUser = SearchUser
