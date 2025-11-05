# ============================================
# 1️⃣ Etapa base: Node.js + dependencias
# ============================================
FROM node:20-alpine

# Crear carpeta de la app
WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código del proyecto
COPY . .

# Establecer variable de entorno
ENV PORT=3000

# Exponer el puerto de tu backend
EXPOSE 3000

# Comando de inicio
CMD ["npm", "start"]
