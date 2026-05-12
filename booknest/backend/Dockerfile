FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma.config.ts ./
RUN npx prisma generate

EXPOSE 4000
CMD ["sh", "-c", "if [ \"$FORCE_DB_RESET\" = \"true\" ]; then npx prisma db push --force-reset --accept-data-loss; else npx prisma db push --accept-data-loss; fi && node dist/index.js"]
