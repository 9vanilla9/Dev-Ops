variable "region" {
  description = "Регион AWS"
  type        = string
  default     = "us-east-1"
}

variable "endpoint" {
  description = "Адрес Floci, доступный с машины, где запускается Terraform"
  type        = string
  default     = "http://localhost:4566"
}

variable "bucket_name" {
  description = "S3 bucket для результатов скрапера"
  type        = string
  default     = "quotes-results"
}

variable "queue_name" {
  description = "SQS очередь заданий для скрапера"
  type        = string
  default     = "scrape-tasks"
}

variable "visibility_timeout" {
  description = "Сколько секунд сообщение скрыто от других получателей, пока скрапер его обрабатывает"
  type        = number
  default     = 300
}
