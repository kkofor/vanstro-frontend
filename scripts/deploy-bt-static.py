#!/usr/bin/env python3
"""将指定 Git 提交安全部署到宝塔静态站点的独立版本目录。"""

from __future__ import annotations

import argparse
import base64
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
import http.client
import json
import os
import re
import ssl
import subprocess
import sys
import tarfile
import tempfile
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any


class DeploymentError(RuntimeError):
    pass


def run(command: list[str], *, cwd: Path | None = None, env: dict[str, str] | None = None) -> str:
    print(f"+ {' '.join(command)}", flush=True)
    result = subprocess.run(
        command,
        cwd=cwd,
        env=env,
        check=False,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    if result.stdout:
        print(result.stdout, end="" if result.stdout.endswith("\n") else "\n")
    if result.returncode != 0:
        raise DeploymentError(f"命令失败（退出码 {result.returncode}）：{' '.join(command)}")
    return result.stdout.strip()


def require_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise DeploymentError(f"缺少环境变量 {name}")
    return value


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="从指定 Git 提交构建静态站点，通过宝塔 API 上传到全新版本目录并切换站点根目录。"
    )
    parser.add_argument("--commit", default="HEAD", help="要部署的 Git 提交，默认 HEAD")
    parser.add_argument(
        "--include-tracked-worktree",
        action="store_true",
        help="在指定提交之上包含当前 tracked 工作区差异；不会包含 untracked 文件",
    )
    parser.add_argument("--domain", default="vanstro.ca", help="宝塔站点主域名")
    parser.add_argument("--www-domain", default="www.vanstro.ca", help="附加 www 域名；传空字符串可禁用")
    parser.add_argument("--server-ip", required=True, help="不依赖 DNS 的 HTTP 验证目标 IP")
    parser.add_argument("--repo", type=Path, default=Path(__file__).resolve().parents[1], help="Git 仓库路径")
    parser.add_argument("--chunk-mib", type=int, default=1, help="API 上传分片大小，默认 1 MiB")
    parser.add_argument(
        "--release-suffix",
        default="",
        help="为同一 commit 创建新的发布目录，例如 repair1；仅允许字母、数字和连字符",
    )
    parser.add_argument(
        "--insecure-panel-tls",
        action="store_true",
        help="允许宝塔面板使用自签名 TLS 证书",
    )
    return parser.parse_args()


class BtApi:
    def __init__(self, base_url: str, api_key: str, *, insecure_tls: bool) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.context = ssl._create_unverified_context() if insecure_tls else ssl.create_default_context()

    def call(self, endpoint: str, fields: dict[str, Any] | None = None, *, timeout: int = 60) -> Any:
        request_time = str(int(time.time()))
        key_digest = hashlib.md5(self.api_key.encode()).hexdigest()
        request_token = hashlib.md5((request_time + key_digest).encode()).hexdigest()
        data: dict[str, Any] = {
            "request_time": request_time,
            "request_token": request_token,
        }
        if fields:
            data.update(fields)
        request = urllib.request.Request(
            self.base_url + endpoint,
            data=urllib.parse.urlencode(data).encode(),
            method="POST",
            headers={"User-Agent": "VanStro-Deploy/1.0"},
        )
        try:
            with urllib.request.urlopen(request, context=self.context, timeout=timeout) as response:
                payload = response.read().decode("utf-8", "replace")
        except Exception as error:
            raise DeploymentError(f"宝塔 API 请求失败：{endpoint}: {error}") from error
        try:
            return json.loads(payload)
        except json.JSONDecodeError as error:
            raise DeploymentError(f"宝塔 API 返回非 JSON：{endpoint}: {payload[:200]}") from error

    def require_success(self, endpoint: str, fields: dict[str, Any] | None = None, *, timeout: int = 60) -> Any:
        response = self.call(endpoint, fields, timeout=timeout)
        if not isinstance(response, dict) or response.get("status") is not True:
            raise DeploymentError(f"宝塔 API 操作失败：{endpoint}: {response!r}")
        return response

    def list_sites(self, search: str) -> list[dict[str, Any]]:
        response = self.call(
            "/data?action=getData",
            {"table": "sites", "limit": "100", "p": "1", "search": search},
        )
        if not isinstance(response, dict) or not isinstance(response.get("data"), list):
            raise DeploymentError(f"无法读取宝塔站点列表：{response!r}")
        return [row for row in response["data"] if isinstance(row, dict)]

    def list_dir(self, path: str) -> tuple[list[str], list[str]]:
        response = self.call("/files?action=GetDir", {"path": path, "showRow": "5000"})
        if not isinstance(response, dict):
            raise DeploymentError(f"无法读取服务器目录：{path}: {response!r}")
        directories = [row.split(";", 1)[0] for row in response.get("DIR", []) if isinstance(row, str)]
        files = [row.split(";", 1)[0] for row in response.get("FILES", []) if isinstance(row, str)]
        return directories, files

    def create_dir(self, path: str) -> None:
        response = self.call("/files?action=CreateDir", {"path": path})
        if isinstance(response, dict) and response.get("status") is True:
            return
        message = response.get("msg", "") if isinstance(response, dict) else ""
        if "存在" in str(message):
            return
        raise DeploymentError(f"创建目录失败：{path}: {response!r}")

    def upload_bytes(self, remote_dir: str, name: str, content: bytes, *, chunk_size: int) -> None:
        offset = 0
        total = len(content)
        while offset < total:
            chunk = content[offset : offset + chunk_size]
            response = self.call(
                "/files?action=upload",
                {
                    "f_path": remote_dir,
                    "f_name": name,
                    "f_size": str(total),
                    "f_start": str(offset),
                    "b64_data": base64.b64encode(chunk).decode(),
                },
                timeout=120,
            )
            expected = offset + len(chunk)
            if expected < total:
                if not isinstance(response, int) or response != expected:
                    raise DeploymentError(
                        f"上传偏移不一致：{name}，期望 {expected}，服务器返回 {response!r}"
                    )
            elif not isinstance(response, dict) or response.get("status") is not True:
                raise DeploymentError(f"上传完成失败：{name}: {response!r}")
            offset = expected
            print(f"上传 {name}: {offset}/{total} ({offset * 100 / total:.1f}%)", flush=True)


