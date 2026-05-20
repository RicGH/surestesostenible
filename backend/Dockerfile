FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev=false

COPY src ./src

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "--watch", "src/index.js"]
