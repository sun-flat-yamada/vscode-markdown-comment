---
trigger: always_on
---

# Language & Documentation Rules

## Communication Language

- **全てのプロンプト応答、説明、コミュニケーション、および生成物（アーティファクト、計画書、タスクリスト等）は日本語で行ってください。**
- (All AI responses, explanations, communication, and artifacts including plans and task lists must be in Japanese.)

## Documentation Policy

- **English as Master**: 全ての主要ドキュメント（`.md`）は英語で記述される必要があります。AI が参照するマスターデータは常に英語ドキュメントです。
- **Japanese for Human Reference (`.ja.md`)**:
  - AI は日本語版（`.ja.md`）をコンテキストとして読み込んではならず、またそれを生成の基準にしてはなりません。
  - 日本語版は、あくまで人間（ユーザー）の理解を助けるためのリファレンスです。

- **Header Requirement for .ja.md**:
  全ての `.ja.md` ファイルの冒頭には以下の警告を記述してください：
  > [!IMPORTANT]
  > このファイルは人間専用のリファレンスです。AIはこのファイルを読み込まず、必ず英語版マスターを参照してください。
  > (This file is for human reference only. AI must not read this file and must refer to the English master.)

- **Documentation Updates**:
  - コードに変更を加えた場合、関連する全てのドキュメント（README.md, GEMINI.md, または機能固有のドキュメント）を最新の状態に更新してください。
  - 英語版のマスターデータを更新した場合、**日本語版は差分更新ではなく、英語版を元に「再生成（完全翻訳）」してください。** (Japanese docs must be regenerated/re-translated from the English master, not incrementally updated.)
