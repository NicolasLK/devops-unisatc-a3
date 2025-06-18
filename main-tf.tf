# terraform/main.tf
# Infraestrutura principal para Strapi no Google Cloud Platform
# Projeto: DevOps UNISATC A3

terraform {
  required_version = ">= 1.5"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
  }
  
  backend "gcs" {
    # Configurado via backend-config no GitHub Actions
  }
}

# Provider principal do Google Cloud
provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

# Locals para configurações comuns
locals {
  app_name = "devops-unisatc-a3"
  labels = {
    project     = "devops-unisatc-a3"
    environment = var.environment
    managed_by  = "terraform"
    team        = "unisatc"
  }
  
  # Nome dos recursos com prefixo do environment
  name_prefix = "${local.app_name}-${var.environment}"
}

# Habilita APIs necessárias do Google Cloud
resource "google_project_service" "required_apis" {
  for_each = toset([
    "compute.googleapis.com",
    "container.googleapis.com",
    "sql.googleapis.com",
    "storage.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "iam.googleapis.com",
    "secretmanager.googleapis.com",
    "cloudbuild.googleapis.com"
  ])
  
  service            = each.value
  disable_on_destroy = false
  
  timeouts {
    create = "10m"
    update = "10m"
  }
}

# VPC Network
resource "google_compute_network" "vpc" {
  name                    = "${local.name_prefix}-vpc"
  auto_create_subnetworks = false
  mtu                     = 1460
  
  depends_on = [google_project_service.required_apis]
  
  labels = local.labels
}

# Subnet para aplicação
resource "google_compute_subnetwork" "app_subnet" {
  name          = "${local.name_prefix}-app-subnet"
  ip_cidr_range = "10.0.1.0/24"
  region        = var.region
  network       = google_compute_network.vpc.id
  
  private_ip_google_access = true
  
  log_config {
    aggregation_interval = "INTERVAL_10_MIN"
    flow_sampling        = 0.5
    metadata             = "INCLUDE_ALL_METADATA"
  }
}

# Subnet para banco de dados
resource "google_compute_subnetwork" "db_subnet" {
  name          = "${local.name_prefix}-db-subnet"
  ip_cidr_range = "10.0.2.0/24"
  region        = var.region
  network       = google_compute_network.vpc.id
  
  private_ip_google_access = true
}

# Firewall rules
resource "google_compute_firewall" "allow_internal" {
  name    = "${local.name_prefix}-allow-internal"
  network = google_compute_network.vpc.name

  allow {
    protocol = "tcp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "udp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "icmp"
  }

  source_ranges = ["10.0.0.0/16"]
  target_tags   = ["internal"]
}

resource "google_compute_firewall" "allow_http_https" {
  name    = "${local.name_prefix}-allow-http-https"
  network = google_compute_network.vpc.name

  allow {
    protocol = "tcp"
    ports    = ["80", "443"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["web"]
}

resource "google_compute_firewall" "allow_ssh" {
  name    = "${local.name_prefix}-allow-ssh"
  network = google_compute_network.vpc.name

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["ssh"]
}

# Cloud SQL Instance para PostgreSQL
resource "google_sql_database_instance" "postgres" {
  name             = "${local.name_prefix}-postgres"
  database_version = "POSTGRES_15"
  region           = var.region
  
  deletion_protection = var.environment == "production" ? true : false
  
  settings {
    tier                        = var.db_tier
    availability_type           = var.environment == "production" ? "REGIONAL" : "ZONAL"
    disk_type                   = "PD_SSD"
    disk_size                   = var.db_disk_size
    disk_autoresize             = true
    disk_autoresize_limit       = var.db_max_disk_size
    
    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"
      location                       = var.region
      point_in_time_recovery_enabled = var.environment == "production"
      transaction_log_retention_days = var.environment == "production" ? 7 : 3
      
      backup_retention_settings {
        retained_backups = var.environment == "production" ? 30 : 7
        retention_unit   = "COUNT"
      }
    }
    
    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.vpc.id
      require_ssl     = true
    }
    
    database_flags {
      name  = "log_checkpoints"
      value = "on"
    }
    
    database_flags {
      name  = "log_connections"
      value = "on"
    }
    
    database_flags {
      name  = "log_disconnections"
      value = "on"
    }
    
    maintenance_window {
      day          = 7  # Sunday
      hour         = 3
      update_track = "stable"
    }
  }
  
  depends_on = [
    google_project_service.required_apis,
    google_service_networking_connection.private_vpc_connection
  ]
}

