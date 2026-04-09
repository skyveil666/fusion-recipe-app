// v1.1
import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

// ─── Supabase Client ───────────────────────────────────────────────────────────
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  console.log('✅ Supabase connected');
} else {
  console.log('⚠️  Supabase not configured – using in-memory store only');
}

// ─── Recipe Share Store (in-memory cache + Supabase persistence) ──────────────
const recipeCache = new Map(); // id -> { recipe, fusionParams }
const imageMap   = new Map(); // id -> imageBase64 (separate to keep list API light)

const SERVER_BASE = process.env.RAILWAY_PUBLIC_DOMAIN
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  : 'https://api-server-production-0f51.up.railway.app';

function generateId() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}

async function saveRecipe(id, recipe, fusionParams, imageBase64) {
  recipeCache.set(id, { recipe, fusionParams, createdAt: new Date().toISOString() });
  if (imageBase64) imageMap.set(id, imageBase64);
  if (supabase) {
    try {
      // store image inside recipe JSONB so no extra column needed
      const recipeToSave = imageBase64 ? { ...recipe, _img: imageBase64 } : recipe;
      const { error } = await supabase.from('recipes').insert({
        id,
        recipe: recipeToSave,
        fusion_params: fusionParams ?? null,
        created_at: new Date().toISOString(),
      });
      if (error) console.error('Supabase insert error:', error.message);
    } catch (err) {
      console.error('Supabase save error:', err);
    }
  }
}

async function getRecipe(id) {
  if (recipeCache.has(id)) return recipeCache.get(id);
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('recipe, fusion_params, created_at')
        .eq('id', id)
        .single();
      if (data && !error) {
        const { _img, ...recipeClean } = data.recipe ?? {};
        if (_img) imageMap.set(id, _img);
        const result = { recipe: recipeClean, fusionParams: data.fusion_params, createdAt: data.created_at };
        recipeCache.set(id, result);
        return result;
      }
    } catch (err) {
      console.error('Supabase get error:', err);
    }
  }
  return null;
}

async function getAllRecipes(limit = 60) {
  // Merge in-memory + Supabase, deduplicate by id
  const map = new Map();
  // From memory cache
  for (const [id, val] of recipeCache) map.set(id, { id, ...val });
  // From Supabase (newest first)
  if (supabase) {
    try {
      const { data } = await supabase
        .from('recipes')
        .select('id, recipe, fusion_params, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (data) {
        for (const row of data) {
          if (!map.has(row.id)) {
            const { _img, ...recipeClean } = row.recipe ?? {};
            if (_img && !imageMap.has(row.id)) imageMap.set(row.id, _img);
            map.set(row.id, { id: row.id, recipe: recipeClean, fusionParams: row.fusion_params, createdAt: row.created_at });
          }
        }
      }
    } catch (err) {
      console.error('Supabase list error:', err);
    }
  }
  return [...map.values()]
    .sort((a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0))
    .slice(0, limit);
}

// ─── Web Gallery Homepage ───────────────────────────────────────────────────────
app.get('/', async (req, res) => {
  const items = await getAllRecipes(60);
  const count = items.length;
  const cardsHtml = count === 0
    ? `<div class="empty"><div class="empty-emoji">🍳</div><p>まだ投稿されたレシピがありません。<br>アプリでレシピを生成してシェアしよう！</p></div>`
    : items.map(item => {
        const fp = item.fusionParams ?? {};
        const r  = item.recipe ?? {};
        const fusionTag = fp.country1 && fp.country2 ? `🌍 ${fp.country1} × ${fp.country2}` : '';
        const timeChip  = r.time     ? `<span class="meta-chip">⏱ ${r.time}</span>` : '';
        const calChip   = r.calories ? `<span class="meta-chip">🔥 ${r.calories}kcal</span>` : '';
        const hasImg    = imageMap.has(item.id);
        const imgTag    = hasImg
          ? `<img class="card-img" src="/recipe/${item.id}/image" loading="lazy" alt="">`
          : `<div class="card-img-placeholder"></div>`;
        return `<a class="card" href="/recipe/${item.id}">
          ${imgTag}
          <div class="card-body">
            ${fusionTag ? `<div class="fusion-tag">${fusionTag}</div>` : ''}
            <div class="card-title">${r.name ?? 'フュージョンレシピ'}</div>
            <div class="card-meta">${timeChip}${calChip}</div>
          </div>
        </a>`;
      }).join('');

  res.send(`<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>フュージョンレシピ | みんなの投稿</title>
  <meta name="description" content="世界の料理を組み合わせたAI生成フュージョンレシピ集">
  <meta property="og:title" content="フュージョンレシピ | みんなの投稿">
  <meta property="og:description" content="世界の料理を組み合わせたAI生成フュージョンレシピ集">
  <meta property="og:type" content="website">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Hiragino Sans,sans-serif;background:#f8f2e6;color:#1a1a1a}
    /* ── Header ── */
    header{background:#3a5a18;color:#fff;padding:14px 24px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;box-shadow:0 2px 12px rgba(0,0,0,.18)}
    .logo{display:flex;align-items:center;gap:10px}
    .logo-emoji{font-size:26px}
    .logo-text{font-size:15px;font-weight:800;letter-spacing:.3px}
    .logo-sub{font-size:10px;opacity:.7;margin-top:1px}
    .header-count{font-size:12px;background:rgba(255,255,255,.15);padding:4px 12px;border-radius:20px;white-space:nowrap}
    /* ── Hero ── */
    .hero{background:linear-gradient(135deg,#1e4010 0%,#3a7a20 60%,#5a9a30 100%);padding:52px 24px 44px;text-align:center;color:#fff}
    .hero h1{font-size:26px;font-weight:900;letter-spacing:.5px;margin-bottom:10px;line-height:1.3}
    .hero p{font-size:13px;opacity:.85;line-height:1.6}
    .hero-badge{display:inline-block;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);border-radius:20px;padding:5px 16px;font-size:11px;font-weight:700;margin-bottom:16px;letter-spacing:.5px}
    /* ── Gallery ── */
    .gallery{max-width:1100px;margin:0 auto;padding:28px 16px;display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}
    /* ── Card ── */
    .card{background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.07);transition:transform .2s,box-shadow .2s;cursor:pointer;text-decoration:none;color:inherit;display:block}
    .card:hover{transform:translateY(-5px);box-shadow:0 10px 28px rgba(0,0,0,.13)}
    .card-img{width:100%;height:180px;object-fit:cover;display:block}
    .card-img-placeholder{width:100%;height:180px;background:linear-gradient(135deg,#3a5a18 0%,#5a9a30 100%);display:flex;align-items:center;justify-content:center;font-size:48px}
    .card-img-placeholder::after{content:'🍽️'}
    .card-body{padding:14px}
    .fusion-tag{display:inline-block;background:#f0f7e6;color:#3a5a18;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;margin-bottom:8px;border:1px solid #c8e6a0}
    .card-title{font-size:13px;font-weight:700;line-height:1.55;margin-bottom:10px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;color:#1a1a1a}
    .card-meta{display:flex;gap:6px;flex-wrap:wrap}
    .meta-chip{background:#f8f2e6;color:#888;font-size:11px;padding:3px 9px;border-radius:10px}
    /* ── Empty ── */
    .empty{text-align:center;padding:80px 24px;color:#aaa;grid-column:1/-1}
    .empty-emoji{font-size:52px;margin-bottom:16px}
    .empty p{line-height:1.8;font-size:14px}
    /* ── App Banner ── */
    .app-banner{background:linear-gradient(135deg,#1e4010,#3a7a20);color:#fff;padding:40px 24px;text-align:center;margin-top:16px}
    .app-banner h2{font-size:18px;font-weight:800;margin-bottom:8px}
    .app-banner p{font-size:13px;opacity:.85;line-height:1.6;max-width:480px;margin:0 auto}
    footer{text-align:center;padding:28px;color:#bbb;font-size:12px}
    /* ── Responsive ── */
    @media(max-width:600px){
      .gallery{grid-template-columns:1fr 1fr;gap:10px;padding:16px 10px}
      .card-img,.card-img-placeholder{height:130px}
      .hero h1{font-size:20px}
      .hero{padding:36px 20px 32px}
      header{padding:12px 16px}
    }
  </style>
</head>
<body>
<header>
  <div class="logo">
    <span class="logo-emoji">🍽️</span>
    <div>
      <div class="logo-text">フュージョンレシピ</div>
      <div class="logo-sub">世界の味を組み合わせたレシピ集</div>
    </div>
  </div>
  <span class="header-count">${count}件投稿</span>
</header>

<div class="hero">
  <div class="hero-badge">✨ AI生成レシピギャラリー</div>
  <h1>🌍 みんなのフュージョンレシピ</h1>
  <p>世界各地の料理と地域食材を掛け合わせた<br>オリジナルレシピを発見しよう</p>
</div>

<div class="gallery">${cardsHtml}</div>

<div class="app-banner">
  <h2>📱 アプリで自分だけのレシピを生成しよう</h2>
  <p>2つの国・地域を選ぶだけで、AIがその土地の食材と文化を融合した<br>オリジナルフュージョンレシピを作成します</p>
</div>

<footer>フュージョンレシピ © 2025 · Made with ❤️ and AI</footer>
</body>
</html>`);
});

