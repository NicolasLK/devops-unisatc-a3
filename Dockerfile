# Etapa 1: build da aplicação
FROM node:18 as builder

# Define diretório de trabalho
WORKDIR /app

# Copia os arquivos para dentro do container
COPY package*.json ./
RUN npm install

COPY . .

# Opcional: build se for necessário (por exemplo, TypeScript ou Strapi build)
RUN npm run build

# Etapa 2: imagem final de produção
FROM node:18-slim

WORKDIR /app

# Copia apenas o necessário da imagem de build
COPY --from=builder /app /app

# Instala apenas dependências de produção
RUN npm install --omit=dev

# Expõe a porta que a aplicação usa
EXPOSE 1337

# Comando para iniciar a aplicação
CMD ["npm", "run", "start"]