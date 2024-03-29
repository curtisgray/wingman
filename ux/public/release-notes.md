# Notes

## Code Sign on Windows using signtool with Hardware Token

via: <https://stackoverflow.com/a/54439759>

```pwsh
signtool sign /a /tr http://timestamp.comodoca.com /td sha256 /fd sha256 /f "$env:WINGMAN_CODESIGN_CERT_PATH" /n "$env:WINGMAN_CODESIGN_CERT_NAME" /csp "$env:WINGMAN_CODESIGN_CERT_CSP" /kc "[{{$env:WINGMAN_CODESIGN_CERT_PASSWORD}}]=$env:WINGMAN_CODESIGN_CERT_CONTAINER" ./out/wingman-win32-x64/wingman.exe
```

## Download Release Assets

### MacOS Downloads

| Architecture    | Format | Download Link                                                                                       | Size    |
|-----------------|--------|-----------------------------------------------------------------------------------------------------|---------|
| Apple Silicon   | dmg    | [Download](https://github.com/curtisgray/wingman/releases/download/v0.8.5/wingman-0.8.4-arm64.dmg)  | 243 MB  |
| Apple Silicon   | zip    | [Download](https://github.com/curtisgray/wingman/releases/download/v0.8.5/wingman-darwin-arm64-0.8.4.zip) | 251 MB  |
| Intel x64       | dmg    | [Download](https://github.com/curtisgray/wingman/releases/download/v0.8.5/wingman-0.8.4-x64.dmg)    | 254 MB  |
| Intel x64       | zip    | [Download](https://github.com/curtisgray/wingman/releases/download/v0.8.5/wingman-darwin-x64-0.8.4.zip) | 262 MB  |

### Windows Downloads

| Architecture    | Format | Download Link                                                                                       | Size    |
|-----------------|--------|-----------------------------------------------------------------------------------------------------|---------|
| x64             | exe    | [Download](https://github.com/curtisgray/wingman/releases/download/v0.8.5/wingman-0.8.4-Setup.exe)  | 441 MB  |
| x64             | zip    | [Download](https://github.com/curtisgray/wingman/releases/download/v0.8.5/wingman-win32-x64-0.8.4.zip) | 452 MB  |