// ─── API: List all shared recipes (no images – lightweight) ──────────────────
app.get('/api/recipes', async (req, res) => {
  const items = await getAllRecipes(60);
  const result = items.map(item => ({
    id: item.id,
    recipe: {
      name: item.recipe?.name,
      time: item.recipe?.time,
      calories: item.recipe?.calories,
      description: item.recipe?.description,
      nutrition: item.recipe?.nutrition,
    },
    fusionParams: item.fusionParams,
    hasImage: imageMap.has(item.id),
    createdAt: item.createdAt,
  }));
  res.json(result);
});

// ─── Serve recipe image ────────────────────────────────────────────────────────
app.get('/recipe/:id/image', async (req, res) => {
  const id = req.params.id;
  // Check in-memory first
  if (!imageMap.has(id)) {
    // Try loading from Supabase
    await getRecipe(id); // this populates imageMap if _img exists
  }
  const b64 = imageMap.get(id);
  if (!b64) return res.status(404).send('No image');
  const buf = Buffer.from(b64, 'base64');
  res.set('Content-Type', 'image/jpeg');
  res.set('Cache-Control', 'public, max-age=86400');
  res.send(buf);
});

// Save recipe & get shareable URL
app.post('/api/recipe/share', async (req, res) => {
  const { recipe, fusionParams, imageBase64 } = req.body;
  if (!recipe) return res.status(400).json({ error: 'recipe is required' });
  const id = generateId();
  await saveRecipe(id, recipe, fusionParams, imageBase64 ?? null);
  res.json({ id, url: `${SERVER_BASE}/recipe/${id}` });
});

