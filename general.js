const fs = require('fs'); 
const path = require('path'); 
 
const publicDir = path.join(__dirname,  'public'); 
const staticBuildDir = path.join(__dirname,  'static-build'); 
 
// 确保静态构建目录存在 
if (!fs.existsSync(staticBuildDir))  { 
    fs.mkdirSync(staticBuildDir);  
} 
 
// 复制 public 目录下的所有文件到静态构建目录 
const files = fs.readdirSync(publicDir);  
files.forEach(file  => { 
    const source = path.join(publicDir,  file); 
    const destination = path.join(staticBuildDir,  file); 
    fs.copyFileSync(source,  destination); 
}); 
 
console.log('Static  assets copied successfully.');

const express = require('express');
const axios = require('axios'); 
const xml2js = require('xml2js'); 
const ejs = require('ejs'); 
 
const app = express(); 
const PORT = process.env.PORT  || 3001; 
 
// 繁体字与简体字对应字典 
const fan = '繁體字'; // 替换为实际的繁体字字符串 
const jian = '简体字'; // 替换为实际的简体字字符串 
const charMap = {}; 
for (let i = 0; i < fan.length;  i++) { 
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
app.use(express.static(path.join(__dirname,  'public'))); 
 
// Function to fetch and parse RSS feed 
async function fetchRssFeed() { 
    try { 
        const response = await axios.get('https://dmhy.pages.dev/topics/rss/team_id/816/rss.xml');  
        const rssData = response.data;  
        const parser = new xml2js.Parser(); 
        const result = await parser.parseStringPromise(rssData);  
        return result; 
    } catch (error) { 
        console.error('Error  fetching RSS feed:', error); 
    } 
} 
 
// Function to add days to a date 
function addDays(date, days) { 
    const result = new Date(date); 
    result.setDate(result.getDate()  + days); 
    return result; 
} 
 
// Function to get the day of the week in Chinese 
function getDayOfWeek(date) { 
    const days = ['日', '一', '二', '三', '四', '五', '六']; 
    return `${date.getMonth()  + 1}月${date.getDate()} 日（${days[date.getDay()]}）`; 
} 
 
// Function to extract the essential part of the title 
function extractTitle(title) { 
    const match = title.match(/\[(.*?)\] (.*?) - (\d+)/); 
    return match? match[2] : title; 
} 
 
// Generate sitemap.xml  
async function generateSitemap() { 
    const rssData = await fetchRssFeed(); 
    const items = rssData.rss.channel[0].item.map(item  => extractTitle(item.title[0].replace('<![CDATA[',  '').replace(']]>', '').trim())); 
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?> 
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;  
    items.forEach(item  => { 
        const simplifiedItem = convertToSimplified(item); // 转换为简体字 
        const encodedTitle = encodeURIComponent(simplifiedItem); 
        sitemap += ` 
      <url> 
        <loc>https://yourdomain.com/?title=${encodedTitle}</loc>  
        <lastmod>${new Date().toISOString().split('T')[0]}</lastmod> 
        <changefreq>weekly</changefreq> 
        <priority>0.8</priority> 
      </url>`; 
    }); 
    sitemap += ` 
</urlset>`; 
    fs.writeFileSync(path.join(__dirname,  'public', 'sitemap.xml'),  sitemap); 
} 
 
// Route to render HTML from RSS data 
async function generateStaticHTML() { 
    const rssData = await fetchRssFeed(); 
    const items = rssData.rss.channel[0].item.map(item  => ({ 
        title: convertToSimplified(extractTitle(item.title[0].replace('<![CDATA[',  '').replace(']]>', '').trim())), // 转换为简体字 
        pubDate: new Date(item.pubDate[0])  
    })); 
 
    // Generate future dates for the next 7 days 
    const futureItems = items.map(item  => ({ 
        title: item.title,  
        pubDate: addDays(item.pubDate,  7) 
    })); 
 
    const allTitles = items.map(item  => item.title).join(',  '); 
    const allTitlesShortest = allTitles.slice(0,  200); 
    const allTitlesShortest2 = allTitles.slice(200,  400); 
    const description = `这里展示了最新的番组表，包含了${allTitlesShortest}等多个节目信息。`; 
    const keywords = allTitlesShortest2; 
 
    ejs.renderFile(path.join(__dirname,  'views', 'template.ejs'),  { 
        items: futureItems, 
        addDays, 
        getDayOfWeek, 
        currentDate: new Date(), 
        description, 
        keywords 
    }, (err, html) => { 
        if (err) { 
            console.error('Error  rendering EJS template:', err); 
        } else { 
            fs.writeFileSync(path.join(__dirname,  'static-build', 'index.html'),  html); 
            console.log('Static  HTML generated successfully.'); 
        } 
    }); 
} 
 
// Generate sitemap and static HTML 
async function main() { 
    await generateSitemap(); 
    await generateStaticHTML(); 
} 
 
main(); 