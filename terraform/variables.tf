variable "strapi_image" {
  description = "O caminho completo da imagem Docker do Strapi a ser implantada."
  type        = string
}

variable "app_keys" {
  description = "Chaves de aplicação para o Strapi (APP_KEYS)"
  type        = string
  sensitive   = true
}
