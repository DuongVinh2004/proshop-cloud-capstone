FROM node:16-alpine AS build

WORKDIR /app
ENV CI=false
ENV GENERATE_SOURCEMAP=false

COPY frontend/package*.json ./
RUN npm ci --legacy-peer-deps

COPY frontend ./
RUN npm run build

FROM nginx:1.25-alpine

COPY --from=build /app/build /usr/share/nginx/html
COPY infra/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
