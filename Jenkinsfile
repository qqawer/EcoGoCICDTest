pipeline {
    agent any

    tools {
        jdk 'jdk-17'
        maven 'maven-3.9.5'
    }

    environment {
        GIT_URL = 'https://github.com/qqawer/EcoGoCICDTest.git'
        BRANCH_NAME = 'main'
        
        BACKEND_PORT = '8090'
        FRONTEND_PORT = '3000' 
        CHATBOT_PORT = '8000'
        
        SERVER_IP          = credentials('SERVER_IP')
        
        // SonarCloud Configuration
        SONAR_TOKEN        = credentials('SONAR_TOKEN')
        SONAR_HOST_URL     = 'https://sonarcloud.io'
        SONAR_PROJECT_KEY  = credentials('SONAR_PROJECT_KEY')
    }

    stages {
        stage('Checkout Code') {
            steps {
                echo 'Pulling latest code...'
                deleteDir()
                git branch: "${BRANCH_NAME}", url: "${GIT_URL}"
            }
        }

        stage('CI') {
            parallel {
                stage('Backend CI & Sonar') {
                    steps {
                        echo 'Running Backend CI and SonarCloud Analysis...'
                        dir('EcoGo') {
                            script {
                                sh 'chmod +x mvnw'
                                // Compile, Test, Static Analysis, Coverage, and SonarCloud Analysis
                                sh './mvnw clean verify'
                                
                                sh """
                                    ./mvnw sonar:sonar \
                                      -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
                                      -Dsonar.host.url=${SONAR_HOST_URL} \
                                      -Dsonar.login=${SONAR_TOKEN}
                                """
                            }
                        }
                    }
                }
                
                stage('Frontend CI') {
                    steps {
                        echo 'Running Frontend CI...'
                        dir('EcoGoManagementSystem') {
                            script {
                                // Install Node if needed
                                sh """
                                   if [ ! -d "node-bin" ]; then
                                       echo "Installing Node.js locally..."
                                       curl -sO https://nodejs.org/dist/v18.19.0/node-v18.19.0-linux-x64.tar.xz
                                       tar -xf node-v18.19.0-linux-x64.tar.xz
                                       rm -rf node-bin
                                       mv node-v18.19.0-linux-x64 node-bin
                                       rm node-v18.19.0-linux-x64.tar.xz
                                   else
                                       echo "Node.js already installed in node-bin."
                                   fi
                                """
                                withEnv(["PATH=${pwd()}/node-bin/bin:${env.PATH}"]) {
                                    sh 'npm install'
                                    sh 'npm run lint'
                                    sh 'npm run test:coverage'
                                }
                            }
                        }
                    }
                }
            }
        }

        stage('Deploy with Docker Compose') {
            steps {
                echo 'Building and Deploying containers...'
                script {
                    sh 'docker-compose down || true'
                    sh 'docker-compose build'
                    sh 'docker-compose up -d'
                    
                    // Wait for containers to be up
                    sleep 15
                }
            }
        }

        stage('Health Check') {
            steps {
                script {
                    def target = "http://${SERVER_IP}:${BACKEND_PORT}"
                    def healthEndpoint = "${target}/actuator/health"
                    
                    echo "Waiting for backend to be ready at ${healthEndpoint}..."
                    
                    try {
                        timeout(time: 5, unit: 'MINUTES') {
                            waitUntil {
                                try {
                                    def response = sh(script: "curl -s -o /dev/null -w '%{http_code}' ${healthEndpoint}", returnStdout: true).trim()
                                    return response == '200'
                                } catch (Exception e) {
                                    return false
                                }
                            }
                        }
                    } catch (Exception e) {
                        error("Backend failed to start within timeout")
                    }
                    echo "✅ Backend is UP."
                }
            }
        }

        stage('DAST: OWASP ZAP Security Scan') {
            steps {
                script {
                    def target = "http://${SERVER_IP}:${BACKEND_PORT}"
                    echo "Starting ZAP Scan on ${target}..."

                    sh """
                        docker run --rm -t \
                          -v \$(pwd):/zap/wrk/:rw \
                          owasp/zap2docker-stable \
                          zap-baseline.py -t ${target} -r zap-report.html
                    """
                    archiveArtifacts artifacts: 'zap-report.html', allowEmptyArchive: true
                }
            }
        }
    }

    post {
        success {
            echo "🎉 ALL DEPLOYED SUCCESSFULLY!"
            echo "🔗 Backend: http://${SERVER_IP}:${BACKEND_PORT}"
            echo "🔗 Frontend: http://${SERVER_IP}:${FRONTEND_PORT}"
            echo "🔗 Chatbot: http://${SERVER_IP}:${CHATBOT_PORT}"
            echo "📊 SonarCloud: ${SONAR_HOST_URL}/dashboard?id=${SONAR_PROJECT_KEY}"
        }
        failure {
            echo "❌ Pipeline failed"
        }
    }
}