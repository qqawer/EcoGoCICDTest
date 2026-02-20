# Stage 1: Build
FROM maven:3.9.5-eclipse-temurin-17 AS builder
WORKDIR /app
COPY pom.xml .
# Download dependencies first to cache them
RUN mvn dependency:go-offline
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Runtime
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
# Workaround for Alpine DNS issue in certain Docker environments
RUN echo "nameserver 8.8.8.8" > /etc/resolv.conf && apk add --no-cache curl
COPY --from=builder /app/target/*.jar app.jar

ENV SERVER_PORT=8090
EXPOSE 8090

HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:8090/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
