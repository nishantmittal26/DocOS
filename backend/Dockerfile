# Stage 1: Build & Publish
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy csproj files for optimal layer caching
COPY ["src/DocOS.Domain/DocOS.Domain.csproj", "src/DocOS.Domain/"]
COPY ["src/DocOS.Application/DocOS.Application.csproj", "src/DocOS.Application/"]
COPY ["src/DocOS.Infrastructure/DocOS.Infrastructure.csproj", "src/DocOS.Infrastructure/"]
COPY ["src/DocOS.API/DocOS.API.csproj", "src/DocOS.API/"]

# Restore NuGet dependencies
RUN dotnet restore "src/DocOS.API/DocOS.API.csproj"

# Copy remaining source code
COPY . .

# Build and publish release binaries
WORKDIR "/src/src/DocOS.API"
RUN dotnet publish "DocOS.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Stage 2: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

# Configure default port for Render (Render maps to 8080 or the PORT env var)
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080

COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "DocOS.API.dll"]
