resource "google_container_cluster" "devops-cluster" {
  name     = "gke-devops-cluster"
  location = "us-central1-a"
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
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]
  }

  upgrade_settings {
    max_surge       = 1
    max_unavailable = 0
  }

  lifecycle {
    prevent_destroy = true
    ignore_changes = [
      node_config[0].kubelet_config,
      node_config[0].resource_labels,
      node_config[0].tags,
      node_config[0].labels,
    ]
  }
}