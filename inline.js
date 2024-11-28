import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 读取构建后的文件
const distPath = join(__dirname, 'dist', 'assets');
const files = readdirSync(distPath);
const jsFile = files.find(f => f.endsWith('.js'));
const cssFile = files.find(f => f.endsWith('.css'));

let newHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: mediastream: *">
    <title>Voice Show</title>
    <script>
        // 错误处理
        window.onerror = function(msg, url, line, col, error) {
            console.error('Error: ' + msg + '\\nurl: ' + url + '\\nline: ' + line);
            return false;
        };
        
        // 禁用CORS检查
        const originalFetch = window.fetch;
        window.fetch = function (...args) {
            if (args[1] && args[1].mode === 'cors') {
                args[1].mode = 'no-cors';
            }
            return originalFetch.apply(this, args);
        };

        // 检查浏览器支持
        window.addEventListener('load', function() {
            if (!navigator?.mediaDevices?.getUserMedia) {
                alert('您的浏览器不支持音频设备访问，请使用现代浏览器并确保通过HTTPS访问。');
            }
        });
    </script>
    <style>
        /* 添加基础样式 */
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
                Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            background: #fff;
        }
        #root {
            width: 100vw;
            height: 100vh;
        }
        .error-message {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #ff4444;
            color: white;
            padding: 1rem;
            text-align: center;
    </style>`;

// 内联CSS
if (cssFile) {
	const cssContent = readFileSync(join(distPath, cssFile), 'utf-8');
	newHtml += `\n<style>${cssContent}</style>`;
}

newHtml += `\n</head>\n<body>\n<div id="root"></div>`;

// 内联JS
if (jsFile) {
	const jsContent = readFileSync(join(distPath, jsFile), 'utf-8');
	newHtml += `\n<script defer>${jsContent}</script>`;
}

newHtml += `\n</body>\n</html>`;

// 写入新的HTML文件，使用UTF-8编码
writeFileSync(join(__dirname, 'dist', 'inline.html'), newHtml, {
	encoding: 'utf8',
});
