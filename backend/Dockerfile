FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN apk add --no-cache iputils nmap nmap-nselibs nmap-scripts \
    && npm install --omit=dev

COPY src/ ./src/

RUN addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001 -G nodejs \
    && mkdir -p /app/config /app/data /app/user-data \
    && chown -R nodejs:nodejs /app/user-data

USER nodejs

# Nmap on Alpine splits NSE runtime data into separate packages.
# Fail the build if an unprivileged production worker cannot load it.
RUN test -r /usr/share/nmap/nse_main.lua \
    && test -r /usr/share/nmap/nmap-service-probes \
    && nmap -n -Pn -sT -sV --version-light -p 1 --host-timeout 10s -oX - 127.0.0.1 > /tmp/nmap-smoke.xml \
    && grep -q '<nmaprun' /tmp/nmap-smoke.xml \
    && rm -f /tmp/nmap-smoke.xml

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=5 \
  CMD node -e "require('http').get('http://127.0.0.1:4000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)}).on('error', () => process.exit(1))"

CMD ["node", "src/index.js"]
