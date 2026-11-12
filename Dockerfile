FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/src/aplicacion ./src/aplicacion
COPY --from=build /app/src/dominio ./src/dominio
COPY --from=build /app/src/presencia ./src/presencia

ENV PORT=3001
EXPOSE 3001
USER node

CMD ["npm", "start"]
