const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const postsDir = fs.existsSync('./src/content/posts') ? './src/content/posts' : './src/pages/posts';
if (!fs.existsSync(postsDir)) { fs.mkdirSync(postsDir, { recursive: true }); }

app.get('/', (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'));
    const unreadyposts = [];
    
    files.forEach(file => {
        const content = fs.readFileSync(path.join(postsDir, file), 'utf-8');
        if (!content.includes('deployed: true')) {
            const titleMatch = content.match(/title:\s*"(.*?)"/);
            const pipsMatch = content.match(/pips:\s*"(.*?)"/);
            unreadyposts.push({
                filename: file,
                title: titleMatch ? titleMatch[1] : file,
                pips: pipsMatch ? pipsMatch[1] : ''
            });
        }
    });

    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>トレードログ・マネージャー</title>
            <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
        </head>
        <body class="bg-slate-950 min-h-screen p-4 md:p-8 text-slate-100 font-sans">
            <div class="max-w-4xl mx-auto space-y-6">
                
                <!-- 未デプロイ・リスト -->
                <div class="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
                    <h2 class="text-xl font-bold text-amber-400 mb-4 flex items-center gap-2">📦 未デプロイの下書き一覧 (${unreadyposts.length}件)</h2>
                    ${unreadyposts.length === 0 ? `
                        <p class="text-slate-500 text-sm">未デプロイのログはありません。すべて送信済みです。</p>
                    ` : `
                        <form action="/deploy-selected" method="POST" class="space-y-4">
                            <div class="max-h-40 overflow-y-auto space-y-2 pr-2">
                                ${unreadyposts.map(post => `
                                    <label class="flex items-center gap-3 bg-slate-800 p-3 rounded-lg cursor-pointer hover:bg-slate-700 transition">
                                        <input type="checkbox" name="files" value="${post.filename}" checked class="w-4 h-4 accent-amber-500">
                                        <span class="text-sm font-medium flex-1">${post.title}</span>
                                        <span class="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded font-bold">${post.pips}</span>
                                    </label>
                                `).join('')}
                            </div>
                            <button type="submit" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-lg transition shadow-lg shadow-emerald-600/20 cursor-pointer">
                                🚀 選択した未デプロイ記事を一括公開する
                            </button>
                        </form>
                    `}
                </div>

                <!-- 投稿＆お絵描きフォーム -->
                <div class="bg-slate-900 p-6 md:p-8 rounded-2xl shadow-2xl border border-slate-800">
                    <h1 class="text-2xl font-bold text-amber-400 mb-6 flex items-center gap-2">📝 トレードログ作成（カード表示最適化版）</h1>
                    
                    <form id="logForm" action="/save-draft" method="POST" class="space-y-5">
                        <input type="hidden" id="imageData" name="imageData">
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-semibold text-slate-400 mb-2">日付</label>
                                <input type="date" name="date" value="${today}" required class="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-400 mb-2">獲得 Pips (例: +25.5)</label>
                                <input type="text" name="pips" placeholder="+25.5 pips" required class="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white">
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-semibold text-slate-400 mb-2">通貨ペア / 銘柄</label>
                            <div class="grid grid-cols-4 gap-2">
                                ${['XAUUSD', 'ナスダック', '日経'].map((p, i) => `
                                    <label class="cursor-pointer bg-slate-800 border border-slate-700 text-center py-2 rounded-lg text-sm hover:bg-slate-700 has-[:checked]:bg-amber-500 has-[:checked]:text-slate-950 transition-all">
                                        <input type="radio" name="pair" value="${p}" ${i===0?'checked':''} class="hidden">${p}
                                    </label>
                                `).join('')}
                                <input type="text" name="pair_custom" placeholder="手動入力" class="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none">
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-semibold text-slate-400 mb-2">StableVOL 設定</label>
                            <div class="grid grid-cols-4 gap-2">
                                ${['StableVOL100', 'StableVOL80', 'StableVOL60'].map((s, i) => `
                                    <label class="cursor-pointer bg-slate-800 border border-slate-700 text-center py-2 rounded-lg text-sm hover:bg-slate-700 has-[:checked]:bg-amber-500 has-[:checked]:text-slate-950 transition-all">
                                        <input type="radio" name="vol" value="${s}" ${i===0?'checked':''} class="hidden">${s}
                                    </label>
                                `).join('')}
                                <input type="text" name="vol_custom" placeholder="手動入力" class="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none">
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-semibold text-slate-400 mb-2">時間足</label>
                                <div class="flex gap-4 py-2">
                                    <label class="flex items-center gap-2 text-sm"><input type="radio" name="timeframe" value="1分足" checked class="accent-amber-500"> 1分足 (基本)</label>
                                    <label class="flex items-center gap-2 text-sm"><input type="radio" name="timeframe" value="5分足" class="accent-amber-500"> 5分足</label>
                                </div>
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-400 mb-2">売買</label>
                                <select name="direction" class="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white">
                                    <option value="ロング">ロング</option>
                                    <option value="ショート">ショート</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-semibold text-slate-400 mb-2">手法・エントリー根拠（タイトル後半）</label>
                            <input type="text" name="strategy" placeholder="例: EMA45反発からのSGAP不成立" required class="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white">
                        </div>

                        <div>
                            <label class="block text-xs font-semibold text-slate-400 mb-1">チャート画像 (ファイル選択 または Ctrl+V 貼り付け)</label>
                            <input type="file" id="fileInput" accept="image/*" class="mb-3 text-sm text-slate-400 file:bg-slate-800 file:text-white file:border-0 file:py-1.5 file:px-3 file:rounded file:mr-2 cursor-pointer">
                            <div class="relative overflow-auto max-w-full bg-slate-950 rounded-lg p-2">
                                <canvas id="paintCanvas" width="600" height="350" class="mx-auto rounded border border-slate-800"></canvas>
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-semibold text-slate-400 mb-2">詳細メモ（任意）</label>
                            <textarea name="content" rows="3" class="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm" placeholder="メモなど..."></textarea>
                        </div>

                        <button type="submit" class="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 rounded-lg transition shadow-lg shadow-amber-500/10 text-base cursor-pointer">
                            💾 下書きとしてローカル保存する
                        </button>
                    </form>
                </div>
            </div>

            <script>
                const canvas = document.getElementById('paintCanvas');
                const ctx = canvas.getContext('2d');
                let isDrawing = false;

                ctx.fillStyle = '#475569';
                ctx.font = '14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('画像をファイル選択するか、ここで Ctrl + V で貼り付けてください', canvas.width/2, canvas.height/2);

                function loadImageToCanvas(src) {
                    const img = new Image();
                    img.onload = () => {
                        canvas.width = img.width > 1200 ? 1200 : img.width;
                        canvas.height = (img.height / img.width) * canvas.width;
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        ctx.strokeStyle = '#ef4444'; 
                        ctx.lineWidth = 3;
                        ctx.lineCap = 'round';
                    };
                    img.src = src;
                }

                document.getElementById('fileInput').addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => loadImageToCanvas(event.target.result);
                        reader.readAsDataURL(file);
                    }
                });

                window.addEventListener('paste', (e) => {
                    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
                    for (const item of items) {
                        if (item.type.indexOf('image') !== -1) {
                            const blob = item.getAsFile();
                            const reader = new FileReader();
                            reader.onload = (event) => loadImageToCanvas(event.target.result);
                            reader.readAsDataURL(blob);
                        }
                    }
                });

                canvas.addEventListener('mousedown', (e) => { isDrawing = true; ctx.beginPath(); ctx.moveTo(e.offsetX, e.offsetY); });
                canvas.addEventListener('mousemove', (e) => { if (isDrawing) { ctx.lineTo(e.offsetX, e.offsetY); ctx.stroke(); } });
                canvas.addEventListener('mouseup', () => isDrawing = false);
                canvas.addEventListener('mouseleave', () => isDrawing = false);

                document.getElementById('logForm').addEventListener('submit', (e) => {
                    document.getElementById('imageData').value = canvas.toDataURL('image/png');
                });
            </script>
        </body>
        </html>
    `);
});

app.post('/save-draft', (req, res) => {
    const { date, pair, pair_custom, timeframe, vol, vol_custom, pips, direction, strategy, content, imageData } = req.body;
    
    if (!imageData || imageData.startsWith('data:text')) {
        return res.status(400).send('画像データがありません。');
    }

    // 【重要】デザイン連動用の表記ゆれ修正
    let finalPair = pair_custom ? pair_custom.trim() : pair;
    if (finalPair === 'XAUUSD') {
        finalPair = 'GOLD(XAUUSD)'; // XAUUSDの場合はGOLD(XAUUSD)表記に自動変換
    }
    const finalVol = vol_custom ? vol_custom.trim() : vol;

    // タイトル形式を丸の部分（全角の「：」）に完全一致させる
    const title = `${finalPair} ${timeframe}：${strategy}${direction}`;
    const slug = `${date}-trade-${Date.now().toString().slice(-4)}`;
    
    const base64Data = imageData.replace(/^data:image\/png;base64,/, "");
    const imgFilename = `trade-${Date.now()}.png`;
    fs.writeFileSync(`./public/${imgFilename}`, base64Data, 'base64');

    // フロントマター構成をブログ一覧のカード認識ロジックに完全最適化
    // 確実にpipsバッジとサムネが動くパス形式
    const markdownContent = `---
