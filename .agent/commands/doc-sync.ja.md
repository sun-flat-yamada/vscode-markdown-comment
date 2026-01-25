> [!IMPORTANT]
> このファイルは人間専用のリファレンスです。AIはこのファイルを読み込まず、必ず英語版マスターを参照してください。
> (This file is for human reference only. AI must not read this file and must refer to the English master.)

# /doc-sync コマンド

最近のコード変更に合わせてドキュメントを同期（チェックおよび更新）します。

## 概要

コードの変更箇所を確認し、ドキュメントをそれに合わせて更新します。

## 使い方

```
/doc-sync [スコープ]
```

スコープオプション:
- `all` - すべてのドキュメントを確認 (デフォルト)
- `readme` - README.md にフォーカス
- `gemini` - GEMINI.md にフォーカス
- `recent` - 直近のコミットで変更されたファイルのみ確認

## プロセス

1. コードの変更を特定する
2. ドキュメントへの影響を分析する
3. 必要な更新を提案する
4. ユーザーの承認を得て変更を適用する

## チェック対象ドキュメント

- README.md
- GEMINI.md
- インラインコードコメント
- ワークフロードキュメント
