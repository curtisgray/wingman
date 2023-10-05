@REM run wingman
@echo off
cd ux
START npm run start
cd ..
rundll32 url.dll,FileProtocolHandler http://localhost:3000