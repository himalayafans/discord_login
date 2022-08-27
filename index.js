require('dotenv').config()
const express = require("express")
const axios = require('axios').default;
var cookieParser = require('cookie-parser')
var session = require('express-session')
var https = require('https')
var qs = require('qs')
const app = express()

const oneDay = 1000 * 60 * 60 * 24
const PORT = 80

// session中间件
app.use(session({
    secret: "gkshuak2",
    saveUninitialized: true,
    cookie: { maxAge: oneDay },
    resave: false
}))
// 设置视图引擎
app.set("view engine", "ejs")

// discord授权后跳转的站点URL，必须与discord后台设置相同
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI
const CLIENT_ID = process.env.CLIENT_ID
const CLIENT_SECRET = process.env.CLIENT_SECRET

/** 获取discord重定向URL */
function getRedirect() {
    // 拼接后的URL与discord OAuth2 URL Generator相同，只是该URL是由程序生成
    let data = {
        client_id: CLIENT_ID,
        redirect_uri: DISCORD_REDIRECT_URI,
        response_type: 'code',
        scope: 'identify guilds'
    }
    let params = qs.stringify(data)
    return `https://discord.com/api/oauth2/authorize?${params}`
}

// 首页路由
app.get("/", async function (req, res) {
    let code = req.query.code
    let user = null // discord用户
    let avatar = '' // discord头像
    let name = '' // discord名称
    let id = '' // discord ID
    if (code) {        
        try {
            // 获取token
            const data = {
                grant_type: 'authorization_code',
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                redirect_uri: DISCORD_REDIRECT_URI,
                code: code,
                scope: 'identify guilds'
            }
            let tokenResponse = await axios({
                method: 'POST',
                headers: { 'content-type': 'application/x-www-form-urlencoded' },
                data: qs.stringify(data),
                url: 'https://discord.com/api/oauth2/token'
            })
            // 获取用户资料
            let tokenType = tokenResponse.data.token_type
            let accessToken = tokenResponse.data.access_token
            let userResponse = await axios.get('https://discord.com/api/users/@me', {
                headers: {
                    authorization: `${tokenType} ${accessToken}`,
                }
            })
            user = userResponse.data
            avatar = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.jpg`
            name = `${user.username}#${user.discriminator}`
            id = user.id
        } catch (error) {
            console.error(error)
        }
    }
    res.render("index", { url: getRedirect(), user, avatar, name, id });
})

app.listen(PORT, function () {
    console.log("Server is running on port " + PORT);
});