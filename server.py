from __future__ import annotations

import json
import os
import threading
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse


HOST = "0.0.0.0"
PORT = 8000
ROOT = Path(__file__).resolve().parent
DATA_FILE = ROOT / "questions.json"
VALID_EXERCISES = {
    4, 5, 6, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    49, 50, 51, 52, 53, 54, 56, 57, 58, 59,
    71, 72, 73, 74, 75, 77, 78, 79, 80, 81,
}
data_lock = threading.Lock()


def read_questions() -> dict[str, str]:
    if not DATA_FILE.exists():
        return {}
    try:
        data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}
    return {
        str(key): value
        for key, value in data.items()
        if isinstance(value, str)
    }


def write_questions(data: dict[str, str]) -> None:
    temporary_file = DATA_FILE.with_suffix(".json.tmp")
    temporary_file.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    os.replace(temporary_file, DATA_FILE)


class AppHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def api_exercise_id(self) -> int | None:
        path = urlparse(self.path).path
        prefix = "/api/questions/"
        if not path.startswith(prefix):
            return None
        try:
            exercise_id = int(path.removeprefix(prefix))
        except ValueError:
            return None
        return exercise_id if exercise_id in VALID_EXERCISES else None

    def send_json(self, payload: dict, status: HTTPStatus = HTTPStatus.OK) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:
        if urlparse(self.path).path.startswith("/api/questions/"):
            self.send_response(HTTPStatus.NO_CONTENT)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, PUT, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Access-Control-Max-Age", "86400")
            self.end_headers()
            return
        self.send_error(HTTPStatus.NOT_FOUND)

    def do_GET(self) -> None:
        if urlparse(self.path).path.startswith("/api/questions/"):
            exercise_id = self.api_exercise_id()
            if exercise_id is None:
                self.send_json({"error": "Bộ đề không hợp lệ."}, HTTPStatus.NOT_FOUND)
                return
            with data_lock:
                text = read_questions().get(str(exercise_id), "")
            self.send_json({"id": exercise_id, "text": text})
            return
        super().do_GET()

    def do_PUT(self) -> None:
        exercise_id = self.api_exercise_id()
        if exercise_id is None:
            self.send_json({"error": "Bộ đề không hợp lệ."}, HTTPStatus.NOT_FOUND)
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            if content_length > 100_000:
                raise ValueError
            payload = json.loads(self.rfile.read(content_length))
            text = payload["text"]
            if not isinstance(text, str):
                raise ValueError
        except (json.JSONDecodeError, KeyError, TypeError, ValueError):
            self.send_json({"error": "Nội dung gửi lên không hợp lệ."}, HTTPStatus.BAD_REQUEST)
            return

        with data_lock:
            questions = read_questions()
            questions[str(exercise_id)] = text
            write_questions(questions)
        self.send_json({"saved": True, "id": exercise_id})


if __name__ == "__main__":
    server = ThreadingHTTPServer((HOST, PORT), AppHandler)
    print(f"Ứng dụng đang chạy tại http://{HOST}:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nĐã dừng ứng dụng.")
    finally:
        server.server_close()
