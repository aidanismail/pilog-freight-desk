"""Run the React and FastAPI development servers together."""
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
from time import monotonic, sleep
from urllib.error import URLError
from urllib.request import urlopen


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src"
HOST, UI_PORT, API_PORT = "127.0.0.1", 5173, 8001


def wait_for_api(process):
    deadline = monotonic() + 30
    url = f"http://{HOST}:{API_PORT}/api/v1/health"
    while process.poll() is None and monotonic() < deadline:
        try:
            with urlopen(url, timeout=1):
                return True
        except (URLError, TimeoutError):
            sleep(0.25)
    return False


def stop(process):
    if process.poll() is not None:
        return
    if os.name == "nt":
        subprocess.run(["taskkill", "/PID", str(process.pid), "/T", "/F"], capture_output=True)
    else:
        process.terminate()
    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait()


def python_files():
    files = {}
    for path in SOURCE.rglob("*.py"):
        try:
            files[path] = path.stat().st_mtime_ns
        except FileNotFoundError:
            continue
    return files


def start_api():
    return subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "pilog_cfr_dss.api.main:app", "--app-dir", str(SOURCE),
         "--host", HOST, "--port", str(API_PORT)],
        cwd=ROOT,
    )


def main():
    node = shutil.which("node")
    frontend = ROOT / "frontend"
    vite = frontend / "node_modules/vite/bin/vite.js"
    if node is None or not vite.is_file():
        print("Install Node.js dan jalankan npm --prefix frontend ci sebelum memulai.", file=sys.stderr)
        return 1
    for port in (UI_PORT, API_PORT):
        with socket.socket() as probe:
            if probe.connect_ex((HOST, port)) == 0:
                print(f"Port {port} sudah dipakai. Hentikan server dev lama terlebih dahulu.", file=sys.stderr)
                return 1

    env = {**os.environ, "PILOG_DEV_API_ORIGIN": f"http://{HOST}:{API_PORT}"}
    source_files = python_files()
    api, ui = None, None
    try:
        api = start_api()
        if not wait_for_api(api):
            print("FastAPI gagal siap. Periksa pesan di terminal.", file=sys.stderr)
            return 1
        ui = subprocess.Popen([node, str(vite), "--host", HOST, "--port", str(UI_PORT), "--strictPort"],
                              cwd=frontend, env=env)
        print(f"Buka http://{HOST}:{UI_PORT} untuk edit dengan hot reload. Ctrl+C untuk berhenti.", flush=True)
        while ui.poll() is None:
            sleep(0.5)
            current_files = python_files()
            if current_files != source_files:
                print("File Python berubah. Memulai ulang FastAPI…", flush=True)
                stop(api)
                api = start_api()
                source_files = current_files
        return ui.returncode or 1
    except KeyboardInterrupt:
        return 0
    finally:
        for process in (ui, api):
            if process is not None:
                stop(process)


if __name__ == "__main__":
    sys.exit(main())
