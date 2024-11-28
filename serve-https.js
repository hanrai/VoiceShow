import { createServer } from 'https';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import selfsigned from 'selfsigned';
import express from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 生成自签名证书
const attrs = [{ name: 'commonName', value: 'localhost' }];
const pems = selfsigned.generate(attrs, {
	algorithm: 'sha256',
	days: 30,
	keySize: 2048,
	extensions: [
		{
			name: 'basicConstraints',
			cA: true,
		},
		{
			name: 'keyUsage',
			keyCertSign: true,
			digitalSignature: true,
			nonRepudiation: true,
			keyEncipherment: true,
			dataEncipherment: true,
		},
		{
			name: 'extKeyUsage',
			serverAuth: true,
			clientAuth: true,
			codeSigning: true,
			timeStamping: true,
		},
		{
			name: 'subjectAltName',
			altNames: [
				{
					type: 2, // DNS
					value: 'localhost',
				},
				{
					type: 7, // IP
					ip: '127.0.0.1',
				},
			],
		},
	],
});

const app = express();

// 允许跨域访问
app.use((req, res, next) => {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
	res.header('Access-Control-Allow-Headers', 'Content-Type');
	next();
});

// 提供静态文件
app.use(express.static('dist'));

// 创建HTTPS服务器
const httpsServer = createServer(
	{
		key: pems.private,
		cert: pems.cert,
	},
	app
);

const PORT = 3000;

httpsServer.listen(PORT, () => {
	console.log(`HTTPS Server running on port ${PORT}`);
	console.log(`访问 https://localhost:${PORT}`);
	console.log('注意：由于使用自签名证书，浏览器会显示警告，这是正常的');
	console.log('在手机上访问时，请使用内网穿透工具，如 ngrok 或 localtunnel');
});
