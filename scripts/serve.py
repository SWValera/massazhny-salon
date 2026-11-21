#!/usr/bin/env python3
"""Preview only dist, never source files; real 404 and noindex headers."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import unquote, urlsplit
import argparse

ROOT = Path(__file__).resolve().parents[1] / 'dist'
class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw): super().__init__(*a, directory=str(ROOT), **kw)
    def end_headers(self):
        self.send_header('X-Robots-Tag', 'noindex, nofollow')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'strict-origin-when-cross-origin')
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()
    def list_directory(self, path):
        self.send_error(404)
        return None
    def send_error(self, code, message=None, explain=None):
        if code == 404 and (ROOT/'404.html').is_file():
            body = (ROOT/'404.html').read_bytes()
            self.send_response(404)
            self.send_header('Content-Type','text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            if self.command != 'HEAD': self.wfile.write(body)
        else: super().send_error(code,message,explain)

if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=4173)
    parser.add_argument('--host', default='0.0.0.0')
    args=parser.parse_args()
    print(f'Preview ready: http://localhost:{args.port}', flush=True)
    ThreadingHTTPServer((args.host,args.port),Handler).serve_forever()
