# ---------- dependencias ----------
FROM node:22-alpine AS deps
WORKDIR /app

# Soporte para entornos con inspeccion TLS (antivirus o proxy corporativo que
# reemplaza el certificado del registro de npm por uno firmado con su propia
# CA). Si hay algun .crt en certs/, se anade a la lista de CA de confianza de
# Node; si la carpeta esta vacia se usa el bundle del sistema y no cambia nada.
# Sin esto, `npm ci` falla con UNABLE_TO_VERIFY_LEAF_SIGNATURE, que npm
# reporta de forma enganosa como "Exit handler never called!".
COPY certs/ /usr/local/share/ca-certificates/extra/
RUN cat /usr/local/share/ca-certificates/extra/*.crt > /etc/ssl/extra-ca.crt 2>/dev/null || true; \
    [ -s /etc/ssl/extra-ca.crt ] || cp /etc/ssl/certs/ca-certificates.crt /etc/ssl/extra-ca.crt
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/extra-ca.crt

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---------- desarrollo (servidor Vite con hot reload) ----------
FROM node:22-alpine AS dev
WORKDIR /app
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN chown -R node:node /app
USER node
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

# ---------- build de produccion ----------
FROM deps AS build
COPY . .
# El bundle de Vite hornea estas variables en tiempo de build.
# Por defecto rutas relativas, para que las resuelva el proxy de nginx.
ARG VITE_API_URL=/api
ARG VITE_WS_URL=/ws
ENV VITE_API_URL=$VITE_API_URL \
    VITE_WS_URL=$VITE_WS_URL
RUN npm run build

# ---------- produccion (nginx sirviendo estaticos) ----------
FROM nginx:alpine AS prod
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
