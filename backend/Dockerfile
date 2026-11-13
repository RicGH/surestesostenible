FROM node:20-alpine

RUN apk add --no-cache \
  chromium \
  nss \
  freetype \
  freetype-dev \
  harfbuzz \
  ca-certificates \
  ttf-freefont \
  font-noto \
  font-carlito \
  font-liberation \
  font-dejavu \
  libreoffice

# Fuentes que usan las plantillas de Word y no vienen en Alpine (Lato, OFL).
# Sin ellas LibreOffice las sustituye por otras mas anchas y el contrato se
# descuadra (hojas casi en blanco, firmas partidas).
COPY fonts/ /usr/share/fonts/custom/
RUN fc-cache -f

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev=false

COPY src ./src

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "--watch", "src/index.js"]
