const { onRequest } = require("firebase-functions/v2/https");
const axios = require("axios");

exports.proxy = onRequest({ cors: true, timeoutSeconds: 60, memory: "256MiB" }, async (req, res) => {
    let targetUrl = req.query.url;

    if (!targetUrl) {
        return res.status(400).send("Usage: /browse?url=https://example.com");
    }

    try {
        // Automatically inject https protocol if it was missing from the parameters
        if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
            targetUrl = "https://" + targetUrl;
        }

        const parsedUrl = new URL(targetUrl);
        
        // ADVANCED SPOOFING HEADERS: Simulates an authentic Windows 11 Chrome browser profile
        const response = await axios({
            method: req.method || "GET",
            url: targetUrl,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
                "Accept-Encoding": "gzip, deflate, br",
                "Cache-Control": "max-age=0",
                "Sec-Ch-Ua": '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
                "Sec-Ch-Ua-Mobile": "?0",
                "Sec-Ch-Ua-Platform": '"Windows"',
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "none",
                "Sec-Fetch-User": "?1",
                "Upgrade-Insecure-Requests": "1",
                "host": parsedUrl.host
            },
            data: req.body,
            responseType: "arraybuffer", 
            validateStatus: () => true   
        });

        // Copy original site configuration headers cleanly over
        res.set(response.headers);

        // DEMOLISH INDIVIDUAL SECURITY BLOCKS CAUSING IFRAME DESTRUCTION
        res.removeHeader("x-frame-options");
        res.removeHeader("content-security-policy");
        res.removeHeader("content-security-policy-report-only");
        res.removeHeader("cross-origin-embedder-policy");
        res.removeHeader("cross-origin-opener-policy");

        // Force cross-origin availability so the browser container renders the components
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

        let data = response.data;
        const contentType = response.headers["content-type"] || "";

        // Dynamically append base origins onto relative paths so internal scripts don't loop break
        if (contentType.includes("text/html")) {
            let htmlContent = data.toString("utf8");
            const baseTag = `<head><base href="${parsedUrl.origin}/">`;
            htmlContent = htmlContent.replace("<head>", baseTag);
            data = Buffer.from(htmlContent, "utf8");
        }

        res.status(response.status).send(data);

    } catch (error) {
        res.status(500).send(`Proxy Routing Block: ${error.message}`);
    }
});
