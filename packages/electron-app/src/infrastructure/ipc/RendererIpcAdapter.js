export class RendererIpcAdapter {
    constructor() {
        this.api = window.api;
        if (!this.api) {
            console.error("RendererIpcAdapter: window.api is not defined!");
        }
    }
    openFile() {
        return this.api.openFile();
    }
    openFileSpecific(filePath) {
        return this.api.openFileSpecific(filePath);
    }
    getRecentFiles() {
        return this.api.getRecentFiles();
    }
    generateAiPrompt() {
        return this.api.generateAiPrompt();
    }
    getThreads(filePath) {
        return this.api.getThreads(filePath);
    }
    getAvailableTags(filePath) {
        return this.api.getAvailableTags(filePath);
    }
    addComment(params) {
        return this.api.addComment(params);
    }
    addReply(params) {
        return this.api.addReply(params);
    }
    updateComment(params) {
        return this.api.updateComment(params);
    }
    updateTags(params) {
        return this.api.updateComment(params);
    } // Re-uses update-comment
    deleteComment(params) {
        return this.api.deleteComment(params);
    }
    updateStatus(params) {
        return this.api.updateStatus(params);
    }
    saveLayout(settings) {
        return this.api.saveLayout(settings);
    }
    getWindowState() {
        return this.api.getWindowState();
    }
    openExternal(url) {
        return this.api.openExternal(url);
    }
    onUpdatePreview(callback) {
        this.api.onUpdatePreview(callback);
    }
    onTriggerAddComment(callback) {
        this.api.onTriggerAddComment(callback);
    }
    onTriggerOpenFile(callback) {
        this.api.onTriggerOpenFile(callback);
    }
    onUpdateRecentFiles(callback) {
        this.api.onUpdateRecentFiles(callback);
    }
}
//# sourceMappingURL=RendererIpcAdapter.js.map