def ensure_tracked_worktree(repo: Path, *, allow_changes: bool) -> None:
    status = run(["git", "-C", str(repo), "status", "--porcelain=v1", "--untracked-files=no"])
    if status and not allow_changes:
        raise DeploymentError("tracked 工作区不干净；为避免部署未提交源码，已停止")
    run(["git", "-C", str(repo), "diff", "--check"])


def resolve_commit(repo: Path, commit: str) -> str:
    return run(["git", "-C", str(repo), "rev-parse", "--verify", f"{commit}^{{commit}}"])


def export_commit(repo: Path, commit_sha: str, destination: Path) -> None:
    archive_path = destination.parent / "source.tar"
    run(["git", "-C", str(repo), "archive", "--format=tar", "-o", str(archive_path), commit_sha])
    with tarfile.open(archive_path, "r") as archive:
        archive.extractall(destination, filter="data")


def export_tracked_worktree(repo: Path, commit_sha: str, destination: Path) -> None:
    export_commit(repo, commit_sha, destination)
    diff_path = destination.parent / "tracked-worktree.patch"
    with diff_path.open("wb") as output:
        result = subprocess.run(
            ["git", "-C", str(repo), "diff", "--binary", "--full-index", commit_sha, "--"],
            check=False,
            stdout=output,
            stderr=subprocess.PIPE,
        )
    if result.returncode != 0:
        message = result.stderr.decode("utf-8", "replace")
        raise DeploymentError(f"无法导出 tracked 工作区差异：{message}")
    if diff_path.stat().st_size:
        run(["git", "apply", "--binary", str(diff_path)], cwd=destination)


def build_static_export(source: Path, domain: str) -> Path:
    run(["pnpm", "install", "--frozen-lockfile"], cwd=source)
    run(["pnpm", "run", "typecheck:web"], cwd=source)
    env = os.environ.copy()
    env["NEXT_PUBLIC_BASE_PATH"] = ""
    env["NEXT_PUBLIC_SITE_URL"] = f"https://{domain}"
    run(["pnpm", "run", "build:pages"], cwd=source, env=env)
    run(["pnpm", "run", "qa:seo-artifacts"], cwd=source, env=env)
    output = source / "out"
    if not (output / "index.html").is_file():
        raise DeploymentError("静态构建缺少 out/index.html")
    return output


def create_archive(output: Path, archive_path: Path) -> None:
    with tarfile.open(archive_path, "w:gz") as archive:
        for path in sorted(output.rglob("*")):
            archive.add(path, arcname=path.relative_to(output), recursive=False)


