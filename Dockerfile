FROM node:24-alpine

WORKDIR /app

# Hanya menyalin package.json untuk efisiensi cache layer Docker
COPY package*.json ./

# Install dependensi produksi saja
RUN npm install --production

# Salin seluruh kode backend
COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
