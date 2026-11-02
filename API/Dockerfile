
# ==========================================
# 1. BUILD - SDK .NET 10
# ==========================================
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build

WORKDIR /src

# Copiar projetos para aproveitar cache
COPY Pudd.Domain/Pudd.Domain.csproj Pudd.Domain/
COPY Pudd.Application/Pudd.Application.csproj Pudd.Application/
COPY Pudd.Infrastructure/Pudd.Infrastructure.csproj Pudd.Infrastructure/
COPY Pudd.API/Pudd.API.csproj Pudd.API/

# Restaurar dependências
RUN dotnet restore Pudd.API/Pudd.API.csproj

# Copiar código-fonte
COPY . .

# Publicar aplicação
WORKDIR /src/Pudd.API
RUN dotnet publish -c Release \
    -o /app/publish \
    --no-restore \
    /p:UseAppHost=false

# ==========================================
# 2. RUNTIME - ASP.NET CORE 10
# ==========================================
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final

WORKDIR /app

# Configurações padrão
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 8080

# Copiar binários publicados
COPY --from=build /app/publish .

# Executar sem privilégios de root
USER $APP_UID

# Iniciar API
ENTRYPOINT ["dotnet", "Pudd.API.dll"]
