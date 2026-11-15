# Build do PWA (Vite) + Caddy servindo os arquivos estaticos e fazendo proxy de /api
# para o backend pela rede privada do Railway. O navegador so fala com este servico.

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Mesma origem: o Caddy repassa /api para o backend
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM caddy:2.11-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
ENV PORT=8080
EXPOSE 8080
