FROM python:3.12-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv
# /srv/apps/api: riot.py usa parents[3] como raiz -> cache em /srv/data/raw
WORKDIR /srv/apps/api
COPY apps/api/pyproject.toml apps/api/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project
COPY apps/api/app ./app
EXPOSE 8000
CMD [".venv/bin/fastapi", "run", "app/main.py", "--port", "8000"]
