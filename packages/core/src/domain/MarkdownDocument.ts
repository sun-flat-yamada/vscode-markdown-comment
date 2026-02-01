export class MarkdownDocument {
    constructor(
        public readonly content: string,
        public readonly filePath: string
    ) {}

    public getWordCount(): number {
        return this.content.split(/\s+/).filter(word => word.length > 0).length;
    }

    public getCharacterCount(): number {
        return this.content.length;
    }
}
