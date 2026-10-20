# Провайдер смотрит в локальный Floci, а не в настоящий AWS.
# Ключи фейковые: Floci их не проверяет.
provider "aws" {
  region     = var.region
  access_key = "test"
  secret_key = "test"

  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true
  s3_use_path_style           = true

  endpoints {
    s3  = var.endpoint
    sqs = var.endpoint
  }
}
