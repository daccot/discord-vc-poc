# discord-vc-poc

Discord VC 録音 PoC の土台です。STEP3 までの構成を作成します。

## 対象
- STEP1: Bot login / join / leave
- STEP2: session 管理
- STEP3: mixed 録音の土台（実録音ミックスは TODO）

## セットアップ
1. Node.js 20+ を入れる
2. ffmpeg を PATH に入れる
3. `.env.example` を `.env` にコピーして値を設定
4. ルートで `npm install`
5. `npm run dev:recorder`

## 注意
- Discord VC 音声接続は 2026 年時点で DAVE 対応検証が必要
- この雛形は PoC の構成生成が主目的
- mixed.wav の本格生成ロジックは `apps/recorder/src/voice/recorder.ts` の TODO を実装する