# Private service connection para Cloud SQL
resource "google_compute_global_address" "private_ip_address" {
  name          = "${local.name_prefix}-private-ip"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.vpc.id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_address.name]
  
  depends_on = [google_project_service.required_apis]
}

# Database e usuário
resource "google_sql_database" "strapi_db" {
  name     = var.db_name
  instance = google_sql_database_instance.postgres.name
}

resource "google_sql_user" "strapi_user" {
  name     = var.db_user
  instance = google_sql_database_instance.postgres.name
  password = var.db_password
}

# Cloud Storage bucket para uploads
resource "google_storage_bucket" "uploads" {
  name          = "${local.name_prefix}-uploads-${random_string.bucket_suffix.result}"
  location      = var.region
  force_destroy = var.environment != "production"
  
  uniform_bucket_level_access = true
  
  versioning {
    enabled = var.environment == "production"
  }
  
  lifecycle_rule {
    condition {
      age = var.environment == "production" ? 90 : 30
    }
    action {
      type = "Delete"
    }
  }
  
  cors {
    origin          = ["*"]
    method          = ["GET", "HEAD", "PUT", "POST", "DELETE"]
    response_header = ["*"]
    max_age_seconds = 3600
  }
  
  labels = local.labels
}

resource "random_string" "bucket_suffix" {
  length  = 8
  special = false
  upper   = false
}

# Service Account para a aplicação
resource "google_service_account" "app_service_account" {
  account_id   = "${local.name_prefix}-app-sa"
  display_name = "Service Account for ${local.app_name} ${var.environment}"
  description  = "Service account used by the Strapi application"
}

# Permissões para o Service Account
resource "google_project_iam_member" "app_service_account_permissions" {
  for_each = toset([
    "roles/storage.objectAdmin",
    "roles/cloudsql.client",
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
    "roles/secretmanager.secretAccessor"
  ])
  
  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.app_service_account.email}"
}

# Secret Manager para variáveis sensíveis
resource "google_secret_manager_secret" "jwt_secret" {
  secret_id = "${local.name_prefix}-jwt-secret"
  
  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }
  
  labels = local.labels
}

resource "google_secret_manager_secret_version" "jwt_secret_version" {
  secret      = google_secret_manager_secret.jwt_secret.id
  secret_data = var.jwt_secret
}

resource "google_secret_manager_secret" "admin_jwt_secret" {
  secret_id = "${local.name_prefix}-admin-jwt-secret"
  
  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }
  
  labels = local.labels
}

resource "google_secret_manager_secret_version" "admin_jwt_secret_version" {
  secret      = google_secret_manager_secret.admin_jwt_secret.id
  secret_data = var.admin_jwt_secret
}

