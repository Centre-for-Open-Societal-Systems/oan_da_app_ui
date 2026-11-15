#!/usr/bin/env bash
# deploy-helm-dev.sh - Install or upgrade the `da-app-ui` Helm release on the oan_dev k3s node
# Called by Jenkins for develop, after "Push image".
#
# Runs on the deploy agent with the kubeconfig Jenkins holds as `oan-dev-kubeconfig` (oan-helm chart
# oan-cluster-access, which must list this namespace); the agent needs helm and kubectl. The node pulls
# from ECR with its own IAM role, so there is no pull secret.
set -euo pipefail

: "${KUBECONFIG:?KUBECONFIG is required (credential oan-dev-kubeconfig)}"
: "${IMAGE_TAG_BUILD:?IMAGE_TAG_BUILD is required}"

NS="${DA_NAMESPACE:-da-app}"
RELEASE="${DA_UI_RELEASE:-da-app-ui}"
CHART=helm/oan-da-app-ui
VALUES=helm/environments/dev/oan-da-app-ui.yaml

echo "=== Deploying to oan_dev: release ${RELEASE}, namespace ${NS}, image tag ${IMAGE_TAG_BUILD} ==="

if ! helm upgrade --install "${RELEASE}" "${CHART}" --namespace "${NS}" -f "${VALUES}" \
  --set ui.image.tag="${IMAGE_TAG_BUILD}" \
  --wait --timeout 5m; then
  echo "=== helm upgrade failed ==="
  helm -n "${NS}" history "${RELEASE}" --max 3 || true
  kubectl -n "${NS}" get pods || true
  exit 1
fi

helm -n "${NS}" status "${RELEASE}"
kubectl -n "${NS}" get pods,ingress

echo "=== oan_dev deploy complete: ${RELEASE} ${IMAGE_TAG_BUILD} ==="
