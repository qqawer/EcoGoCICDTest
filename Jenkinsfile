pipeline {
    agent any

    // 使用 Jenkins 内部配置的工具。注意：字符串必须与 Jenkins “全局工具配置” 中的名称一模一样！
    // 之前你遇到 java not found，就是因为你在 Jenkins 里配置的名字可能叫 jdk17 或者 maven3，而不是 'JDK 17'。
    // 请确认你 Jenkins (Manage Jenkins -> Tools) 中 JDK 和 Maven 的 Name 到底是什么，并在这里修改一致。
    tools {
        jdk 'JDK 17'  // 请根据你 Jenkins 里的实际名称修改
        maven 'Maven 3.9' // 请根据你 Jenkins 里的实际名称修改
    }

    environment {
        GIT_URL = 'https://github.com/qqawer/EcoGoCICDTest.git'
        BRANCH_NAME = 'main'
        BACKEND_PORT = '8090'
        SERVER_IP = credentials('SERVER_IP')
        SONAR_TOKEN = credentials('SONAR_TOKEN')
        SONAR_HOST_URL = 'https://sonarcloud.io'
        SONAR_PROJECT_KEY = credentials('SONAR_PROJECT_KEY')
    }

    stages {
        stage('Checkout Code') {
            steps {
                deleteDir()
                git branch: "${BRANCH_NAME}", url: "${GIT_URL}"
            }
        }

        stage('CI') {
            parallel {
                stage('Backend CI & Sonar') {
                    steps {
                        dir('EcoGo') {
                            script {
                                // 启动宿主机上的 mongodb 容器
                                sh 'docker compose up -d mongodb'
                                // 运行测试和打包
                                sh 'mvn clean verify'
                                // Sonar 分析
                                sh "mvn sonar:sonar -Dsonar.organization=qqawer -Dsonar.projectKey=${SONAR_PROJECT_KEY} -Dsonar.host.url=${SONAR_HOST_URL} -Dsonar.login=${SONAR_TOKEN}"
                            }
                        }
                    }
                }
                
                stage('Frontend CI') {
                    steps {
                        dir('EcoGoManagementSystem') {
                            script {
                                // 你的 Node 安装逻辑没问题，但执行命令可以简化
                                sh """
                                   if [ ! -d "node-bin" ]; then
                                       curl -sO https://nodejs.org/dist/v22.12.0/node-v22.12.0-linux-x64.tar.xz
                                       tar -xf node-v22.12.0-linux-x64.tar.xz
                                       mv node-v22.12.0-linux-x64 node-bin
                                   fi
                                """
                                withEnv(["PATH=${pwd()}/node-bin/bin:${env.PATH}"]) {
                                    // 删掉重复的命令，保证流程清晰
                                    sh 'npm install'
                                    sh 'npm run lint || true'
                                    sh 'npm run test:coverage || true'
                                }
                            }
                        }
                    }
                }
            }
        }

      stage('Deploy') {
            steps {
                // 部署时重新拉起全套服务
                sh 'docker compose up -d --build'
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