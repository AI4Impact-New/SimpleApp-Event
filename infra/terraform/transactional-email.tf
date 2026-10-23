# Resend key material is inserted locally after provisioning. Never store a key
# in Terraform variables or a secret_version resource (which would enter state).
resource "aws_secretsmanager_secret" "resend_api_key" {
  name                    = "${var.project_name}/resend-api-key"
  description             = "Resend sending-only API key for AI4Impact transactional mail"
  recovery_window_in_days = 30
}

output "resend_api_key_secret_arn" {
  value = aws_secretsmanager_secret.resend_api_key.arn
}

# Legacy SES verification/feedback resources are retained for reference only.
# Application delivery uses Resend; Cognito uses COGNITO_DEFAULT independently.
resource "aws_sesv2_account_suppression_attributes" "transactional" {
  suppressed_reasons = ["BOUNCE", "COMPLAINT"]
}
resource "aws_sesv2_configuration_set" "transactional" {
  configuration_set_name = "${var.project_name}-transactional"
  reputation_options {
    reputation_metrics_enabled = true
  }
  suppression_options {
    suppressed_reasons = ["BOUNCE", "COMPLAINT"]
  }
}
resource "aws_sesv2_configuration_set_event_destination" "transactional_feedback" {
  configuration_set_name = aws_sesv2_configuration_set.transactional.configuration_set_name
  event_destination_name = "operations-feedback"
  event_destination {
    enabled              = true
    matching_event_types = ["BOUNCE", "COMPLAINT", "REJECT", "RENDERING_FAILURE"]
    sns_destination {
      topic_arn = aws_sns_topic.operations.arn
    }
  }
  depends_on = [aws_sns_topic_policy.operations]
}
