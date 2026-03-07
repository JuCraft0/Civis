@echo off
start cmd /k "cd server & npm start"
start cmd /k "cd client & npm run dev"
echo Civis Application Started!
echo Server: http://localhost:3000
echo Client: http://localhost:5173
