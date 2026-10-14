# Learning content is private at both the S3 origin and CloudFront viewer.
resource "aws_s3_bucket" "videos" {
  bucket = "${var.project_name}-videos-${data.aws_caller_identity.current.account_id}"
}
resource "aws_s3_bucket" "certificates" {
  bucket = "${var.project_name}-certificates-${data.aws_caller_identity.current.account_id}"
}
locals {
  learning_buckets = { videos = aws_s3_bucket.videos.id, certificates = aws_s3_bucket.certificates.id }
}
resource "aws_s3_bucket_public_access_block" "learning" {
  for_each                = local.learning_buckets
  bucket                  = each.value
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
resource "aws_s3_bucket_server_side_encryption_configuration" "learning" {
  for_each = local.learning_buckets
  bucket   = each.value
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}
resource "aws_s3_bucket_versioning" "learning" {
  for_each = local.learning_buckets
  bucket   = each.value
  versioning_configuration { status = "Enabled" }
}
resource "aws_s3_bucket_cors_configuration" "videos" {
  bucket = aws_s3_bucket.videos.id
  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["POST", "GET", "HEAD"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag", "Content-Length", "Content-Range"]
    max_age_seconds = 3600
  }
}
resource "tls_private_key" "video_signer" {
  algorithm = "RSA"
  rsa_bits  = 2048
}
resource "aws_secretsmanager_secret" "video_signer" {
  name                    = "${var.project_name}-video-signer"
  recovery_window_in_days = 7
}
resource "aws_secretsmanager_secret_version" "video_signer" {
  secret_id     = aws_secretsmanager_secret.video_signer.id
  secret_string = tls_private_key.video_signer.private_key_pem
}
resource "aws_cloudfront_public_key" "videos" {
  name        = "${var.project_name}-videos"
  encoded_key = tls_private_key.video_signer.public_key_pem
}
resource "aws_cloudfront_key_group" "videos" {
  name  = "${var.project_name}-videos"
  items = [aws_cloudfront_public_key.videos.id]
}
resource "aws_cloudfront_origin_access_control" "videos" {
  name                              = "${var.project_name}-videos"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}
resource "aws_cloudfront_distribution" "videos" {
  enabled     = true
  comment     = "Private PiLearn lecture delivery"
  price_class = "PriceClass_All"
  origin {
    domain_name              = aws_s3_bucket.videos.bucket_regional_domain_name
    origin_id                = "videos"
    origin_access_control_id = aws_cloudfront_origin_access_control.videos.id
  }
  default_cache_behavior {
    target_origin_id           = "videos"
    viewer_protocol_policy     = "https-only"
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD"]
    trusted_key_groups         = [aws_cloudfront_key_group.videos.id]
    cache_policy_id            = "658327ea-f89d-4fab-a63d-7e88639e58f6"
    response_headers_policy_id = aws_cloudfront_response_headers_policy.videos.id
    compress                   = true
  }
  restrictions {
    geo_restriction { restriction_type = "none" }
  }
  viewer_certificate { cloudfront_default_certificate = true }
}
resource "aws_cloudfront_response_headers_policy" "videos" {
  name = "${var.project_name}-video-headers"
  cors_config {
    access_control_allow_credentials = false
    access_control_allow_headers { items = ["*"] }
    access_control_allow_methods { items = ["GET", "HEAD", "OPTIONS"] }
    access_control_allow_origins { items = ["*"] }
    access_control_expose_headers { items = ["Content-Length", "Content-Range", "Accept-Ranges"] }
    origin_override = true
  }
  security_headers_config {
    content_type_options { override = true }
    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      override                   = true
    }
  }
}
resource "aws_s3_bucket_policy" "videos" {
  bucket = aws_s3_bucket.videos.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.videos.arn}/*"
      Condition = { StringEquals = { "AWS:SourceArn" = aws_cloudfront_distribution.videos.arn } }
    }]
  })
}
resource "aws_iam_role" "learning" {
  name = "${var.project_name}-learning-role"
  assume_role_policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [{ Effect = "Allow", Principal = { Service = "lambda.amazonaws.com" }, Action = "sts:AssumeRole" }]
  })
}
resource "aws_iam_role_policy_attachment" "learning_vpc" {
  role       = aws_iam_role.learning.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}
resource "aws_iam_role_policy" "learning_runtime" {
  name   = "learning-content"
  role   = aws_iam_role.learning.id
  policy = file("${path.module}/policies/learning.json")
}
resource "aws_cloudwatch_log_group" "learning" {
  name              = "/aws/lambda/${var.project_name}-learning"
  retention_in_days = 30
}
resource "aws_lambda_function" "learning" {
  function_name                  = "${var.project_name}-learning"
  role                           = aws_iam_role.learning.arn
  runtime                        = var.python_runtime
  handler                        = "learning.handler.handler"
  filename                       = "../../lambdas/learning.zip"
  source_code_hash               = filebase64sha256("../../lambdas/learning.zip")
  memory_size                    = 512
  timeout                        = 30
  reserved_concurrent_executions = 5
  vpc_config {
    subnet_ids         = [aws_subnet.private["a"].id, aws_subnet.private["b"].id]
    security_group_ids = [aws_security_group.lambda.id]
  }
  environment {
    variables = merge(local.lambda_env, {
      VIDEO_BUCKET                = aws_s3_bucket.videos.id
      CERTIFICATE_BUCKET          = aws_s3_bucket.certificates.id
      VIDEO_DOMAIN                = aws_cloudfront_distribution.videos.domain_name
      VIDEO_KEY_ID                = aws_cloudfront_public_key.videos.id
      VIDEO_SIGNER_SECRET_ARN     = aws_secretsmanager_secret.video_signer.arn
      CERTIFICATE_VERIFY_BASE_URL = aws_apigatewayv2_api.main.api_endpoint
      CERTIFICATE_VERIFY_PAGE_URL = "https://main.${aws_amplify_app.landing.default_domain}/verify"
      EXPO_PROJECT_ID             = var.expo_project_id
    })
  }
  depends_on = [aws_iam_role_policy_attachment.learning_db_secret, aws_iam_role_policy.learning_runtime, aws_iam_role_policy_attachment.learning_vpc, aws_cloudwatch_log_group.learning, null_resource.build_lambdas, aws_secretsmanager_secret_version.video_signer]
}
resource "aws_apigatewayv2_integration" "learning" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.learning.invoke_arn
  payload_format_version = "1.0"
}
resource "aws_lambda_permission" "api_learning" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.learning.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}
resource "aws_apigatewayv2_route" "learning" {
  for_each           = toset(["ANY /learning/{proxy+}", "ANY /admin/{proxy+}", "GET /me/learning", "GET /me/certificates", "GET /me/notifications", "GET /me/devices", "POST /me/devices", "DELETE /me/devices/{id}", "PATCH /me/notifications/{id}", "GET /certificates/{id}/download"])
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = each.value
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
  target             = "integrations/${aws_apigatewayv2_integration.learning.id}"
}
resource "aws_apigatewayv2_route" "certificate_verify" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "GET /certificates/{id}/verify"
  authorization_type = "NONE"
  target             = "integrations/${aws_apigatewayv2_integration.learning.id}"
}
output "video_cloudfront_domain" { value = aws_cloudfront_distribution.videos.domain_name }
output "video_bucket" { value = aws_s3_bucket.videos.id }
output "certificate_bucket" { value = aws_s3_bucket.certificates.id }

# Explicit unauthenticated preflight outranks the JWT-protected ANY proxy routes.
resource "aws_apigatewayv2_route" "learning_preflight" {
  for_each           = toset(["OPTIONS /admin/{proxy+}", "OPTIONS /learning/{proxy+}"])
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = each.value
  authorization_type = "NONE"
  target             = "integrations/${aws_apigatewayv2_integration.learning.id}"
}

resource "aws_iam_role_policy_attachment" "learning_db_secret" {
  role       = aws_iam_role.learning.name
  policy_arn = aws_iam_policy.lambda_secrets.arn
}
