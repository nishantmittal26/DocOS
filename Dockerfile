# Stage 1: Build & Publish (from repository root)
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy project files for optimal layer caching
COPY ["backend/src/DocOS.Domain/DocOS.Domain.csproj", "backend/src/DocOS.Domain/"]
COPY ["backend/src/DocOS.Application/DocOS.Application.csproj", "backend/src/DocOS.Application/"]
COPY ["backend/src/DocOS.Infrastructure/DocOS.Infrastructure.csproj", "backend/src/DocOS.Infrastructure/"]
COPY ["backend/src/DocOS.API/DocOS.API.csproj", "backend/src/DocOS.API/"]

# Restore NuGet dependencies
RUN dotnet restore "backend/src/DocOS.API/DocOS.API.csproj"

# Copy full backend source code
COPY backend/ backend/

# Build and publish release binaries
WORKDIR "/src/backend/src/DocOS.API"
RUN dotnet publish "DocOS.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Stage 2: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

# Configure default port for Render (Render maps to 8080 or the PORT env var)
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080

COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "DocOS.API.dll"]
