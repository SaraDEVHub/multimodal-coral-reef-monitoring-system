@echo off
cd /d "%~dp0"
cd ..
call .venv\Scripts\activate
streamlit run app\app.py
pause