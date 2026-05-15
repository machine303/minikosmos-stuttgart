FROM node:22-alpine

WORKDIR /app

# Build tools required for better-sqlite3 native addon (Alpine has none by default)
RUN apk add --no-cache python3 make g++

# Deps first (cache layer)
COPY cms/package.json ./
RUN npm install --production

# Strip build tools to keep image lean
RUN apk del python3 make g++

# App code + website files
COPY cms/index.js ./
COPY website/ ./website/

# Persistent data volume
VOLUME ["/app/data"]

EXPOSE 3002

CMD ["node", "index.js"]
