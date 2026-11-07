const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

app.use(cors());

app.get('/api/index', async (req, res) => {
    let targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send("No target URL specified.");

    try {
        if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
            targetUrl = "https://" + targetUrl;
        }
        const parsedUrl = new URL(targetUrl);
        const response = await axios({
            method: req.method || 'GET',
            url: targetUrl,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'host': parsedUrl.host
            },
            responseType: 'arraybuffer',
            validateStatus: () => true
        });

        res.set(response.headers);
        res.removeHeader('x-frame-options');
        res.removeHeader('content-security-policy');
        res.removeHeader('content-security-policy-report-only');
        res.removeHeader('cross-origin-embedder-policy');
        res.removeHeader('cross-origin-opener-policy');
        res.setHeader('Access-Control-Allow-Origin', '*');

        let data = response.data;
        const contentType = response.headers["content-type"] || "";
        if (contentType.includes("text/html")) {
            let htmlContent = data.toString("utf8");
            const baseTag = `<head><base href="${parsedUrl.origin}/">`;
            htmlContent = htmlContent.replace("<head>", baseTag);
            data = Buffer.from(htmlContent, "utf8");
        }
        res.status(response.status).send(data);
    } catch (error) {
        res.status(500).send("Proxy error: " + error.message);
    }
});

module.exports = app;