def ensure_site(api: BtApi, domain: str, www_domain: str, site_root: str) -> int:
    exact = [site for site in api.list_sites(domain) if site.get("name") == domain]
    if len(exact) > 1:
        raise DeploymentError(f"发现多个同名站点 {domain}，已停止")
    if exact:
        return int(exact[0]["id"])

    webname: dict[str, Any] = {"domain": domain, "domainlist": [], "count": 0}
    if www_domain:
        webname["domainlist"] = [www_domain]
        webname["count"] = 1
    response = api.call(
        "/site?action=AddSite",
        {
            "webname": json.dumps(webname, separators=(",", ":")),
            "path": site_root,
            "type": "PHP",
            "type_id": "0",
            "version": "00",
            "port": "80",
            "ps": f"{domain} static storefront",
            "ftp": "false",
            "sql": "false",
            "codeing": "utf8",
        },
    )
    if not isinstance(response, dict) or response.get("siteStatus") is not True:
        raise DeploymentError(f"新建站点失败：{response!r}")
    return int(response["siteId"])


def build_manifest(output: Path) -> list[dict[str, Any]]:
    manifest = []
    for path in sorted(output.rglob("*")):
        if not path.is_file():
            continue
        content = path.read_bytes()
        manifest.append(
            {
                "path": path.relative_to(output).as_posix(),
                "size": len(content),
                "sha256": hashlib.sha256(content).hexdigest(),
            }
        )
    return manifest


def verify_http(server_ip: str, domain: str, manifest: list[dict[str, Any]]) -> None:
    def verify_file(row: dict[str, Any]) -> dict[str, Any] | None:
        path = "/" + urllib.parse.quote(row["path"], safe="/%:@!$&'()*+,;=-._~")
        cache_busted_path = f"{path}?verify={row['sha256'][:16]}"
        last_error = ""
        for attempt in range(3):
            try:
                headers = {
                    "Host": domain,
                    "User-Agent": "VanStro-Integrity/1.0",
                    "Accept-Encoding": "identity",
                    "Cache-Control": "no-cache, no-store, max-age=0",
                    "Pragma": "no-cache",
                }
                connection = http.client.HTTPConnection(server_ip, 80, timeout=30)
                connection.request("GET", cache_busted_path, headers=headers)
                response = connection.getresponse()
                body = response.read()
                redirect = response.getheader("Location", "")
                connection.close()
                if response.status in {301, 302, 307, 308} and redirect.startswith(f"https://{domain}"):
                    secure_url = urllib.parse.urlsplit(redirect)
                    secure_path = secure_url.path or path
                    if secure_url.query:
                        secure_path += f"?{secure_url.query}"
                    connection = http.client.HTTPSConnection(
                        server_ip,
                        443,
                        timeout=30,
                        context=ssl._create_unverified_context(),
                    )
                    connection.request("GET", secure_path, headers=headers)
                    response = connection.getresponse()
                    body = response.read()
                    connection.close()
                digest = hashlib.sha256(body).hexdigest()
                if response.status == 200 and len(body) == row["size"] and digest == row["sha256"]:
                    return None
                return {
                    "path": row["path"],
                    "status": response.status,
                    "expected_size": row["size"],
                    "actual_size": len(body),
                    "expected_sha256": row["sha256"],
                    "actual_sha256": digest,
                }
            except Exception as error:
                last_error = f"{type(error).__name__}: {error}"
                time.sleep(0.3 * (attempt + 1))
        return {"path": row["path"], "error": last_error}

    readiness_row = next(
        (row for row in manifest if row["path"].endswith("/_clientMiddlewareManifest.js")),
        next(row for row in manifest if row["path"] == "index.html"),
    )
    deadline = time.monotonic() + 30
    while True:
        readiness_failure = verify_file(readiness_row)
        if readiness_failure is None:
            break
        if time.monotonic() >= deadline:
            raise DeploymentError(f"站点切换后新构建未就绪：{readiness_failure!r}")
        print(f"等待新构建生效：{readiness_row['path']}", flush=True)
        time.sleep(1)

    failures = []
    with ThreadPoolExecutor(max_workers=12) as pool:
        futures = [pool.submit(verify_file, row) for row in manifest]
        for index, future in enumerate(as_completed(futures), 1):
            failure = future.result()
            if failure:
                failures.append(failure)
            if index % 250 == 0 or index == len(manifest):
                print(f"完整性验证：{index}/{len(manifest)}，失败 {len(failures)}", flush=True)
    if failures:
        raise DeploymentError(
            f"完整性验证失败：{len(failures)}/{len(manifest)} 个文件不一致；示例：{failures[:5]!r}"
        )
    print(f"完整性验证通过：{len(manifest)}/{len(manifest)} 个文件 SHA-256 一致")


