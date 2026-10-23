FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY src/ ./src/

RUN addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001 -G nodejs \
    && mkdir -p /app/config /app/data /app/user-data \
    && chown -R nodejs:nodejs /app/user-data

USER nodejs

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=5 \
  CMD node -e "require('http').get('http://127.0.0.1:4000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)}).on('error', () => process.exit(1))"

CMD ["node", "src/index.js"]
