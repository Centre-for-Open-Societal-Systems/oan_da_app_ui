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
        // develop is also installed on the oan_dev k3s node (stage "develop → oan_dev (helm)"), from the same
        // image pushed again under this repository with the tag <package.json version>-develop.<build>.
        ECR_REPO        = 'eoan/oan-da-app-ui/da-app-ui'
        // oan_dev's private address: APISIX binds its ports 80/443, the oan_dev verify calls it from the VPN agent.
        OAN_DEV_EDGE_IP = '10.0.1.131'
        IMAGE_REPO      = "${IMAGE_REGISTRY}/${IMAGE_NAME}"
        // The DA cluster node (different from the grievance node). Jenkins SSHes in and runs helm there.
        DA_NODE         = '65.0.132.192'
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
                            namespace: 'develop',
                            verifyUrl: 'https://da-registry-development.oanstaging.com/login',
                            apiBaseUrl: 'http://da-backend-development.oanstaging.com'
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

        stage('Deploy (helm)') {
            when { anyOf { branch 'develop'; branch 'staging' } }
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

        stage('Verify') {
            when { anyOf { branch 'develop'; branch 'staging' } }
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

        // ---- develop -> Helm release `da-app-ui` on the oan_dev k3s node ----
        // Runs after the DA node deploy above, so a problem here never blocks it. The image built above is
        // pushed again under eoan/oan-da-app-ui/da-app-ui:<package.json version>-develop.<build>. The chart sets
        // API_BASE_URL and API_PATH_PREFIX at runtime: the DA services API through APISIX.
        stage('Push image (helm)') {
            when { branch 'develop' }
            steps {
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: 'aws-ecr-creds'
                ]]) {
                    script {
                        // <package.json version>-develop.<build>, which is also the chart version
                        env.IMMUTABLE_TAG = sh(returnStdout: true, script: 'python3 ci/package_chart.py version').trim()
                    }
                    sh '''#!/usr/bin/env bash
                        set -euo pipefail
                        IMAGE_URI="${IMAGE_REGISTRY}/${ECR_REPO}"

                        aws ecr get-login-password --region "$AWS_REGION" \
                            | docker login --username AWS --password-stdin "$IMAGE_REGISTRY"

                        # ECR does not create a repository on push.
                        aws ecr describe-repositories --region "$AWS_REGION" --repository-names "$ECR_REPO" >/dev/null 2>&1 \
                            || aws ecr create-repository --region "$AWS_REGION" --repository-name "$ECR_REPO" >/dev/null

                        docker tag "$FULL_IMAGE" "${IMAGE_URI}:${IMMUTABLE_TAG}"
                        docker push "${IMAGE_URI}:${IMMUTABLE_TAG}"
                        docker rmi "${IMAGE_URI}:${IMMUTABLE_TAG}" || true
                        echo "Pushed ${IMAGE_URI}:${IMMUTABLE_TAG}"
                    '''
                }
            }
        }

        // Flow (develop): Push image (helm) -> Package chart -> deploy -> Publish chart.
        // helm/oan-da-app-ui is zipped with this build's image before the deploy; the deploy installs
        // that archive, and the same archive is published to oan-helm afterwards.
        stage('Package chart') {
            when { branch 'develop' }
            steps {
                script {
                    env.IMAGE_TAG = env.IMMUTABLE_TAG
                    env.SOURCE_COMMIT = sh(returnStdout: true, script: 'git rev-parse --verify HEAD').trim()
                    env.COMMIT_SUBJECT = sh(returnStdout: true, script: 'git log -1 --pretty=%s').trim()
                    env.IMAGE_REPOSITORY = "${env.IMAGE_REGISTRY}/${env.ECR_REPO}"
                }
                sh 'python3 ci/package_chart.py package'
                // The deploy stage runs on the VPN deploy agent, which gets the archive from here.
                stash name: 'built-chart', includes: 'built-chart/**'
            }
        }

        stage('develop → oan_dev (helm)') {
            when { beforeAgent true; branch 'develop' }
            agent { label 'oan-ci-deploy' }   // VPN agent with helm and kubectl that reaches the oan_dev API
            options { timeout(time: 15, unit: 'MINUTES') }
            steps {
                checkout scm
                unstash 'built-chart'
                withCredentials([file(credentialsId: 'oan-dev-kubeconfig', variable: 'KUBECONFIG')]) {
                    sh 'bash ci/deploy-helm-dev.sh'
                }
            }
        }

        // Through APISIX on oan_dev by its private address: public DNS may still point elsewhere.
        stage('Verify (oan_dev)') {
            when { beforeAgent true; branch 'develop' }
            agent { label 'oan-ci-deploy' }
            steps {
                sh '''
                    host=da-app.development.oanstaging.com
                    url="https://$host/login"
                    for i in $(seq 1 10); do
                        code=$(curl -sL -o /dev/null -w "%{http_code}" --resolve "$host:443:$OAN_DEV_EDGE_IP" "$url" || true)
                        echo "attempt $i: $url -> $code"
                        [ "$code" = "200" ] && exit 0
                        sleep 6
                    done
                    echo "da-app-ui did not return 200 at $url"
                    exit 1
                '''
            }
        }

        // Adds the archive built by 'Package chart' to repository/develop/ of oan-helm, only after
        // the oan_dev deploy and its verify succeeded.
        stage('Publish chart') {
            when { branch 'develop' }
            steps {
                // UNSTABLE, not failed: the image is already deployed.
                catchError(buildResult: 'UNSTABLE', stageResult: 'UNSTABLE') {
                    withCredentials([usernamePassword(credentialsId: 'oan-helm-fork-token', usernameVariable: 'GH_USER', passwordVariable: 'GH_TOKEN')]) {
                        sh 'python3 ci/package_chart.py publish'
                    }
                }
            }
        }
    }

    post {
        failure {
            echo "da-registry-frontend ${env.BRANCH_NAME} deploy failed (namespace ${env.K8S_NAMESPACE}). Check the stage logs above; 'helm history ${env.HELM_RELEASE} -n ${env.K8S_NAMESPACE}' shows whether Helm rolled back."
        }
    }
}
