# Fusion Recipe

AI を使ったフュージョン料理レシピ生成アプリ

## セットアップ

### 1. APIキーの設定

`.env` ファイルを編集して Anthropic API キーを設定してください：

```
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

APIキーは https://console.anthropic.com から取得できます。

### 2. 依存パッケージのインストール

```bash
npm run install:all
```

### 3. 起動

```bash
npm start
```

- フロントエンド: http://localhost:5173
- バックエンド API: http://localhost:3001

## 機能

| 機能 | 説明 |
|------|------|
| **フュージョン生成** | 2つの国の料理スタイルを掛け合わせたオリジナルレシピを AI が生成 |
| **スキャンでレシピ** | 冷蔵庫の写真をアップロード → Claude Vision で食材を自動検出 → レシピ提案 |
| **PFCバランス設定** | タンパク質・脂質・炭水化物の比率を指定してレシピ生成 |
| **アレルギー設定** | 除外食材を登録し、安全なレシピのみ生成 |
| **お気に入り** | 気に入ったレシピをローカルに保存 |

## 技術スタック

- **フロントエンド**: React 18 + Vite + Tailwind CSS + Lucide React
- **バックエンド**: Express.js + Node.js
- **AI**: Anthropic Claude API (`claude-sonnet-4-6`)
  - Vision API: 画像から食材を検出
  - Text API: JSON スキーマに従ったレシピ生成
