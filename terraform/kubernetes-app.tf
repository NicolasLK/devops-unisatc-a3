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
  depends_on = [kubernetes_persistent_volume_claim.strapi_pvc]

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
        container {
          image = var.strapi_image
          name  = "strapi"
          port {
            container_port = 1337
          }
          env {
            name = "APP_KEYS"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.strapi_env.metadata[0].name
                key  = "APP_KEYS"
              }
            }
          }
          env {
            name = "API_TOKEN_SALT"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.strapi_env.metadata[0].name
                key  = "API_TOKEN_SALT"
              }
            }
          }
          env {
            name = "ADMIN_JWT_SECRET"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.strapi_env.metadata[0].name
                key  = "ADMIN_JWT_SECRET"
              }
            }
          }
          env {
            name = "TRANSFER_TOKEN_SALT"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.strapi_env.metadata[0].name
                key  = "TRANSFER_TOKEN_SALT"
              }
            }
          }
          env {
            name = "JWT_SECRET"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.strapi_env.metadata[0].name
                key  = "JWT_SECRET"
              }
            }
          }
        }
      }
    }
  }
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

resource "kubernetes_secret" "strapi_env" {
  metadata {
    name = "strapi-env"
  }

  data = {
    APP_KEYS = base64encode(var.app_keys)
    API_TOKEN_SALT        = base64encode(var.api_token_salt)
    ADMIN_JWT_SECRET      = base64encode(var.admin_jwt_secret)
    TRANSFER_TOKEN_SALT   = base64encode(var.transfer_token_salt)
    JWT_SECRET            = base64encode(var.jwt_secret)
  }

  type = "Opaque"
}