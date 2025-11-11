const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/fetch', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate URL format
    if (!/^https?:\/\//i.test(url)) {
      return res.status(500).json({ error: 'Invalid URL format' });
    }

    const response = await axios.get(url);
    const html = response.data;
    const $ = cheerio.load(html);

    // Helper: preserve capitalization pattern
    function replaceYalePreservingCase(text) {
      return text.replace(/yale/gi, (match) => {
        if (match === 'YALE') return 'FALE';
        if (match === 'Yale') return 'Fale';
        if (match === 'yale') return 'fale';
        return 'Fale'; // fallback for mixed-case variants
      });
    }

    // Replace text nodes only
    $('body *')
      .contents()
      .filter(function () {
        return this.nodeType === 3; // text node
      })
      .each(function () {
        const text = $(this).text();
        const newText = replaceYalePreservingCase(text);
        if (text !== newText) $(this).replaceWith(newText);
      });

    // Replace in title too
    const newTitle = replaceYalePreservingCase($('title').text());
    $('title').text(newTitle);

    res.json({
      success: true,
      content: $.html(),
      title: newTitle,
      originalUrl: url,
    });
  } catch (error) {
    console.error('Error fetching URL:', error.message);
    res
      .status(500)
      .json({ error: `Failed to fetch content: ${error.message}` });
  }
});

app.listen(PORT, () =>
  console.log(`Faleproxy server running at http://localhost:${PORT}`)
);
