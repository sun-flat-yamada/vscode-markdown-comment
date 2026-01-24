import * as assert from 'assert';
import { MarkdownDocument } from './MarkdownDocument';

suite('MarkdownDocument Domain Test', () => {
    test('getWordCount returns correct count', () => {
        const content = 'Hello world this is a test'; // 6 words
        const doc = new MarkdownDocument(content, 'test.md');
        assert.strictEqual(doc.getWordCount(), 6);
    });

    test('getCharacterCount returns correct count', () => {
        const content = 'abcde';
        const doc = new MarkdownDocument(content, 'test.md');
        assert.strictEqual(doc.getCharacterCount(), 5);
    });

    test('getWordCount handles multiple spaces', () => {
        const content = 'Hello   world';
        const doc = new MarkdownDocument(content, 'test.md');
        assert.strictEqual(doc.getWordCount(), 2);
    })
});
