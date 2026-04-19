Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location 'C:\Users\HP\Desktop\JanMitra\backend'; python app.py"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location 'C:\Users\HP\Desktop\JanMitra\frontend'; npm run dev"
