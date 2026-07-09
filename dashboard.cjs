const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const app = express();
app.use(express.urlencoded({ extended: true }));

// 画像の保存先を設定 (public/ フォルダ直下)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './public';
        if (!fs.existsSync(dir)){ fs.mkdirSync(dir); }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// GUIのHTML画面
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>トレードログ 投稿ダッシュボード</title>
            <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
        </head>
        <body class="bg-slate-50 min-h-screen flex items-center justify-center p-6">
            <div class="bg-white p-8 rounded-2xl shadow-xl w-full max-w-xl border border-slate-100">
                <h1 class="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">📊 トレードログ新規作成</h1>
                <form action="/publish" method="POST" enctype="multipart/form-data" class="space-y-5">
                    <div>
                        <label class="block text-sm font-semibold text-slate-600 mb-2">タイトル</label>
                        <input type="text" name="title" required class="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700" placeholder="例: 2026-07-09 Goldトレード記録">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-slate-600 mb-2">本文 (Markdown形式)</label>
                        <textarea name="content" rows="8" required class="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 text-sm" placeholder="本日のトレード内容を記述..."></textarea>
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-slate-600 mb-2">チャート写真・画像</label>
                        <input type="file" name="image" accept="image/*" required class="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer">
                    </div>
                    <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg shadow-blue-500/20 cursor-pointer">🚀 記事を公開（デプロイ開始）</button>
                </form>
            </div>
        </body>
        </html>
    `);
});

// 投稿処理
app.post('/publish', upload.single('image'), (req, res) => {
    const { title, content } = req.body;
    const imageFile = req.file;
    
    if (!imageFile) return res.status(400).send('画像が選択されていません。');

    const dateStr = new Date().toISOString().split('T')[0];
    const slug = title.toLowerCase().replace(/[^a-z0-0]/g, '-').replace(/-+/g, '-');
    const markdownFileName = `${dateStr}-${slug || 'post'}.md`;
    
    // プロジェクト構成に合わせて格納先を自動判別 (src/content/posts か src/pages/posts)
    let postsDir = './src/content/posts';
    if (!fs.existsSync(postsDir)) {
        postsDir = './src/pages/posts';
        if (!fs.existsSync(postsDir)) {
            fs.mkdirSync('./src/content/posts', { recursive: true });
            postsDir = './src/content/posts';
        }
    }

    // Markdownの本文を組み立て
    const markdownContent = `---
title: "${title}"
date: ${dateStr}
image: "/${imageFile.filename}"
---

![チャート](/${imageFile.filename})

${content}
`;

    // ファイル書き込み
    fs.writeFileSync(path.join(postsDir, markdownFileName), markdownContent, 'utf-8');

    // 自動で Git に追加して Cloudflare へ飛ばす
    exec('git add . && git commit -m "feat: auto-published via dashboard" && git push origin main', (err, stdout, stderr) => {
        if (err) {
            console.error(err);
            return res.send(`<h1>ファイル作成に成功しましたが、Gitプッシュでエラーが発生しました。</h1><pre>${stderr}</pre>`);
        }
        res.send(`
            <div style="text-align:center; font-family:sans-serif; padding:50px;">
                <h1 style="color:#10B981;">🎉 投稿に成功しました！</h1>
                <p>現在 Cloudflare Pages で自動ビルド・デプロイが走っています。数分後にブログに反映されます。</p>
                <a href="/" style="color:#2563EB; text-decoration:none; font-weight:bold;">← 戻る</a>
            </div>
        `);
    });
});

app.listen(3000, () => console.log('🟢 Dashboard running on http://localhost:3000'));
