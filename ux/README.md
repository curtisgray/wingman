# Notes

## Code Sign on Windows using signtool with Hardware Token
 
 via: <https://stackoverflow.com/a/54439759
 >
```pwsh
signtool sign /a /tr http://timestamp.comodoca.com /td sha256 /fd sha256 /f "$env:WINGMAN_CODESIGN_CERT_PATH" /n "$env:WINGMAN_CODESIGN_CERT_NAME" /csp "$env:WINGMAN_CODESIGN_CERT_CSP" /kc "[{{$env:WINGMAN_CODESIGN_CERT_PASSWORD}}]=$env:WINGMAN_CODESIGN_CERT_CONTAINER" ./out/wingman-win32-x64/wingman.exe
```

## Download Release Assets

```markdown
## Download Wingman

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

```

## Example Prompts

1. List the most common categories for personal banking transactions.

2. ```
6/9/2023	BOSE CORPORATION	-242.74
6/9/2023	MCDONALD'S F4323	-15.34
6/12/2023	DRIVE & SHINE 8	-11
6/12/2023	MEIJER # 119 FUEL	-71.49
6/12/2023	CHATGPT SUBSCRIPTION	-20
6/12/2023	APPLE.COM/BILL	-24.99
6/12/2023	VAST.AI* FSYAAQV	-10
6/16/2023	PHILLIPS 66 - BENIPAL	-74.65
6/16/2023	NEWEGG MARKETPLACE	-27.51
6/19/2023	TST* BREAKFAST AT TIFF	-52.13
6/19/2023	MEIJER # 119	-61.22
```

Create a table with the above transactions and categorize each transaction into one of the categories you listed.
