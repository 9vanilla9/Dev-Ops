resource "aws_s3_bucket" "results" {
  bucket = var.bucket_name

  # Иначе destroy упадёт, если в bucket уже лежат результаты
  force_destroy = true
}

resource "aws_sqs_queue" "tasks" {
  name                       = var.queue_name
  visibility_timeout_seconds = var.visibility_timeout
  receive_wait_time_seconds  = 20
}