def main() -> int:
    args = parse_args()
    api_key = require_env("BT_API_KEY")
    panel_url = require_env("BT_PANEL_URL")
    repo = args.repo.resolve()
    if not (repo / ".git").exists():
        raise DeploymentError(f"不是 Git 仓库：{repo}")
    if args.chunk_mib < 1 or args.chunk_mib > 4:
        raise DeploymentError("--chunk-mib 必须在 1 到 4 之间")
    if args.release_suffix and not re.fullmatch(r"[a-zA-Z0-9-]+", args.release_suffix):
        raise DeploymentError("--release-suffix 仅允许字母、数字和连字符")

    ensure_tracked_worktree(repo, allow_changes=args.include_tracked_worktree)
    commit_sha = resolve_commit(repo, args.commit)
    version = commit_sha[:12]
    if args.release_suffix:
        version = f"{version}-{args.release_suffix}"
    site_root = f"/www/wwwroot/{args.domain}"
    release_root = f"{site_root}/releases/{version}"
    package_root = f"{site_root}/packages"
    package_name = f"{version}.tar.gz"
    print(f"准备部署 {commit_sha} -> {args.domain} ({release_root})")

    api = BtApi(panel_url, api_key, insecure_tls=args.insecure_panel_tls)
    site_id = ensure_site(api, args.domain, args.www_domain, site_root)
    api.create_dir(f"{site_root}/releases")
    api.create_dir(package_root)
    api.create_dir(release_root)
    release_dirs, release_files = api.list_dir(release_root)
    if release_dirs or release_files:
        raise DeploymentError(f"版本目录不是空目录，拒绝覆盖：{release_root}")
    _, package_files = api.list_dir(package_root)
    if package_name in package_files:
        raise DeploymentError(f"部署包已存在，拒绝覆盖：{package_root}/{package_name}")

    with tempfile.TemporaryDirectory(prefix=f"vanstro-deploy-{version}-") as temp_name:
        temp = Path(temp_name)
        source = temp / "source"
        source.mkdir()
        if args.include_tracked_worktree:
            export_tracked_worktree(repo, commit_sha, source)
        else:
            export_commit(repo, commit_sha, source)
        output = build_static_export(source, args.domain)
        manifest = build_manifest(output)
        archive_path = temp / package_name
        create_archive(output, archive_path)
        archive_bytes = archive_path.read_bytes()
        archive_sha256 = hashlib.sha256(archive_bytes).hexdigest()
        metadata = (
            f"commit={commit_sha}\n"
            f"domain={args.domain}\n"
            "build=static-export\n"
            f"tracked_worktree={'included' if args.include_tracked_worktree else 'excluded'}\n"
            f"archive_sha256={archive_sha256}\n"
        ).encode()
        chunk_size = args.chunk_mib * 1024 * 1024
        api.upload_bytes(release_root, "DEPLOYMENT.txt", metadata, chunk_size=chunk_size)
        api.upload_bytes(package_root, package_name, archive_bytes, chunk_size=chunk_size)

    _, uploaded_packages = api.list_dir(package_root)
    if package_name not in uploaded_packages:
        raise DeploymentError("上传完成后未找到部署包")
    api.require_success(
        "/files?action=UnZip",
        {
            "sfile": f"{package_root}/{package_name}",
            "dfile": release_root,
            "type": "tar.gz",
            "coding": "UTF-8",
            "password": "",
            "power": "755",
            "user": "www",
        },
        timeout=240,
    )
    _, deployed_files = api.list_dir(release_root)
    for required in ("index.html", "404.html", "robots.txt", "sitemap.xml", "DEPLOYMENT.txt"):
        if required not in deployed_files:
            raise DeploymentError(f"解压后缺少关键文件：{required}")

    site_rows = [site for site in api.list_sites(args.domain) if site.get("name") == args.domain]
    if len(site_rows) != 1:
        raise DeploymentError("切换前无法唯一确定目标站点记录")
    previous_root = str(site_rows[0].get("path") or "")
    api.require_success("/site?action=SetPath", {"id": str(site_id), "path": release_root})
    try:
        site_rows = [site for site in api.list_sites(args.domain) if site.get("name") == args.domain]
        if len(site_rows) != 1 or site_rows[0].get("path") != release_root:
            raise DeploymentError("站点根目录切换后的数据库记录不符合预期")
        verify_http(args.server_ip, args.domain, manifest)
    except Exception:
        if previous_root and previous_root != release_root:
            rollback = api.call("/site?action=SetPath", {"id": str(site_id), "path": previous_root})
            print(f"完整性验证失败，回滚站点根目录到 {previous_root}: {rollback!r}", file=sys.stderr)
        raise

    print(json.dumps(
        {
            "status": "deployed",
            "domain": args.domain,
            "commit": commit_sha,
            "site_id": site_id,
            "release_root": release_root,
            "dns_changed": False,
            "ssl_changed": False,
        },
        ensure_ascii=False,
        indent=2,
    ))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except DeploymentError as error:
        print(f"部署失败：{error}", file=sys.stderr)
        raise SystemExit(1)
