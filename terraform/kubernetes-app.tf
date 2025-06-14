data "google_client_config" "default" {}

resource "kubernetes_persistent_volume_claim" "strapi_pvc" {
  wait_until_bound = true
  timeouts {
    create = "10m"
  }
  metadata {
    name = "strapi-data-disk-claim"
  }
  spec {
    access_modes = ["ReadWriteOnce"]
    storage_class_name = "standard"
    resources {
      requests = {
        storage = "1Gi"
      }
    }
  }

  depends_on = [
    google_container_node_pool.primary_preemptible_nodes
  ]
}

resource "kubernetes_deployment" "strapi" {
  metadata {
    name = "strapi-deployment"
  }
  spec {
    replicas = 1
    selector {
      match_labels = {
        app = "strapi"
      }
    }
    template {
      metadata {
        labels = {
          app = "strapi"
        }
      }
      spec {
        volume {
          name = "strapi-data"
          persistent_volume_claim {
            claim_name = kubernetes_persistent_volume_claim.strapi_pvc.metadata[0].name
          }
        }
        container {
          image = var.strapi_image
          name  = "strapi"
          port {
            container_port = 1337
          }
          volume_mount {
            name       = "strapi-data"
            mount_path = "/app/.tmp"
          }
        }
      }
    }
  }
  depends_on = [kubernetes_persistent_volume_claim.strapi_pvc]
}

resource "kubernetes_service" "strapi" {
  metadata {
    name = "strapi-service"
  }
  spec {
    selector = {
      app = kubernetes_deployment.strapi.spec[0].template[0].metadata[0].labels.app
    }
    port {
      port        = 80
      target_port = 1337
    }
    type = "LoadBalancer"
  }
}