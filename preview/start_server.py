#!/usr/bin/env python3
# 本地预览服务器
# 在 websiteArticleDeta 目录启动，提供 preview 和 articles 访问

import http.server
import socketserver
import os
import webbrowser

PORT = 8080
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def log_message(self, format, *args):
        # 简化日志输出
        print(f"[SERVER] {self.address_string()} {format % args}")

if __name__ == '__main__':
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        url = f"http://localhost:{PORT}/preview/index.html"
        print(f"\n本地预览服务器已启动: {url}")
        print(f"按下 Ctrl+C 停止服务\n")
        webbrowser.open(url)
        httpd.serve_forever()
