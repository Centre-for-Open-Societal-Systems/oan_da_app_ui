#!/usr/bin/env bash
# deploy-helm-dev.sh - Install or upgrade the `da-app-ui` Helm release on the oan_dev k3s node
# Called by Jenkins for develop, after "Push image (helm)" and "Package chart".
#
# Runs on the deploy agent with the kubeconfig Jenkins holds as `oan-dev-kubeconfig` (oan-helm chart
# oan-cluster-access, which must list this namespace); the agent needs helm and kubectl. The node pulls
# from ECR with its own IAM role, so there is no pull secret.
set -euo pipefail

: "${KUBECONFIG:?KUBECONFIG is required (credential oan-dev-kubeconfig)}"
: "${IMMUTABLE_TAG:?IMMUTABLE_TAG is required (<package.json version>-<branch>.<build>)}"

# DEPLOY_ENV picks the values: dev (develop) or staging (the staging branch, a promoted chart).
DEPLOY_ENV="${DEPLOY_ENV:-dev}"

NS="${DA_NAMESPACE:-da-app}"
RELEASE="${DA_UI_RELEASE:-da-app-ui}"
CHART_TGZ="built-chart/oan-da-app-ui-${IMMUTABLE_TAG}.tgz"
VALUES="helm/environments/${DEPLOY_ENV}/oan-da-app-ui.yaml"

test -f "${CHART_TGZ}" || { echo "${CHART_TGZ} is missing: run package_chart.py package first" >&2; exit 1; }

echo "=== Deploying to ${DEPLOY_ENV}: release ${RELEASE}, namespace ${NS}, image tag ${IMMUTABLE_TAG} ==="

# 12m, not 5m: when the base image (node:24-alpine) moves, every layer of the new image is new and the node pulls it
# whole before the container starts. Build 66 failed this way: the new Pod was Running, not yet Ready, at 5m.
HELM_TIMEOUT="${HELM_TIMEOUT:-12m}"

# Why the new Pods are not Ready, printed into the Jenkins log: their state, conditions and events (image pull,
# probe failures), and the container's output.
diagnose() {
  local selector="app.kubernetes.io/instance=${RELEASE}"
  kubectl -n "${NS}" get pods -l "${selector}" -o wide || true
  for pod in $(kubectl -n "${NS}" get pods -l "${selector}" \
                 -o jsonpath='{range .items[?(@.status.containerStatuses[0].ready==false)]}{.metadata.name}{" "}{end}' 2>/dev/null); do
    echo "----- ${pod}: describe (conditions and events)"
    kubectl -n "${NS}" describe pod "${pod}" | sed -n '/^Conditions:/,$p' || true
    echo "----- ${pod}: log"
    kubectl -n "${NS}" logs "${pod}" --tail=100 || true
  done
}

if ! helm upgrade --install "${RELEASE}" "${CHART_TGZ}" --namespace "${NS}" -f "${VALUES}" \
  --set ui.image.tag="${IMMUTABLE_TAG}" \
  --wait --timeout "${HELM_TIMEOUT}"; then
  echo "=== helm upgrade failed ==="
  helm -n "${NS}" history "${RELEASE}" --max 3 || true
  diagnose
  exit 1
fi

helm -n "${NS}" status "${RELEASE}"
kubectl -n "${NS}" get pods,ingress

echo "=== ${DEPLOY_ENV} deploy complete: ${RELEASE} ${IMMUTABLE_TAG} ==="
