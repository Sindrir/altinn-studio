FROM mcr.microsoft.com/dotnet/core/sdk:3.1.402-alpine3.12 AS build

# Copy event backend
COPY Events ./Events
WORKDIR Events/


# Build and publish
RUN dotnet build Altinn.Platform.Events.csproj -c Release -o /app_output
RUN dotnet publish Altinn.Platform.Events.csproj -c Release -o /app_output

FROM mcr.microsoft.com/dotnet/core/aspnet:3.1.8-alpine3.12 AS final
EXPOSE 5080
WORKDIR /app
COPY --from=build /app_output .

COPY /Events/Migration ./Migration

# setup the user and group
# the user will have no password, using shell /bin/false and using the group dotnet
RUN addgroup -g 3000 dotnet && adduser -u 1000 -G dotnet -D -s /bin/false dotnet
# update permissions of files if neccessary before becoming dotnet user
USER dotnet
RUN mkdir /tmp/logtelemetry

ENTRYPOINT ["dotnet", "Altinn.Platform.Events.dll"]
