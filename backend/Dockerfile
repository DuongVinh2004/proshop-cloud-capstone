FROM node:16-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY backend ./backend
COPY uploads ./uploads

RUN mkdir -p /app/uploads && chown -R node:node /app
USER node

EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:' + (process.env.PORT || 5000) + '/api/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "backend/server.js"]
