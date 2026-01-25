> [!IMPORTANT]
> このファイルは人間専用のリファレンスです。AIはこのファイルを読み込まず、必ず英語版マスターを参照してください。
> (This file is for human reference only. AI must not read this file and must refer to the English master.)

# /code-review コマンド

最近の変更または指定されたファイルに対して、コードレビューを実行します。

## 概要

品質、セキュリティ、および Clean Architecture への準拠について、包括的なコードレビューを行います。

## 使い方

```
/code-review [ファイルまたはディレクトリ]
```

引数がない場合は、コミットされていない最近の変更をレビューします。

## レビュー範囲

- Clean Architecture への準拠
- TypeScript のベストプラクティス
- テストカバレッジ
- セキュリティ上の考慮事項
- ドキュメントの完全性

## 出力

重要度レベルと修正案を含む構造化されたレビューフィードバック。
