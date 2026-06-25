# Whole-app image: builds the React client, publishes the ASP.NET server, and serves both.
# Build context is the `` folder:  docker build -f Dockerfile .

# 1) Build the React client -> /client/dist
FROM node:20-alpine AS client
WORKDIR /client
COPY client/package.json client/package-lock.json* ./
RUN npm install
COPY client/ ./
RUN npx tsc -b && npx vite build --outDir dist --emptyOutDir

# 2) Publish the ASP.NET server. The client built in stage 1 is copied into wwwroot, so the
#    server build itself stays pure .NET (no Node needed).
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY server/aspnet/RevealAIChat.Server/RevealAIChat.Server.csproj ./RevealAIChat.Server/
RUN dotnet restore ./RevealAIChat.Server/RevealAIChat.Server.csproj
COPY server/aspnet/RevealAIChat.Server/ ./RevealAIChat.Server/
COPY --from=client /client/dist ./RevealAIChat.Server/wwwroot
RUN dotnet publish ./RevealAIChat.Server/RevealAIChat.Server.csproj -c Release -o /app

# 3) Runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app ./
# The app never starts a database itself; in the image the database is the `db` service in
# docker-compose.app.yml, reached via the Database__* env vars.
ENV ASPNETCORE_URLS=http://+:8111
EXPOSE 8111
ENTRYPOINT ["dotnet", "RevealAIChat.Server.dll"]
