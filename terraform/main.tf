resource "google_container_cluster" "devops-cluster" {
  name     = "gke-devops-cluster"
  location = "us-central1-a"

  # We can't create a cluster with no node pool defined, but we want to only use
  # separately managed node pools. So we create the smallest possible default
  # node pool and immediately delete it.
  remove_default_node_pool  = true
  initial_node_count        = 1
  default_max_pods_per_node = 30
  deletion_protection       = false
}

resource "google_container_node_pool" "primary_preemptible_nodes" {
  name       = "node-devops-pool"
  location   = "us-central1-a"
  cluster    = google_container_cluster.devops-cluster.name
  node_count = 1

  node_config {
    preemptible  = true
    machine_type = "e2-medium"

    # Google recommends custom service accounts that have cloud-platform scope and permissions granted via IAM Roles.
    # service_account = google_service_account.default.email
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]
  }
}