@REM run wingman
@echo off
SET WINGMAN_PORT=6565
cd ux
START npm run start -- --port %WINGMAN_PORT%
cd ..
rundll32 url.dll,FileProtocolHandler http://localhost:%WINGMAN_PORT%