// Web page for shared recipe
app.get('/recipe/:id', async (req, res) => {
  const data = await getRecipe(req.params.id);
  if (!data) {
    return res.status(404).send(`<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><title>レシピが見つかりません</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8f2e6;}
    .box{text-align:center;padding:40px;}.emoji{font-size:48px;}.msg{color:#666;margin-top:16px;}</style>
    </head><body><div class="box"><div class="emoji">🍽️</div><div class="msg">このレシピは期限切れか見つかりませんでした</div></div></body></html>`);
  }
  const { recipe: r, fusionParams: fp } = data;
  const fusionLine = fp ? `<p class="fusion-tag">🌍 ${fp.country1} × ${fp.country2}</p>` : '';
  const ingredients = (r.ingredients || []).map(i =>
    `<li><span class="ing-name">${i.name}</span><span class="ing-amount">${i.amount}</span></li>`
  ).join('');
  const steps = (r.instructions || []).map((s, i) =>
    `<div class="step"><div class="step-num">${i + 1}</div><div class="step-text">${s}</div></div>`
  ).join('');
  const tipLabels = ['①', '②', '③'];
  const tips = (r.tips || []).map((tip, i) =>
    `<div class="tip-row"><div class="tip-badge">${tipLabels[i] ?? '+'}</div><div class="tip-text">${tip}</div></div>`
  ).join('');
  const timeChip = r.time ? `<span class="chip">⏱ ${r.time}</span>` : '';
  const calChip  = r.calories ? `<span class="chip">🔥 ${r.calories} kcal / 1人前</span>` : '';
  const shareUrl = `${SERVER_BASE}/recipe/${req.params.id}`;

  const ogDesc = (r.description || '').slice(0, 120);
  res.send(`<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <!-- OGP -->
  <meta property="og:type" content="article">
  <meta property="og:title" content="${r.name} | フュージョンレシピ">
  <meta property="og:description" content="${ogDesc}">
  <meta property="og:url" content="${shareUrl}">
  <meta property="og:image" content="${SERVER_BASE}/og-image.png">
  <meta property="og:site_name" content="フュージョンレシピ">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${r.name} | フュージョンレシピ">
  <meta name="twitter:description" content="${ogDesc}">
  <title>${r.name} | フュージョンレシピ</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8f2e6;color:#1a1a1a;max-width:600px;margin:0 auto}
    .header{background:#3a5a18;color:#fff;padding:14px 20px;display:flex;align-items:center;gap:10px}
    .header-logo{font-size:22px}.header-title{font-size:15px;font-weight:700}
    .hero{background:linear-gradient(135deg,#2d5a1b,#4a8a25);padding:24px 20px 20px;color:#fff}
    .recipe-name{font-size:20px;font-weight:800;line-height:1.4;margin-bottom:8px}
    .fusion-tag{font-size:12px;opacity:.8;margin-bottom:10px;letter-spacing:.3px}
    .recipe-desc{font-size:13px;opacity:.92;line-height:1.7}
    .chips{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap}
    .chip{background:rgba(255,255,255,.18);border-radius:20px;padding:4px 12px;font-size:12px;color:#fff;border:1px solid rgba(255,255,255,.25)}
    .nutri-wrap{background:#fff;margin:14px 14px 0;border-radius:16px;padding:12px 16px;box-shadow:0 2px 8px rgba(0,0,0,.06)}
    .nutri-label-top{font-size:10px;font-weight:700;color:#aaa;text-align:center;letter-spacing:.6px;margin-bottom:10px}
    .nutri{display:flex;gap:0}
    .nutri-item{flex:1;text-align:center;border-right:1px solid #f0f0f0}
    .nutri-item:last-child{border-right:none}
    .nutri-val{font-size:17px;font-weight:700}.nutri-unit{font-size:10px;font-weight:400}
    .nutri-lbl{font-size:10px;color:#999;margin-top:2px}
    .p-v{color:#4a8020}.f-v{color:#9040b0}.c-v{color:#2060c0}.k-v{color:#c87820}
    .section{background:#fff;margin:12px 14px;border-radius:16px;padding:16px;box-shadow:0 2px 8px rgba(0,0,0,.06)}
    .section-title{font-size:13px;font-weight:700;color:#333;margin-bottom:12px}
    ul.ings{list-style:none}
    ul.ings li{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f5f5f5;font-size:13px}
    ul.ings li:last-child{border-bottom:none}
    .ing-amount{color:#999;font-size:12px;flex-shrink:0;margin-left:8px}
    .step{display:flex;gap:12px;margin-bottom:14px}
    .step-num{width:24px;height:24px;border-radius:50%;background:#3a5a18;color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px}
    .step-text{font-size:13px;line-height:1.65;color:#333;flex:1}
    .tips-card{background:#fffbeb;margin:12px 14px;border-radius:16px;padding:16px;border:1px solid #fde68a}
    .tip-row{display:flex;gap:10px;margin-top:10px;align-items:flex-start}
    .tip-badge{width:22px;height:22px;border-radius:7px;background:#d97706;color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}
    .tip-text{font-size:12px;color:#78350f;line-height:1.6;flex:1}
    .share-section{background:#fff;margin:12px 14px;border-radius:16px;padding:16px;box-shadow:0 2px 8px rgba(0,0,0,.06);text-align:center}
    .share-url{font-size:11px;color:#aaa;word-break:break-all;margin-top:8px;padding:8px;background:#f8f8f8;border-radius:8px}
    .app-banner{background:linear-gradient(135deg,#2d5a1b,#4a8a25);color:#fff;margin:12px 14px;border-radius:16px;padding:20px;text-align:center}
    .app-banner p{font-size:12px;opacity:.85;margin-top:4px}
    .app-title{font-size:15px;font-weight:700}
    .footer{text-align:center;padding:20px;color:#bbb;font-size:11px}
  </style>
</head>
<body>
  <div class="header">
    <span class="header-logo">🍽️</span>
    <span class="header-title">フュージョンレシピ</span>
  </div>
  <div class="hero">
    <div class="recipe-name">${r.name}</div>
    ${fusionLine}
    <div class="recipe-desc">${r.description || ''}</div>
    <div class="chips">${timeChip}${calChip}</div>
  </div>
  ${r.nutrition ? `<div class="nutri-wrap">
    <div class="nutri-label-top">1人前あたり</div>
    <div class="nutri">
      <div class="nutri-item"><div class="nutri-val p-v">${r.nutrition.protein}<span class="nutri-unit">g</span></div><div class="nutri-lbl">タンパク質</div></div>
      <div class="nutri-item"><div class="nutri-val f-v">${r.nutrition.fat}<span class="nutri-unit">g</span></div><div class="nutri-lbl">脂質</div></div>
      <div class="nutri-item"><div class="nutri-val c-v">${r.nutrition.carbs}<span class="nutri-unit">g</span></div><div class="nutri-lbl">炭水化物</div></div>
      <div class="nutri-item"><div class="nutri-val k-v">${r.calories}<span class="nutri-unit">kcal</span></div><div class="nutri-lbl">カロリー</div></div>
    </div>
  </div>` : ''}
  <div class="section">
    <div class="section-title">🥕 材料</div>
    <ul class="ings">${ingredients}</ul>
  </div>
  <div class="section">
    <div class="section-title">👨‍🍳 作り方</div>
    ${steps}
  </div>
  ${tips ? `<div class="tips-card">
    <div class="section-title" style="margin-bottom:2px">💡 ワンポイントアドバイス</div>
    ${tips}
  </div>` : ''}
  <div class="share-section">
    <div class="section-title" style="margin-bottom:6px">🔗 このレシピのリンク</div>
    <div class="share-url">${shareUrl}</div>
  </div>
  <div class="app-banner">
    <div class="app-title">📱 フュージョンレシピ アプリ</div>
    <p>世界の料理を組み合わせたオリジナルレシピを毎回生成！</p>
  </div>
  <div class="footer">フュージョンレシピ © 2025 · レシピは30日間保存されます</div>
</body>
</html>`);
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ─── Ingredient Info (for popup) ───────────────────────────────────────────────
const ingredientCache = new Map();

app.get('/api/ingredient', async (req, res) => {
  const name = (req.query.name || '').trim();
  if (!name) return res.status(400).json({ error: 'name is required' });

  if (ingredientCache.has(name)) return res.json(ingredientCache.get(name));

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(
      `食材「${name}」について、料理初心者向けに以下のJSON形式で回答してください。コードフェンスなし、JSONのみ:
{
  "description": "2〜3文の短い説明（食感・香り・どんな料理に使うか）",
  "season": "旬の時期（例:「3月〜5月」「9月〜11月・3月〜4月」「通年流通」）",
  "substitute": "代用できる食材を2〜3種類、読点で区切って必ず記載すること（例:「めかぶ、もずく」「パセリ、フェンネル」）。どうしても代用がない場合のみ「なし」と書く。nullは禁止。",
  "searchKeyword": "Wikipedia英語版で検索する英語名（1〜3単語、食材の正確な名称）",
  "jaSearchKeyword": "Wikipedia日本語版で検索する日本語名（食材の正式名称・漢字表記）",
  "rarity": "common|uncommon|rare"
}`
    );
    const text = result.response.text().trim();
    const match = text.match(/\{[\s\S]*\}/);
    const info = JSON.parse(match ? match[0] : text);

    // ── Wikipedia からリアル写真を取得 ──────────────────────────────
    let imageUrl = null;

    // 日本語 Wikipedia を優先
    if (info.jaSearchKeyword) {
      try {
        const jaRes = await fetch(
          `https://ja.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(info.jaSearchKeyword)}&prop=pageimages&format=json&pithumbsize=600`
        );
        const jaData = await jaRes.json();
        const jaPage = Object.values(jaData.query?.pages || {})[0];
        if (jaPage?.thumbnail?.source) imageUrl = jaPage.thumbnail.source;
      } catch { /* ignore */ }
    }

    // 英語 Wikipedia にフォールバック
    if (!imageUrl && info.searchKeyword) {
      try {
        const enRes = await fetch(
          `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(info.searchKeyword)}&prop=pageimages&format=json&pithumbsize=600`
        );
        const enData = await enRes.json();
        const enPage = Object.values(enData.query?.pages || {})[0];
        if (enPage?.thumbnail?.source) imageUrl = enPage.thumbnail.source;
      } catch { /* ignore */ }
    }

    const finalInfo = { ...info, imageUrl };
    ingredientCache.set(name, finalInfo);
    res.json(finalInfo);
  } catch (err) {
    console.error('Ingredient info error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Ingredient Detection via Vision ──────────────────────────────────────────
app.post('/api/detect', async (req, res) => {
  try {
    const { imageBase64, mediaType = 'image/jpeg' } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'imageBase64 is required' });

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const result = await model.generateContent([
      {
        inlineData: {
          data: imageBase64,
          mimeType: mediaType,
        },
      },
      `この画像に写っている食材・食品をすべて特定してください。冷蔵庫の中身、食材、食品などを漏れなくリストアップしてください。
必ず以下のJSON配列形式のみで返答してください。他のテキストや説明は一切含めないでください:
["食材1", "食材2", "食材3"]
日本語で食材名を返してください。`,
    ]);

    const text = result.response.text().trim();
    let ingredients;
    try {
      const match = text.match(/\[[\s\S]*?\]/);
      ingredients = JSON.parse(match ? match[0] : text);
    } catch {
      ingredients = text
        .replace(/[\[\]"]/g, '')
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
    }

    res.json({ ingredients });
  } catch (error) {
    console.error('Detection error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── Recipe Generation ─────────────────────────────────────────────────────────
app.post('/api/recipe', async (req, res) => {
  try {
    const { type, params } = req.body;
    if (!type || !params) return res.status(400).json({ error: 'type and params are required' });

    const allergies = params.allergies || [];
    const dislikes = params.dislikes || [];
    const avoidMethods = params.avoidMethods || [];
    // ─── 味の好みクローズ ─────────────────────────────────────────────────────
    const tastePrefs = params.tastePrefs || null;
    let tasteClause = '';
    if (tastePrefs) {
      const tasteParts = [];
      const { sweetness, spiciness, sourness, richness } = tastePrefs;

      if (sweetness === '甘め') {
        tasteParts.push('- 甘み【甘め】: 砂糖・みりん・はちみつ・甘味噌など甘みのある調味料や食材をやや多めに使い、全体的に甘みを感じられる仕上がりにすること');
      } else if (sweetness === 'ひかえめ') {
        tasteParts.push('- 甘み【ひかえめ】: 砂糖・みりんなど甘みのある調味料は最小限に抑え、甘さを感じさせないすっきりした味わいにすること');
      }

      if (spiciness === 'しっかり') {
        tasteParts.push('- 辛み【しっかり】: 唐辛子・一味・七味・コチュジャン・豆板醤・わさびなど辛味のある食材・調味料を積極的に使い、辛さをしっかり感じる味付けにすること');
      } else if (spiciness === 'ひかえめ') {
        tasteParts.push('- 辛み【ひかえめ】: ごくわずかな辛味を加える程度にとどめ、辛さが苦手な人でも食べやすい範囲にすること');
      }
      // spiciness === 'なし' は何も追加しない

      if (sourness === 'しっかり') {
        tasteParts.push('- 酸味【しっかり】: 酢・レモン汁・柑橘果汁・トマトなど酸味のある食材・調味料を積極的に活用し、酸味が引き立つ爽やかな味付けにすること');
      } else if (sourness === '少し') {
        tasteParts.push('- 酸味【少し】: 酢やレモン汁など少量を仕上げに加え、ほんのりと酸味を感じる程度の爽やかさを出すこと');
      }
      // sourness === 'なし' は何も追加しない

      if (richness === 'しっかり') {
        tasteParts.push('- 味の濃さ【しっかり】: 調味料をしっかり効かせ、満足感とコクのある濃いめの味付けにすること');
      } else if (richness === 'あっさり') {
        tasteParts.push('- 味の濃さ【あっさり】: 調味料・油・塩分を控えめにして、軽くさっぱりとした口当たりの味付けにすること');
      }
      // richness === 'ふつう' は何も追加しない

      if (tasteParts.length > 0) {
        tasteClause = `\n🎨 【味の好み（ユーザー設定・必ず反映すること）】\n以下の好みに合わせて味の方向を調整してください。料理の成立を最優先にしつつ、ベースの料理に合う範囲で反映すること:\n${tasteParts.join('\n')}`;
      }
    }

    let allergyClause = '';
    if (allergies.length > 0) {
      allergyClause += `\n⚠️ 【絶対禁止 – アレルギー除外】以下の食材・成分・派生物は材料にも工程にも調味料にも一切含めないこと: ${allergies.join('、')}`;
    }
    if (dislikes.length > 0) {
      allergyClause += `\n🚫 【嫌いな食材 – 可能な限り除外】: ${dislikes.join('、')}`;
    }
    if (avoidMethods.length > 0) {
      allergyClause += `\n🚫 【避けたい調理法・条件 – 可能な限り除外】: ${avoidMethods.join('、')}`;
    }

    let userPrompt;

    if (type === 'arrange') {
      const { recipe: base, fusionParams: fp } = params;
      const baseIngredients = (base.ingredients || []).map(i => `${i.name}(${i.amount})`).join('、');
      const baseInstructions = (base.instructions || []).map((s, i) => `${i+1}. ${s}`).join('\n');

      const keepClause = fp ? `
★ 以下の要素は必ず維持すること：
  - 料理スタイル1: ${fp.country1}料理
  - 料理スタイル2: ${fp.country2}料理
  - 料理カテゴリー: ${fp.category || '主菜'}
  - 人数: ${fp.servings || '2人前'}${fp.cookingTime ? `\n  - 調理時間の目安: ${fp.cookingTime}以内` : ''}` : '';

      userPrompt = `あなたはプロの創作料理家です。以下のベースレシピの「アレンジバージョン」を1つ作成してください。

【絶対ルール】
★ 元レシピを完全に作り直すことは禁止。「少し違うバージョン」にすること
★ 以下の中から1〜3要素だけ変更する：
  - 味付け（例：あっさり → スパイシー、和風 → こってり）
  - 一部の食材（1〜2品だけ差し替え。大幅な変更は禁止）
  - 調理方法の一部（焼く → 炒める など軽微な変更のみ）
  - ソース・トッピング・仕上げの変更や追加
★ 元レシピと「似ているが違う」と分かる内容にすること
★ 完全に別の料理にならないこと
★ 料理名は元の名前をベースに「〜アレンジ」「スパイシー〜」など軽微な変更にすること${keepClause}

【ベースレシピ（これを元にする）】
料理名: ${base.name}
説明: ${base.description}
食材: ${baseIngredients}
調理手順:
${baseInstructions}${allergyClause}`;
    } else if (type === 'fusion') {
      const { country1, country2, category, servings, ingredients, isPfcEnabled, pfc, cookingTime, pfcPreset } = params;

      // PFCプリセット・スタイル指示
      let pfcClause = '';
      if (pfcPreset === 'hearty') {
        pfcClause = `\n🍖 【がっつりモード（制限なし）】\n- PFCバランスやカロリー制限は一切考慮しない\n- ボリューム・食べ応え・満足感を最優先にする\n- 肉料理・濃いタレ・揚げ物・こってり味付けも積極的に使う\n- 「とにかくお腹いっぱい食べたい」料理を作る`;
      } else if (pfcPreset === 'protein') {
        pfcClause = `\n💪 【高タンパクモード】\n- 鶏胸肉・魚・大豆製品・卵など高タンパク食材を積極的に使う\n- 脂質は控えめ、炭水化物はやや少なめに\n- 筋トレ・ボディメイクに適したレシピにする\n- タンパク質を意識した食材選びと調理法を優先`;
      } else if (pfcPreset === 'healthy') {
        pfcClause = `\n🥗 【ヘルシーモード】\n- 野菜・きのこ・豆類・海藻類を中心に使う\n- 油の使用は最小限（蒸す・煮る・和えるなどを優先）\n- あっさりした味付けで、カロリーは自然と低めになる構成\n- 食物繊維が豊富な食材を積極的に取り入れる`;
      } else if (isPfcEnabled && pfc) {
        pfcClause = `\n- PFCバランス目標: タンパク質 ${pfc.p}%、脂質 ${pfc.f}%、炭水化物 ${pfc.c}%（できるだけ近い栄養バランスにすること）`;
      }

      // 調理時間ごとの詳細指示
      const cookingTimeClause = cookingTime ? (() => {
        const guides = {
          '10分': `\n⏱️ 【調理時間：10分以内（厳守）】\n- 材料は5〜6品目以内に絞ること\n- 工程は3〜4ステップ以内のシンプルな構成にすること\n- 下ごしらえ（水切り・マリネ・長時間浸水など）は一切不可\n- 長時間の煮込み・焼成・蒸し・揚げは不可\n- 電子レンジ・フライパン調理・和えるだけなど時短調理法を優先\n- 生成するレシピの"time"フィールドは必ず10分以内の値にすること`,
          '20分': `\n⏱️ 【調理時間：20分程度】\n- 材料は6〜8品目程度\n- 工程は4〜5ステップの比較的簡単な構成\n- 簡単な下ごしらえ（切る・混ぜる）は可、長時間仕込みは不可\n- 一般的な家庭料理レベルの複雑さにすること\n- 生成するレシピの"time"フィールドは必ず20分前後の値にすること`,
          '30分': `\n⏱️ 【調理時間：30分程度】\n- 材料は8〜10品目程度\n- 工程は5〜7ステップの標準的な構成\n- 炒める・煮る・焼くなど一般的な調理法を使ってよい\n- ある程度しっかり作り込んだレシピにすること\n- 生成するレシピの"time"フィールドは必ず30分前後の値にすること`,
          '45分': `\n⏱️ 【調理時間：45分程度】\n- 材料は10品目以上でも可\n- 工程は7ステップ以上の本格的な構成も許容\n- 軽い漬け込み・煮込み・オーブン調理など手をかけた工程も可\n- 本格的で満足感の高いレシピにすること\n- 生成するレシピの"time"フィールドは必ず45分前後の値にすること`,
        };
        return guides[cookingTime] || '';
      })() : '';

      const moodLine = pfcPreset === 'hearty'
        ? `今日はがっつり食べたい気分ですね。満足感・ボリューム・食べ応えを最大限に引き出した一皿を作ってください。`
        : pfcPreset === 'protein'
        ? `身体を鍛える高タンパク志向に応えます。鶏胸肉・魚・大豆製品を主役に、食べて強くなれる一皿を作ってください。`
        : pfcPreset === 'healthy'
        ? `体を労わるヘルシーな気分に寄り添います。野菜を主役に、心まで洗われるあっさりした一皿を作ってください。`
        : `バランスよく食べることを大切に。体にも心にも優しい、毎日食べたくなる一皿を作ってください。`;

      userPrompt = `あなたはプロの創作料理家・地域文化ガイドです。以下の条件でユニークなフュージョンレシピを1つ作成してください。

【タイトルの作り方（必須・厳守）】
料理名は必ず以下の構造を持つ「物語風タイトル」にしてください。
構造: 「${country1}の具体的な地名・名所・景色・文化への言及」＋「${country2}ゆかりの食材や調理法の固有名詞」＋「料理スタイル」
良い例:
- 「南信州・飯田の満天の星空をイメージした、市田柿とブラジルカカオのテリーヌ」
- 「天竜峡の川面を渡る風のような、信州味噌とイタリアンハーブの爽やかグリル」
- 「元善光寺の静寂に寄り添う、地元の野沢菜と情熱のパエリア風ピラフ」
禁止: 「〜風フュージョン」「〜×〜」などの無機質なタイトル。必ず情景が浮かぶ表現にすること。

【紹介文の作り方（厳守）】
★ 必ず2文のみ（3文以上は禁止、改行・段落分けは一切不可）
1文目: ${country1}と${country2}を組み合わせた理由と、料理の味・香り・食感のイメージ
2文目: ${moodLine}（モード・気分への言及を必ず含める）

【地域要素の使い方（最重要・必ずこの方針で考えること）】
★ 超マニアック・ディープな地域食材を優先すること（重要）
  - 「長野＝信州味噌・りんご」「沖縄＝豚・ゴーヤ」など有名すぎる食材は極力避ける
  - その地域の産直市場・道の駅・郷土料理にしか登場しないような珍しい食材を発掘して使う
  - 地元の人しか知らない・全国流通していない特産物・伝統食材を積極的に選ぶ
  - 例（長野なら）: すんき漬け・凍り豆腐・山ごぼう・寒天・花豆・むかご・こごみ・あけびの皮・ざざむし・市田柿・霧下そば粉など
  - 毎回同じ食材を出さず、その地域の多様な食材の中から「今回だけの発見」を届けること

★ 地域の代表食材1つだけに頼ることを禁止。以下の幅広い観点から地域性を表現すること:
  ・特産物・郷土食材（主食材・副食材どちらでもよい）
  ・果物・発酵食品・乾物・伝統菓子・郷土調味料・山菜・きのこ・川魚・郷土漬物
  ・地域の気候・季節感・景色のイメージをレシピの雰囲気に反映
  ・観光地・文化・歴史的背景をタイトルや説明に込める

★ 地域食材はレシピ内のどの位置に使ってもよい（柔軟に活用すること）:
  ・主食材 / 副食材 / 下味・マリネ / ソース・たれ / 添え物・つけ合わせ
  ・隠し味・仕上げ調味料 / トッピング・彩り / 香りづけ・風味付け

★ カテゴリーの役割は必ず守ること（主菜なら主菜、デザートならデザート）
  ただし、そのカテゴリーの中で地域食材をどこに使うかは自由
  例:
  - 主菜でも → 地域の果物をソースや隠し味に使う
  - 主菜でも → 地域の郷土菓子の風味を仕上げに取り入れる
  - デザートでも → 地域の発酵食品を生地やクリームに混ぜる

★ ${country1}の地域食材を深く発掘すること（有名すぎる食材は避け、珍しい食材を選ぶ）:
  特産物・郷土食材・果物・発酵食品・乾物・伝統菓子・山菜・川魚・漬物・香辛料・地場調味料
★ ${country2}の地域要素（同様に幅広く・マニアックに）:
  その国・地域の調理法・スパイス・ハーブ・代表的な料理スタイル・発酵食品・ソース・伝統食材

【栄養情報（必須）】
nutrition と calories は必ず「1人前あたり」の数値で記載してください。

【作り方（必須）】
各工程は火加減（強火/中火/弱火）・加熱時間の目安・確認ポイントを含めた詳細な説明にすること。
工程数は最低5ステップ以上にすること。

【ワンポイントアドバイス（必須・3件・必ずtips配列に含めること）】
tips[0]: 時短・効率化の具体的アドバイス（「〜を前日に準備しておくと当日5分短縮になります」「市販の〜を使うと手間が省けます」など）
tips[1]: 隠し味・代用食材の具体的アドバイス（「〜を少量加えるとコクが格段にアップします」「〜の代わりに〜を使っても美味しく作れます」など）
tips[2]: 保存方法・アレンジの具体的アドバイス（「冷蔵庫で〜日間保存できます」「残ったら翌日〜にアレンジするとまた楽しめます」など）

【条件（すべて厳守）】
- 料理スタイル1: ${country1}料理
- 料理スタイル2: ${country2}料理
- 料理カテゴリー: ${category || '主菜'}（このカテゴリーの役割を外さないこと）
- 人数: ${servings || '2人前'}
${ingredients && ingredients.length > 0 ? `- 使いたい食材（必ず活用すること）: ${ingredients.join('、')}` : ''}${pfcClause}${cookingTimeClause}${allergyClause}`;
    } else if (type === 'single') {
      const { country1, category, servings, ingredients, cookingTime, cookingStyle } = params;
      const ctClause = cookingTime ? ({ '10分': '\n⏱️【10分以内厳守】材料5品目以内、工程3〜4ステップ、時短調理法優先。', '20分': '\n⏱️【20分程度】材料6〜8品目、工程4〜5ステップ。', '30分': '\n⏱️【30分程度】材料8〜10品目、工程5〜7ステップ。', '45分': '\n⏱️【45分程度】本格的な構成、工程7ステップ以上も可。' }[cookingTime] || '') : '';
      const csClause = cookingStyle ? `\n- 料理スタイル: 【${cookingStyle}】の味付け・調理法・雰囲気を取り入れること` : '';
      userPrompt = `あなたはプロの創作料理家・地域文化ガイドです。${country1}の食文化・地域食材を活かしたユニークなレシピを1つ作成してください。

【タイトル（必須）】「${country1}の地名・名所・景色・文化への言及」＋「食材の特徴」＋「料理スタイル」で物語風タイトル。
【紹介文（必須・2文のみ）】1文目: ${country1}の食文化の魅力と料理の味・香りのイメージ。2文目: この料理を食べる幸せへの言及。
【地域食材】${country1}の超マニアックな特産物・郷土食材・発酵食品・伝統菓子などを幅広く活用。一般的に有名な食材は避け、珍しい地域食材を優先。主材料・ソース・隠し味・添え物など様々な形で地域性を表現。
【条件】- カテゴリー: ${category || '主菜'} - 人数: ${servings || '2人前'}${ingredients && ingredients.length > 0 ? ` - 使いたい食材: ${ingredients.join('、')}` : ''}${csClause}${ctClause}${tasteClause}${allergyClause}`;

    } else if (type === 'photo') {
      const { ingredients, servings } = params;
      const ingList = ingredients && ingredients.length > 0 ? ingredients.join('、') : '手元にある食材';
      userPrompt = `あなたは家庭料理の専門家です。以下の食材を使って、15分以内で作れる簡単な一品料理を1つ提案してください。

【使える食材（必ず優先して使うこと）】${ingList}

【厳守ルール】
- 調理時間は必ず15分以内（これは絶対条件）
- 調理工程は2〜4ステップのみ（シンプルに）
- 調味料は家庭によくある基本調味料のみ（醤油・みりん・砂糖・塩・ごま油・酢・バター・マヨネーズ・ポン酢など）を2〜4種類程度に絞る
- 揚げ物・オーブン料理・長時間の煮込み（15分超）は禁止
- がっつりしたメイン料理ではなく、おつまみ・副菜・小鉢・軽い一品にする
- 以下のような手軽な料理スタイルを参考に:
  冷ややっこ・卵焼き・和え物・おひたし・ナムル・炒め物・浅漬け・蒸し料理・巻き物・チーズ焼き

【タイトル】誰でも分かる、シンプルで親しみやすい料理名にする（難しい漢字・専門用語は避ける）
【紹介文（2文のみ）】1文目: この一品の味と食感を簡単に表現。2文目: 「15分以内」「手軽」を感じさせる一文。
【工程の書き方】各工程は簡潔に1〜2行で。専門的な技法は使わず、初心者でも分かる表現にする。
【条件】- 人数: ${servings || '2人前'}${allergyClause}`;

    } else if (type === 'seasonal') {
      const { season, seasonalIngredients, country1, category, servings, cookingTime } = params;
      const ctClause = cookingTime ? ({ '10分': '\n⏱️【10分以内厳守】材料5品目以内、工程3〜4ステップ、時短調理法を優先。', '20分': '\n⏱️【20分程度】材料6〜8品目、工程4〜5ステップ。', '30分': '\n⏱️【30分程度】材料8〜10品目、工程5〜7ステップ。', '45分': '\n⏱️【45分程度】本格的な構成、工程7ステップ以上も可。' }[cookingTime] || '') : '';
      const styleClause = country1
        ? `- ${country1}の調味料・調理技法をさりげなく一部取り入れてよい（あくまで「旬の食材レシピ」の範囲内で自然に）\n- ただし二か国フュージョン・異文化ミックス感が強い表現は絶対に使わない`
        : `- 日本の伝統的な調理技法（煮る・蒸す・焼く・和える・炊く）を基本に、家庭で作りやすくまとめること\n- 旬食材の素材感・香り・食感を活かすシンプルな美味しさを大切にする`;
      userPrompt = `あなたはプロの日本料理家・季節料理の専門家です。${season}に旬を迎える食材を主役にした、家庭で作りやすい自然なレシピを1つ作成してください。

【旬の食材（必須）】以下から1〜2種を必ず主役として使用すること: ${(seasonalIngredients || []).join('、')}

【タイトル（必須）】
- ${season}の季節感と旬食材の魅力が一目で伝わる、情緒ある日本語タイトルにすること
- 良い例: 「春菊と新玉ねぎのやさしい白和え」「夏の完熟トマトと豆腐の冷製だし浸し」「秋鮭と舞茸の炊き込みごはん」
- 禁止: フュージョン・異文化ミックスを前提とした表現、「〜×〜」「〜風フュージョン」などのタイトル

【紹介文（2文のみ・改行なし・厳守）】
1文目: 旬食材の香り・食感・甘み・みずみずしさの魅力と、この料理の味のイメージ
2文目: ${season}の季節感への言及と、この料理を食べることへの喜び

【料理スタイル（厳守）】
${styleClause}
- 季節感・旬の食材を主役にした、家庭で親しみやすい料理にすること
- 素材の良さが引き立つ調理法を優先し、無理な演出や複雑な手順は避ける

【条件】
- カテゴリー: ${category || '主菜'}
- 人数: ${servings || '2人前'}${ctClause}${tasteClause}${allergyClause}`;

    } else if (type === 'pfc') {
      const { pfcPreset, customPfc, ingredients, servings, cookingTime } = params;
      const ctClause = cookingTime ? ({ '10分': '\n⏱️【10分以内厳守】材料5品目以内、工程3〜4ステップ。', '20分': '\n⏱️【20分程度】材料6〜8品目、工程4〜5ステップ。', '30分': '\n⏱️【30分程度】材料8〜10品目、工程5〜7ステップ。', '45分': '\n⏱️【45分程度】本格的な構成。' }[cookingTime] || '') : '';
      const pfcMoodLine = pfcPreset === 'hearty' ? 'がっつり食べたい気分に応えます。ボリューム・満足感を最優先で。' : pfcPreset === 'protein' ? '高タンパク志向に応えます。鶏胸肉・魚・大豆製品を主役に食べて強くなれる一皿を。' : pfcPreset === 'healthy' ? 'ヘルシーな気分に寄り添います。野菜を主役にあっさりとした一皿を。' : 'バランスよく食べることを大切に。体にも心にも優しい一皿を。';
      const pfcModeClause = pfcPreset === 'hearty' ? '🍖【がっつりモード】PFC制限なし。ボリューム・食べ応えを最優先。濃いタレ・こってり味付けも積極的に。' : pfcPreset === 'protein' ? '💪【高タンパクモード】鶏胸肉・魚・大豆製品・卵を積極的に使う。脂質控えめ・炭水化物やや少なめ。' : pfcPreset === 'healthy' ? '🥗【ヘルシーモード】野菜・きのこ・豆類・海藻類を中心に。油の使用は最小限。カロリーは自然と低めに。' : '⚖️【バランスモード】P/F/Cのバランスを意識した体に優しいレシピ。';
      const customPfcClause = customPfc
        ? `\n🎯【カスタムPFC目標】たんぱく質 ${customPfc.p}%・脂質 ${customPfc.f}%・炭水化物 ${customPfc.c}%（この比率にできるだけ近づけること）`
        : '';
      userPrompt = `あなたはプロの管理栄養士・料理家です。${pfcMoodLine}栄養バランスを考慮した美味しいレシピを1つ作成してください。

【タイトル（必須）】料理の魅力と栄養コンセプトが伝わる物語風タイトル。
【紹介文（必須・2文のみ）】1文目: 料理の味・食感・香りのイメージ。2文目: 栄養面のメリットへの言及。
【${pfcModeClause}】${customPfcClause}
【条件】- カテゴリー: 主菜 - 人数: ${servings || '2人前'}${ingredients && ingredients.length > 0 ? ` - 使いたい食材: ${ingredients.join('、')}` : ''}${ctClause}${allergyClause}`;

    } else if (type === 'dish_fusion') {
      const { dishName, addIngredient, cookingTime, servings, lessSeasoning, homeIngredients, lessSteps } = params;
      const ctMap = { '10分': '10分以内', '15分': '15分以内', '20分': '20分以内' };
      const ctLabel = ctMap[cookingTime] || '15分以内';
      const optionClauses = [];
      if (lessSeasoning) optionClauses.push('- 調味料は醤油・みりん・塩・砂糖・ごま油・バター・マヨネーズなど家庭にある基本のものを2〜4種類のみに絞ること');
      if (homeIngredients) optionClauses.push('- 買い足す食材は最小限にして、家庭によくある食材を優先すること');
      if (lessSteps) optionClauses.push('- 調理工程は2〜4ステップのシンプルな構成にすること');
      const optClause = optionClauses.length > 0 ? `\n【追加条件】\n${optionClauses.join('\n')}` : '';
      userPrompt = `あなたは家庭料理の専門家です。「${dishName}」に「${addIngredient}」を加えた、ちょっと意外だけど家庭でちゃんと作れる新しい一皿のレシピを1つ作ってください。

【コンセプト】
- 「${dishName}」の雰囲気・ベース味は残しながら、「${addIngredient}」が自然に活きる内容にする
- 「意外な組み合わせだけど確かにおいしそう」と思える、遊び心と実用性を両立した料理にする
- 揚げ物・オーブン料理・長時間煮込み・特殊な調理器具を使う料理は禁止
- 初心者や高齢の方でも「これならできそう」と思える現実的な内容にする

【厳守ルール】
- 調理時間は${ctLabel}（絶対条件）
- 家庭で普通に作れるレシピにする（特殊な道具不要）${optClause}

【タイトル】親しみやすく、ちょっとワクワクする料理名にする（難しい漢字・専門用語は避ける）
【紹介文（2文のみ）】1文目: この料理の味と食感のイメージ。2文目: 「${cookingTime}」「簡単」を感じさせる一文。
【条件】- 人数: ${servings || '2人前'}${tasteClause}${allergyClause}`;

    } else if (type === 'leftover') {
      const { leftoverText, leftoverType, cookingTime, servings, lessSeasoning, homeIngredients, lessSteps, excludeList } = params;
      const ctMap = { '5分': '5分以内', '10分': '10分以内', '15分': '15分以内', '20分': '20分以内' };
      const ctLabel = ctMap[cookingTime] || '15分以内';
      const optionClauses = [];
      if (lessSeasoning) optionClauses.push('- 調味料は醤油・みりん・塩・砂糖・ごま油・バター・マヨネーズなど家庭にある基本のものを2〜4種類のみに絞ること');
      if (homeIngredients) optionClauses.push('- 買い足す食材は最小限にして、家庭によくある食材を優先すること');
      if (lessSteps) optionClauses.push('- 調理工程は2〜4ステップのシンプルな構成にし、洗い物も少なくすること');
      const optClause = optionClauses.length > 0 ? `\n【追加条件】\n${optionClauses.join('\n')}` : '';
      const typeGuide = {
        '生もの': '生もの・刺身・鮮魚は必ず加熱を前提とすること。そのまま再利用するレシピは禁止。',
        '汁もの': '鍋・スープの残りは再加熱を前提とし、雑炊・うどん・スープ系のアレンジを中心に考えること。',
        'おかず': '煮物・焼き物・炒め物の残りを卵とじ・炒め物・混ぜご飯など別の形にアレンジすること。',
        'ご飯・麺': 'ご飯・麺の残りは炒め物・スープ・おにぎり風など食感や食べ方が変わるアレンジにすること。',
        '野菜系': '野菜の残りや野菜メインのおかずは、炒め物・スープ・混ぜ物など汎用的なアレンジにすること。',
      };
      const safetyClause = typeGuide[leftoverType] || '';
      const excludeClause = excludeList && excludeList.length > 0 ? `\n- 以下は使わないこと: ${excludeList.join('、')}` : '';
      userPrompt = `あなたは家庭料理の専門家です。「${leftoverText}」（種類: ${leftoverType}）を使って、次の日に別の一品として食べられるアレンジレシピを1つ作ってください。

【コンセプト】
- 元の残り物をそのまま出すのではなく、少し違う料理・食べ方に変える
- 「もったいない」を「おいしい」に変える発想で、家庭で誰でもすぐ作れる内容にする
- 若い人から高齢の方まで食べやすい、実用的な一品にする
- 揚げ物・オーブン料理・長時間煮込みは禁止

【安全性ルール】
- ${safetyClause}
- 古い食材をそのまま生で使うレシピは禁止
- 無理に危険なアレンジは提案しない

【厳守ルール】
- 調理時間は${ctLabel}（絶対条件）
- 家庭で普通に作れるレシピにする（特殊な道具不要）${optClause}${excludeClause}

【タイトル】親しみやすく、アレンジ感が伝わる料理名にする（難しい漢字・専門用語は避ける）
【紹介文（2文のみ）】1文目: この料理の味・食感のイメージ。2文目: 「${cookingTime}」「残り物活用」を感じさせる一文。
【条件】- 人数: ${servings}${allergyClause}`;

    } else if (type === 'microwave') {
      const { ingredientText, cookingTime, servings, lessSeasoning, homeIngredients, lessWashing, cleanHands, excludeList } = params;
      const ctLabel = cookingTime === '5分' ? '5分以内' : '10分以内';
      const optionClauses = [];
      if (lessSeasoning) optionClauses.push('- 調味料は醤油・みりん・塩・砂糖・ごま油・バターなど家庭にある基本のものを2〜4種類のみに絞ること');
      if (homeIngredients) optionClauses.push('- 買い足す食材は最小限にして、家庭によくある食材を優先すること');
      if (lessWashing) optionClauses.push('- 使う器具・容器はできるだけ1つの耐熱容器や皿で完結させること。洗い物を増やさない');
      if (cleanHands) optionClauses.push('- こねる・まぶす・包む・衣をつけるなど手作業が多い工程は禁止。箸やスプーンで混ぜる程度の手軽さにすること');
      const optClause = optionClauses.length > 0 ? `\n【追加条件】\n${optionClauses.join('\n')}` : '';
      const excludeClause = excludeList && excludeList.length > 0 ? `\n- 以下は使わないこと: ${excludeList.join('、')}` : '';
      userPrompt = `あなたは電子レンジ料理の専門家です。「${ingredientText}」を使って、電子レンジだけで作れる簡単な一品料理のレシピを1つ作ってください。

【絶対ルール】
- 電子レンジのみを使うこと。コンロ・オーブン・トースター・直火は一切使わない
- 調理時間は${ctLabel}（電子レンジ加熱時間＋下ごしらえの合計）
- 揚げ物・長時間加熱・手でこねる工程は禁止
- 副菜・小鉢・おつまみ・簡単おかずを優先すること

【コンセプト】
- 「今すぐ一品ほしい」を解決する実用的なレシピにする
- 若い人から高齢の方まで失敗しにくい内容にする
- 家庭にある食材・調味料だけで作れることを意識する
- 後片付けのラクさまで含めて価値を出す${optClause}${excludeClause}

【タイトル】親しみやすく、レンジ調理感が伝わる料理名にする（難しい漢字・専門用語は避ける）
【紹介文（2文のみ）】1文目: この料理の味・食感のイメージ。2文目: 「${cookingTime}」「電子レンジだけ」を感じさせる一文。
【条件】- 人数: ${servings}${allergyClause}`;

    } else {
      const { ingredients, category, servings } = params;
      userPrompt = `あなたはプロの料理家です。以下の条件でレシピを1つ作成してください。

【条件】
- 使用する食材（メインに使うこと）: ${ingredients.join('、')}
- 料理カテゴリー: ${category || '主菜'}
- 人数: ${servings || '2人前'}${allergyClause}`;
    }

    const schemaInstructions = `

【重要】必ず以下のJSON形式のみで返答してください。コードフェンス・説明文は一切不要です。tipsは必ず3件、実際のアドバイス文章を記述すること（スキーマの説明文をそのまま返すのは禁止）:

{
  "name": "（物語風タイトルをここに記述）",
  "description": "（2文のみ・改行なし）",
  "calories": 000,
  "time": "○○分",
  "nutrition": {
    "protein": 00,
    "fat": 00,
    "carbs": 00
  },
  "ingredients": [
    { "name": "食材名", "amount": "量" }
  ],
  "instructions": [
    "手順1の詳細（火加減・時間・確認ポイント含む）",
    "手順2の詳細",
    "手順3の詳細（最低5ステップ以上）"
  ],
  "tips": [
    "【時短コツ】このレシピ専用の時短・効率化アドバイスを1〜2文で記述（例: 「鶏肉は前日に下味をつけておくと当日5分短縮できます」）",
    "【隠し味】このレシピ専用の隠し味・代用食材アドバイスを1〜2文で記述（例: 「仕上げに醤油を数滴たらすとコクが増します」）",
    "【保存・アレンジ】このレシピ専用の保存方法・アレンジアドバイスを1〜2文で記述（例: 「冷蔵で3日保存可能。翌日はスープに入れてもおいしいです」）"
  ]
}`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(userPrompt + schemaInstructions);
    const text = result.response.text().trim();

    let recipe;
    try {
      const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      recipe = JSON.parse(match ? match[0] : cleaned);
    } catch {
      console.error('JSON parse failed, raw text:', text);
      return res.status(500).json({ error: 'レシピのJSONパースに失敗しました', raw: text });
    }

    // tipsが空・欠損・スキーマ説明文のままの場合はフォールバック
    const isSchemaText = (t) => typeof t === 'string' && (t.includes('このレシピ専用') || t.includes('記述すること'));
    if (!Array.isArray(recipe.tips) || recipe.tips.length === 0 || recipe.tips.every(isSchemaText)) {
      console.warn('tips missing or placeholder – using fallback');
      recipe.tips = [
        `${recipe.name}の食材は前日に切り揃えておくと当日の調理がスムーズです。`,
        `仕上げに塩・レモン汁を少々加えると味が引き締まります。`,
        `冷蔵庫で2〜3日保存可能。翌日は少し水を足して温め直すと味が馴染んでさらに美味しくなります。`,
      ];
    }

    res.json({ recipe });
  } catch (error) {
    console.error('Recipe generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── AI Image Generation (Stability AI SDXL) ───────────────────────────────────
app.post('/api/image', async (req, res) => {
  try {
    const { recipeName, description } = req.body;
    if (!recipeName) return res.status(400).json({ error: 'recipeName is required' });

    // Translate to English for Stability AI (English only)
    const translateModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const translateResult = await translateModel.generateContent(
      `Translate the following Japanese dish name and description to English. Return ONLY a JSON object with keys "name" and "description", no other text.\nName: ${recipeName}\nDescription: ${description || ''}`
    );
    let engName = recipeName;
    let engDesc = description || 'delicious food';
    try {
      const raw = translateResult.response.text().trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
      const parsed = JSON.parse(raw);
      engName = parsed.name || engName;
      engDesc = parsed.description || engDesc;
    } catch { /* fallback to original */ }

    const prompt = `${engName}, ${engDesc}, ultra-realistic food photography, DSLR photo, 85mm lens, shallow depth of field, soft bokeh background, natural daylight, food styling by professional chef, Michelin star restaurant plating, glossy textures, rich colors, macro detail, steam rising, fresh ingredients visible, on elegant ceramic plate, wooden table setting, photorealistic`;
    const negativePrompt = 'cartoon, anime, illustration, painting, drawing, 3d render, CGI, digital art, watermark, text, logo, blurry, low quality, ugly, deformed';

    // SDXL v1.0
    const response = await fetch(
      'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
        },
        body: JSON.stringify({
          text_prompts: [
            { text: prompt, weight: 1 },
            { text: negativePrompt, weight: -1 },
          ],
          cfg_scale: 7,
          height: 1024,
          width: 1024,
          steps: 30,
          samples: 1,
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error('Stability AI error:', err);
      return res.status(500).json({ error: 'Image generation failed', detail: err });
    }

    const data = await response.json();
    const base64 = data.artifacts[0].base64;

    res.json({ imageBase64: `data:image/png;base64,${base64}` });
  } catch (error) {
    console.error('Image generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── Usage Tracking (Supabase) ─────────────────────────────────────────────────
const getMonth = () => new Date().toISOString().slice(0, 7); // 'YYYY-MM'

// GET /api/usage/:deviceId
app.get('/api/usage/:deviceId', async (req, res) => {
  const { deviceId } = req.params;
  const month = getMonth();
  if (!supabase) return res.json({ monthlyUsed: 0, bonusRecipes: 0, isPremium: false });
  try {
    const { data } = await supabase.from('usage').select('*').eq('device_id', deviceId).single();
    if (!data) return res.json({ monthlyUsed: 0, bonusRecipes: 0, isPremium: false });
    if (data.month !== month) {
      await supabase.from('usage').update({ month, monthly_used: 0 }).eq('device_id', deviceId);
      return res.json({ monthlyUsed: 0, bonusRecipes: data.bonus_recipes, isPremium: data.is_premium });
    }
    return res.json({ monthlyUsed: data.monthly_used, bonusRecipes: data.bonus_recipes, isPremium: data.is_premium });
  } catch (err) {
    console.error('usage get error:', err);
    return res.json({ monthlyUsed: 0, bonusRecipes: 0, isPremium: false });
  }
});

// POST /api/usage/:deviceId/consume — 1回消費
app.post('/api/usage/:deviceId/consume', async (req, res) => {
  const { deviceId } = req.params;
  const month = getMonth();
  if (!supabase) return res.json({ success: true });
  try {
    const { data } = await supabase.from('usage').select('*').eq('device_id', deviceId).single();
    const isPrem    = data?.is_premium ?? false;
    const limit     = isPrem ? 20 : 5;
    const currMonth = data?.month ?? month;
    const used      = currMonth === month ? (data?.monthly_used ?? 0) : 0;
    const bonus     = data?.bonus_recipes ?? 0;
    if (used >= limit && bonus <= 0) return res.status(429).json({ error: 'usage_exceeded' });
    const newUsed  = used < limit ? used + 1 : used;
    const newBonus = used < limit ? bonus : Math.max(0, bonus - 1);
    await supabase.from('usage').upsert(
      { device_id: deviceId, month, monthly_used: newUsed, bonus_recipes: newBonus, is_premium: isPrem, updated_at: new Date().toISOString() },
      { onConflict: 'device_id' }
    );
    return res.json({ success: true, monthlyUsed: newUsed, bonusRecipes: newBonus });
  } catch (err) {
    console.error('usage consume error:', err);
    return res.json({ success: true });
  }
});

// POST /api/usage/:deviceId/bonus — ボーナス回数追加（購入後）
app.post('/api/usage/:deviceId/bonus', async (req, res) => {
  const { deviceId } = req.params;
  const { amount } = req.body;
  if (!supabase || !amount) return res.json({ success: true });
  try {
    const { data } = await supabase.from('usage').select('bonus_recipes').eq('device_id', deviceId).single();
    const newBonus = (data?.bonus_recipes ?? 0) + amount;
    await supabase.from('usage').upsert(
      { device_id: deviceId, bonus_recipes: newBonus, updated_at: new Date().toISOString() },
      { onConflict: 'device_id' }
    );
    return res.json({ success: true, bonusRecipes: newBonus });
  } catch (err) {
    console.error('usage bonus error:', err);
    return res.json({ success: true });
  }
});

// POST /api/usage/:deviceId/premium — プレミアム状態更新
app.post('/api/usage/:deviceId/premium', async (req, res) => {
  const { deviceId } = req.params;
  const { isPremium } = req.body;
  if (!supabase) return res.json({ success: true });
  try {
    await supabase.from('usage').upsert(
      { device_id: deviceId, is_premium: isPremium, updated_at: new Date().toISOString() },
      { onConflict: 'device_id' }
    );
    return res.json({ success: true });
  } catch (err) {
    console.error('usage premium error:', err);
    return res.json({ success: true });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
