data "google_client_config" "default" {}

# 1. Solicita um "pedaço" de armazenamento persistente.
resource "kubernetes_persistent_volume_claim" "strapi_pvc" {
  metadata {
    name = "strapi-data-disk-claim" # Nome da solicitação de volume
  }
  spec {
    access_modes = ["ReadWriteOnce"] # Pode ser lido/escrito por um pod de cada vez
    resources {
      requests = {
        storage = "1Gi" # Solicita 1 GB de espaço. Suficiente para o SQLite.
      }
    }
  }
}

# 2. Define o Deployment da aplicação (como rodar o contêiner)
resource "kubernetes_deployment" "strapi" {
  metadata {
    name = "strapi-deployment"
  }
  spec {
    replicas = 1 # IMPORTANTE: Para SQLite, use apenas 1 réplica.
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
        # 3. Conecta o volume persistente ao Pod.
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
          # 4. "Monta" o volume dentro do contêiner no local exato do banco.
          volume_mount {
            name       = "strapi-data"
            mount_path = "/app/.tmp" # Mapeia nosso disco para a pasta do banco de dados.
          }
        }
      }
    }
  }
  # Garante que o volume seja criado antes do deployment tentar usá-lo
  depends_on = [kubernetes_persistent_volume_claim.strapi_pvc]
}

# 5. Expõe a aplicação para a internet com um IP público
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