# Cloud Run service
resource "google_cloud_run_service" "strapi" {
  name     = "${local.name_prefix}-app"
  location = var.region
  
  template {
    metadata {
      labels = local.labels
      annotations = {
        "autoscaling.knative.dev/maxScale"        = var.max_instances
        "autoscaling.knative.dev/minScale"        = var.min_instances
        "run.googleapis.com/cloudsql-instances"   = google_sql_database_instance.postgres.connection_name
        "run.googleapis.com/execution-environment" = "gen2"
        "run.googleapis.com/cpu-throttling"       = "false"
      }
    }
    
    spec {
      service_account_name = google_service_account.app_service_account.email
      
      containers {
        image = "gcr.io/${var.project_id}/${local.app_name}:${var.image_tag}"
        
        ports {
          container_port = 1337
        }
        
        resources {
          limits = {
            cpu    = var.cpu_limit
            memory = var.memory_limit
          }
          requests = {
            cpu    = var.cpu_request
            memory = var.memory_request
          }
        }
        
        env {
          name  = "NODE_ENV"
          value = var.environment == "production" ? "production" : "development"
        }
        
        env {
          name  = "DATABASE_CLIENT"
          value = "postgres"
        }
        
        env {
          name  = "DATABASE_HOST"
          value = "/cloudsql/${google_sql_database_instance.postgres.connection_name}"
        }
        
        env {
          name  = "DATABASE_PORT"
          value = "5432"
        }
        
        env {
          name  = "DATABASE_NAME"
          value = google_sql_database.strapi_db.name
        }
        
        env {
          name  = "DATABASE_USERNAME"
          value = google_sql_user.strapi_user.name
        }
        
        env {
          name  = "DATABASE_PASSWORD"
          value = var.db_password
        }
        
        env {
          name = "JWT_SECRET"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.jwt_secret.secret_id
              key  = "latest"
            }
          }
        }
        
        env {
          name = "ADMIN_JWT_SECRET"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.admin_jwt_secret.secret_id
              key  = "latest"
            }
          }
        }
        
        env {
          name  = "APP_KEYS"
          value = var.app_keys
        }
        
        env {
          name  = "API_TOKEN_SALT"
          value = var.api_token_salt
        }
        
        env {
          name  = "TRANSFER_TOKEN_SALT"
          value = var.transfer_token_salt
        }
        
        env {
          name  = "STORAGE_BUCKET"
          value = google_storage_bucket.uploads.name
        }
        
        env {
          name  = "HOST"
          value = "0.0.0.0"
        }
        
        env {
          name  = "PORT"
          value = "1337"
        }
        
        startup_probe {
          http_get {
            path = "/_health"
            port = 1337
          }
          initial_delay_seconds = 30
          timeout_seconds       = 5
          period_seconds        = 10
          failure_threshold     = 3
        }
        
        liveness_probe {
          http_get {
            path = "/_health"
            port = 1337
          }
          initial_delay_seconds = 60
          timeout_seconds       = 5
          period_seconds        = 30
          failure_threshold     = 3
        }
      }
      
      timeout_seconds = 300
    }
  }
  
  traffic {
    percent         = 100
    latest_revision = true
  }
  
  depends_on = [
    google_project_service.required_apis,
    google_sql_database_instance.postgres
  ]
  
  lifecycle {
    ignore_changes = [
      template[0].metadata[0].annotations["run.googleapis.com/operation-id"],
    ]
  }
}

# IAM policy para permitir acesso público ao Cloud Run
resource "google_cloud_run_service_iam_member" "public_access" {
  service  = google_cloud_run_service.strapi.name
  location = google_cloud_run_service.strapi.location
  role     = "roles/run.invoker"
  member   = "allUsers"
  
  count = var.allow_public_access ? 1 : 0
}

# Load Balancer (opcional para production)
resource "google_compute_global_address" "lb_ip" {
  count = var.environment == "production" ? 1 : 0
  name  = "${local.name_prefix}-lb-ip"
}

# Cloud Logging
resource "google_logging_log_sink" "app_logs" {
  name        = "${local.name_prefix}-app-logs"
  destination = "storage.googleapis.com/${google_storage_bucket.logs.name}"
  filter      = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${google_cloud_run_service.strapi.name}\""
  
  unique_writer_identity = true
}

resource "google_storage_bucket" "logs" {
  name          = "${local.name_prefix}-logs-${random_string.bucket_suffix.result}"
  location      = var.region
  force_destroy = true
  
  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type = "Delete"
    }
  }
  
  labels = local.labels
}

resource "google_storage_bucket_iam_member" "log_sink_writer" {
  bucket = google_storage_bucket.logs.name
  role   = "roles/storage.objectCreator"
  member = google_logging_log_sink.app_logs.writer_identity
}