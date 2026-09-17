FROM node:22-slim

ENV NODE_ENV=production

WORKDIR /app

COPY --chown=10001:10001 package.json package-lock.json ./

RUN npm ci --omit=dev \
    && npm cache clean --force \
    && mkdir -p /app/logs /app/data

COPY --chown=10001:10001 . .

RUN chown -R 10001:10001 /app

USER 10001:10001

CMD ["tail", "-f", "/dev/null"]
