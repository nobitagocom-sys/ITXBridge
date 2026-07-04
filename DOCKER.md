# Docker

Run ITXBridge in a container. Published image: [`decolua/itxbridge`](https://hub.docker.com/r/decolua/itxbridge) — multi-platform `linux/amd64` + `linux/arm64`.

---

# 👤 For Users

## Quick start

```bash
docker run -d \
  -p 20127:20127 \
  -v "$HOME/.itxbridge:/app/data" \
  -e DATA_DIR=/app/data \
  --name itxbridge \
  decolua/itxbridge:latest
```

App listens on port `20127`. Open: <http://localhost:20127>

## Manage container

```bash
docker logs -f itxbridge        # view logs
docker stop itxbridge           # stop
docker start itxbridge          # start again
docker rm -f itxbridge          # remove
```

## Data persistence

```bash
-v "$HOME/.itxbridge:/app/data" \
-e DATA_DIR=/app/data
```

Without `DATA_DIR`, the app falls back to `~/.itxbridge/` (macOS/Linux) or `%APPDATA%\itxbridge\` (Windows). In the container, `DATA_DIR=/app/data` makes the bind mount work.

Data layout under `$DATA_DIR/`:

```text
$DATA_DIR/
├── db/
│   ├── data.sqlite       # main SQLite database
│   └── backups/          # auto backups
└── ...                   # certs, logs, runtime configs
```

Host path: `$HOME/.itxbridge/db/data.sqlite`
Container path: `/app/data/db/data.sqlite`

## Optional env vars

```bash
docker run -d \
  -p 20127:20127 \
  -v "$HOME/.itxbridge:/app/data" \
  -e DATA_DIR=/app/data \
  -e PORT=20127 \
  -e HOSTNAME=0.0.0.0 \
  -e DEBUG=true \
  --name itxbridge \
  decolua/itxbridge:latest
```

## Optional Headroom sidecar

The ITXBridge image does not bundle Python or Headroom. To use Headroom in Docker, run it as a separate service and point ITXBridge at that proxy:

```yaml
services:
  itxbridge:
    image: decolua/itxbridge:latest
    ports:
      - "20127:20127"
    volumes:
      - "$HOME/.itxbridge:/app/data"
    environment:
      DATA_DIR: /app/data
      HEADROOM_URL: http://headroom:8787
    depends_on:
      - headroom

  headroom:
    image: ghcr.io/chopratejas/headroom:latest
    ports:
      - "8787:8787"
```

In the dashboard, open `Endpoint` → `Token Saver` → `Headroom`, confirm the URL is `http://headroom:8787`, recheck status, then enable Headroom.

If Headroom runs on the Docker host instead of as a sidecar, use `http://host.docker.internal:8787` on macOS/Windows. On Linux, add `--add-host=host.docker.internal:host-gateway` or the equivalent compose `extra_hosts` entry.

## Update to latest

```bash
docker pull decolua/itxbridge:latest
docker rm -f itxbridge
# re-run the quick start command
```

---

# 🛠 For Developers

## Build image locally (test)

```bash
cd app && docker build -t itxbridge .

docker run --rm -p 20127:20127 \
  -v "$HOME/.itxbridge:/app/data" \
  -e DATA_DIR=/app/data \
  itxbridge
```

## Publish (automatic via CI)

Push a git tag `v*` → GitHub Actions builds multi-platform (amd64+arm64) and pushes to:

- `ghcr.io/decolua/itxbridge:v{version}` + `:latest`
- `decolua/itxbridge:v{version}` + `:latest`

```bash
# Use scripts/release.js (recommended)
node scripts/release.js "Release title" "Notes"

# Or manually
git tag v0.4.x && git push origin v0.4.x
```

Workflow: `app/.github/workflows/docker-publish.yml`
