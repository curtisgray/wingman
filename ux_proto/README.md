# downloadllama

## Notes

CSS Button Effects <https://freefrontend.com/css-button-click-effects/>
tsParticles <https://github.com/tsparticles/react>
Animated icon and button designs <https://dribbble.com/Ed117>
Button that bursts colors onto the entire page <https://codepen.io/aaronmcg/pen/KmzNKB>

### Wingman.cpp

Copy wingman.cpp build output to wingman frontend folder.

```powershell
# Windows cuBLAS
cp ~/source/repos/wingman.cpp/out/build/cuBLAS/bin/Debug/*.* ~/source/repos/wingman/ux_proto/server/wingman/Windows/cuBLAS/bin -Exclude '*.pdb','*.log'

# Linux cuBLAS
cp ~/source/repos/wingman.cpp/out/build/cuBLAS/bin/Debug/*.* ~/source/repos/wingman/ux_proto/server/wingman/Linux/cuBLAS/bin -Exclude '*.pdb','*.log'

# Mac Metal
cp ~/source/repos/wingman.cpp/out/build/cuBLAS/bin/Debug/*.* ~/source/repos/wingman/ux_proto/server/wingman/Darwin/bin -Exclude '*.pdb','*.log'
```

## Huggingface Download Manager

Act as an experienced full-stack software engineer and work with the team to build and maintain the Huggingface Download Manager. This is a web module that allows users to download models from the Huggingface model hub. It is built to integrate with an existing Next.js framework application that uses Tailwind CSS.

The Huggingface Download Manager is a web module that allows users to download models from the Huggingface model hub. It is built to integrate with an existing Next.js framework application that uses Tailwind CSS.

### Features

- Download model files from the Huggingface model hub.
- Track download progress in real-time.
- Download multiple files simultaneously.
- Pause and resume downloads.
- Download files in the background.
- Allow users to query the status of downloads.

### Implement Download Button

Follow this structure to implement a system where progress is tracked in files, allowing for idempotent, fire-and-forget downloads, and providing real-time updates to the frontend.

1. **Directory Structure**:

   ```text
   /pages
      /api
         download.ts
         progress.ts
   /utils
      /server
         download.huggingface.ts
         progressTracker.ts
   ```

2. **Backend Design**:

   2.1. **File-Based Progress Tracking (`/utils/server/progressTracker.ts`)**:

      This utility will handle the reading and writing of download status.

   2.2. **Download Utility Update (`/utils/server/download.huggingface.ts`)**:

      This utility will download the file and update progress into the file-based system.
      - Each download will be tracked in a separate json file that is named after the `ModelRepo` and `FilePath`.
      - Each file will have the following structure:

        ```json
        {
          "status": "queued",
          "progress": 0,
          "error": null
        }
        ```

        - The `status` field can have the following values:
            - `queued`: The download is queued and will start soon.
            - `in-progress`: The download is ongoing.
            - `done`: The download is completed.
            - `failed`: The download failed.

   2.3. **Download Handler (`/pages/api/download.ts`)**:

      When a request is made to this endpoint:

      - It should check if a progress tracker file exists for the provided `ModelRepo` and `FilePath` using the utility.
      - If it exists and the status is 'done', return that the download is already completed.
      - If it exists and the status is 'in-progress', just inform the client that the download is ongoing.
      - If it doesn't exist, initialize the progress file and queue the download in the background.
      - If the download is queued, return the status as 'queued'.
      - If the download fails, return the status as 'failed', along with the error message.

   2.4. **Progress SSE Endpoint (`/pages/api/progress.ts`)**:

      This endpoint will handle streaming progress to clients:

      - For a provided `ModelRepo` and `FilePath`, initiate an SSE stream.
      - In the streaming loop, read the progress using the utility and send it to the client.
      - Continue this loop until the download completes or an error occurs.
      - If `ModelRepo` and `FilePath` are provided, and the download already exist, it should return the specific download status.
      - If `ModelRepo` is provided, but not `FilePath`, return the status of all downloads for that `ModelRepo`.
      - If neither `ModelRepo` nor `FilePath` is provided, return the status of all downloads.

3. **Frontend Design**:

   3.1. **Initiate Download**:

      When you want to start a download:

      - Make a request to `/api/download` with the required `ModelRepo` and `FilePath`.
      - This endpoint will either queue the download or inform the client about the current status (e.g., already downloading or done).

   3.2. **Fetch Progress via SSE**:

      - Read real-time progress from `/api/progress` using streaming SSE.

   3.3. **View Download Queue**:

      - Make a request to `/api/progress` to get the status of all downloads.
      - `ModelRepo` and `FilePath` parameters will get the status of that specific download.
      - Downloads can have the following statuses:
        - `queued`: The download is queued and will start soon.
        - `downloading`: The download is ongoing.
        - `done`: The download is completed.
        - `failed`: The download failed.

