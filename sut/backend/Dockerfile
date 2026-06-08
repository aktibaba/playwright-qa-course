# Inkwell API (Express + Sequelize). Full node image so bcrypt's native build
# always succeeds regardless of prebuild availability.
FROM node:20-bookworm

WORKDIR /app

# Install deps first for layer caching. Backend has its own package.json
# (the repo is an npm-workspaces monorepo; we build this service standalone).
COPY package.json ./
RUN npm install

COPY . .

ENV NODE_ENV=development
EXPOSE 3001

CMD ["node", "index.js"]
