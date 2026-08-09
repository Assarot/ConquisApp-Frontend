# Fase 1: Compilación
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build -- --configuration=production

# Fase 2: Servidor Web
FROM nginx:1.25-alpine
# Copiar estáticos (ajustar la ruta dist según el nombre de tu proyecto Angular)
COPY --from=build /app/dist/gestion-club/browser /usr/share/nginx/html
# Copiar archivo de configuración para soportar rutas de Angular Router
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
