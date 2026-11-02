"""Serve Amani locally and automatically index property image folders.

Use START_AMANI_WEB_AUTO.cmd instead of running plain python -m http.server.
The same standard-library HTTP server behavior is retained.
"""
from __future__ import annotations

import argparse
import os
import subprocess
import sys
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import re
from pathlib import Path

WEB = Path(__file__).resolve().parents[1]
GALLERIES = WEB / 'img' / 'rental'
PUBLISH_LOCK = threading.Lock()


def state():
    files = []
    if GALLERIES.is_dir():
        for base, dirs, names in os.walk(GALLERIES):
            dirs[:] = [d for d in dirs if not d.startswith('.')]
            for name in names:
                if not name.lower().endswith(('.jpg', '.jpeg', '.webp', '.png', '.avif', '.gif')):
                    continue
                path = Path(base) / name
                try:
                    stat = path.stat()
                    files.append((str(path.relative_to(GALLERIES)), stat.st_size, stat.st_mtime_ns))
                except (OSError, PermissionError):
                    pass
    return tuple(sorted(files))


def publish():
    # HTTP requests and the auto watcher may refresh together. Serialize them
    # so two refreshes cannot overwrite the same generated catalog concurrently.
    with PUBLISH_LOCK:
        result = subprocess.run(['node', str(WEB / 'scripts' / 'auto-gallery.mjs')],
                                cwd=WEB, check=False, text=True)
        if result.returncode:
            print('ERROR: Gallery refresh failed; existing index retained.', file=sys.stderr, flush=True)
        return result.returncode == 0


def watch(stop_event: threading.Event) -> None:
    previous = state()
    while not stop_event.wait(2.5):
        current = state()
        if current != previous:
            if publish():
                previous = current


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEB), **kwargs)

    def do_GET(self):
        # The production build creates /properties/amani-p001/index.html pages.
        # Local development keeps the existing property.html page and its JS.
        path = self.path.split('?', 1)[0]
        match = re.fullmatch(r'/properties/(amani-p\d{3,})/?', path, re.I)
        if match:
            unit_query = ('?' + self.path.split('?', 1)[1]) if '?' in self.path else ''
            suffix = ('&' + unit_query[1:]) if unit_query else ''
            self.send_response(302)
            self.send_header('Location', f'/properties.html?id={match.group(1)}{suffix}')
            self.end_headers()
            return
        # Request-time indexing protects even when the polling thread misses a change.
        if self.path.split('?', 1)[0].endswith('/property_gallery_published.json'):
            if not publish():
                self.send_error(503, 'Gallery index refresh failed')
                return
        return super().do_GET()

    def end_headers(self):
        if self.path.split('?', 1)[0].endswith('/property_gallery_published.json'):
            self.send_header('Cache-Control', 'no-store, max-age=0')
        super().end_headers()


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--port', type=int, default=8080)
    args = p.parse_args()
    if not publish():
        print('ERROR: Gallery index could not be built; web server not started.', file=sys.stderr)
        return 1
    stop = threading.Event()
    threading.Thread(target=watch, args=(stop,), daemon=True).start()
    try:
        with ThreadingHTTPServer(('127.0.0.1', args.port), Handler) as server:
            print(f'Amani website: http://localhost:{args.port}', flush=True)
            print('Property images are automatically indexed when you add or remove files.', flush=True)
            server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        stop.set()
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
