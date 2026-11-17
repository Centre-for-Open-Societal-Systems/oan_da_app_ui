#!/usr/bin/env bash
# deploy-helm-dev.sh - Install or upgrade the `da-app-ui` Helm release on the oan_dev k3s node
# Called by Jenkins for develop, after "Push image (helm)" and "Package chart".
#
# Runs on the deploy agent with the kubeconfig Jenkins holds as `oan-dev-kubeconfig` (oan-helm chart
# oan-cluster-access, which must list this namespace); the agent needs helm and kubectl. The node pulls
# from ECR with its own IAM role, so there is no pull secret.
set -euo pipefail

: "${KUBECONFIG:?KUBECONFIG is required (credential oan-dev-kubeconfig)}"
: "${IMMUTABLE_TAG:?IMMUTABLE_TAG is required (<package.json version>-develop.<build>)}"

NS="${DA_NAMESPACE:-da-app}"
RELEASE="${DA_UI_RELEASE:-da-app-ui}"
CHART_TGZ="built-chart/oan-da-app-ui-${IMMUTABLE_TAG}.tgz"
VALUES=helm/environments/dev/oan-da-app-ui.yaml

test -f "${CHART_TGZ}" || { echo "${CHART_TGZ} is missing: run package_chart.py package first" >&2; exit 1; }

echo "=== Deploying to oan_dev: release ${RELEASE}, namespace ${NS}, image tag ${IMMUTABLE_TAG} ==="

if ! helm upgrade --install "${RELEASE}" "${CHART_TGZ}" --namespace "${NS}" -f "${VALUES}" \
  --set ui.image.tag="${IMMUTABLE_TAG}" \
  --wait --timeout 5m; then
  echo "=== helm upgrade failed ==="
  helm -n "${NS}" history "${RELEASE}" --max 3 || true
  kubectl -n "${NS}" get pods || true
  exit 1
fi

helm -n "${NS}" status "${RELEASE}"
kubectl -n "${NS}" get pods,ingress

echo "=== oan_dev deploy complete: ${RELEASE} ${IMMUTABLE_TAG} ==="
