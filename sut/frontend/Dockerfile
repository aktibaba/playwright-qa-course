# Multi-stage: build the Vite SPA, then serve the static bundle with nginx.
# nginx also reverse-proxies /api → the api service, so the frontend's relative
# axios calls stay same-origin (the app uses HashRouter, so the pathname is
# always "/").
FROM node:20-bookworm AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
