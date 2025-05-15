# Use official .NET SDK for building
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /app

# Copy and restore
COPY . . 
RUN dotnet restore

# Build the application
RUN dotnet publish -c Release -o out

# Use a smaller runtime image
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/out .

# Run the app
ENTRYPOINT ["dotnet", "SubnetCalc.dll"]
