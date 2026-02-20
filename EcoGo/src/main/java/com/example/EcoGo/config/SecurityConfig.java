package com.example.EcoGo.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

        private static final String ADMIN_ROLE = "ADMIN";

        @Bean
        @SuppressWarnings("java:S4502") // CSRF is safely disabled: stateless REST API using JWT bearer tokens, no
                                        // cookies/sessions
        public SecurityFilterChain securityFilterChain(HttpSecurity http,
                        JwtAuthenticationFilter jwtAuthenticationFilter,
                        CustomAccessDeniedHandler accessDeniedHandler,
                        CustomAuthenticationEntryPoint authenticationEntryPoint) throws Exception {
                http
                                // Enable CORS using the custom configuration bean
                                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                                // CSRF protection is disabled because this API is stateless (JWT bearer
                                // tokens).
                                // No session cookies are used, so CSRF attacks are not applicable.
                                .csrf(AbstractHttpConfigurer::disable)

                                // Disable default login forms (we use our own API endpoints)
                                .formLogin(AbstractHttpConfigurer::disable)
                                .httpBasic(AbstractHttpConfigurer::disable)

                                // Authorize Requests
                                .authorizeHttpRequests(auth -> auth
                                                // Public Endpoints
                                                .requestMatchers("/api/v1/mobile/users/login",
                                                                "/api/v1/mobile/users/register")
                                                .permitAll()
                                                // Chatbot endpoints are allowed for dev/test flows that don't have JWT
                                                .requestMatchers("/api/v1/mobile/chatbot/**")
                                                .permitAll()
                                                .requestMatchers("/api/v1/web/users/login").permitAll()
                                                .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll() // Swagger

                                                .requestMatchers(HttpMethod.GET, "/api/v1/orders").hasRole(ADMIN_ROLE)
                                                .requestMatchers(HttpMethod.POST, "/api/v1/goods").hasRole(ADMIN_ROLE)
                                                .requestMatchers(HttpMethod.PUT, "/api/v1/goods/{id}")
                                                .hasRole(ADMIN_ROLE)
                                                .requestMatchers(HttpMethod.DELETE, "/api/v1/goods/{id}")
                                                .hasRole(ADMIN_ROLE)
                                                .requestMatchers(HttpMethod.GET, "/api/v1/support/churn/admin/**")
                                                .hasRole(ADMIN_ROLE)

                                                .requestMatchers(HttpMethod.PUT, "/api/v1/goods/batch-stock")
                                                .hasRole(ADMIN_ROLE)
                                                .requestMatchers(HttpMethod.GET, "/api/v1/goods/categories")
                                                .hasRole(ADMIN_ROLE)
                                                .requestMatchers(HttpMethod.GET, "/api/v1/goods/admin/vouchers")
                                                .hasRole(ADMIN_ROLE)
                                                .requestMatchers(HttpMethod.POST, "/api/v1/goods/admin/vouchers")
                                                .hasRole(ADMIN_ROLE)
                                                .requestMatchers(HttpMethod.PUT, "/api/v1/goods/admin/vouchers/**")
                                                .hasRole(ADMIN_ROLE)
                                                .requestMatchers(HttpMethod.DELETE, "/api/v1/goods/admin/vouchers/**")
                                                .hasRole(ADMIN_ROLE)

                                                // Secured Endpoints
                                                .requestMatchers("/api/v1/admin/**").hasRole(ADMIN_ROLE)
                                                .requestMatchers("/api/v1/mobile/**").authenticated()
                                                .requestMatchers("/api/v1/web/**").hasRole(ADMIN_ROLE)

                                                // Default
                                                .anyRequest().permitAll() // Keep other paths open for development
                                )

                                // Exception Handling for 401 and 403
                                .exceptionHandling(exception -> exception
                                                .accessDeniedHandler(accessDeniedHandler)
                                                .authenticationEntryPoint(authenticationEntryPoint))

                                // Add JWT Filter before the standard username/password filter
                                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

                return http.build();
        }

        @Bean
        public CorsConfigurationSource corsConfigurationSource() {
                CorsConfiguration configuration = new CorsConfiguration();

                // Critical fix: Replace wildcard with exact frontend origin to resolve CORS
                // issues
                configuration.setAllowedOrigins(Arrays.asList("http://13.229.148.21:3000"));

                // Allow all standard HTTP methods for API operations
                configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));

                // Allow all request headers (including JWT tokens, content-type, etc.)
                configuration.setAllowedHeaders(Arrays.asList("*"));

                // Enable credentials (cookies, authorization headers, TLS client certificates)
                configuration.setAllowCredentials(true);

                // Cache preflight OPTIONS request response for 1 hour to reduce overhead
                configuration.setMaxAge(3600L);

                UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
                // Apply CORS configuration to all API endpoints
                source.registerCorsConfiguration("/**", configuration);

                return source;
        }
}
