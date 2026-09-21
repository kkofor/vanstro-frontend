#!/usr/bin/env python3
import atexit
import os
import signal
import socket
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
OUT = Path(os.environ.get("UI0_BROWSER_OUT", ROOT / "tasks/evidence/v1-ui0-omp-trial/browser"))
HOST = "127.0.0.1"
server = None
port = None
server_log = None
cleaned = False


def available_port():
    with socket.socket() as probe:
        probe.bind((HOST, 0))
        return probe.getsockname()[1]


def assert_port_free(candidate):
    with socket.socket() as probe:
        probe.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        probe.bind((HOST, candidate))


def cleanup():
    global cleaned, server, server_log
    if cleaned:
        return
    cleaned = True
    if server is not None:
        try:
            os.killpg(server.pid, signal.SIGTERM)
        except ProcessLookupError:
            pass
        try:
            server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            try:
                os.killpg(server.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            server.wait(timeout=5)
    if server_log is not None and not server_log.closed:
        server_log.close()
    if port is not None:
        deadline = time.monotonic() + 5
        while True:
            try:
                assert_port_free(port)
                break
            except OSError:
                if time.monotonic() >= deadline:
                    print(f"UI-0 cleanup failed: port {port} remains occupied", file=sys.stderr)
                    os._exit(1)
                time.sleep(0.1)


def forward_signal(signum, _frame):
    cleanup()
    raise SystemExit(128 + signum)


port = int(os.environ.get("UI0_PORT", available_port()))
try:
    assert_port_free(port)
except OSError as error:
    raise SystemExit(f"UI-0 preflight failed: port {port} is occupied") from error

OUT.mkdir(parents=True, exist_ok=True)
atexit.register(cleanup)
signal.signal(signal.SIGINT, forward_signal)
signal.signal(signal.SIGTERM, forward_signal)
signal.signal(signal.SIGHUP, forward_signal)

server_log = (OUT / "server.log").open("w", encoding="utf-8")
server = subprocess.Popen(
    ["pnpm", "exec", "next", "dev", "--hostname", HOST, "--port", str(port)],
    cwd=HERE,
    stdout=server_log,
    stderr=subprocess.STDOUT,
    start_new_session=True,
)

deadline = time.monotonic() + 30
ready = False
while time.monotonic() < deadline:
    if server.poll() is not None:
        server_log.close()
        print((OUT / "server.log").read_text(encoding="utf-8"), file=sys.stderr)
        raise SystemExit(f"UI-0 fixture exited with status {server.returncode}")
    try:
        with urllib.request.urlopen(f"http://{HOST}:{port}/", timeout=0.25) as response:
            ready = response.status == 200
    except Exception:
        ready = False
    if ready:
        break
    time.sleep(0.1)
if not ready:
    raise SystemExit("UI-0 fixture did not become ready within 30 seconds")

acceptance_env = {
    **os.environ,
    "UI0_BASE_URL": f"http://{HOST}:{port}/",
    "UI0_BROWSER_OUT": str(OUT),
}
completed = subprocess.run([sys.executable, str(HERE / "acceptance.py")], cwd=ROOT, env=acceptance_env)
raise SystemExit(completed.returncode)
