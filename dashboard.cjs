const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const app = express();
app.use(express.urlencoded({ extended: true }));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './public';
        if (!fs.existsSync(dir)){ fs.mkdirSync(dir); }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        // サムネイル不具合対策：スペースや特殊文字を排除したクリーンなファイル名
        cb(null, 'trade-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

app.get('/', (req, res) => {
    // 今日の日付をデフォルトで取得
    const today = new Date().toISOString().split('T')[0];
    
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>トレードログ・マスター</title>
            <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
        </head>
        <body class="bg-slate-950 min-h-screen flex items-center justify-center p-4 md:p-8 text-slate-100">
            <div class="bg-slate-900 p-6 md:p-8 rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-800">
                <h1 class="text-2xl font-bold text-amber-400 mb-6 flex items-center gap-2">📊 トレードログ高速入力（ダイレクトデプロイ）</h1>
                
                <form action="/publish" method="POST" enctype="multipart/form-data" class="space-y-5">
                    
                    <!-- 日付（自動入力・変更も可） -->
                    <div>
                        <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">日付</label>
                        <input type="date" name="date" value="${today}" required class="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500">
                    </div>

                    <!-- 銘柄・通貨ペア -->
                    <div>
                        <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">銘柄 / 通貨ペア</label>
                        <div class="grid grid-cols-4 gap-2">
                            <label class="cursor-pointer bg-slate-800 border border-slate-700 text-center py-2 rounded-lg text-sm font-medium hover:bg-slate-700 has-[:checked]:bg-amber-500 has-[:checked]:text-slate-950 has-[:checked]:border-amber-500 transition-all">
                                <input type="radio" name="pair" value="XAUUSD" checked class="hidden">XAUUSD
                            </label>
                            <label class="cursor-pointer bg-slate-800 border border-slate-700 text-center py-2 rounded-lg text-sm font-medium hover:bg-slate-700 has-[:checked]:bg-amber-500 has-[:checked]:text-slate-950 has-[:checked]:border-amber-500 transition-all">
                                <input type="radio" name="pair" value="ナスダック" class="hidden">ナスダック
                            </label>
                            <label class="cursor-pointer bg-slate-800 border border-slate-700 text-center py-2 rounded-lg text-sm font-medium hover:bg-slate-700 has-[:checked]:bg-amber-500 has-[:checked]:text-slate-950 has-[:checked]:border-amber-500 transition-all">
                                <input type="radio" name="pair" value="日経" class="hidden">日経
                            </label>
                            <input type="text" name="pair_custom" placeholder="手動入力" class="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500">
                        </div>
                    </div>

                    <!-- 時間足 -->
                    <div>
                        <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">時間足</label>
                        <div class="flex gap-4">
                            <label class="cursor-pointer flex items-center gap-2 text-sm">
                                <input type="radio" name="timeframe" value="1分足" checked class="w-4 h-4 accent-amber-500"> 1分足 (基本)
                            </label>
                            <label class="cursor-pointer flex items-center gap-2 text-sm">
                                <input type="radio" name="timeframe" value="5分足" class="w-4 h-4 accent-amber-500"> 5分足
                            </label>
                        </div>
                    </div>

                    <!-- ST 設定 -->
                    <div>
                        <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">ST 設定</label>
                        <div class="grid grid-cols-4 gap-2">
                            <label class="cursor-pointer bg-slate-800 border border-slate-700 text-center py-2 rounded-lg text-sm font-medium hover:bg-slate-700 has-[:checked]:bg-amber-500 has-[:checked]:text-slate-950 has-[:checked]:border-amber-500 transition-all">
                                <input type="radio" name="st" value="ST100" checked class="hidden">ST100
                            </label>
                            <label class="cursor-pointer bg-slate-800 border border-slate-700 text-center py-2 rounded-lg text-sm font-medium hover:bg-slate-700 has-[:checked]:bg-amber-500 has-[:checked]:text-slate-950 has-[:checked]:border-amber-500 transition-all">
                                <input type="radio" name="st" value="ST80" class="hidden">ST80
                            </label>
                            <label class="cursor-pointer bg-slate-800 border border-slate-700 text-center py-2 rounded-lg text-sm font-medium hover:bg-slate-700 has-[:checked]:bg-amber-500 has-[:checked]:text-slate-950 has-[:checked]:border-amber-500 transition-all">
                                <input type="radio" name="st" value="ST60" class="hidden">ST60
                            </label>
                            <input type="text" name="st_custom" placeholder="手動入力" class="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500">
                        </div>
                    </div>

                    <!-- 獲得pips & 売買 -->
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">獲得 Pips (例: +25.5)</label>
                            <input type="text" name="pips" placeholder="+25.5 pips" required class="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">売買</label>
                            <select name="direction" class="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500">
                                <option value="ロング">ロング</option>
                                <option value="ショート">ショート</option>
                            </select>
                        </div>
                    </div>

                    <!-- 手法 / メモ -->
                    <div>
                        <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">手法・エントリー根拠（タイトル後半になります）</label>
                        <input type="text" name="strategy" placeholder="例: EMA45反発からのSGAP不成立" required class="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-500">
                    </div>

                    <!-- チャート画像 -->
                    <div>
                        <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">チャート写真・画像（必須）</label>
                        <input type="file" name="image" accept="image/*" required class="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-400 cursor-pointer">
                    </div>

                    <!-- 本文メモ -->
                    <div>
                        <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">詳細メモ（記事の本文になります / 任意）</label>
                        <textarea name="content" rows="4" class="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" placeholder="追加の環境認識や反省点などがあれば自由に入力..."></textarea>
                    </div>

                    <button type="submit" class="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg shadow-amber-500/20 cursor-pointer text-base">🚀 ログを生成してダイレクトデプロイ</button>
                </form>
            </div>
        </body>
        </html>
    `);
});

app.post('/publish', upload.single('image'), (req, res) => {
    const { date, pair, pair_custom, timeframe, st, st_custom, pips, direction, strategy, content } = req.body;
    const imageFile = req.file;
    if (!imageFile) return res.status(400).send('画像ファイルが必要です。');

    // カスタム入力を優先判定
    const finalPair = pair_custom ? pair_custom.trim() : pair;
    const finalSt = st_custom ? st_custom.trim() : st;
    
    // サムネ不具合対策：フロントマター内の画像指定をフレームワークに合わせて調整
    // /public/ を抜いたファイル名のみ、もしくは各種パターンに対応できるように成形
    const imgPath = `${imageFile.filename}`;

    // 自動タイトル組み立て
    // 例: GOLD(XAUUSD) 1分足：EMA45反発からのSGAP不成立ショート
    const title = `${finalPair} ${timeframe} : ${strategy}${direction}`;

    // Markdownファイル名の決定
    const slug = `${date}-trade-${Date.now().toString().slice(-4)}`;
    const markdownFileName = `${slug}.md`;
    
    let postsDir = './src/content/posts';
    if (!fs.existsSync(postsDir)) { postsDir = './src/pages/posts'; }

    // フロントマターの組み立て (サムネイル表示のためにimageパスを二通り試せるようセット)
    const markdownContent = `---
title: "${title}"
date: ${date}
image: "${imgPath}"
pips: "${pips}"
---

![チャート](/${imgPath})

### トレードデータ
- **銘柄**: ${finalPair}
- **時間足**: ${timeframe}
- **環境設定**: ${finalSt}
- **結果**: ${pips}

### メモ
${content || '特記事項なし'}
`;

    fs.writeFileSync(path.join(postsDir, markdownFileName), markdownContent, 'utf-8');

    console.log('⏳ ローカルビルド＆Cloudflare直撃デプロイ中...');
    exec('npm run build && npx wrangler pages deploy dist --project-name=trade-log', (err, stdout, stderr) => {
        if (err) {
            console.error(err);
            return res.send(`<h1>デプロイに失敗しました</h1><pre>${stderr}</pre>`);
        }
        
        // 裏側で静かにGitにもバックアップをプッシュ
        exec('git add . && git commit -m "auto trade log" && git push origin main');

        res.send(`
            <div style="text-align:center; font-family:sans-serif; padding:50px; background:#0f172a; color:#fff; min-height:100vh;">
                <h1 style="color:#F59E0B; font-size: 2rem;">⚡ ログの追加＆デプロイ完了！</h1>
                <p style="color:#94a3b8; margin: 20px 0;">サムネイル画像付きでCloudflare Pagesへ直接送信されました。一瞬で反映されます。</p>
                <p style="font-size: 0.9rem; color: #64748b;">タイトル: ${title} (${pips})</p>
                <a href="/" style="display:inline-block; margin-top:20px; background:#f59e0b; color:#0f172a; padding:10px 20px; border-radius:8px; text-decoration:none; font-weight:bold;">← 次のログを入力する</a>
            </div>
        `);
    });
});

app.listen(3000, () => console.log('🟢 強化版ダッシュボード稼働: http://localhost:3000'));
