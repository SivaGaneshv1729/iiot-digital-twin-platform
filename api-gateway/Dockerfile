# Stage 1: Build the application using Maven
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
# Download dependencies
RUN mvn dependency:go-offline -B
COPY src ./src
# Build the application
RUN mvn clean package -DskipTests

# Stage 2: Run the application
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/api-gateway-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 4000
EXPOSE 4001
ENTRYPOINT ["java", "-jar", "app.jar"]
