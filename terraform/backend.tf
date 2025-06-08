terraform {
    backend "gcs" {
      bucket = "gcs-devops-tfstate-nicolas-eloi-jhayne"
      prefix = "terraform/state"
    }
    
}