import { IDocumentRepository } from '../domain/IDocumentRepository';
import { AnalysisResult } from '../domain/AnalysisResult';

export class AnalyzeDocumentUseCase {
    constructor(private readonly documentRepository: IDocumentRepository) {}

    public async execute(): Promise<AnalysisResult | null> {
        const document = await this.documentRepository.getCurrentDocument();

        if (!document) {
            return null;
        }

        const wordCount = document.getWordCount();
        const characterCount = document.getCharacterCount();
        const readingTimeMinutes = Math.ceil(wordCount / 200); // Avg reading speed 200 wpm

        return {
            wordCount,
            characterCount,
            readingTimeMinutes
        };
    }
}
