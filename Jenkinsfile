pipeline {
    agent any

    options {
        disableConcurrentBuilds()
        timeout(time: 45, unit: 'MINUTES')
    }

    environment {
        AWS_REGION      = 'ap-south-1'
        AWS_ACCOUNT_ID  = '379220350808'
        IMAGE_REGISTRY  = '379220350808.dkr.ecr.ap-south-1.amazonaws.com'
        IMAGE_NAME      = 'da-registry-frontend'   // must exist as an ECR repository first
        IMAGE_REPO      = "${IMAGE_REGISTRY}/${IMAGE_NAME}"
        // The DA cluster node (different from the grievance node). staging: Jenkins SSHes in and runs helm there.
        // develop runs on the oan_dev k3s node instead (stage "develop → oan_dev (helm)").
        DA_NODE         = '65.0.132.192'
        // oan_dev's private address: APISIX binds its ports 80/443, Verify calls it from the VPN agent.
        OAN_DEV_EDGE_IP = '10.0.1.131'
        HELM_RELEASE    = 'registry-frontend'
        CHART_DIR       = '/home/ubuntu/da/helm/charts/da-app'
        // Per-branch target (namespace, public URL) is chosen in the Checkout stage:
        //   develop -> namespace develop, image tag develop-<build>-<sha>
        //   staging -> namespace staging, image tag staging-<build>-<sha>
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
                script {
                    def targets = [
                        develop: [
                            namespace: 'da-app',
                            verifyUrl: 'https://da-app.development.oanstaging.com/login',
                            apiBaseUrl: 'https://da-services.development.oanstaging.com'
                        ],
                        staging: [
                            namespace: 'staging',
                            verifyUrl: 'https://da-registry-staging.oanstaging.com/login',
                            apiBaseUrl: 'http://da-backend-staging.oanstaging.com'
                        ]
                    ]
                    def target = targets[env.BRANCH_NAME]
                    env.TARGET_ENV    = target ? env.BRANCH_NAME : 'develop'
                    def t = target ?: targets.develop
                    env.K8S_NAMESPACE = t.namespace
                    env.VERIFY_URL    = t.verifyUrl
                    env.API_BASE_URL  = t.apiBaseUrl

                    def sha = sh(returnStdout: true, script: 'git rev-parse --short=7 HEAD').trim()
                    env.IMAGE_TAG_BUILD = "${env.TARGET_ENV}-${env.BUILD_NUMBER}-${sha}"
                    env.FULL_IMAGE      = "${env.IMAGE_REPO}:${env.IMAGE_TAG_BUILD}"
                    echo "Branch ${env.BRANCH_NAME} -> namespace ${env.K8S_NAMESPACE}, image ${env.FULL_IMAGE}"
                }
            }
        }

        stage('Install & test') {
            steps {
                // npm project (package-lock.json); `npm run check` = lint + typecheck + vitest.
                // `next typegen` first: PageProps / LayoutProps are generated global types (Next 15.5+),
                // and a clean checkout does not have them, so `tsc --noEmit` fails without it.
                sh '''
                    docker run --rm --user "$(id -u):$(id -g)" -e HOME=/tmp -e CI=true \
                        -v "$PWD":/app -w /app node:24-alpine \
                        sh -c "npm ci && npx next typegen && npm run check"
                '''
            }
        }

        stage('Build image') {
            when { anyOf { branch 'develop'; branch 'staging' } }
            steps {
                // API_BASE_URL is baked into the /api/v1 proxy at build time (see Dockerfile).
                sh '''
                    docker build --pull \
                        --build-arg API_BASE_URL="$API_BASE_URL" \
                        -t "$FULL_IMAGE" \
                        -t "$IMAGE_REPO:$TARGET_ENV" \
                        .
                '''
            }
        }

        stage('Push image') {
            when { anyOf { branch 'develop'; branch 'staging' } }
            steps {
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: 'aws-ecr-creds'
                ]]) {
                    sh '''
                        aws ecr get-login-password --region "$AWS_REGION" \
                            | docker login --username AWS --password-stdin "$IMAGE_REGISTRY"
                        docker push "$FULL_IMAGE"
                        docker push "$IMAGE_REPO:$TARGET_ENV"
                    '''
                }
            }
        }

        // develop -> Helm release `da-app-ui` on the oan_dev k3s node (chart helm/oan-da-app-ui). The chart's
        // values set API_BASE_URL and API_PATH_PREFIX at runtime: the DA services API through APISIX.
        stage('develop → oan_dev (helm)') {
            when { beforeAgent true; branch 'develop' }
            agent { label 'oan-ci-deploy' }   // VPN agent with helm and kubectl that reaches the oan_dev API
            options { timeout(time: 15, unit: 'MINUTES') }
            steps {
                checkout scm
                withCredentials([file(credentialsId: 'oan-dev-kubeconfig', variable: 'KUBECONFIG')]) {
                    sh 'DA_NAMESPACE="$K8S_NAMESPACE" bash ci/deploy-helm-dev.sh'
                }
            }
        }

        stage('Deploy (helm)') {
            when { branch 'staging' }
            steps {
                withCredentials([sshUserPrivateKey(
                    credentialsId: 'da-node-ssh-key',
                    keyFileVariable: 'SSH_KEY',
                    usernameVariable: 'SSH_USER'
                )]) {
                    // Same chart and values Ansible uses; --reuse-values keeps env, ingress host and probes
                    // of the live release and changes only the image and pull secret.
                    // --rollback-on-failure + --wait: Helm rolls back itself if the pods do not become ready.
                    sh '''
ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" "$SSH_USER@$DA_NODE" \
    bash -s -- "$HELM_RELEASE" "$CHART_DIR" "$K8S_NAMESPACE" "$IMAGE_REPO" "$IMAGE_TAG_BUILD" <<'ENDSSH'
set -euo pipefail
RELEASE="$1"; CHART="$2"; NS="$3"; REPO="$4"; TAG="$5"
export PATH="$PATH:/usr/local/bin:/snap/bin"
export KUBECONFIG="${KUBECONFIG:-$HOME/.kube/config}"

# Fail fast on a wrong release/namespace instead of creating a second release
helm status "$RELEASE" -n "$NS" > /dev/null
kubectl get secret ecr-regcred -n "$NS" > /dev/null || { echo "secret ecr-regcred missing in $NS (pull-secret CronJob not set up?)"; exit 1; }

echo "Deploying $REPO:$TAG to release $RELEASE ($NS)"
helm upgrade "$RELEASE" "$CHART" -n "$NS" --reuse-values \
    --set-string "image.repository=$REPO" \
    --set-string "image.tag=$TAG" \
    --set-string "image.pullPolicy=IfNotPresent" \
    --set "imagePullSecrets[0].name=ecr-regcred" \
    --rollback-on-failure --wait --timeout 5m
ENDSSH
                    '''
                }
            }
        }

        // develop: through APISIX on oan_dev by its private address (public DNS may still point elsewhere).
        stage('Verify (develop)') {
            when { beforeAgent true; branch 'develop' }
            agent { label 'oan-ci-deploy' }
            steps {
                sh '''
                    host=$(echo "$VERIFY_URL" | sed -E 's#^https://([^/]+).*#\\1#')
                    for i in $(seq 1 10); do
                        code=$(curl -sL -o /dev/null -w "%{http_code}" --resolve "$host:443:$OAN_DEV_EDGE_IP" "$VERIFY_URL" || true)
                        echo "attempt $i: $VERIFY_URL -> $code"
                        [ "$code" = "200" ] && exit 0
                        sleep 6
                    done
                    echo "da-registry-frontend did not return 200 at $VERIFY_URL"
                    exit 1
                '''
            }
        }

        stage('Verify') {
            when { branch 'staging' }
            steps {
                sh '''
                    for i in $(seq 1 10); do
                        code=$(curl -skL -o /dev/null -w "%{http_code}" "$VERIFY_URL" || true)
                        echo "attempt $i: $VERIFY_URL -> $code"
                        [ "$code" = "200" ] && exit 0
                        sleep 6
                    done
                    echo "da-registry-frontend did not return 200 at $VERIFY_URL"
                    exit 1
                '''
            }
        }
    }

    post {
        failure {
            echo "da-registry-frontend ${env.BRANCH_NAME} deploy failed (namespace ${env.K8S_NAMESPACE}). Check the stage logs above; 'helm history ${env.HELM_RELEASE} -n ${env.K8S_NAMESPACE}' shows whether Helm rolled back."
        }
    }
}
