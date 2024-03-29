import Axios from "axios"
import qs from "qs"
import { load } from "cheerio"
import { _tiktokurl } from "../../constants/api"
import { AuthorPost, Posts, StalkResult, Stats, Users } from "../../types/search/stalker"
import { _userPostsParams } from "../../constants/params"
import { createCipheriv } from "crypto"

/**
 * Tiktok Stalk User
 * @param {string} username - The username you want to stalk
 * @param {object|string} cookie - Your Tiktok Cookie (optional)
 * @returns {Promise<StalkResult>}
 */

export const StalkUser = (username: string, cookie?: any): Promise<StalkResult> =>
  new Promise(async (resolve, reject) => {
    username = username.replace("@", "")
    Axios.get(`${_tiktokurl}/@${username}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Safari/537.36",
        cookie: typeof cookie === "object" ? cookie.map((v) => `${v.name}=${v.value}`).join("; ") : cookie
      }
    })
      .then(async ({ data }) => {
        const $ = load(data)
        const result = JSON.parse($("script#__UNIVERSAL_DATA_FOR_REHYDRATION__").text())
        if (!result["__DEFAULT_SCOPE__"] && !result["__DEFAULT_SCOPE__"]["webapp.user-detail"]) {
          return resolve({
            status: "error",
            message: "User not found!"
          })
        }
        const dataUser = result["__DEFAULT_SCOPE__"]["webapp.user-detail"]["userInfo"]

        // Posts Result
        let hasMore = true
        let cursor
        const posts: Posts[] = []

        while (hasMore) {
          const result2 = await request(dataUser.user.secUid, cursor, 30)

          if (result2 === "") hasMore = false

          result2?.itemList?.forEach((v) => {
            const author: AuthorPost = {
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
            }

            if (v.imagePost) {
              const images: string[] = v.imagePost.images.map((img) => img.imageURL.urlList[0])

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
              })
            } else {
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
              }

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
              })
            }
          })

          hasMore = result2.hasMore
          cursor = hasMore ? result2.cursor : null
        }

        // User Info Result
        const users: Users = {
          id: dataUser.user.id,
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
          nicknameModifyTime: dataUser.user.nickNameModifyTime
        }

        // Statistics Result
        const stats: Stats = {
          followerCount: dataUser.stats.followerCount,
          followingCount: dataUser.stats.followingCount,
          heartCount: dataUser.stats.heartCount,
          videoCount: dataUser.stats.videoCount,
          likeCount: dataUser.stats.diggCount,
          friendCount: dataUser.stats.friendCount,
          postCount: posts.length
        }

        resolve({
          status: "success",
          result: {
            users,
            stats,
            posts
          }
        })
      })
      .catch((e) => resolve({ status: "error", message: e.message }))
  })

/**
 * Thanks to:
 * https://github.com/atharahmed/tiktok-private-api/blob/020ede2eaa6021bcd363282d8cef1aacaff2f88c/src/repositories/user.repository.ts#L148
 */

const request = async (secUid: string, cursor = 0, count = 30) => {
  const { data } = await Axios.get(`https://www.tiktok.com/api/post/item_list/?${_userPostsParams()}`, {
    headers: {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.35",
      "X-tt-params": xttparams(
        qs.stringify({
          aid: "1988",
          cookie_enabled: true,
          screen_width: 0,
          screen_height: 0,
          browser_language: "",
          browser_platform: "",
          browser_name: "",
          browser_version: "",
          browser_online: "",
          timezone_name: "Europe/London",
          secUid,
          cursor,
          count,
          is_encryption: 1
        })
      )
    }
  })

  return data
}

const xttparams = (params) => {
  const cipher = createCipheriv("aes-128-cbc", "webapp1.0+202106", "webapp1.0+202106")
  return Buffer.concat([cipher.update(params), cipher.final()]).toString("base64")
}
