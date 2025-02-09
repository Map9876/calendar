const express = require('express');
const path = require('path');
const axios = require('axios');
const xml2js = require('xml2js');
const ejs = require('ejs');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// 繁体字与简体字对应字典 https://www.n.cn/search/d96dc0ea176b454498c4e628a322792e?fr=none
// https://www.n.cn/search/17866b452d484aacafb26ec4a4d2b682?fr=none
const fan = "萬";
const jian = "万";

// 字符映射表
const charMap = {};
for (let i = 0; i < fan.length; i++) {
    charMap[fan[i]] = jian[i];
}

// 繁体字转换为简体字的函数
function convertToSimplified(str) {
    let result = '';
    for (let char of str) {
        result += charMap[char] || char;
    }
    return result;
}

// Middleware to serve static files (CSS)
app.use(express.static(path.join(__dirname, 'public')));

// Function to fetch and parse RSS feed
async function fetchRssFeed() {
    try {
        const response = await axios.get('https://dmhy.pages.dev/topics/rss/team_id/816/rss.xml'); // dmhy镜像，通过cloudflare workers代理openai这种通用代码搭建
        const rssData = response.data;
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(rssData);
        return result;
    } catch (error) {
        console.error('Error fetching RSS feed:', error);
    }
}

// Function to add days to a date
function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

// Function to get the day of the week in Chinese
function getDayOfWeek(date) {
    const days = ['日', '一', '二', '三', '四', '五', '六'];
    return `${date.getMonth() + 1}月${date.getDate()}日（${days[date.getDay()]}）`;
}

// Function to extract the essential part of the title
function extractTitle(title) {
    const match = title.match(/\[(.*?)\] (.*?) - (\d+)/);
    return match ? match[2] : title;
}

// Generate sitemap.xml
async function generateSitemap() {
    const rssData = await fetchRssFeed();
    const items = rssData.rss.channel[0].item.map(item => extractTitle(item.title[0].replace('<![CDATA[', '').replace(']]>', '').trim()));
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
    items.forEach(item => {
        const simplifiedItem = convertToSimplified(item); // 转换为简体字
        const encodedTitle = encodeURIComponent(simplifiedItem);
        sitemap += `\n  <url>\n    <loc>https://yourdomain.com/?title=${encodedTitle}</loc>\n    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`;
    });
    sitemap += `\n</urlset>`;
    fs.writeFileSync(path.join(__dirname, 'public', 'sitemap.xml'), sitemap);
}

// Route to render HTML from RSS data
app.get('/', async (req, res) => {
    const rssData = await fetchRssFeed();
    const items = rssData.rss.channel[0].item.map(item => ({
        title: convertToSimplified(extractTitle(item.title[0].replace('<![CDATA[', '').replace(']]>', '').trim())), // 转换为简体字
        pubDate: new Date(item.pubDate[0])
    }));
    // 获取 9 天前的日期 
const nineDaysAgo = new Date(); 
nineDaysAgo.setDate(nineDaysAgo.getDate()  - 9); 
 
// 映射 items 数组，并过滤掉 9 天前的日期

    // Generate future dates for the next 8 days
    const futureItems = items.map(item => ({
        title: item.title,
        pubDate: addDays(item.pubDate, 7)
    })).filter(item => { 
    const itemDate = new Date(item.pubDate);  
    return itemDate >= nineDaysAgo});

    const allTitles = items.map(item => item.title).join(', ');
    const allTitlesShortest = allTitles.slice(0, 200);
    const allTitlesShortest2 = allTitles.slice(200, 400);
    const description = `这里展示了最新的番组表，包含了${allTitlesShortest}等多个节目信息。`;
    const keywords = allTitlesShortest2;

    ejs.renderFile(path.join(__dirname, 'views', 'template.ejs'), {
        items: futureItems,
        addDays,
        getDayOfWeek,
        currentDate: new Date(),
        description,
        keywords
    }, (err, html) => {
        if (err) {
            console.error('Error rendering EJS template:', err);
            res.status(500).send('Internal Server Error');
        } else {
            res.send(html);
        }
    });
});

// Serve sitemap.xml
app.get('/sitemap.xml', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'sitemap.xml'));
});

// Start the server
app.listen(PORT, async () => {
    await generateSitemap();
    console.log(`Server is running on port http://127.0.0.1:${PORT}`);
});
//现在还是有重复的 00:05中年大叔轉生反派千金00:03中年大叔轉生反派千金，基于这个代码来 还有就是一个小时的框内，时间晚的应该排在时间早的下面，还有就是对于每一天的同一个小时，需要确保的是，如果周几的这一个小时时间比较晚那它应该始终在较早时间的那一天的偏下方一点
