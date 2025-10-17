pipeline {
    agent any

    environment {
        AWS_REGION = 'ap-south-1'           
        S3_BUCKET = 'bucket-bcci'      
    }

    stages {
        stage('Checkout') {
            steps {
                git branch: 'main', url: 'https://github.com/yashpflutter/Capproject.git'
            }
        }

        stage('Install AWS CLI') {
            steps {
                sh 'which aws || curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && unzip awscliv2.zip && sudo ./aws/install'
            }
        }

        stage('Deploy to S3') {
            steps {
                sh '''
                    aws s3 sync . s3://$S3_BUCKET --region $AWS_REGION --delete --exclude ".git/*" --exclude "Jenkinsfile"
                '''
            }
        }
    }

    post {
        success {
            echo 'Website successfully deployed to S3!'
        }
        failure {
            echo 'Deployment failed. Check logs.'
        }
    }
}
