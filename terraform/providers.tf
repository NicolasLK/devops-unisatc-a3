provider "google" {
  project = "sound-dialect-458215-j9"
  region  = "southamerica-east1"
}

provider "kubernetes" {
  host = "https://{google_container_cluster.devops-cluster.endpoint}"
  token = data.google_client_config.default.access_token
  cluster_ca_certificate = base64decode(google_container_cluster.devops-cluster.master_auth[0].cluster_ca_certificate)
}