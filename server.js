const express = require('express');
const path = require('path');
const axios = require('axios');
const xml2js = require('xml2js');
const ejs = require('ejs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to serve static files (CSS)
app.use(express.static(path.join(__dirname, 'public')));

// Function to fetch and parse RSS feed
async function fetchRssFeed() {
  try {
    const response = await axios.get('https://dmhy.pages.dev/topics/rss/team_id/816/rss.xml');
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

// Route to render HTML from RSS data
app.get('/', async (req, res) => {
  const rssData = await fetchRssFeed();
  const items = rssData.rss.channel[0].item.map(item => ({
    title: extractTitle(item.title[0].replace('<![CDATA[', '').replace(']]>', '').trim()),
    pubDate: new Date(item.pubDate[0])
  }));

  // Generate future dates for the next 7 days
  const futureItems = items.map(item => ({
    title: item.title,
    pubDate: addDays(item.pubDate, 7)
  }));

  ejs.renderFile(path.join(__dirname, 'views', 'template.ejs'), { items: futureItems, addDays, getDayOfWeek, currentDate: new Date() }, (err, html) => {
    if (err) {
      console.error('Error rendering EJS template:', err);
      res.status(500).send('Internal Server Error');
    } else {
      res.send(html);
    }
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});