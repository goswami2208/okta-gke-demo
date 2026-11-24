#!/usr/bin/env bash
# End-to-end GCP deployment. Edit the variables, then run step by step (not meant to be fire-and-forget).
set -euo pipefail

PROJECT_ID=my-project
REGION=us-east1
CLUSTER=demo-cluster
BUCKET=app.example.com          # bucket name == site host name is convenient, any name works
APP_DOMAIN=app.example.com
API_DOMAIN=api.example.com
REPO=demo

gcloud config set project "$PROJECT_ID"
gcloud services enable container.googleapis.com artifactregistry.googleapis.com compute.googleapis.com

# ---------- 1. GKE (Autopilot handles node autoscaling; the HPA handles pod autoscaling) ----------
gcloud container clusters create-auto "$CLUSTER" --region "$REGION"
gcloud container clusters get-credentials "$CLUSTER" --region "$REGION"

# ---------- 2. Build + push images ----------
gcloud artifacts repositories create "$REPO" --repository-format=docker --location="$REGION" || true
gcloud auth configure-docker "$REGION-docker.pkg.dev" -q
for svc in items-service gateway; do
  docker build -t "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/$svc:1.0.0" "./$svc"
  docker push  "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/$svc:1.0.0"
done

# ---------- 3. Deploy backend ----------
sed -i "s#REGION-docker.pkg.dev/PROJECT_ID#$REGION-docker.pkg.dev/$PROJECT_ID#" k8s/*.yaml
kubectl apply -f k8s/config.yaml
# kubectl -n demo create secret generic db2-credentials ...   (see k8s/config.yaml)
gcloud compute addresses create api-ip --global || true      # then point DNS A record of $API_DOMAIN at it
kubectl apply -f k8s/items-service.yaml -f k8s/gateway.yaml

# ---------- 4. Angular -> Cloud Storage behind an HTTPS load balancer ----------
(cd frontend && npm ci && npm run build)       # output: frontend/dist/items-ui/browser
gcloud storage buckets create "gs://$BUCKET" --location="$REGION" --uniform-bucket-level-access || true
gcloud storage buckets update "gs://$BUCKET" --web-main-page-suffix=index.html --web-error-page=index.html  # SPA deep links
gcloud storage cp -r frontend/dist/items-ui/browser/* "gs://$BUCKET"
gcloud storage buckets add-iam-policy-binding "gs://$BUCKET" --member=allUsers --role=roles/storage.objectViewer

gcloud compute addresses create web-ip --global || true      # DNS A record of $APP_DOMAIN -> this IP
gcloud compute backend-buckets create web-backend --gcs-bucket-name="$BUCKET" --enable-cdn
gcloud compute url-maps create web-map --default-backend-bucket=web-backend
gcloud compute ssl-certificates create web-cert --domains="$APP_DOMAIN" --global
gcloud compute target-https-proxies create web-proxy --url-map=web-map --ssl-certificates=web-cert
gcloud compute forwarding-rules create web-https --global --address=web-ip --target-https-proxy=web-proxy --ports=443

echo "Done. Add DNS records, wait for managed certs to go ACTIVE, then browse https://$APP_DOMAIN"
