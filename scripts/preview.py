#!/usr/bin/env python3
"""Run local preview and a temporary phone link until Ctrl+C."""
from pathlib import Path
import subprocess, sys, shutil
ROOT=Path(__file__).resolve().parents[1]
server=None
try:
    subprocess.run([sys.executable,str(ROOT/'scripts/build.py')],cwd=ROOT,check=True)
    server=subprocess.Popen([sys.executable,str(ROOT/'scripts/serve.py')],cwd=ROOT)
    binary=ROOT/'.preview/cloudflared'
    command=str(binary) if binary.exists() else shutil.which('cloudflared')
    print('\nLocal preview: http://localhost:4173\nKeep this window open. Ctrl+C stops the preview.\n',flush=True)
    if command:
        subprocess.run([command,'tunnel','--url','http://localhost:4173','--no-autoupdate'],cwd=ROOT)
    else:
        print('For phone preview, connect to the same Wi-Fi and open your computer LAN IP on port 4173.',flush=True)
        server.wait()
except KeyboardInterrupt: pass
finally:
    if server: server.terminate()
