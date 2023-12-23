import { downloadFile } from '@huggingface/hub'
import type { RepoDesignation } from "@huggingface/hub";
import { updateProgress } from './progressTrackerUtility';

export const FileDownloader = async (modelRepo: string, filePath: string) =>
{
    const repo: RepoDesignation = { type: "model", name: modelRepo };
    const response = await downloadFile({ repo, path: filePath });

    if (response && response.status === 200) {
        let downloaded = 0;
        const contentLength = response.headers.get('content-length');
        const totalSize = contentLength ? parseInt(contentLength, 10) : 0;

        updateProgress(modelRepo, filePath, { PercentComplete: 0, DownloadStatus: 'in-progress' });

        const reader = response.body?.getReader();

        if (!reader) {
            throw new Error(`Failed to download file from ${repo.name}: no response body was returned.`);
        }
        while (true) {
            const { done, value } = await reader.read();

            if (done) {
                break;
            }

            downloaded += value.length;
            const percentComplete = (downloaded / totalSize) * 100;
            updateProgress(modelRepo, filePath, { PercentComplete: percentComplete, DownloadStatus: 'in-progress' });
        }
    } else {
        updateProgress(modelRepo, filePath, { PercentComplete: 0, DownloadStatus: 'aborted' });
        // TODO: delete partial downloads
        throw new Error(`Failed to download file from ${repo.name}`);
    }

    updateProgress(modelRepo, filePath, { PercentComplete: 100, DownloadStatus: 'done' });
};
