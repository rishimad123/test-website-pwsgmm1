import sys

bad = "ðŸ“…"
try:
    print(bad.encode('windows-1252').decode('utf-8'))
except Exception as e:
    print("Error:", e)
