/*const express = require('express');  const path = require('path');  const axios = require('axios');  const xml2js = require('xml2js');  const ejs = require('ejs');  const fs = require('fs');    const app = express();  const PORT = process.env.PORT || 3001;    // 繁体字与简体字对应字典 https://www.n.cn/search/d96dc0ea176b454498c4e628a322792e?fr=none //https://www.n.cn/search/17866b452d484aacafb26ec4a4d2b682?fr=none const fan = "萬"; const jian = "万";   // 字符映射表  const charMap = {};  for (let i = 0; i < fan.length; i++) {      charMap[fan[i]] = jian[i];  }    // 繁体字转换为简体字的函数  function convertToSimplified(str) {      let result = '';      for (let char of str) {          result += charMap[char] || char;      }      return result;  }    // Middleware to serve static files (CSS)  app.use(express.static(path.join(__dirname, 'public')));    // Function to fetch and parse RSS feed  async function fetchRssFeed() {      try {          const response = await axios.get('https://dmhy.pages.dev/topics/rss/team_id/816/rss.xml'); //dmhy镜像，通过cloudflare workers代理openai这种通用代码搭建         const rssData = response.data;          const parser = new xml2js.Parser();          const result = await parser.parseStringPromise(rssData);          return result;      } catch (error) {          console.error('Error fetching RSS feed:', error);      }  }    // Function to add days to a date  function addDays(date, days) {      const result = new Date(date);      result.setDate(result.getDate() + days);      return result;  }    // Function to get the day of the week in Chinese  function getDayOfWeek(date) {      const days = ['日', '一', '二', '三', '四', '五', '六'];      return `${date.getMonth() + 1}月${date.getDate()}日（${days[date.getDay()]}）`;  }    // Function to extract the essential part of the title  function extractTitle(title) {      const match = title.match(/\[(.*?)\] (.*?) - (\d+)/);      return match? match[2] : title;  }    // Generate sitemap.xml  async function generateSitemap() {      const rssData = await fetchRssFeed();      const items = rssData.rss.channel[0].item.map(item => extractTitle(item.title[0].replace('<![CDATA[', '').replace(']]>', '').trim()));      let sitemap = `<?xml version="1.0" encoding="UTF-8"?>  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;      items.forEach(item => {          const simplifiedItem = convertToSimplified(item); // 转换为简体字          const encodedTitle = encodeURIComponent(simplifiedItem);          sitemap += `      <url>        <loc>https://yourdomain.com/?title=${encodedTitle}</loc>        <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>        <changefreq>weekly</changefreq>        <priority>0.8</priority>      </url>`;      });      sitemap += `  </urlset>`;      fs.writeFileSync(path.join(__dirname, 'public', 'sitemap.xml'), sitemap);  }    // Route to render HTML from RSS data  app.get('/', async (req, res) => {      const rssData = await fetchRssFeed();      const items = rssData.rss.channel[0].item.map(item => ({          title: convertToSimplified(extractTitle(item.title[0].replace('<![CDATA[', '').replace(']]>', '').trim())), // 转换为简体字          pubDate: new Date(item.pubDate[0])      }));        // Generate future dates for the next 7 days      const futureItems = items.map(item => ({          title: item.title,          pubDate: addDays(item.pubDate, 7)      }));        const allTitles = items.map(item => item.title).join(', ');      const allTitlesShortest = allTitles.slice(0,  200);      const allTitlesShortest2 = allTitles.slice(200,  400);      const description = `这里展示了最新的番组表，包含了${allTitlesShortest}等多个节目信息。`;      const keywords = allTitlesShortest2;        ejs.renderFile(path.join(__dirname, 'views', 'template.ejs'), {          items: futureItems,          addDays,          getDayOfWeek,          currentDate: new Date(),          description,          keywords      }, (err, html) => {          if (err) {              console.error('Error rendering EJS template:', err);              res.status(500).send('Internal Server Error');          } else {              res.send(html);          }      });  });    // Serve sitemap.xml  app.get('/sitemap.xml', (req, res) => {      res.sendFile(path.join(__dirname, 'public', 'sitemap.xml'));  });    // Start the server  app.listen(PORT, async () => {      await generateSitemap();      console.log(`Server is running on port http://127.0.0.1:${PORT}`);  });       修改为显示未来8天的，也就是本周几到次周几，还有就是一个节目如果是周几的几点，那么它应该就是所有周都是那个时间，这样来显示      <!DOCTYPE html>  <html lang="zh-cn">  <head>    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">    <meta http-equiv="Content-Style-Type" content="text/css">    <meta http-equiv="Content-Script-Type" content="text/javascript">    <meta name="description" content="<%= description %>">    <meta name="keywords" content="<%= keywords %>">    <link rel="stylesheet" href="/weekly.css" type="text/css">    <title>一个播完才能看到播出时间的番组表</title>    <script language="JavaScript">      function Menu() {        if (document.all) {          document.all("menu").style.pixelTop = document.body.scrollTop;        } else {          document.getElementById("menu").style.top = pageYOffset + "px";        }      }      onscroll = Menu;    </script>  </head>  <body>    <div align="center">      <div id="menu" style="position:absolute; top:0px; left:0px; z-index:1; width:100%;">        <table border="0" cellpadding="5" cellspacing="1" width="911px" bgcolor="#6699cc">          <tr>            <td width="18px" rowspan="1" colspan="1" class="w_Hour_head" valign="top">時</td>            <% for (let i = 0; i < 7; i++) { %>              <td width="108px" rowspan="1" colspan="1" class="w_WeekDay_date" valign="top"><%= getDayOfWeek(addDays(currentDate, i)) %></td>            <% } %>            <td width="18px" rowspan="1" colspan="1" class="w_Hour_head" valign="top">時</td>          </tr>        </table>      </div>      <div class="table_margin">        <table border="0" cellpadding="5" cellspacing="1" width="911px" bgcolor="#6699cc">          <% for (let hour = 0; hour < 24; hour++) { %>            <tr>              <td width="18px" colspan="1" rowspan="1" class="w_Hour1" valign="top"><%= hour %></td>              <% for (let day = 0; day < 7; day++) { %>                <td width="108px" colspan="1" rowspan="1" class="w_WeekDay" valign="top">                  <%                    const date = addDays(currentDate, day);                    const item = items.find(item => item.pubDate.getHours() === hour && item.pubDate.getDate() === date.getDate());                  %>                  <% if (item) { %>                    <div class="oa_time"><%= item.pubDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) %></div>                    <div class="oa_title"><%= item.title %></div>                  <% } %>                </td>              <% } %>              <td width="18px" colspan="1" rowspan="1" class="w_Hour1" valign="top"><%= hour %></td>            </tr>          <% } %>        </table>      </div>    </div>  </body>  </html>
给我两个完整代码即可*/
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
const PORT = process.env.PORT || 3001; 
 
// 繁体字与简体字对应字典 https://www.n.cn/search/d96dc0ea176b454498c4e628a322792e?fr=none
//https://www.n.cn/search/17866b452d484aacafb26ec4a4d2b682?fr=none
const fan = "萬";
const jian = "万";
 
// 字符映射表 
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