title: "${title}"
date: "${date}"
image: "/${imgFilename}"
pips: "${pips.startsWith('+') || pips.startsWith('-') ? pips : '+' + pips}"
deployed: false
---

![チャート](/${imgFilename})

### トレードデータ
- **銘柄**: ${finalPair}
- **時間足**: ${timeframe}
- **環境設定**: ${finalVol}
- **結果**: ${pips}

### メモ
${content || '特記事項なし'}
`;

    fs.writeFileSync(path.join(postsDir, `${slug}.md`), markdownContent, 'utf-8');
    res.redirect('/');
});

app.post('/deploy-selected', (req, res) => {
    let filesToDeploy = req.body.files;
    if (!filesToDeploy) return res.redirect('/');
    if (!Array.isArray(filesToDeploy)) { filesToDeploy = [filesToDeploy]; }

    filesToDeploy.forEach(file => {
        const filePath = path.join(postsDir, file);
        let content = fs.readFileSync(filePath, 'utf-8');
        content = content.replace('deployed: false', 'deployed: true');
        fs.writeFileSync(filePath, content, 'utf-8');
    });

    console.log('⏳ 選択されたログをまとめてビルド＆デプロイ中...');
    exec('npm run build && npx wrangler pages deploy dist --project-name=trade-log', (err, stdout, stderr) => {
        if (err) {
            console.error(err);
            return res.send(`<h1>デプロイに失敗しました</h1><pre>${stderr}</pre>`);
        }
        exec('git add . && git commit -m "feat: regular card batch deploy" && git push origin main');
        res.send(`
            <div style="text-align:center; font-family:sans-serif; padding:50px; background:#0f172a; color:#fff; min-height:100vh;">
                <h1 style="color:#10B981; font-size: 2rem;">🎉 カード表示で一括デプロイが完了しました！</h1>
                <p style="color:#94a3b8; margin: 20px 0;">画像、pipsバッジ付きの綺麗なデザインカードとしてブログに反映されます。</p>
                <a href="/" style="display:inline-block; background:#2563EB; color:#fff; padding:10px 20px; border-radius:8px; text-decoration:none; font-weight:bold;">← 管理画面に戻る</a>
            </div>
        `);
    });
});

app.listen(3000, () => console.log('🟢 カード表示最適化版ダッシュボード稼働: http://localhost:3000'));
